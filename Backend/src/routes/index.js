const { Router } = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const authenticate = require('../middleware/auth');
const { verifyPassword, hashPassword } = require('../utils/password');
const { publicUser } = require('../repositories/users');
const { fail } = require('../utils/errors');
const venues = require('../data/venues.json');
const dummyHash = hashPassword('not-a-real-account');
const PHONE = /^\+?[0-9 ()-]{6,25}$/;
const MIN_PASSWORD = 8;
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = value => typeof value === 'string' && value.length >= MIN_PASSWORD && value.length <= 128;
const validName = value => typeof value === 'string' && !!value.trim() && value.trim().length <= 80;
const validPhone = value => typeof value === 'string' && (value === '' || PHONE.test(value));
const normalizeEmail = value => value.trim().toLowerCase();

/** Login y registro emiten exactamente la misma sesión. */
function issueSession(user) {
  const token = jwt.sign({}, config.jwtSecret, { subject: user.id,
    algorithm: 'HS256', expiresIn: config.jwtExpiresIn,
    issuer: 'sportclub-api', audience: 'sportclub-mobile' });
  return { token, tokenType: 'Bearer', expiresIn: 3600, user: publicUser(user) };
}

function createRouter(users) {
  const router = Router();
  router.post('/auth/login', (req, res, next) => {
    const body = req.body;
    if (!isObject(body) || !validEmail(body.email) || typeof body.password !== 'string' || !body.password.length || body.password.length > 128) {
      return next(fail(400, 'VALIDATION_ERROR', 'Ingresá un email y una contraseña válidos.'));
    }
    const user = users.findByEmail(normalizeEmail(body.email));
    const matches = verifyPassword(body.password, user ? user.passwordHash : dummyHash);
    if (!user || !matches) return next(fail(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.'));
    res.json(issueSession(user));
  });
  router.post('/auth/register', (req, res, next) => {
    const body = req.body;
    const allowed = ['firstName', 'lastName', 'email', 'password', 'phone'];
    if (!isObject(body) || Object.keys(body).some(key => !allowed.includes(key))) {
      return next(fail(400, 'VALIDATION_ERROR', 'Campos permitidos: firstName, lastName, email, password y phone.'));
    }
    if (!validName(body.firstName) || !validName(body.lastName)) {
      return next(fail(400, 'VALIDATION_ERROR', 'Ingresá un nombre y un apellido de hasta 80 caracteres.'));
    }
    if (!validEmail(body.email)) return next(fail(400, 'VALIDATION_ERROR', 'Ingresá un email válido.'));
    if (!validPassword(body.password)) {
      return next(fail(400, 'VALIDATION_ERROR', `La contraseña debe tener entre ${MIN_PASSWORD} y 128 caracteres.`));
    }
    if (body.phone !== undefined && !validPhone(body.phone)) {
      return next(fail(400, 'VALIDATION_ERROR', 'El campo phone es inválido.'));
    }
    const user = users.create({
      firstName: body.firstName.trim(), lastName: body.lastName.trim(),
      email: normalizeEmail(body.email), phone: (body.phone || '').trim(), password: body.password,
    });
    if (!user) return next(fail(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese email.'));
    res.status(201).json(issueSession(user));
  });
  router.get('/venues', (req, res) => res.json({ data: venues }));
  router.get('/venues/:id', (req, res, next) => {
    const venue = venues.find(item => item.id === req.params.id);
    if (!venue) return next(fail(404, 'NOT_FOUND', 'Sede no encontrada.'));
    res.json({ data: venue });
  });
  router.use('/users', authenticate(users));
  router.get('/users/me', (req, res) => res.json({ data: publicUser(req.user) }));
  router.patch('/users/me', (req, res, next) => {
    const body = req.body;
    const fields = ['firstName', 'lastName', 'email'];
    if (!isObject(body) || !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
      return next(fail(400, 'VALIDATION_ERROR', 'Campos permitidos: firstName, lastName y email.'));
    }
    const changes = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string' || (key !== 'email' && (!value.trim() || value.trim().length > 80)) ||
          (key === 'email' && !validEmail(value.trim()))) {
        return next(fail(400, 'VALIDATION_ERROR', `El campo ${key} es inválido.`));
      }
      changes[key] = key === 'email' ? value.trim().toLowerCase() : value.trim();
    }
    res.json({ data: publicUser(users.update(req.user.id, changes)) });
  });
  return router;
}
module.exports = { createRouter };
