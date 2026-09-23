import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiClientError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { UserDTO } from '@vaani/types';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const unauthorized = () =>
  json(401, { error: { code: 'UNAUTHORIZED', message: 'Session expired' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  useAuthStore.setState({ user: { id: 'u1' } as UserDTO });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const paths = () => fetchMock.mock.calls.map((c) => c[0] as string);

describe('api client session refresh', () => {
  it('refreshes on a 401 and retries the original request', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, { data: { user: {} } }))
      .mockResolvedValueOnce(json(200, { data: { ok: true } }));

    await expect(api.get('/api/progress')).resolves.toEqual({ ok: true });
    expect(paths()).toEqual(['/api/progress', '/api/auth/refresh', '/api/progress']);
    expect(useAuthStore.getState().user).not.toBeNull();
  });

  it('shares one refresh across concurrent 401s', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === '/api/auth/refresh') return json(200, { data: {} });
      const retried = paths().filter((p) => p === path).length > 1;
      return retried ? json(200, { data: path }) : unauthorized();
    });

    await Promise.all([api.get('/api/a'), api.get('/api/b')]);
    expect(paths().filter((p) => p === '/api/auth/refresh')).toHaveLength(1);
  });

  it('signs the user out when the refresh fails', async () => {
    fetchMock.mockImplementation(async () => unauthorized());

    await expect(api.get('/api/progress')).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('does not try to refresh for auth endpoints (e.g. a wrong password)', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized());

    await expect(api.post('/api/auth/login', {})).rejects.toBeInstanceOf(ApiClientError);
    expect(paths()).toEqual(['/api/auth/login']);
  });
});
