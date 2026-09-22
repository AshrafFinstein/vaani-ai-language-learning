import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiClientError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from './auth.api';

/**
 * Runs once on app mount: checks the session cookie via `/me` and hydrates the
 * auth store. A 401 simply means "not logged in" (expected, not an error).
 */
export function useHydrateAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  const query = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setUser(query.data.user);
      setHydrating(false);
    } else if (query.isError) {
      setUser(null);
      setHydrating(false);
    }
  }, [query.isSuccess, query.isError, query.data, setUser, setHydrating]);
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['me'], data);
      navigate('/app/dashboard');
    },
  });
}

export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['me'], data);
      navigate('/app/dashboard');
    },
  });
}

export function useLogout() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      navigate('/login');
    },
  });
}

/** Extracts a user-facing message + field errors from a mutation error. */
export function toFormError(error: unknown): {
  message: string;
  fields?: Record<string, string[]>;
} {
  if (error instanceof ApiClientError) {
    return { message: error.message, fields: error.fields };
  }
  return { message: 'Something went wrong. Please try again.' };
}
