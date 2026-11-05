import type { AuthSession } from '../types/auth';
import { createApiAuthService } from './api-auth-service.ts';
import { createApiClient } from './api-client.ts';
import { AuthError, DEMO_CREDENTIALS, authenticateLocally, validateLoginInput } from './auth-service.ts';

/** Solo la combinación demo conocida entra localmente; el resto requiere la API. */
export async function authenticateSession(email: string, password: string): Promise<AuthSession> {
  const fields = validateLoginInput(email, password);
  if (Object.keys(fields).length) throw new AuthError('VALIDATION_ERROR', 'Revisá los campos indicados.', fields);
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    return { user: authenticateLocally(email, password), token: null, expiresAt: null, source: 'local' };
  }
  const client = createApiClient(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api');
  return createApiAuthService(client).signIn(normalizedEmail, password);
}
