const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { createReservationController } = require('../controllers/reservations');

function createReservationRouter(users, service) {
  const router = Router();
  const controller = createReservationController(service);
  router.use(authenticate(users));
  router.get('/sessions', controller.listSessions);
  router.get('/sessions/:id', controller.getSession);
  router.post('/reservations', controller.create);
  router.get('/reservations/me', controller.listMine);
  router.patch('/reservations/:id/cancel', controller.cancel);
  return router;
}
module.exports = { createReservationRouter };
