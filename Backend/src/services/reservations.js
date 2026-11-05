const { randomUUID } = require('node:crypto');
const { fail } = require('../utils/errors');
const { intervalsOverlap } = require('../utils/intervals');

/** @typedef {import('../types/reservations').ReservationState} ReservationState */
/** @typedef {import('../types/reservations').Session} Session */

/** @param {ReservationState} state */
function confirmedCounts(state) {
  const counts = new Map();
  for (const reservation of state.reservations) {
    if (reservation.status === 'CONFIRMED') {
      counts.set(reservation.sessionId, (counts.get(reservation.sessionId) || 0) + 1);
    }
  }
  return counts;
}

function sessionView(session, counts, now) {
  const confirmedCount = counts.get(session.id) || 0;
  const remainingCapacity = session.capacity - confirmedCount;
  return { ...session, confirmedCount, remainingCapacity, bookable: session.startsAt > now && remainingCapacity > 0 };
}

function requireSession(state, id) {
  const session = state.sessions.find(item => item.id === id);
  if (!session) throw fail(404, 'SESSION_NOT_FOUND', 'Sesión no encontrada.');
  return session;
}

/**
 * Las mutaciones completas se ejecutan dentro de repository.transaction.
 * users es el repositorio de usuarios existente; el controller solo usa req.user.id.
 */
function createReservationService(repository, users, clock = Date.now) {
  return {
    listSessions(filters = {}) {
      const state = repository.read();
      const now = clock();
      const counts = confirmedCounts(state);
      return state.sessions.filter(session => session.startsAt > now &&
        (!filters.branchId || session.branchId === filters.branchId) &&
        (!filters.activityId || session.activityId === filters.activityId))
        .map(session => sessionView(session, counts, now))
        .sort((a, b) => a.startsAt - b.startsAt || a.id.localeCompare(b.id));
    },
    getSession(id) {
      const state = repository.read();
      return sessionView(requireSession(state, id), confirmedCounts(state), clock());
    },
    listReservations(userId) {
      const state = repository.read();
      const counts = confirmedCounts(state);
      const sessions = new Map(state.sessions.map(session => [session.id, session]));
      const now = clock();
      return state.reservations.filter(item => item.userId === userId)
        .map(item => ({ ...item, session: sessionView(sessions.get(item.sessionId), counts, now) }))
        .sort((a, b) => a.session.startsAt - b.session.startsAt || a.createdAt - b.createdAt);
    },
    create(userId, sessionId) {
      return repository.transaction(state => {
        if (!users.findById(userId)) throw fail(401, 'UNAUTHORIZED', 'Usuario no autorizado.');
        const session = requireSession(state, sessionId);
        const now = clock();
        if (session.startsAt <= now) throw fail(409, 'SESSION_STARTED', 'La sesión ya comenzó.');
        const confirmed = state.reservations.filter(item => item.status === 'CONFIRMED');
        if (confirmed.some(item => item.userId === userId && item.sessionId === sessionId)) {
          throw fail(409, 'DUPLICATE_RESERVATION', 'Ya tenés una reserva confirmada para esta sesión.');
        }
        const counts = confirmedCounts(state);
        if ((counts.get(sessionId) || 0) >= session.capacity) {
          throw fail(409, 'SESSION_FULL', 'La sesión no tiene cupos disponibles.');
        }
        const sessions = new Map(state.sessions.map(item => [item.id, item]));
        for (const reservation of confirmed) {
          if (reservation.userId !== userId) continue;
          const other = sessions.get(reservation.sessionId);
          if (intervalsOverlap({ start: session.startsAt, end: session.endsAt },
            { start: other.startsAt, end: other.endsAt })) {
            throw fail(409, 'SCHEDULE_CONFLICT', 'La sesión se superpone con otra reserva confirmada.');
          }
        }
        const reservation = { id: randomUUID(), userId, sessionId, status: 'CONFIRMED',
          createdAt: now, cancelledAt: null };
        state.reservations.push(reservation);
        counts.set(sessionId, (counts.get(sessionId) || 0) + 1);
        return { ...reservation, session: sessionView(session, counts, now) };
      });
    },
    cancel(userId, reservationId) {
      return repository.transaction(state => {
        if (!users.findById(userId)) throw fail(401, 'UNAUTHORIZED', 'Usuario no autorizado.');
        const reservation = state.reservations.find(item => item.id === reservationId && item.userId === userId);
        if (!reservation) throw fail(404, 'RESERVATION_NOT_FOUND', 'Reserva no encontrada.');
        const session = requireSession(state, reservation.sessionId);
        const now = clock();
        if (reservation.status === 'CONFIRMED') {
          if (session.startsAt <= now) throw fail(409, 'SESSION_STARTED', 'No se puede cancelar una sesión que ya comenzó.');
          reservation.status = 'CANCELLED';
          reservation.cancelledAt = now;
        }
        return { ...reservation, session: sessionView(session, confirmedCounts(state), now) };
      });
    },
  };
}
module.exports = { createReservationService };
