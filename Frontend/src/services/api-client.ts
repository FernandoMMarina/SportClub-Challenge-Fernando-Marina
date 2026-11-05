import { create, type AxiosInstance } from 'axios';

import { AuthError } from './auth-service.ts';

/** Cliente sin token global: cada solicitud protegida recibe el JWT de su sesión. */
export function createApiClient(baseURL: string, timeout = 10_000): AxiosInstance {
  let url: URL;
  try {
    url = new URL(baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
  } catch {
    throw new AuthError('CONFIGURATION_ERROR', 'La URL de la API es inválida.');
  }
  return create({
    baseURL: url.toString().replace(/\/$/, ''),
    timeout,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
}
