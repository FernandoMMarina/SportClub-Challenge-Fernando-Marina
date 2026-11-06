import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { AxiosError } from 'axios';
import { createApiClient } from '../src/services/api-client.ts';
import { createApiAuthService, mapApiAuthError } from '../src/services/api-auth-service.ts';
import { AuthError, describeLoginError } from '../src/services/auth-service.ts';
import { authenticateSession } from '../src/services/session-service.ts';
import { createAuthStore } from '../src/stores/auth-store.ts';

const user = { id: 'u1', firstName: 'Usuario API', lastName: 'Prueba', email: 'demo@sportclub.com', phone: '' };
const session = { user, token: 'server-test-token', expiresAt: Date.now() + 3600000, source: 'api' };
async function serve(t, handler, timeout = 1000) {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
    res.setHeader('Content-Type', 'application/json');
    handler(req, res, body);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const baseURL = `http://127.0.0.1:${server.address().port}/api`;
  return { ...createApiAuthService(createApiClient(baseURL, timeout)), baseURL };
}

test('Axios: login real por HTTP y consulta de perfil con Bearer JWT', async t => {
  const seen = [];
  const service = await serve(t, (req, res, body) => {
    seen.push(req.url);
    if (req.url === '/api/auth/login') {
      assert.deepEqual(body, { email: 'demo@sportclub.com', password: 'SportClub123!' });
      assert.equal(req.headers.authorization, undefined);
      res.end(JSON.stringify({ token: 'server-test-token', tokenType: 'Bearer', expiresIn: 3600 }));
    } else {
      assert.equal(req.url, '/api/users/me');
      assert.equal(req.headers.authorization, 'Bearer server-test-token');
      res.end(JSON.stringify({ data: user }));
    }
  });
  const result = await service.signIn('  DEMO@sportclub.com  ', 'SportClub123!');
  assert.equal(result.token, 'server-test-token');
  assert.equal(result.source, 'api');
  assert.deepEqual(result.user, user);
  assert.ok(result.expiresAt > Date.now());
  assert.deepEqual(seen, ['/api/auth/login', '/api/users/me']);
});
test('validaciones locales no envían solicitudes HTTP', async t => {
  let requests = 0;
  const service = await serve(t, (_req, res) => { requests += 1; res.end('{}'); });
  await assert.rejects(() => service.signIn('invalid', ''), error => error.code === 'VALIDATION_ERROR');
  assert.equal(requests, 0);
});
test('errores HTTP se clasifican sin exponer mensajes técnicos', async t => {
  for (const [status, code] of [[401, 'INVALID_CREDENTIALS'], [429, 'RATE_LIMITED'], [503, 'SERVER_ERROR']]) {
    const service = await serve(t, (_req, res) => { res.statusCode = status; res.end('{"error":{"message":"technical-secret"}}'); });
    await assert.rejects(() => service.signIn('demo@sportclub.com', 'wrong'), error => {
      assert.equal(error.code, code);
      assert.doesNotMatch(JSON.stringify(describeLoginError(error)), /technical-secret/);
      return true;
    });
  }
});
test('el token debe permitir acceder al perfil antes de confirmar el ingreso', async t => {
  const service = await serve(t, (req, res) => {
    if (req.url === '/api/auth/login') res.end('{"token":"invalid","tokenType":"Bearer","expiresIn":3600}');
    else { res.statusCode = 401; res.end('{}'); }
  });
  await assert.rejects(() => service.signIn('demo@sportclub.com', 'SportClub123!'), error => error.code === 'SESSION_EXPIRED');
});
test('respuestas incompletas del servidor no crean una sesión', async t => {
  for (const payload of [{}, { token: '', tokenType: 'Bearer', expiresIn: 3600 }, { token: 'x', tokenType: 'Bearer', expiresIn: -1 }]) {
    const service = await serve(t, (_req, res) => res.end(JSON.stringify(payload)));
    await assert.rejects(() => service.signIn('demo@sportclub.com', 'SportClub123!'), error => error.code === 'INVALID_RESPONSE');
  }
  const service = await serve(t, (req, res) => res.end(req.url === '/api/auth/login'
    ? '{"token":"x","tokenType":"Bearer","expiresIn":3600}' : '{"data":{"id":"incomplete"}}'));
  await assert.rejects(() => service.signIn('demo@sportclub.com', 'SportClub123!'), error => error.code === 'INVALID_RESPONSE');
});
test('timeout y red: errores claros, sin usar automáticamente la cuenta local', async t => {
  const service = await serve(t, (_req, res) => {
    const timer = setTimeout(() => res.end('{}'), 300);
    res.on('close', () => clearTimeout(timer));
  }, 20);
  await assert.rejects(() => service.signIn('demo@sportclub.com', 'SportClub123!'), error => error.code === 'TIMEOUT');
  assert.equal(mapApiAuthError(new AxiosError('Network Error', 'ERR_NETWORK'), 'login').code, 'NETWORK_ERROR');
});
test('URL inválida falla como configuración, antes de hacer una solicitud', () => {
  for (const url of ['invalid', 'file:///tmp/a', 'http://user:password@example.com']) {
    assert.throws(() => createApiClient(url), error => error.code === 'CONFIGURATION_ERROR');
  }
});
test('Zustand almacena la sesión solo tras el éxito y limpia el JWT al salir', async () => {
  let finish;
  const store = createAuthStore(() => new Promise(resolve => { finish = resolve; }));
  const attempt = store.getState().signIn('demo@sportclub.com', 'SportClub123!');
  assert.equal(store.getState().user, null);
  finish(session);
  await attempt;
  assert.deepEqual(store.getState().user, user);
  assert.equal(store.getState().token, session.token);
  store.getState().signOut();
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().token, null);
  assert.equal(store.getState().expiresAt, null);
});
test('Zustand no restaura una sesión cerrada cuando llega una respuesta tardía', async () => {
  let finish;
  const store = createAuthStore(() => new Promise(resolve => { finish = resolve; }));
  const attempt = store.getState().signIn('demo@sportclub.com', 'SportClub123!');
  store.getState().signOut();
  finish(session);
  await assert.rejects(() => attempt, error => error.code === 'CANCELLED');
  assert.equal(store.getState().token, null);
});
test('Zustand no guarda usuario ni token si el acceso falla', async () => {
  const store = createAuthStore(async () => { throw new AuthError('NETWORK_ERROR', 'Offline'); });
  await assert.rejects(() => store.getState().signIn('demo@sportclub.com', 'SportClub123!'));
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().token, null);
});

