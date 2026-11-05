const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const branches = require('../data/venues.json');
const { createSessionSeed } = require('../data/session-seed');
const { validateInterval } = require('../utils/intervals');

/** @typedef {import('../types/reservations').ReservationState} ReservationState */
const activeFiles = new Set();

/** Verifica el archivo completo al leerlo; datos corruptos no se sobrescriben. */
function validateState(state) {
  if (!state || !Array.isArray(state.sessions) || !Array.isArray(state.reservations)) {
    throw new Error('Archivo de reservas inválido.');
  }
  const sessions = new Map();
  for (const session of state.sessions) {
    validateInterval({ start: session.startsAt, end: session.endsAt });
    const branch = branches.find(item => item.id === session.branchId);
    if (typeof session.id !== 'string' || !session.id || sessions.has(session.id) ||
        !branch?.classes.some(activity => activity.id === session.activityId) ||
        !Number.isSafeInteger(session.capacity) || session.capacity < 1) {
      throw new Error('Sesión inválida en el archivo de reservas.');
    }
    sessions.set(session.id, session);
  }
  const ids = new Set();
  const confirmedPairs = new Set();
  const counts = new Map();
  for (const reservation of state.reservations) {
    if (typeof reservation.id !== 'string' || !reservation.id || ids.has(reservation.id) ||
        typeof reservation.userId !== 'string' || !reservation.userId || !sessions.has(reservation.sessionId) ||
        !['CONFIRMED', 'CANCELLED'].includes(reservation.status) ||
        !Number.isSafeInteger(reservation.createdAt) ||
        (reservation.status === 'CONFIRMED' && reservation.cancelledAt !== null) ||
        (reservation.status === 'CANCELLED' && (!Number.isSafeInteger(reservation.cancelledAt) || reservation.cancelledAt < reservation.createdAt))) {
      throw new Error('Reserva inválida en el archivo de reservas.');
    }
    ids.add(reservation.id);
    if (reservation.status === 'CONFIRMED') {
      const pair = JSON.stringify([reservation.userId, reservation.sessionId]);
      if (confirmedPairs.has(pair)) throw new Error('Reserva confirmada duplicada en el archivo.');
      confirmedPairs.add(pair);
      const count = (counts.get(reservation.sessionId) || 0) + 1;
      if (count > sessions.get(reservation.sessionId).capacity) throw new Error('Capacidad excedida en el archivo.');
      counts.set(reservation.sessionId, count);
    }
  }
}

/**
 * Una sección crítica SÍNCRONA por archivo en un único proceso Node.
 * Leer, validar reglas y escribir ocurren sin await; no pueden intercalarse requests.
 * Rename confirma sesiones y reservas juntas. No es un bloqueo entre procesos.
 */
function createReservationRepository(filename, seed = createSessionSeed) {
  const file = path.resolve(filename);
  function write(state) {
    validateState(state);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  /** @returns {ReservationState} */
  function read() {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    validateState(state);
    return state;
  }
  if (!fs.existsSync(file)) write(seed());
  else read();

  return {
    read,
    /** @template T @param {(state: ReservationState) => T} operation @returns {T} */
    transaction(operation) {
      if (activeFiles.has(file)) throw new Error('Transacción de reservas reentrante.');
      activeFiles.add(file);
      try {
        const state = read();
        const result = operation(state);
        if (result && typeof result.then === 'function') {
          throw new Error('Las transacciones de reservas deben ser síncronas.');
        }
        write(state);
        return result;
      } finally {
        activeFiles.delete(file);
      }
    },
  };
}
module.exports = { createReservationRepository };
