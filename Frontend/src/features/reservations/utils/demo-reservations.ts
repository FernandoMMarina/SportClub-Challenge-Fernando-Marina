import type { Reservation } from '../../../services/reservations-service';

type DemoVenue = { id: string; classes: { id: string; days: string[]; times: string[] }[] };
const DAY = 86_400_000;
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Reservas iniciales de la demo: el store permite modificarlas en memoria, sin enviarlas al backend. */
export function createDemoReservations(venues: DemoVenue[], userId: string, now = Date.now()): Reservation[] {
  const localDate = new Date(now - 3 * 3_600_000).toISOString().slice(0, 10);
  const midnight = Date.parse(`${localDate}T00:00:00Z`);
  const examples: Reservation[] = [];
  for (let offset = -7; offset <= 14; offset++) {
    const date = new Date(midnight + offset * DAY);
    const dateString = date.toISOString().slice(0, 10);
    const weekday = weekdays[date.getUTCDay()];
    for (const venue of venues) {
      for (const activity of venue.classes) {
        if (!activity.days.includes(weekday)) continue;
        for (const time of activity.times) {
          const startsAt = Date.parse(`${dateString}T${time}:00-03:00`);
          const sessionId = `demo-${activity.id}-${dateString}-${time.replace(':', '')}`;
          examples.push({ id: `reservation-${sessionId}`, userId, sessionId,
            status: 'CONFIRMED', createdAt: startsAt - DAY, cancelledAt: null,
            session: { id: sessionId, branchId: venue.id, activityId: activity.id, startsAt, endsAt: startsAt + 3_600_000 } });
        }
      }
    }
  }
  examples.sort((a, b) => a.session.startsAt - b.session.startsAt);
  // Clases de días diferentes para mostrar variedad sin superponer ejemplos.
  const future = examples.filter(item => item.session.startsAt > now);
  const upcoming: Reservation[] = [];
  for (const item of future) {
    if (!upcoming.some(previous => previous.session.startsAt >= item.session.startsAt - DAY)) upcoming.push(item);
    if (upcoming.length === 3) break;
  }
  const past = examples.filter(item => item.session.endsAt < now).slice(-1);
  return [...upcoming.map((item, index) => index === 2 ? {
    ...item, status: 'CANCELLED' as const, cancelledAt: item.createdAt + 1000,
  } : item), ...past];
}