function setApiUrl(t, value) {
  const previous = process.env.EXPO_PUBLIC_API_URL;
  t.after(() => { if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
  process.env.EXPO_PUBLIC_API_URL = value;
}

test('la combinación demo entra sin API ni configuración adicional', async t => {
  setApiUrl(t, 'invalid-api-url');
  const result = await authenticateSession('  DEMO@sportclub.com  ', 'SportClub123!');
  assert.equal(result.source, 'local');
  assert.equal(result.token, null);
  assert.equal(result.expiresAt, null);
  await assert.rejects(() => authenticateSession('demo@sportclub.com', ''), error => error.code === 'VALIDATION_ERROR');
  await assert.rejects(() => authenticateSession('demo@sportclub.com', 'wrong'), error => error.code === 'CONFIGURATION_ERROR');
  await assert.rejects(() => authenticateSession('other@example.com', 'SportClub123!'), error => error.code === 'CONFIGURATION_ERROR');
});
test('otras credenciales se envían al servidor y no generan una sesión local', async t => {
  let attempts = 0;
  const service = await serve(t, (req, res, body) => {
    if (req.url === '/api/auth/login') {
      attempts += 1;
      assert.deepEqual(body, { email: 'real@example.com', password: 'Real123!' });
      res.end('{"token":"server-token","tokenType":"Bearer","expiresIn":3600}');
    } else res.end(JSON.stringify({ data: { ...user, email: 'real@example.com' } }));
  });
  setApiUrl(t, service.baseURL);
  const result = await authenticateSession('REAL@example.com', 'Real123!');
  assert.equal(attempts, 1);
  assert.equal(result.source, 'api');
  assert.equal(result.user.email, 'real@example.com');
  assert.equal(result.token, 'server-token');
});
test('contraseña demo incorrecta requiere backend y no concede acceso autónomo', async t => {
  const service = await serve(t, (_req, res) => { res.statusCode = 401; res.end('{}'); });
  setApiUrl(t, service.baseURL);
  await assert.rejects(() => authenticateSession('demo@sportclub.com', 'SportClub123! '),
    error => error.code === 'INVALID_CREDENTIALS');
});
test('Zustand conserva el origen local de la cuenta demo y lo limpia al salir', async () => {
  const store = createAuthStore();
  await store.getState().signIn('demo@sportclub.com', 'SportClub123!');
  assert.equal(store.getState().source, 'local');
  assert.equal(store.getState().token, null);
  store.getState().signOut();
  assert.equal(store.getState().source, null);
});
