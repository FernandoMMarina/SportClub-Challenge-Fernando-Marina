import type { User } from '@/types/user';

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;
export type AuthErrorCode = 'VALIDATION_ERROR' | 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' |
  'TIMEOUT' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'SESSION_EXPIRED' | 'INVALID_RESPONSE' |
  'CONFIGURATION_ERROR' | 'UNEXPECTED_ERROR' | 'CANCELLED';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly fields: LoginFieldErrors;

  constructor(code: AuthErrorCode, message: string, fields: LoginFieldErrors = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.fields = fields;
  }
}

export function validateLoginInput(email: string, password: string): LoginFieldErrors {
  const fields: LoginFieldErrors = {};
  const normalizedEmail = email.trim();
  if (!normalizedEmail) fields.email = 'Ingresá tu correo electrónico.';
  else if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    fields.email = 'Ingresá un correo válido, por ejemplo nombre@correo.com.';
  }
  if (!password.trim()) fields.password = 'Ingresá tu contraseña.';
  else if (password.length > 128) fields.password = 'La contraseña no puede superar los 128 caracteres.';
  return fields;
}

// Credenciales públicas de demostración. No representan autenticación de servidor.
export const DEMO_CREDENTIALS = {
  email: 'demo@sportclub.com',
  password: 'SportClub123!',
} as const;

export function authenticateLocally(email: string, password: string): User {
  const fields = validateLoginInput(email, password);
  if (Object.keys(fields).length) {
    throw new AuthError('VALIDATION_ERROR', 'Revisá los campos indicados.', fields);
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    throw new AuthError('INVALID_CREDENTIALS', 'El correo electrónico o la contraseña no coinciden.');
  }
  return {
    id: 'user-demo', firstName: 'Alex', lastName: 'García',
    email: DEMO_CREDENTIALS.email, phone: '',
  };
}

/** Traduce fallos conocidos y oculta detalles técnicos de errores inesperados. */
export function describeLoginError(cause: unknown): { title: string; message: string } {
  if (cause instanceof AuthError && cause.code === 'INVALID_CREDENTIALS') {
    return {
      title: 'Datos de acceso incorrectos',
      message: 'El correo electrónico o la contraseña no coinciden. Revisalos e intentá nuevamente.',
    };
  }
  if (cause instanceof AuthError) {
    const messages: Partial<Record<AuthErrorCode, { title: string; message: string }>> = {
      NETWORK_ERROR: { title: 'No pudimos conectar', message: 'Revisá tu conexión y que el backend esté encendido. Volvé a intentarlo.' },
      TIMEOUT: { title: 'El servidor tardó demasiado', message: 'No se completó el ingreso. Volvé a intentarlo.' },
      RATE_LIMITED: { title: 'Demasiados intentos', message: 'Esperá unos minutos antes de volver a ingresar.' },
      SERVER_ERROR: { title: 'El servidor no está disponible', message: 'Ocurrió un problema en el servidor. Intentá más tarde.' },
      SESSION_EXPIRED: { title: 'La sesión venció', message: 'Volvé a ingresar con tu correo y contraseña.' },
      INVALID_RESPONSE: { title: 'No pudimos validar la sesión', message: 'El servidor devolvió una respuesta inesperada. Volvé a intentarlo.' },
      CONFIGURATION_ERROR: { title: 'Configuración de acceso inválida', message: 'Revisá el modo de autenticación y la URL de la API.' },
      CANCELLED: { title: 'Ingreso cancelado', message: 'Podés volver a iniciar sesión.' },
    };
    const message = messages[cause.code];
    if (message) return message;
  }
  return {
    title: 'No pudimos iniciar sesión',
    message: 'Ocurrió un problema inesperado. Tus datos siguen en el formulario para que puedas volver a intentarlo.',
  };
}
