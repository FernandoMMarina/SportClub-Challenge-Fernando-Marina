const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');
const config = require('./src/config');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./src/docs/openapi.json');
const { createUserRepository } = require('./src/repositories/users');
const { createRouter } = require('./src/routes');
const { createReservationRepository } = require('./src/repositories/reservations');
const { createReservationService } = require('./src/services/reservations');
const { createReservationRouter } = require('./src/routes/reservations');

function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '16kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.get('/api-docs.json', (req, res) => res.json(openapi));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    swaggerOptions: { validatorUrl: null },
    customSiteTitle: 'SportClub API — Swagger UI',
  }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Endpoints públicos que escriben o verifican credenciales: un límite por IP cada uno.
  const authLimiter = limit => rateLimit({ windowMs: 15 * 60 * 1000, limit,
    standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Intentá más tarde.' } } });
  app.use('/api/auth/login', authLimiter(20));
  app.use('/api/auth/register', authLimiter(20));
  const users = options.users || createUserRepository(config.dataFile);
  const reservations = options.reservations || createReservationRepository(config.reservationFile);
  app.use('/api', createRouter(users));
  app.use('/api', createReservationRouter(users, createReservationService(reservations, users, options.clock)));
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }));
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: {
      code: err.code || (status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR'),
      message: status >= 500 ? 'Ocurrió un error interno.' : err.message,
    } });
  });
  return app;
}
module.exports = createApp();
module.exports.createApp = createApp;
