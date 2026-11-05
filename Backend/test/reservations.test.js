const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sportclub-reservations-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'reservation-test-secret-at-least-32-bytes';
process.env.DATA_FILE = path.join(root, 'bootstrap/users.json');
process.env.RESERVATIONS_FILE = path.join(root, 'bootstrap/reservations.json');
const { createApp } = require('../app');
const { createReservationRepository } = require('../src/repositories/reservations');
const { createReservationService } = require('../src/services/reservations');
const { createSessionSeed } = require('../src/data/session-seed');
const { hashPassword } = require('../src/utils/password');
const NOW = Date.parse('2030-01-07T10:00:00Z');
const HOUR = 60 * 60 * 1000;
const users = ['u1', 'u2', 'u3'].map(id => ({ id, email: `${id}@example.com`,
  firstName: id, lastName: 'Demo', phone: '', passwordHash: hashPassword('Test123!') }));
const userRepository = {
  findById: id => users.find(user => user.id === id),
  findByEmail: email => users.find(user => user.email === email),
};
const session = (id, startsAt, endsAt, capacity = 1, branchId = 'palermo', activityId = 'palermo-1') => ({
  id, branchId, activityId, startsAt, endsAt, capacity,
});
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(root, 'case-'));
  const filename = path.join(directory, 'reservations.json');
  const initial = { sessions: [
    session('s1', NOW + HOUR, NOW + 2 * HOUR),
    session('adjacent', NOW + 2 * HOUR, NOW + 3 * HOUR, 2),
    session('overlap', NOW + 1.5 * HOUR, NOW + 2.5 * HOUR, 2, 'belgrano', 'belgrano-1'),
    session('started', NOW - HOUR, NOW + HOUR),
    session('starts-now', NOW, NOW + HOUR),
  ], reservations: [] };
  const repository = createReservationRepository(filename, () => structuredClone(initial));
  let now = NOW;
  const service = createReservationService(repository, userRepository, () => now);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { repository, service, filename, setNow(value) { now = value; } };
}
after(() => fs.rmSync(root, { recursive: true, force: true }));

