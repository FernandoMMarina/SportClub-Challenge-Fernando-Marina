const branches = require('./venues.json');

const DAY = 24 * 60 * 60 * 1000;
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Demo: próximas dos semanas, sesiones de una hora y 20 cupos.
 * Buenos Aires UTC-03:00; no depende de la zona horaria del host.
 * Se ejecuta solo al crear el archivo de reservas por primera vez.
 * @returns {import('../types/reservations').ReservationState}
 */
function createSessionSeed(now = Date.now()) {
  const localDate = new Date(now - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const midnightUtc = Date.parse(`${localDate}T00:00:00Z`);
  const sessions = [];
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(midnightUtc + offset * DAY);
    const dateString = date.toISOString().slice(0, 10);
    const day = days[date.getUTCDay()];
    for (const branch of branches) {
      for (const activity of branch.classes) {
        if (!activity.days.includes(day)) continue;
        for (const time of activity.times) {
          const startsAt = Date.parse(`${dateString}T${time}:00-03:00`);
          sessions.push({ id: `${activity.id}-${dateString}-${time.replace(':', '')}`,
            branchId: branch.id, activityId: activity.id,
            startsAt, endsAt: startsAt + 60 * 60 * 1000, capacity: 20 });
        }
      }
    }
  }
  return { sessions, reservations: [] };
}
module.exports = { createSessionSeed };
