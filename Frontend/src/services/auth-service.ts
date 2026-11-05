import type { User } from '@/types/user';

// Credenciales públicas de demostración. No representan autenticación de servidor.
const demoEmail = 'demo@sportclub.com';
const demoPassword = 'SportClub123!';

export function authenticateLocally(email: string, password: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new Error('Ingresá un correo electrónico válido.');
  }
  if (!password) throw new Error('Ingresá tu contraseña.');
  if (normalizedEmail !== demoEmail || password !== demoPassword) {
    throw new Error('Email o contraseña incorrectos.');
  }
  return {
    id: 'user-demo', firstName: 'Alex', lastName: 'García',
    email: demoEmail, phone: '',
  };
}
