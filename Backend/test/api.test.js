const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-bytes-long';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sportclub-'));
process.env.DATA_FILE = path.join(directory, 'users.json');
const app = require('../app');
const jwt = require('jsonwebtoken');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(directory, { recursive: true, force: true });
});
async function request(route, method = 'GET', body, token) {
  const response = await fetch(base + route, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
const login = () => request('/api/auth/login', 'POST', { email: 'DEMO@sportclub.com', password: 'SportClub123!' });
test('login, edición de perfil y persistencia sin exponer contraseña', async () => {
  const auth = await login();
  assert.equal(auth.status, 200);
  assert.equal(auth.body.user.passwordHash, undefined);
  const token = auth.body.token;
  assert.equal((await request('/api/users/me', 'GET', undefined, token)).body.data.id, 'user-demo');
  const update = await request('/api/users/me', 'PATCH', { firstName: 'María' }, token);
  assert.equal(update.status, 200);
  assert.equal(update.body.data.firstName, 'María');
  const { createUserRepository } = require('../src/repositories/users');
  assert.equal(createUserRepository(process.env.DATA_FILE).findById('user-demo').firstName, 'María');
  assert.equal((await request('/api/users/me', 'GET', undefined, token)).body.data.firstName, 'María');
  assert.ok(!fs.readFileSync(process.env.DATA_FILE, 'utf8').includes('SportClub123!'));
});
test('rechaza credenciales y cuerpos inválidos', async () => {
  for (const email of ['demo@sportclub.com', 'missing@example.com']) {
    assert.equal((await request('/api/auth/login', 'POST', { email, password: 'wrong' })).status, 401);
  }
  for (const body of [null, [], {}, { email: 'bad', password: 'x' }, { email: 'a@b.com', password: 42 }]) {
    assert.equal((await request('/api/auth/login', 'POST', body)).status, 400);
  }
});
test('rechaza acceso sin token y tokens inválidos o vencidos', async () => {
  const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: 'user-demo', expiresIn: -1,
    issuer: 'sportclub-api', audience: 'sportclub-mobile' });
  for (const token of [undefined, 'invalid', expired]) {
    assert.equal((await request('/api/users/me', 'GET', undefined, token)).status, 401);
  }
});
test('valida perfil e impide modificar campos privados', async () => {
  const { body: { token } } = await login();
  for (const body of [{}, { firstName: ' ' }, { phone: 'abc' }, { passwordHash: 'x' }, { id: 'other' }, { email: 'a@b.com' }]) {
    assert.equal((await request('/api/users/me', 'PATCH', body, token)).status, 400);
  }
});
test('sedes, detalle y errores JSON', async () => {
  const venues = await request('/api/venues');
  assert.equal(venues.status, 200);
  assert.equal(venues.body.data.length, 2);
  for (const venue of venues.body.data) {
    assert.equal(venue.classes.length, 2);
    assert.ok(venue.location && venue.address && venue.openingHours.length);
    for (const activity of venue.classes) assert.ok(activity.days.length && activity.times.length);
    assert.equal((await request(`/api/venues/${venue.id}`)).body.data.id, venue.id);
  }
  assert.equal((await request('/api/venues/missing')).status, 404);
  assert.equal((await request('/missing')).status, 404);
  assert.equal((await request('/health')).body.status, 'ok');
  const malformed = await fetch(base + '/api/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.ok((await malformed.json()).error.message);
});
test('Swagger UI y especificación OpenAPI disponibles', async () => {
  const spec = await request('/api-docs.json');
  assert.equal(spec.status, 200);
  assert.equal(spec.body.openapi, '3.0.3');
  assert.deepEqual(Object.keys(spec.body.paths).sort(), [
    '/health', '/api/auth/login', '/api/users/me', '/api/venues', '/api/venues/{id}',
  ].sort());
  assert.deepEqual(spec.body.paths['/api/users/me'].patch.security, [{ bearerAuth: [] }]);
  assert.equal(spec.body.paths['/api/auth/login'].post.security, undefined);
  const ui = await fetch(base + '/api-docs/');
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/);
  for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-init.js']) {
    const result = await fetch(`${base}/api-docs/${asset}`);
    assert.equal(result.status, 200);
  }
});
