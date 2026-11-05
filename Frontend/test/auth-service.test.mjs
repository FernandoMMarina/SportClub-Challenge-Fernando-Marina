import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthError, authenticateLocally, describeLoginError, validateLoginInput } from '../src/services/auth-service.ts';

test('campos vacíos: informa ambos y no intenta autenticar', () => {
  const fields = validateLoginInput('', '');
  assert.equal(fields.email, 'Ingresá tu correo electrónico.');
  assert.equal(fields.password, 'Ingresá tu contraseña.');
  assert.throws(() => authenticateLocally('', ''), error =>
    error instanceof AuthError && error.code === 'VALIDATION_ERROR' && Object.keys(error.fields).length === 2);
});
test('email inválido y longitudes excesivas producen errores del campo correspondiente', () => {
  for (const email of ['sin-arroba', 'a@b', 'a b@c.com', `${'a'.repeat(255)}@b.com`]) {
    assert.ok(validateLoginInput(email, 'Test123!').email);
  }
  assert.ok(validateLoginInput('demo@sportclub.com', ' '.repeat(3)).password);
  assert.ok(validateLoginInput('demo@sportclub.com', 'a'.repeat(129)).password);
});
test('email normalizado permite iniciar sesión y no devuelve contraseña', () => {
  const user = authenticateLocally('  DEMO@sportclub.com  ', 'SportClub123!');
  assert.equal(user.id, 'user-demo');
  assert.equal(user.email, 'demo@sportclub.com');
  assert.equal('password' in user, false);
});
test('contraseña incorrecta y usuario inexistente reciben el mismo error', () => {
  const failures = [];
  for (const [email, password] of [['demo@sportclub.com', 'wrong'], ['missing@example.com', 'SportClub123!']]) {
    assert.throws(() => authenticateLocally(email, password), error => {
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      failures.push(describeLoginError(error));
      return true;
    });
  }
  assert.deepEqual(failures[0], failures[1]);
  assert.equal(failures[0].title, 'Datos de acceso incorrectos');
});
test('la contraseña conserva su comparación exacta, incluyendo espacios', () => {
  assert.throws(() => authenticateLocally('demo@sportclub.com', ' SportClub123! '),
    error => error.code === 'INVALID_CREDENTIALS');
});
test('los fallos inesperados no exponen mensajes internos ni datos del error', () => {
  for (const cause of [new Error('stack trace with secret'), 'internal details', null, { message: 'sensitive data' }]) {
    const failure = describeLoginError(cause);
    assert.equal(failure.title, 'No pudimos iniciar sesión');
    assert.doesNotMatch(JSON.stringify(failure), /secret|internal details|sensitive data/);
  }
});
test('después de fallar se puede corregir y autenticar sin estado residual', () => {
  assert.throws(() => authenticateLocally('demo@sportclub.com', 'wrong'));
  assert.equal(authenticateLocally('demo@sportclub.com', 'SportClub123!').id, 'user-demo');
  assert.deepEqual(validateLoginInput('demo@sportclub.com', 'SportClub123!'), {});
});