async function api(t, sharedRepository) {
  const context = sharedRepository ? { repository: sharedRepository } : fixture(t);
  const app = createApp({ users: userRepository, reservations: context.repository, clock: () => NOW });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { ...context, async request(route, { method = 'GET', body, userId = 'u1' } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers.Authorization = `Bearer ${jwt.sign({}, process.env.JWT_SECRET, {
      subject: userId, issuer: 'sportclub-api', audience: 'sportclub-mobile', expiresIn: '1h',
    })}`;
    const response = await fetch(base + route, { method, headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  } };
}
const expectCode = (operation, code) => assert.throws(operation, error => error.code === code);

test('servicio: autenticación, sesión inexistente y sesión que comenzó', t => {
  const { service } = fixture(t);
  expectCode(() => service.create('missing', 's1'), 'UNAUTHORIZED');
  expectCode(() => service.create('u1', 'missing'), 'SESSION_NOT_FOUND');
  for (const id of ['started', 'starts-now']) expectCode(() => service.create('u1', id), 'SESSION_STARTED');
});
test('servicio: reserva duplicada, sin cupos y consultas de disponibilidad', t => {
  const { service } = fixture(t);
  const reservation = service.create('u1', 's1');
  assert.equal(reservation.status, 'CONFIRMED');
  assert.equal(reservation.session.remainingCapacity, 0);
  expectCode(() => service.create('u1', 's1'), 'DUPLICATE_RESERVATION');
  expectCode(() => service.create('u2', 's1'), 'SESSION_FULL');
  assert.equal(service.getSession('s1').confirmedCount, 1);
  assert.equal(service.getSession('s1').bookable, false);
});
test('servicio: conflictos entre sedes, consecutivas válidas y canceladas sin conflicto', t => {
  const { service } = fixture(t);
  const first = service.create('u1', 's1');
  expectCode(() => service.create('u1', 'overlap'), 'SCHEDULE_CONFLICT');
  assert.equal(service.create('u1', 'adjacent').status, 'CONFIRMED');
  service.cancel('u1', first.id);
  const adjacent = service.listReservations('u1').find(item => item.sessionId === 'adjacent');
  service.cancel('u1', adjacent.id);
  assert.equal(service.create('u1', 'overlap').status, 'CONFIRMED');
});
test('servicio: cancelar libera cupo, es idempotente y permite volver a reservar', t => {
  const { service } = fixture(t);
  const first = service.create('u1', 's1');
  const cancelled = service.cancel('u1', first.id);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.session.remainingCapacity, 1);
  assert.deepEqual(service.cancel('u1', first.id), cancelled);
  const second = service.create('u1', 's1');
  assert.notEqual(second.id, first.id);
  assert.deepEqual(service.listReservations('u1').map(item => item.status).sort(), ['CANCELLED', 'CONFIRMED']);
});
test('servicio: cancelar solo reservas propias y no después del comienzo', t => {
  const { service, setNow } = fixture(t);
  const reservation = service.create('u1', 's1');
  expectCode(() => service.cancel('u2', reservation.id), 'RESERVATION_NOT_FOUND');
  expectCode(() => service.cancel('u1', 'missing'), 'RESERVATION_NOT_FOUND');
  setNow(NOW + HOUR);
  expectCode(() => service.cancel('u1', reservation.id), 'SESSION_STARTED');
});
test('repositorio: persiste al reabrir y revierte cambios si falla la operación', t => {
  const { service, repository, filename } = fixture(t);
  const reservation = service.create('u1', 's1');
  const reopened = createReservationRepository(filename);
  assert.equal(reopened.read().reservations[0].id, reservation.id);
  const before = fs.readFileSync(filename, 'utf8');
  assert.throws(() => repository.transaction(state => { state.reservations.length = 0; throw new Error('rollback'); }), /rollback/);
  assert.equal(fs.readFileSync(filename, 'utf8'), before);
  assert.throws(() => repository.transaction(() => Promise.resolve()), /síncronas/);
  assert.throws(() => repository.transaction(() => reopened.transaction(() => {})), /reentrante/);
  assert.equal(fs.readFileSync(filename, 'utf8'), before);
});
test('repositorio: una escritura fallida no confirma ni ocupa un cupo', t => {
  const { service, filename } = fixture(t);
  const renameSync = fs.renameSync;
  try {
    fs.renameSync = () => { throw new Error('disco no disponible'); };
    assert.throws(() => service.create('u1', 's1'), /disco no disponible/);
  } finally {
    fs.renameSync = renameSync;
  }
  assert.equal(service.getSession('s1').remainingCapacity, 1);
  assert.deepEqual(fs.readdirSync(path.dirname(filename)), ['reservations.json']);
});
test('repositorio: rechaza capacidad, referencias e intervalos inválidos', t => {
  const directory = fs.mkdtempSync(path.join(root, 'invalid-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [index, item] of [
    session('bad', NOW, NOW + HOUR, 0), session('bad', NOW, NOW + HOUR, 1.5),
    session('bad', NOW, NOW), session('bad', NOW, NOW + HOUR, 2, 'missing'),
  ].entries()) {
    assert.throws(() => createReservationRepository(path.join(directory, `${index}.json`), () => ({ sessions: [item], reservations: [] })));
  }
});
test('seed: reutiliza sedes, usa timestamps normalizados y no cambia al reiniciar', t => {
  const state = createSessionSeed(NOW);
  assert.equal(state.reservations.length, 0);
  assert.ok(state.sessions.length > 0);
  assert.equal(new Set(state.sessions.map(item => item.id)).size, state.sessions.length);
  for (const item of state.sessions) {
    assert.ok(item.startsAt > NOW);
    assert.equal(item.endsAt - item.startsAt, HOUR);
    assert.equal(item.capacity, 20);
  }
  const { filename } = fixture(t);
  assert.doesNotThrow(() => createReservationRepository(filename, () => { throw new Error('No debe regenerarse'); }));
});
test('HTTP: consulta sesiones y cupos; filtros y autenticación', async t => {
  const { request } = await api(t);
  assert.equal((await request('/api/sessions', { userId: null })).status, 401);
  assert.equal((await request('/api/reservations/me', { userId: 'missing' })).status, 401);
  const sessions = await request('/api/sessions?branchId=palermo');
  assert.equal(sessions.status, 200);
  assert.ok(sessions.body.data.every(item => item.branchId === 'palermo' && item.startsAt > NOW));
  assert.equal((await request('/api/sessions?activityId=belgrano-1')).body.data.length, 1);
  assert.equal((await request('/api/sessions?branchId=missing')).body.data.length, 0);
  assert.equal((await request('/api/sessions?userId=u2')).status, 400);
  assert.equal((await request('/api/sessions?branchId=palermo&branchId=belgrano')).status, 400);
  assert.equal((await request('/api/sessions/s1')).body.data.remainingCapacity, 1);
  assert.equal((await request('/api/sessions/missing')).status, 404);
});
test('HTTP: valida DTO y toma la identidad únicamente del JWT', async t => {
  const { request } = await api(t);
  for (const body of [{}, null, [], { sessionId: 42 }, { sessionId: 's1', userId: 'u2' }, { sessionId: 's1', status: 'CANCELLED' }]) {
    assert.equal((await request('/api/reservations', { method: 'POST', body })).status, 400);
  }
  assert.equal((await request('/api/reservations', { method: 'POST', body: { sessionId: 's1' }, userId: null })).status, 401);
  const result = await request('/api/reservations', { method: 'POST', body: { sessionId: 's1' } });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.userId, 'u1');
  assert.equal((await request('/api/reservations/me', { userId: 'u2' })).body.data.length, 0);
  assert.equal((await request('/api/reservations/me')).body.data.length, 1);
});
test('HTTP: duplicados, sesión llena, conflictos y sesiones comenzadas usan 409', async t => {
  const { request } = await api(t);
  await request('/api/reservations', { method: 'POST', body: { sessionId: 's1' } });
  for (const [sessionId, userId, code] of [
    ['s1', 'u1', 'DUPLICATE_RESERVATION'], ['s1', 'u2', 'SESSION_FULL'],
    ['overlap', 'u1', 'SCHEDULE_CONFLICT'], ['started', 'u2', 'SESSION_STARTED'],
  ]) {
    const result = await request('/api/reservations', { method: 'POST', body: { sessionId }, userId });
    assert.equal(result.status, 409);
    assert.equal(result.body.error.code, code);
  }
  assert.equal((await request('/api/reservations', { method: 'POST', body: { sessionId: 'missing' } })).status, 404);
});
test('HTTP: cancelación propia, liberación de cupos y privacidad', async t => {
  const { request } = await api(t);
  const first = await request('/api/reservations', { method: 'POST', body: { sessionId: 's1' } });
  const route = `/api/reservations/${first.body.data.id}/cancel`;
  assert.equal((await request(route, { method: 'PATCH', userId: 'u2' })).status, 404);
  assert.equal((await request(route, { method: 'PATCH', body: { userId: 'u2' } })).status, 400);
  const cancelled = await request(route, { method: 'PATCH' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.status, 'CANCELLED');
  assert.equal((await request(route, { method: 'PATCH' })).status, 200);
  assert.equal((await request('/api/sessions/s1')).body.data.remainingCapacity, 1);
  assert.equal((await request('/api/reservations', { method: 'POST', body: { sessionId: 's1' }, userId: 'u2' })).status, 201);
});
test('HTTP: dos solicitudes simultáneas al último cupo, incluso con dos repositorios del mismo archivo', async t => {
  const { request, repository, filename } = await api(t);
  const { request: requestOther } = await api(t, createReservationRepository(filename));
  const results = await Promise.all([
    request('/api/reservations', { method: 'POST', body: { sessionId: 's1' }, userId: 'u1' }),
    requestOther('/api/reservations', { method: 'POST', body: { sessionId: 's1' }, userId: 'u2' }),
  ]);
  assert.deepEqual(results.map(item => item.status).sort(), [201, 409]);
  assert.equal(results.find(item => item.status === 409).body.error.code, 'SESSION_FULL');
  assert.equal(repository.read().reservations.filter(item => item.status === 'CONFIRMED').length, 1);
  const another = createReservationService(createReservationRepository(filename), userRepository, () => NOW);
  assert.equal(another.getSession('s1').remainingCapacity, 0);
  expectCode(() => another.create('u3', 's1'), 'SESSION_FULL');
});
test('HTTP: solicitudes simultáneas del mismo usuario no superponen horarios', async t => {
  const { request } = await api(t);
  const results = await Promise.all(['s1', 'overlap'].map(sessionId => request('/api/reservations', {
    method: 'POST', body: { sessionId },
  })));
  assert.deepEqual(results.map(item => item.status).sort(), [201, 409]);
  assert.equal(results.find(item => item.status === 409).body.error.code, 'SCHEDULE_CONFLICT');
});

test('HTTP: dos solicitudes del mismo usuario a la misma sesión no duplican', async t => {
  const { request, repository } = await api(t);
  const results = await Promise.all([1, 2].map(() => request('/api/reservations', {
    method: 'POST', body: { sessionId: 'adjacent' },
  })));
  assert.deepEqual(results.map(item => item.status).sort(), [201, 409]);
  assert.equal(results.find(item => item.status === 409).body.error.code, 'DUPLICATE_RESERVATION');
  assert.equal(repository.read().reservations.length, 1);
});
test('repositorio: archivo corrupto falla sin sobrescribirlo', t => {
  const { filename, repository } = fixture(t);
  fs.writeFileSync(filename, '{invalid-json');
  assert.throws(() => createReservationRepository(filename));
  assert.throws(() => repository.transaction(() => {}));
  assert.equal(fs.readFileSync(filename, 'utf8'), '{invalid-json');
});
