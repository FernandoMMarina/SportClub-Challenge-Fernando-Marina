const { fail } = require('../utils/errors');

const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(value);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** El usuario se obtiene exclusivamente del middleware JWT existente. */
function createReservationController(service) {
  return {
    listSessions(req, res) {
      if (Object.keys(req.query).some(key => !['branchId', 'activityId'].includes(key)) ||
          Object.values(req.query).some(value => !validId(value))) {
        throw fail(400, 'VALIDATION_ERROR', 'Filtros permitidos: branchId y activityId, como identificadores.');
      }
      res.json({ data: service.listSessions(req.query) });
    },
    getSession(req, res) {
      if (!validId(req.params.id)) throw fail(400, 'VALIDATION_ERROR', 'Identificador de sesión inválido.');
      res.json({ data: service.getSession(req.params.id) });
    },
    create(req, res) {
      if (!isObject(req.body) || Object.keys(req.body).length !== 1 || !validId(req.body.sessionId)) {
        throw fail(400, 'VALIDATION_ERROR', 'Enviar únicamente sessionId como identificador válido.');
      }
      res.status(201).json({ data: service.create(req.user.id, req.body.sessionId) });
    },
    listMine(req, res) {
      if (Object.keys(req.query).length) throw fail(400, 'VALIDATION_ERROR', 'Este endpoint no admite filtros.');
      res.json({ data: service.listReservations(req.user.id) });
    },
    cancel(req, res) {
      if (!validId(req.params.id) || (req.body !== undefined && (!isObject(req.body) || Object.keys(req.body).length))) {
        throw fail(400, 'VALIDATION_ERROR', 'Identificador inválido o cuerpo no vacío.');
      }
      res.json({ data: service.cancel(req.user.id, req.params.id) });
    },
  };
}
module.exports = { createReservationController };
