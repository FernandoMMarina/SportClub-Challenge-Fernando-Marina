import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVenueQr } from '../src/features/venues/utils/resolve-venue-qr.ts';
import { resolveVenueIntent } from '../src/features/venues/utils/resolve-venue-intent.ts';

const origin = 'https://sportclub-challenge-fernando-marina.onrender.com';
test('QR: reconoce HTTPS, esquema anterior e identificadores locales', () => {
  for (const id of ['palermo', 'belgrano']) {
    for (const value of [id, `sportclubchallenge://venues/${id}`, `${origin}/venues/${id}`, `${origin}/venues/${id}/?source=qr`]) {
      assert.equal(resolveVenueQr(value), id);
    }
  }
});
test('QR: rechaza otros dominios, usuarios en URL y sedes inexistentes', () => {
  for (const value of ['https://example.com/venues/palermo', `${origin}.evil.com/venues/palermo`, 'http://sportclub-challenge-fernando-marina.onrender.com/venues/palermo', 'https://user@sportclub-challenge-fernando-marina.onrender.com/venues/palermo', `${origin}/venues/no-existe`, `${origin}/api/venues/palermo`, 'intent://venues/palermo', 'x'.repeat(257)]) {
    assert.equal(resolveVenueQr(value), null, value);
  }
});
test('enlace: conserva la sede antes del login y navega directamente si hay sesión', () => {
  for (const value of [`${origin}/venues/palermo`, 'sportclubchallenge://venues/palermo', '/venues/palermo']) {
    assert.deepEqual(resolveVenueIntent(value, false), { path: '/login', pendingVenueId: 'palermo' });
    assert.deepEqual(resolveVenueIntent(value, true), { path: '/venues/palermo', pendingVenueId: null });
  }
  assert.equal(resolveVenueIntent('https://example.com/venues/palermo', false), null);
});
