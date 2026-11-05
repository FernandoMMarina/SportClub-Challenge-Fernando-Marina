import { isAxiosError, type AxiosInstance } from 'axios';
import type { User } from '../types/user';
import { createApiClient } from './api-client.ts';
import { isUser, mapApiAuthError } from './api-auth-service.ts';
import { validateLoginInput } from './auth-service.ts';

export type ProfileInput = Pick<User, 'firstName' | 'lastName' | 'email'>;
export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;

export function normalizeProfile(input: ProfileInput): ProfileInput {
  return { firstName: input.firstName.trim(), lastName: input.lastName.trim(), email: input.email.trim().toLowerCase() };
}

export function validateProfile(input: ProfileInput): ProfileFieldErrors {
  const fields: ProfileFieldErrors = {};
  for (const key of ['firstName', 'lastName'] as const) {
    if (!input[key].trim()) fields[key] = key === 'firstName' ? 'Ingresá tu nombre.' : 'Ingresá tu apellido.';
    else if (input[key].trim().length > 80) fields[key] = 'El máximo es de 80 caracteres.';
  }
  const emailError = validateLoginInput(input.email, 'unused').email;
  if (emailError) fields.email = emailError;
  return fields;
}

export function hasProfileChanges(input: ProfileInput, user: ProfileInput): boolean {
  const next = normalizeProfile(input);
  const previous = normalizeProfile(user);
  return (Object.keys(next) as (keyof ProfileInput)[]).some(key => next[key] !== previous[key]);
}

export class ProfileError extends Error {
  readonly fields: ProfileFieldErrors;
  constructor(message: string, fields: ProfileFieldErrors = {}) {
    super(message);
    this.name = 'ProfileError';
    this.fields = fields;
  }
}

export function createProfileService(client: AxiosInstance) {
  return async (token: string, input: ProfileInput): Promise<User> => {
    const fields = validateProfile(input);
    if (Object.keys(fields).length) throw new ProfileError('Revisá los campos indicados.', fields);
    try {
      const response = await client.patch<{ data: unknown }>('/users/me', normalizeProfile(input), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isUser(response.data?.data)) throw new ProfileError('El servidor devolvió un perfil inválido.');
      return response.data.data;
    } catch (cause: unknown) {
      if (cause instanceof ProfileError) throw cause;
      if (isAxiosError(cause) && cause.response?.status === 409) {
        throw new ProfileError('Ese correo electrónico ya pertenece a otro usuario.', { email: 'Ese correo ya está en uso.' });
      }
      if (isAxiosError(cause) && cause.response?.status === 400) {
        throw new ProfileError('El servidor rechazó los datos. Revisá los campos indicados.');
      }
      const error = mapApiAuthError(cause, 'profile');
      if (error.code === 'SESSION_EXPIRED') throw new ProfileError('Tu sesión venció. Cerrá sesión y volvé a ingresar.');
      throw new ProfileError(error.message);
    }
  };
}

export async function updateProfile(token: string, input: ProfileInput): Promise<User> {
  const client = createApiClient(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api');
  return createProfileService(client)(token, input);
}
