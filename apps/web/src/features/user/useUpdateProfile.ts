import { useMutation } from '@tanstack/react-query';
import type { UpdateProfileInput, UserDTO } from '@vaani/types';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api.patch<{ user: UserDTO }>('/api/user/profile', input),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['me'], data);
    },
  });
}
