const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/errors');
module.exports = users => (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
  if (!match) return next(fail(401, 'UNAUTHORIZED', 'Se requiere un token Bearer.'));
  let payload;
  try {
    payload = jwt.verify(match[1], config.jwtSecret, {
      algorithms: ['HS256'], issuer: 'sportclub-api', audience: 'sportclub-mobile',
    });
  } catch {
    return next(fail(401, 'UNAUTHORIZED', 'Token inválido o vencido.'));
  }
  const user = users.findById(payload.sub);
  if (!user) return next(fail(401, 'UNAUTHORIZED', 'Usuario no autorizado.'));
  req.user = user;
  next();
};
