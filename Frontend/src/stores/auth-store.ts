import { create } from 'zustand';

import { authenticateLocally } from '@/services/auth-service';
import type { User } from '@/types/user';

type AuthState = {
  user: User | null;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  signIn: (email, password) => {
    const user = authenticateLocally(email, password);
    set({ user });
  },
  signOut: () => set({ user: null }),
}));
