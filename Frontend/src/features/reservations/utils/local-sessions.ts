import type { Session } from '../../../services/reservations-service';
export type VenueSchedule = { id: string; classes: { id: string; days: string[]; times: string[] }[] };
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function createLocalSessions(venues: VenueSchedule[], now: number): Session[] {
  const today = new Date(now - 10800000).toISOString().slice(0, 10);
  const midnight = Date.parse(`${today}T00:00:00Z`);
  const sessions: Session[] = [];
  for (let offset = 0; offset <= 14; offset++) {
    const date = new Date(midnight + offset * 86400000);
    const day = date.toISOString().slice(0, 10);
    for (const venue of venues) for (const activity of venue.classes) {
      if (!activity.days.includes(days[date.getUTCDay()])) continue;
      for (const time of activity.times) {
        const startsAt = Date.parse(`${day}T${time}:00-03:00`);
        if (startsAt <= now) continue;
        sessions.push({ id: `demo-${activity.id}-${day}-${time.replace(':', '')}`, branchId: venue.id,
          activityId: activity.id, startsAt, endsAt: startsAt + 3600000, capacity: 20 });
      }
    }
  }
  return sessions.sort((a, b) => a.startsAt - b.startsAt);
}

export function intervalsOverlap(a: { startsAt: number; endsAt: number }, b: { startsAt: number; endsAt: number }): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}
