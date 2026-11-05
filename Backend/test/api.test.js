const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-bytes-long';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sportclub-'));
process.env.DATA_FILE = path.join(directory, 'users.json');
process.env.RESERVATIONS_FILE = path.join(directory, 'reservations.json');
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
  for (const body of [{}, { firstName: ' ' }, { phone: 'abc' }, { passwordHash: 'x' }, { id: 'other' }, { email: 'invalid' }, { email: '' }, { lastName: ' ' }, { firstName: 42 }, { roles: ['admin'] }, { phone: '+541112345678' }]) {
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
test('registro: crea la cuenta, devuelve sesión y normaliza los datos', async () => {
  const alta = await request('/api/auth/register', 'POST', {
    firstName: '  Fernando ', lastName: 'Marina', email: 'NUEVO@SportClub.com',
    password: 'UnaClaveSegura1', phone: '+54 11 5555 5555',
  });
  assert.equal(alta.status, 201);
  assert.equal(alta.body.tokenType, 'Bearer');
  assert.equal(alta.body.user.email, 'nuevo@sportclub.com');
  assert.equal(alta.body.user.firstName, 'Fernando');
  assert.equal(alta.body.user.passwordHash, undefined);
  assert.notEqual(alta.body.user.id, 'user-demo');
  // El token recién emitido ya sirve para los endpoints protegidos.
  const perfil = await request('/api/users/me', 'GET', undefined, alta.body.token);
  assert.equal(perfil.status, 200);
  assert.equal(perfil.body.data.id, alta.body.user.id);
  // Y la cuenta queda utilizable desde login, con la contraseña nunca guardada en claro.
  const sesion = await request('/api/auth/login', 'POST',
    { email: 'nuevo@sportclub.com', password: 'UnaClaveSegura1' });
  assert.equal(sesion.status, 200);
  assert.equal(sesion.body.user.id, alta.body.user.id);
  assert.ok(!fs.readFileSync(process.env.DATA_FILE, 'utf8').includes('UnaClaveSegura1'));
  // Mismo criterio que login: el email no admite espacios alrededor.
  assert.equal((await request('/api/auth/register', 'POST',
    { firstName: 'Con', lastName: 'Espacios', email: ' otro@sportclub.com ', password: 'ClaveLarga1' })).status, 400);
});
test('registro: rechaza email repetido sin pisar la cuenta existente', async () => {
  const repetido = await request('/api/auth/register', 'POST', {
    firstName: 'Otro', lastName: 'Usuario', email: 'DEMO@sportclub.com', password: 'OtraClave123',
  });
  assert.equal(repetido.status, 409);
  assert.equal(repetido.body.error.code, 'EMAIL_TAKEN');
  const demo = await login();
  assert.equal(demo.status, 200);
  assert.equal(demo.body.user.id, 'user-demo');
});
test('registro: valida el cuerpo y no acepta campos privados', async () => {
  const valido = { firstName: 'Ana', lastName: 'Pérez', email: 'ana@sportclub.com', password: 'ClaveLarga1' };
  const invalidos = [
    null,
    {},
    { ...valido, password: 'corta' },
    { ...valido, email: 'sin-arroba' },
    { ...valido, firstName: '   ' },
    { ...valido, phone: 'abc' },
    { ...valido, id: 'elegido-por-el-cliente' },
    { ...valido, passwordHash: 'x' },
  ];
  for (const body of invalidos) {
    const resultado = await request('/api/auth/register', 'POST', body);
    assert.equal(resultado.status, 400, `esperaba 400 para ${JSON.stringify(body)}`);
  }
  assert.equal((await request('/api/auth/login', 'POST',
    { email: 'ana@sportclub.com', password: 'ClaveLarga1' })).status, 401);
});
test('Swagger UI y especificación OpenAPI disponibles', async () => {
  const spec = await request('/api-docs.json');
  assert.equal(spec.status, 200);
  assert.equal(spec.body.openapi, '3.0.3');
  assert.deepEqual(Object.keys(spec.body.paths).sort(), [
    '/health', '/api/auth/login', '/api/auth/register', '/api/users/me', '/api/venues', '/api/venues/{id}',
    '/api/sessions', '/api/sessions/{id}', '/api/reservations', '/api/reservations/me', '/api/reservations/{id}/cancel',
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


test('PATCH exige JWT y rechaza cuerpos inválidos sin modificar el perfil', async () => {
  const { body: { token } } = await login();
  const before = (await request('/api/users/me', 'GET', undefined, token)).body.data;
  for (const jwt of [undefined, 'invalid']) assert.equal((await request('/api/users/me', 'PATCH', { firstName: 'Otro' }, jwt)).status, 401);
  for (const body of [null, [], {}, { email: null }, { lastName: 'x'.repeat(81) }, { email: 'x'.repeat(255) + '@a.com' }, { firstName: 'Otro', role: 'admin' }]) {
    assert.equal((await request('/api/users/me', 'PATCH', body, token)).status, 400);
  }
  assert.deepEqual((await request('/api/users/me', 'GET', undefined, token)).body.data, before);
});

test('PATCH persiste nombre, apellido y correo normalizados; mantiene JWT y cambia el acceso por email', async () => {
  const { body: { token } } = await login();
  const result = await request('/api/users/me', 'PATCH', { firstName: '  Ana  ', lastName: '  Pérez  ', email: ' ANA@EXAMPLE.COM ' }, token);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data, { id: 'user-demo', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', phone: '' });
  const { createUserRepository } = require('../src/repositories/users');
  const persisted = createUserRepository(process.env.DATA_FILE).findById('user-demo');
  assert.equal(persisted.email, 'ana@example.com');
  assert.ok(persisted.passwordHash);
  assert.equal((await request('/api/users/me', 'GET', undefined, token)).body.data.email, 'ana@example.com');
  assert.equal((await login()).status, 401);
  assert.equal((await request('/api/auth/login', 'POST', { email: 'ana@example.com', password: 'SportClub123!' })).status, 200);
  await request('/api/users/me', 'PATCH', { email: 'demo@sportclub.com' }, token);
});

test('PATCH impide correos duplicados sin escritura parcial ni exposición de campos sensibles', async () => {
  const data = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8'));
  data.push({ ...data[0], id: 'second-user', email: 'OTHER@example.com', role: 'admin' });
  fs.writeFileSync(process.env.DATA_FILE, JSON.stringify(data));
  const { body: { token } } = await login();
  const before = fs.readFileSync(process.env.DATA_FILE, 'utf8');
  const conflict = await request('/api/users/me', 'PATCH', { firstName: 'No guardar', email: ' OTHER@example.com ' }, token);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'EMAIL_IN_USE');
  assert.equal(fs.readFileSync(process.env.DATA_FILE, 'utf8'), before);
  const { publicUser } = require('../src/repositories/users');
  assert.equal(publicUser(data[1]).role, undefined);
  assert.equal(publicUser(data[1]).passwordHash, undefined);
  assert.equal((await request('/api/users/me', 'PATCH', { email: ' DEMO@sportclub.com ' }, token)).status, 200);
});
