import type { ApiError } from '@vaani/types';
import { useAuthStore } from '@/stores/authStore';

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

async function send(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, {
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
}

// One in-flight refresh shared by every request that hits a 401 at the same time, so a
// burst of expired-token failures rotates the refresh token once, not once per request.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= send('/api/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init);

  // The access token is short-lived (15m). On a 401 from anything but the auth
  // endpoints themselves, trade the refresh cookie for a new pair and retry once.
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshSession();
    // Even when this tab's refresh lost a race, another tab may have just rotated the
    // shared cookies — the retry picks those up.
    res = await send(path, init);
    if (res.status === 401 && !refreshed) {
      useAuthStore.getState().setUser(null);
    }
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
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
