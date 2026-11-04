const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');
const config = require('./src/config');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./src/docs/openapi.json');
const { createUserRepository } = require('./src/repositories/users');
const { createRouter } = require('./src/routes');

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
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20,
    standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Intentá más tarde.' } } });
  app.use('/api/auth/login', loginLimiter);
  app.use('/api', createRouter(options.users || createUserRepository(config.dataFile)));
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
