import { create } from 'zustand';

import { hasProfileChanges, normalizeProfile, ProfileError, updateProfile, validateProfile, type ProfileInput } from '../services/profile-service.ts';
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
  updateUser: (input: ProfileInput) => Promise<boolean>;
};

/** El identificador de intento impide que una respuesta tardía restaure una sesión cerrada. */
export function createAuthStore(authenticate = authenticateSession, saveProfile = updateProfile) {
  let currentAttempt = 0;
  let saving = false;
  return create<AuthState>((set, get) => ({
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
    updateUser: async (input) => {
      const session = get();
      if (!session.user || !session.source) {
        throw new ProfileError('Volvé a ingresar para guardar tus datos.');
      }
      if (session.expiresAt !== null && session.expiresAt <= Date.now()) {
        throw new ProfileError('Tu sesión venció. Cerrá sesión y volvé a ingresar.');
      }
      const fields = validateProfile(input);
      if (Object.keys(fields).length) throw new ProfileError('Revisá los campos indicados.', fields);
      if (saving || !hasProfileChanges(input, session.user)) return false;
      if (session.source === 'local') {
        set({ user: { ...session.user, ...normalizeProfile(input) } });
        return true;
      }
      if (!session.token) throw new ProfileError('Volvé a ingresar para guardar tus datos.');
      saving = true;
      const attempt = currentAttempt;
      try {
        const user = await saveProfile(session.token, input);
        if (attempt !== currentAttempt || get().token !== session.token || !get().user ||
            (session.expiresAt !== null && session.expiresAt <= Date.now())) {
          throw new ProfileError('La sesión cambió durante el guardado. Volvé a ingresar.');
        }
        if (user.id !== session.user.id) throw new ProfileError('El servidor devolvió otro usuario.');
        set({ user });
        return true;
      } finally { saving = false; }
    },
    signOut: () => {
      currentAttempt += 1;
      set({ user: null, token: null, expiresAt: null, source: null });
    },
  }));
}

export const useAuthStore = createAuthStore();
