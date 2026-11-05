import type { User } from './user';

export type AuthSession = {
  user: User;
  token: string | null;
  expiresAt: number | null;
  source: 'api' | 'local';
};
