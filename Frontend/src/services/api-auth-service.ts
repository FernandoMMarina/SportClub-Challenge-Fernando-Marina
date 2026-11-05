import { isAxiosError, type AxiosInstance } from 'axios';

import type { AuthSession } from '../types/auth';
import type { User } from '../types/user';
import { AuthError, validateLoginInput } from './auth-service.ts';

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  return ['id', 'firstName', 'lastName', 'email', 'phone'].every(
    key => typeof (value as Record<string, unknown>)[key] === 'string'
  );
}

export function mapApiAuthError(cause: unknown, context: 'login' | 'profile'): AuthError {
  if (cause instanceof AuthError) return cause;
  if (!isAxiosError(cause)) return new AuthError('UNEXPECTED_ERROR', 'Error inesperado.');
  if (cause.code === 'ECONNABORTED' || cause.code === 'ETIMEDOUT') {
    return new AuthError('TIMEOUT', 'La solicitud tardó demasiado.');
  }
  if (!cause.response) return new AuthError('NETWORK_ERROR', 'No se pudo conectar con la API.');
  if (cause.response.status === 401) {
    return new AuthError(context === 'login' ? 'INVALID_CREDENTIALS' : 'SESSION_EXPIRED', 'Acceso no autorizado.');
  }
  if (cause.response.status === 429) return new AuthError('RATE_LIMITED', 'Demasiados intentos.');
  if (cause.response.status >= 500) return new AuthError('SERVER_ERROR', 'El servidor no pudo procesar la solicitud.');
  return new AuthError('UNEXPECTED_ERROR', 'Respuesta HTTP inesperada.');
}

export function createApiAuthService(client: AxiosInstance, clock = Date.now) {
  async function getProfile(token: string): Promise<User> {
    try {
      const response = await client.get<{ data: unknown }>('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isUser(response.data?.data)) throw new AuthError('INVALID_RESPONSE', 'Perfil inválido.');
      return response.data.data;
    } catch (cause: unknown) {
      throw mapApiAuthError(cause, 'profile');
    }
  }

  return {
    getProfile,
    async signIn(email: string, password: string): Promise<AuthSession> {
      const fields = validateLoginInput(email, password);
      if (Object.keys(fields).length) throw new AuthError('VALIDATION_ERROR', 'Revisá los campos indicados.', fields);
      try {
        const requestedAt = clock();
        const response = await client.post<{ token: string; tokenType: string; expiresIn: number }>('/auth/login', {
          email: email.trim().toLowerCase(), password,
        });
        const data = response.data;
        if (!data || typeof data.token !== 'string' || !data.token || data.tokenType !== 'Bearer' ||
            !Number.isSafeInteger(data.expiresIn) || data.expiresIn <= 0 || data.expiresIn > 86400) {
          throw new AuthError('INVALID_RESPONSE', 'Respuesta de autenticación inválida.');
        }
        // Verifica el JWT contra un endpoint protegido y toma el perfil persistido del servidor.
        const user = await getProfile(data.token);
        const expiresAt = requestedAt + data.expiresIn * 1000;
        if (expiresAt <= clock()) throw new AuthError('SESSION_EXPIRED', 'La sesión venció durante el ingreso.');
        return { user, token: data.token, expiresAt, source: 'api' };
      } catch (cause: unknown) {
        throw mapApiAuthError(cause, 'login');
      }
    },
  };
}
