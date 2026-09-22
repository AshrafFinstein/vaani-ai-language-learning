import type { ApiError } from '@vaani/types';

/** Thrown for any non-2xx API response; carries the canonical {@link ApiError}. */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiError: ApiError,
  ) {
    super(apiError.message);
    this.name = 'ApiClientError';
  }

  /** Field-level validation errors, if present. */
  get fields(): Record<string, string[]> | undefined {
    return this.apiError.fields;
  }
}

// Same-origin in the browser (Vite proxies /api → API in dev; reverse-proxied in prod).
const BASE_URL = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiClientError(0, { code: 'INTERNAL', message: 'Network error. Please try again.' });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const apiError: ApiError = body?.error ?? {
      code: 'INTERNAL',
      message: 'Unexpected error',
    };
    throw new ApiClientError(res.status, apiError);
  }

  return (body?.data ?? null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
};
