import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReservationsStore } from '../src/stores/create-reservations-store.ts';
import { createLocalSessions, intervalsOverlap } from '../src/features/reservations/utils/local-sessions.ts';
import venues from '../src/data/venues.json' with { type: 'json' };
const now = 1000;
const s1 = { id: 's1', branchId: 'palermo', activityId: 'palermo-1', startsAt: 2000, endsAt: 3000, capacity: 20 };
const overlap = { ...s1, id: 's2', branchId: 'belgrano', startsAt: 2500, endsAt: 3500 };
const adjacent = { ...s1, id: 's3', startsAt: 3000, endsAt: 4000 };
const reservation = { id: 'r1', userId: 'u1', sessionId: 's1', status: 'CONFIRMED', createdAt: now, cancelledAt: null, session: s1 };
function setup(source = 'local', api = {}) {
  let context = { userId: 'u1', token: source === 'api' ? 'jwt' : null, source, expiresAt: 999999 };
  const defaults = { listMine: async () => [], listSessions: async () => [s1, overlap, adjacent],
    book: async () => reservation, cancel: async () => ({ ...reservation, status: 'CANCELLED', cancelledAt: now }) };
  const store = createReservationsStore({ context: () => context, api: () => ({ ...defaults, ...api }),
    sessions: () => [s1, overlap, adjacent], seed: () => [], clock: () => now });
  return { store, changeContext: next => { context = next; store.getState().reset(); } };
}

test('Zustand local: crear, observar entre pantallas, duplicado, solapamiento y consecutivas', async () => {
  const { store } = setup();
  await store.getState().load();
  let changes = 0;
  const unsubscribe = store.subscribe(() => changes++);
  assert.equal(await store.getState().book('s1'), true);
  assert.equal(store.getState().items.length, 1);
  assert.ok(changes > 0);
  assert.equal(await store.getState().book('s1'), false);
  assert.match(store.getState().error, /Ya tenés/);
  assert.equal(await store.getState().book('s2'), false);
  assert.match(store.getState().error, /superpone/);
  assert.equal(await store.getState().book('s3'), true);
  assert.equal(store.getState().items.length, 2);
  unsubscribe();
});

test('Zustand local: cancelar no se revierte al recargar; libera horario y permite volver a reservar', async () => {
  const { store } = setup();
  await store.getState().load();
  await store.getState().book('s1');
  const id = store.getState().items[0].id;
  assert.equal(await store.getState().cancel(id), true);
  await store.getState().load();
  assert.equal(store.getState().items[0].status, 'CANCELLED');
  assert.equal(await store.getState().book('s2'), true);
  assert.equal(store.getState().items.length, 2);
  assert.equal(await store.getState().cancel(id), true);
  assert.equal(await store.getState().cancel('other'), false);
});

test('Zustand: cerrar sesión limpia todos los datos y otra cuenta no hereda reservas', async () => {
  const { store, changeContext } = setup();
  await store.getState().load();
  await store.getState().book('s1');
  changeContext(null);
  assert.equal(store.getState().items, null);
  assert.equal(store.getState().sessions.length, 0);
  changeContext({ userId: 'u2', source: 'local', token: null, expiresAt: null });
  await store.getState().load();
  assert.deepEqual(store.getState().items, []);
});

test('Zustand API: confirma estado solo después del servidor y evita doble envío', async () => {
  let finish, requests = 0;
  const { store } = setup('api', { book: () => { requests++; return new Promise(resolve => { finish = resolve; }); } });
  await store.getState().load();
  const pending = store.getState().book('s1');
  assert.deepEqual(store.getState().items, []);
  assert.equal(await store.getState().book('s1'), false);
  assert.equal(requests, 1);
  finish(reservation);
  assert.equal(await pending, true);
  assert.deepEqual(store.getState().items, [reservation]);
});

test('Zustand API: fallos conservan datos y liberan el bloqueo para reintentar', async () => {
  let fail = true;
  const { store } = setup('api', { listMine: async () => [reservation], cancel: async () => {
    if (fail) throw new Error('technical-secret');
    return { ...reservation, status: 'CANCELLED', cancelledAt: now };
  } });
  await store.getState().load();
  assert.equal(await store.getState().cancel('r1'), false);
  assert.deepEqual(store.getState().items, [reservation]);
  assert.doesNotMatch(store.getState().error, /technical-secret/);
  assert.equal(store.getState().pending, null);
  fail = false;
  assert.equal(await store.getState().cancel('r1'), true);
  assert.equal(store.getState().items[0].status, 'CANCELLED');
});

test('Zustand API: no restaura datos tras logout mientras carga o guarda', async () => {
  for (const operation of ['load', 'book']) {
    let finish;
    const { store, changeContext } = setup('api', operation === 'load'
      ? { listMine: () => new Promise(resolve => { finish = resolve; }) }
      : { book: () => new Promise(resolve => { finish = resolve; }) });
    if (operation === 'book') await store.getState().load();
    const pending = operation === 'load' ? store.getState().load() : store.getState().book('s1');
    changeContext(null);
    finish(operation === 'load' ? [reservation] : reservation);
    await pending;
    assert.equal(store.getState().items, null);
    assert.equal(store.getState().pending, null);
  }
});

test('Zustand API: no mezcla reservas de otro usuario ni borra lo visible ante un fallo de refresh', async () => {
  let fail = false;
  const { store } = setup('api', { listMine: async () => { if (fail) throw new Error('offline'); return [reservation]; } });
  await store.getState().load(); fail = true;
  await store.getState().load();
  assert.deepEqual(store.getState().items, [reservation]);
  assert.ok(store.getState().error);
  const invalid = setup('api', { listMine: async () => [{ ...reservation, userId: 'u2' }] }).store;
  await invalid.getState().load();
  assert.equal(invalid.getState().items, null);
  assert.ok(invalid.getState().error);
});

test('calendario local y comparación de intervalos usan horarios válidos de Buenos Aires', () => {
  const fixed = Date.parse('2026-11-05T21:00:00Z');
  const sessions = createLocalSessions(venues, fixed);
  assert.ok(sessions.length > 0);
  assert.equal(new Set(sessions.map(s => s.id)).size, sessions.length);
  for (const s of sessions) { assert.ok(s.startsAt > fixed); assert.equal(s.endsAt - s.startsAt, 3600000); }
  assert.equal(intervalsOverlap(s1, overlap), true);
  assert.equal(intervalsOverlap(s1, adjacent), false);
});
