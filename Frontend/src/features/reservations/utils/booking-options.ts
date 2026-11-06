import type { Reservation, Session } from '../../../services/reservations-service';
import { intervalsOverlap } from './local-sessions.ts';

export function sessionDateKey(timestamp: number): string {
  return new Date(timestamp - 10800000).toISOString().slice(0, 10);
}

export function bookingStatus(session: Session, items: Reservation[], now: number): 'Disponible' | 'Reservada' | 'Se superpone' | 'Sin cupo' | 'Finalizada' {
  if (session.startsAt <= now) return 'Finalizada';
  const confirmed = items.filter(item => item.status === 'CONFIRMED');
  if (confirmed.some(item => item.sessionId === session.id)) return 'Reservada';
  if (confirmed.some(item => intervalsOverlap(session, item.session))) return 'Se superpone';
  if (session.remainingCapacity === 0 || confirmed.filter(item => item.sessionId === session.id).length >= session.capacity) return 'Sin cupo';
  return 'Disponible';
}
