import type { ForgotPasswordInput, LoginInput, RegisterInput, UserDTO } from '@vaani/types';
import { api } from '@/lib/api';

export interface UserEnvelope {
  user: UserDTO;
}

export const authApi = {
  me: () => api.get<UserEnvelope>('/api/user/me'),
  login: (input: LoginInput) => api.post<UserEnvelope>('/api/auth/login', input),
  register: (input: RegisterInput) => api.post<UserEnvelope>('/api/auth/register', input),
  logout: () => api.post<{ success: boolean }>('/api/auth/logout'),
  forgotPassword: (input: ForgotPasswordInput) =>
    api.post<{ message: string }>('/api/auth/forgot-password', input),
};
