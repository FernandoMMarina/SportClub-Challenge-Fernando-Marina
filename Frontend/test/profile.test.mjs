import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { AxiosError } from 'axios';
import { createProfileService, normalizeProfile, validateProfile, hasProfileChanges } from '../src/services/profile-service.ts';
import { createApiClient } from '../src/services/api-client.ts';
import { createAuthStore } from '../src/stores/auth-store.ts';
const user = { id: 'u1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', phone: '' };
const updated = { ...user, firstName: 'Andrea', email: 'andrea@example.com' };
const session = { user, token: 'jwt-original', expiresAt: Date.now() + 3600000, source: 'api' };

test('perfil: obligatorios, correo, longitudes y normalización', () => {
  assert.deepEqual(Object.keys(validateProfile({ firstName: ' ', lastName: '', email: '' })).sort(), ['email', 'firstName', 'lastName']);
  for (const email of ['invalid', 'a@@b.com', 'a b@example.com', 'x'.repeat(255) + '@a.com']) assert.ok(validateProfile({ ...user, email }).email);
  assert.ok(validateProfile({ ...user, firstName: 'x'.repeat(81) }).firstName);
  assert.ok(validateProfile({ ...user, lastName: 'x'.repeat(81) }).lastName);
  assert.deepEqual(validateProfile(user), {});
  assert.deepEqual(normalizeProfile({ firstName: ' Ana ', lastName: ' Pérez ', email: ' ANA@EXAMPLE.COM ' }), { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' });
  assert.equal(hasProfileChanges({ ...user, email: ' ANA@EXAMPLE.COM ' }, user), false);
  assert.equal(hasProfileChanges(updated, user), true);
});

test('servicio: PATCH real con JWT, campos permitidos y respuesta validada', async t => {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    assert.equal(req.method, 'PATCH');
    assert.equal(req.url, '/api/users/me');
    assert.equal(req.headers.authorization, 'Bearer jwt-original');
    assert.deepEqual(JSON.parse(Buffer.concat(chunks)), { firstName: 'Andrea', lastName: 'Pérez', email: 'andrea@example.com' });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: updated }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const save = createProfileService(createApiClient(`http://127.0.0.1:${server.address().port}/api`));
  assert.deepEqual(await save(session.token, { ...updated, firstName: ' Andrea ', email: ' ANDREA@EXAMPLE.COM ' }), updated);
});

test('servicio: validación sin HTTP y errores claros sin detalles internos', async () => {
  let calls = 0;
  const save = createProfileService({ patch: async () => { calls++; } });
  await assert.rejects(() => save(session.token, { ...user, firstName: '' }), e => !!e.fields.firstName);
  assert.equal(calls, 0);
  for (const [status, pattern] of [[400, /rechazó/], [401, /sesión venció/], [409, /otro usuario/], [429, /Demasiados/], [500, /servidor/]]) {
    const failing = createProfileService({ patch: async () => { throw new AxiosError('technical-secret', undefined, undefined, undefined, { status }); } });
    await assert.rejects(() => failing(session.token, updated), e => pattern.test(e.message) && !e.message.includes('technical-secret'));
  }
  for (const payload of [{}, { data: { id: 'incomplete' } }]) {
    const invalid = createProfileService({ patch: async () => ({ data: payload }) });
    await assert.rejects(() => invalid(session.token, updated), /perfil inválido/);
  }
  const offline = createProfileService({ patch: async () => { throw new AxiosError('secret', 'ERR_NETWORK'); } });
  await assert.rejects(() => offline(session.token, updated), /conectar/);
});

test('Zustand: actualiza solo el usuario confirmado y conserva JWT y vencimiento', async () => {
  const store = createAuthStore(async () => session, async (token, input) => { assert.equal(token, session.token); assert.equal(input.firstName, 'Andrea'); return updated; });
  await store.getState().signIn('', '');
  assert.equal(await store.getState().updateUser(updated), true);
  assert.deepEqual(store.getState().user, updated);
  assert.equal(store.getState().token, session.token);
  assert.equal(store.getState().expiresAt, session.expiresAt);
  assert.equal(store.getState().source, 'api');
  store.getState().signOut();
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().token, null);
});

