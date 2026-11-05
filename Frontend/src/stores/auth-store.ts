import { create } from 'zustand';

import { AuthError } from '../services/auth-service.ts';
import { authenticateSession } from '../services/session-service.ts';
import type { AuthSession } from '../types/auth';
import type { User } from '../types/user';

type AuthState = {
  user: User | null;
  token: string | null;
  expiresAt: number | null;
  source: AuthSession['source'] | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

/** El identificador de intento impide que una respuesta tardía restaure una sesión cerrada. */
export function createAuthStore(authenticate = authenticateSession) {
  let currentAttempt = 0;
  return create<AuthState>((set) => ({
    user: null,
    token: null,
    expiresAt: null,
    source: null,
    signIn: async (email, password) => {
      const attempt = ++currentAttempt;
      const session = await authenticate(email, password);
      if (attempt !== currentAttempt) throw new AuthError('CANCELLED', 'El intento ya no está activo.');
      set(session);
    },
    signOut: () => {
      currentAttempt += 1;
      set({ user: null, token: null, expiresAt: null, source: null });
    },
  }));
}

export const useAuthStore = createAuthStore();
