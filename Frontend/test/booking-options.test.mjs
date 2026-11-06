import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookingStatus, sessionDateKey } from '../src/features/reservations/utils/booking-options.ts';
const session = { id: 's1', branchId: 'palermo', activityId: 'yoga', startsAt: 2000, endsAt: 3000, capacity: 20 };
const reservation = { id: 'r1', userId: 'u1', sessionId: 's1', status: 'CONFIRMED', createdAt: 500, cancelledAt: null, session };
test('horarios: estados disponible, reservado, superpuesto, consecutivo y cancelado', () => {
  assert.equal(bookingStatus(session, [], 1000), 'Disponible');
  assert.equal(bookingStatus(session, [reservation], 1000), 'Reservada');
  assert.equal(bookingStatus({ ...session, id: 's2', startsAt: 2500, endsAt: 3500 }, [reservation], 1000), 'Se superpone');
  assert.equal(bookingStatus({ ...session, id: 's2', startsAt: 3000, endsAt: 4000 }, [reservation], 1000), 'Disponible');
  assert.equal(bookingStatus(session, [{ ...reservation, status: 'CANCELLED' }], 1000), 'Disponible');
  assert.equal(bookingStatus(session, [], 2000), 'Finalizada');
  assert.equal(bookingStatus({ ...session, remainingCapacity: 0 }, [], 1000), 'Sin cupo');
});
test('fechas: agrupa según Buenos Aires, incluso cuando UTC ya cambió de día', () => {
  assert.equal(sessionDateKey(Date.parse('2026-11-06T01:00:00Z')), '2026-11-05');
  assert.equal(sessionDateKey(Date.parse('2026-11-06T03:00:00Z')), '2026-11-06');
});