test('Zustand: no solicita si no hay cambios o si otro guardado está pendiente', async () => {
  let finish, calls = 0;
  const store = createAuthStore(async () => session, () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  await store.getState().signIn('', '');
  assert.equal(await store.getState().updateUser(user), false);
  assert.equal(calls, 0);
  const pending = store.getState().updateUser(updated);
  assert.deepEqual(store.getState().user, user);
  assert.equal(await store.getState().updateUser(updated), false);
  assert.equal(calls, 1);
  finish(updated);
  await pending;
});

test('Zustand: mantiene los datos originales si falla y permite reintentar', async () => {
  let attempts = 0;
  const store = createAuthStore(async () => session, async () => { if (++attempts === 1) throw new Error('offline'); return updated; });
  await store.getState().signIn('', '');
  await assert.rejects(() => store.getState().updateUser(updated));
  assert.deepEqual(store.getState().user, user);
  assert.equal(store.getState().token, session.token);
  assert.equal(await store.getState().updateUser(updated), true);
});

test('Zustand: no restaura sesión cerrada ni pisa una nueva sesión con respuesta tardía', async () => {
  for (const signInAgain of [false, true]) {
    let finish;
    const store = createAuthStore(async () => session, () => new Promise(resolve => { finish = resolve; }));
    await store.getState().signIn('', '');
    const pending = store.getState().updateUser(updated);
    store.getState().signOut();
    if (signInAgain) await store.getState().signIn('', '');
    finish(updated);
    await assert.rejects(() => pending, /sesión cambió/);
    assert.deepEqual(store.getState().user, signInAgain ? user : null);
  }
});

test('Zustand: impide guardar en sesión vencida, API sin token o con identidad ajena', async () => {
  for (const invalidSession of [{ ...session, token: null }, { ...session, expiresAt: 0 }]) {
    const store = createAuthStore(async () => invalidSession, async () => { assert.fail('No debe enviar HTTP'); });
    await store.getState().signIn('', '');
    await assert.rejects(() => store.getState().updateUser(updated));
    assert.deepEqual(store.getState().user, user);
  }
  const store = createAuthStore(async () => session, async () => ({ ...updated, id: 'otro' }));
  await store.getState().signIn('', '');
  await assert.rejects(() => store.getState().updateUser(updated), /otro usuario/);
  assert.deepEqual(store.getState().user, user);
});


test('perfil demo: guarda y normaliza localmente sin HTTP, conservando identidad y sesión', async () => {
  const local = { user, source: 'local', token: null, expiresAt: null };
  const store = createAuthStore(async () => local, async () => { assert.fail('La cuenta demo no debe enviar HTTP'); });
  await store.getState().signIn('', '');
  assert.equal(await store.getState().updateUser(user), false);
  assert.equal(await store.getState().updateUser({ ...updated, firstName: ' Andrea ', lastName: ' Pérez ', email: ' ANDREA@EXAMPLE.COM ', id: 'otro', phone: 'alterado' }), true);
  assert.deepEqual(store.getState().user, updated);
  assert.equal(store.getState().source, 'local');
  assert.equal(store.getState().token, null);
  assert.equal(store.getState().expiresAt, null);
  store.getState().signOut();
  await assert.rejects(() => store.getState().updateUser(updated), /Volvé a ingresar/);
  await store.getState().signIn('', '');
  assert.deepEqual(store.getState().user, user);
});

test('perfil demo: rechaza datos inválidos sin modificar el usuario ni enviar HTTP', async () => {
  const store = createAuthStore(async () => ({ user, source: 'local', token: null, expiresAt: null }), async () => { assert.fail('No debe enviar HTTP'); });
  await store.getState().signIn('', '');
  for (const input of [{ ...updated, firstName: '' }, { ...updated, lastName: ' ' }, { ...updated, email: 'invalid' }]) {
    await assert.rejects(() => store.getState().updateUser(input), error => Object.keys(error.fields).length > 0);
    assert.deepEqual(store.getState().user, user);
  }
  assert.equal(await store.getState().updateUser(updated), true);
});
