import { create } from 'zustand';
import type { UserDTO } from '@vaani/types';

interface AuthState {
  user: UserDTO | null;
  /** True until the initial `me` check resolves — gates route rendering. */
  isHydrating: boolean;
  setUser: (user: UserDTO | null) => void;
  setHydrating: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: true,
  setUser: (user) => set({ user }),
  setHydrating: (value) => set({ isHydrating: value }),
}));
