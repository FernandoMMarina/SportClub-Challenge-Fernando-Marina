const { test } = require('node:test');
const assert = require('node:assert/strict');
const { intervalsOverlap } = require('../src/utils/intervals');

test('intervalos: intersección parcial simétrica', () => {
  assert.equal(intervalsOverlap({ start: 1, end: 4 }, { start: 3, end: 7 }), true);
  assert.equal(intervalsOverlap({ start: 3, end: 7 }, { start: 1, end: 4 }), true);
});
test('intervalos semiabiertos: consecutivos y separados no se solapan', () => {
  assert.equal(intervalsOverlap({ start: 1, end: 4 }, { start: 4, end: 7 }), false);
  assert.equal(intervalsOverlap({ start: 4, end: 7 }, { start: 1, end: 4 }), false);
  assert.equal(intervalsOverlap({ start: 1, end: 2 }, { start: 3, end: 4 }), false);
});
test('intervalos contenidos e idénticos se solapan', () => {
  assert.equal(intervalsOverlap({ start: 1, end: 10 }, { start: 3, end: 4 }), true);
  assert.equal(intervalsOverlap({ start: 3, end: 4 }, { start: 1, end: 10 }), true);
  assert.equal(intervalsOverlap({ start: 1, end: 10 }, { start: 1, end: 10 }), true);
});
test('intervalos inválidos se rechazan en cualquiera de los argumentos', () => {
  const valid = { start: 0, end: 1 };
  for (const invalid of [null, {}, { start: 1, end: 1 }, { start: 2, end: 1 },
    { start: NaN, end: 3 }, { start: 0, end: Infinity }, { start: '0', end: 3 },
    { start: 0.5, end: 3 }, { start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
    { start: 0, end: 8640000000000001 }]) {
    assert.throws(() => intervalsOverlap(invalid, valid), RangeError);
    assert.throws(() => intervalsOverlap(valid, invalid), RangeError);
  }
});
test('timestamps normalizados comparan el mismo instante con distintos offsets', () => {
  const a = { start: Date.parse('2030-01-07T09:00:00-03:00'), end: Date.parse('2030-01-07T10:00:00-03:00') };
  const b = { start: Date.parse('2030-01-07T12:30:00Z'), end: Date.parse('2030-01-07T13:30:00Z') };
  assert.equal(intervalsOverlap(a, b), true);
  assert.equal(intervalsOverlap(a, { start: Date.parse('2030-01-07T13:00:00Z'), end: Date.parse('2030-01-07T14:00:00Z') }), false);
});
