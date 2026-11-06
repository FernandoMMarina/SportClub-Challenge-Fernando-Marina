import { isAxiosError, type AxiosInstance } from 'axios';
import { createApiClient } from './api-client.ts';
import { mapApiAuthError } from './api-auth-service.ts';

export type Session = { id: string; branchId: string; activityId: string; startsAt: number; endsAt: number; capacity: number; remainingCapacity?: number };

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return ['id', 'branchId', 'activityId'].every(key => typeof s[key] === 'string' && !!s[key]) &&
    typeof s.startsAt === 'number' && typeof s.endsAt === 'number' &&
    Number.isSafeInteger(s.startsAt) && Number.isSafeInteger(s.endsAt) && s.startsAt < s.endsAt &&
    Number.isFinite(new Date(s.startsAt).getTime()) && Number.isFinite(new Date(s.endsAt).getTime()) &&
    typeof s.capacity === 'number' && Number.isSafeInteger(s.capacity) && s.capacity > 0;
}

export type Reservation = {
  id: string;
  userId: string;
  sessionId: string;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: number;
  cancelledAt: number | null;
  session: { id: string; branchId: string; activityId: string; startsAt: number; endsAt: number };
};

function isReservation(value: unknown): value is Reservation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (!item.session || typeof item.session !== 'object') return false;
  const session = item.session as Record<string, unknown>;
  return ['id', 'userId', 'sessionId'].every(key => typeof item[key] === 'string' && !!item[key]) &&
    ['CONFIRMED', 'CANCELLED'].includes(String(item.status)) &&
    Number.isSafeInteger(item.createdAt) &&
    (item.cancelledAt === null || Number.isSafeInteger(item.cancelledAt)) &&
    ['id', 'branchId', 'activityId'].every(key => typeof session[key] === 'string' && !!session[key]) &&
    item.sessionId === session.id && typeof session.startsAt === 'number' && typeof session.endsAt === 'number' &&
    Number.isSafeInteger(session.startsAt) && Number.isSafeInteger(session.endsAt) &&
    Number.isFinite(new Date(session.startsAt).getTime()) && Number.isFinite(new Date(session.endsAt).getTime()) &&
    session.startsAt < session.endsAt;
}

export function canCancelReservation(reservation: Reservation, now = Date.now()): boolean {
  return reservation.status === 'CONFIRMED' && reservation.session.startsAt > now;
}

export function describeReservationError(cause: unknown): string {
  if (isAxiosError(cause) && cause.response?.status === 409) {
    const code: unknown = cause.response.data?.error?.code;
    if (code === 'SCHEDULE_CONFLICT') return 'La clase se superpone con otra de tus reservas.';
    if (code === 'DUPLICATE_RESERVATION') return 'Ya tenés una reserva para esa clase.';
    if (code === 'SESSION_FULL') return 'La clase ya no tiene cupos disponibles.';
    return 'La clase ya comenzó o no está disponible. Actualizá el listado.';
  }
  if (isAxiosError(cause) && cause.response?.status === 404) return 'No encontramos esa reserva. Actualizá el listado.';
  const error = mapApiAuthError(cause, 'profile');
  if (error.code === 'SESSION_EXPIRED') return 'Tu sesión venció. Cerrá sesión y volvé a ingresar.';
  return error.message;
}

export function createReservationsService(client: AxiosInstance) {
  return {
    async listSessions(token: string): Promise<Session[]> {
      const response = await client.get<{ data: unknown }>('/sessions', { headers: { Authorization: `Bearer ${token}` } });
      if (!Array.isArray(response.data?.data) || !response.data.data.every(isSession)) throw new Error('Sesiones inválidas.');
      return response.data.data;
    },
    async book(token: string, sessionId: string): Promise<Reservation> {
      const response = await client.post<{ data: unknown }>('/reservations', { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
      if (!isReservation(response.data?.data) || response.data.data.sessionId !== sessionId || response.data.data.status !== 'CONFIRMED') throw new Error('Reserva inválida.');
      return response.data.data;
    },
    async listMine(token: string, signal?: AbortSignal): Promise<Reservation[]> {
      const response = await client.get<{ data: unknown }>('/reservations/me', {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      if (!Array.isArray(response.data?.data) || !response.data.data.every(isReservation)) {
        throw new Error('Respuesta de reservas inválida.');
      }
      return response.data.data;
    },
    async cancel(token: string, id: string): Promise<Reservation> {
      const response = await client.patch<{ data: unknown }>(`/reservations/${encodeURIComponent(id)}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isReservation(response.data?.data) || response.data.data.id !== id || response.data.data.status !== 'CANCELLED') {
        throw new Error('Respuesta de cancelación inválida.');
      }
      return response.data.data;
    },
  };
}

export function reservationsService() {
  return createReservationsService(createApiClient(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'));
}
