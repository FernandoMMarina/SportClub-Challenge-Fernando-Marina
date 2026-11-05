import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoReservations } from '../src/features/reservations/utils/demo-reservations.ts';
import venues from '../src/data/venues.json' with { type: 'json' };

for (const now of [Date.parse('2026-11-05T21:00:00Z'), Date.parse('2027-01-01T02:30:00Z')]) {
  test(`demo: ejemplos con fechas relativas y catálogo existente (${now})`, () => {
    const items = createDemoReservations(venues, 'user-demo', now);
    assert.equal(items.length, 4);
    assert.equal(new Set(items.map(item => item.id)).size, 4);
    const upcoming = items.filter(item => item.status === 'CONFIRMED' && item.session.startsAt > now);
    assert.equal(upcoming.length, 2);
    assert.ok(upcoming[0].session.endsAt <= upcoming[1].session.startsAt);
    assert.equal(items.filter(item => item.status === 'CANCELLED').length, 1);
    assert.equal(items.filter(item => item.session.endsAt < now).length, 1);
    for (const item of items) {
      assert.equal(item.userId, 'user-demo');
      assert.equal(item.sessionId, item.session.id);
      assert.equal(item.session.endsAt - item.session.startsAt, 3600000);
      const venue = venues.find(venue => venue.id === item.session.branchId);
      assert.ok(venue.classes.some(activity => activity.id === item.session.activityId));
    }
    assert.deepEqual(createDemoReservations(venues, 'user-demo', now), items);
    items[0].status = 'CANCELLED';
    assert.equal(createDemoReservations(venues, 'user-demo', now)[0].status, 'CONFIRMED');
  });
}
