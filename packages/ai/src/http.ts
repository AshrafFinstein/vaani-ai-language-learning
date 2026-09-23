/**
 * Shared HTTP hardening for the real (OpenAI-compatible) providers: a typed error,
 * request timeout via {@link AbortController}, and bounded exponential-backoff retries
 * on transient failures (HTTP 429 / 5xx and network errors). This keeps the OpenAI
 * text/STT/TTS providers consistent and testable — tests stub `fetch` to drive it.
 *
 * NOTE: no secrets live here. Callers pass headers (including Authorization) in.
 */

/** Retry/timeout tuning shared by the real providers. */
export interface HttpHardeningOptions {
  /** Per-attempt timeout in ms before the request is aborted. */
  timeoutMs?: number;
  /** Total attempts (1 = no retry). Bounded to keep cost/latency predictable. */
  maxAttempts?: number;
  /** Base delay for exponential backoff (ms). Attempt n waits ~ base * 2^(n-1). */
  backoffBaseMs?: number;
}

export const DEFAULT_HARDENING: Required<HttpHardeningOptions> = {
  timeoutMs: 30_000,
  maxAttempts: 3,
  backoffBaseMs: 300,
};

/**
 * Typed error for provider HTTP failures. `status` is the HTTP status when the
 * request completed with a non-2xx code; `kind` classifies the failure so callers
 * (e.g. graceful fallback-to-mock) can branch without string-matching messages.
 */
export class ProviderHttpError extends Error {
  constructor(
    public readonly kind: 'timeout' | 'network' | 'http',
    public readonly provider: string,
    public readonly status?: number,
    public readonly detail?: string,
  ) {
    super(
      kind === 'http'
        ? `${provider} request failed (${status ?? '?'}): ${(detail ?? '').slice(0, 300)}`
        : `${provider} request ${kind === 'timeout' ? 'timed out' : 'failed (network error)'}`,
    );
    this.name = 'ProviderHttpError';
  }

  /** Whether the failure is worth retrying (transient). */
  get retryable(): boolean {
    if (this.kind === 'timeout' || this.kind === 'network') return true;
    return this.status === 429 || (this.status !== undefined && this.status >= 500);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Performs a fetch with a per-attempt timeout and bounded exponential-backoff retries
 * on transient failures. Returns the successful {@link Response} (status < 400). Throws
 * a {@link ProviderHttpError} on exhausted retries / non-retryable errors.
 */
export async function fetchWithRetry(
  provider: string,
  url: string,
  init: RequestInit,
  opts?: HttpHardeningOptions,
): Promise<Response> {
  const { timeoutMs, maxAttempts, backoffBaseMs } = { ...DEFAULT_HARDENING, ...opts };
  let lastError: ProviderHttpError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      // AbortError → timeout; anything else → network failure.
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastError = new ProviderHttpError(isAbort ? 'timeout' : 'network', provider);
      if (attempt < maxAttempts && lastError.retryable) {
        await sleep(backoffBaseMs * 2 ** (attempt - 1));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) return res;

    const detail = await res.text().catch(() => '');
    lastError = new ProviderHttpError('http', provider, res.status, detail);
    if (attempt < maxAttempts && lastError.retryable) {
      await sleep(backoffBaseMs * 2 ** (attempt - 1));
      continue;
    }
    throw lastError;
  }

  // Unreachable, but keeps the type checker satisfied.
  throw lastError ?? new ProviderHttpError('network', provider);
}
