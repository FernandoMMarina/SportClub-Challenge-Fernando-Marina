import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { AxiosError } from 'axios';
import { createApiClient } from '../src/services/api-client.ts';
import { createReservationsService, canCancelReservation, describeReservationError } from '../src/services/reservations-service.ts';

const reservation = { id: 'r1', userId: 'u1', sessionId: 's1', status: 'CONFIRMED', createdAt: 1000, cancelledAt: null,
  session: { id: 's1', branchId: 'palermo', activityId: 'palermo-1', startsAt: 3000, endsAt: 4000 } };

test('reservas: GET propio y PATCH de cancelación por HTTP con JWT', async t => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer jwt-real');
    requests.push([req.method, req.url]);
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') res.end(JSON.stringify({ data: [reservation] }));
    else {
      let body = '';
      for await (const chunk of req) body += chunk;
      assert.deepEqual(JSON.parse(body), {});
      res.end(JSON.stringify({ data: { ...reservation, status: 'CANCELLED', cancelledAt: 2000 } }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const service = createReservationsService(createApiClient(`http://127.0.0.1:${server.address().port}/api`));
  assert.deepEqual(await service.listMine('jwt-real'), [reservation]);
  const cancelled = await service.cancel('jwt-real', 'r1');
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.cancelledAt, 2000);
  assert.deepEqual(requests, [['GET', '/api/reservations/me'], ['PATCH', '/api/reservations/r1/cancel']]);
});

test('reservas: lista vacía válida y respuestas malformadas rechazadas', async () => {
  assert.deepEqual(await createReservationsService({ get: async () => ({ data: { data: [] } }) }).listMine('jwt'), []);
  for (const data of [null, {}, [{}], [{ ...reservation, session: null }], [{ ...reservation, session: { ...reservation.session, endsAt: 0 } }], [{ ...reservation, status: 'unknown' }]]) {
    await assert.rejects(() => createReservationsService({ get: async () => ({ data: { data } }) }).listMine('jwt'));
  }
  for (const data of [reservation, { ...reservation, status: 'CANCELLED', id: 'other' }, {}]) {
    await assert.rejects(() => createReservationsService({ patch: async () => ({ data: { data } }) }).cancel('jwt', 'r1'));
  }
});

test('reservas: cancelación solo confirmadas antes del inicio', () => {
  assert.equal(canCancelReservation(reservation, 2999), true);
  assert.equal(canCancelReservation(reservation, 3000), false);
  assert.equal(canCancelReservation(reservation, 5000), false);
  assert.equal(canCancelReservation({ ...reservation, status: 'CANCELLED' }, 2000), false);
});

test('reservas: transmite cancelación de GET y muestra errores de sesión, red y conflicto', async () => {
  const controller = new AbortController();
  controller.abort();
  const service = createReservationsService({ get: async (_url, config) => { assert.equal(config.signal, controller.signal); throw new AxiosError('abort', 'ERR_CANCELED'); } });
  await assert.rejects(() => service.listMine('jwt', controller.signal));
  for (const [status, pattern] of [[401, /sesión venció/], [404, /encontramos/], [409, /comenzó/], [500, /servidor/]]) {
    const error = new AxiosError('technical-secret', undefined, undefined, undefined, { status });
    assert.match(describeReservationError(error), pattern);
    assert.doesNotMatch(describeReservationError(error), /technical-secret/);
  }
  assert.match(describeReservationError(new AxiosError('secret', 'ERR_NETWORK')), /conectar/);
});
