const { Router } = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const authenticate = require('../middleware/auth');
const { verifyPassword, hashPassword } = require('../utils/password');
const { publicUser } = require('../repositories/users');
const { fail } = require('../utils/errors');
const venues = require('../data/venues.json');
const dummyHash = hashPassword('not-a-real-account');
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function createRouter(users) {
  const router = Router();
  router.post('/auth/login', (req, res, next) => {
    const body = req.body;
    if (!isObject(body) || !validEmail(body.email) || typeof body.password !== 'string' || !body.password.length || body.password.length > 128) {
      return next(fail(400, 'VALIDATION_ERROR', 'Ingresá un email y una contraseña válidos.'));
    }
    const user = users.findByEmail(body.email.trim().toLowerCase());
    const matches = verifyPassword(body.password, user ? user.passwordHash : dummyHash);
    if (!user || !matches) return next(fail(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.'));
    const token = jwt.sign({}, config.jwtSecret, { subject: user.id,
      algorithm: 'HS256', expiresIn: config.jwtExpiresIn,
      issuer: 'sportclub-api', audience: 'sportclub-mobile' });
    res.json({ token, tokenType: 'Bearer', expiresIn: 3600, user: publicUser(user) });
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
    const fields = ['firstName', 'lastName', 'phone'];
    if (!isObject(body) || !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
      return next(fail(400, 'VALIDATION_ERROR', 'Campos permitidos: firstName, lastName y phone.'));
    }
    const changes = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string' || (key !== 'phone' && (!value.trim() || value.trim().length > 80)) ||
          (key === 'phone' && value !== '' && !/^\+?[0-9 ()-]{6,25}$/.test(value))) {
        return next(fail(400, 'VALIDATION_ERROR', `El campo ${key} es inválido.`));
      }
      changes[key] = value.trim();
    }
    res.json({ data: publicUser(users.update(req.user.id, changes)) });
  });
  return router;
}
module.exports = { createRouter };
