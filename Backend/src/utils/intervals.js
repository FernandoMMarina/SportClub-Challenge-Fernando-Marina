/** @typedef {import('../types/reservations').Interval} Interval */

/** @param {Interval} interval */
function validateInterval(interval) {
  if (!interval || !Number.isSafeInteger(interval.start) || !Number.isSafeInteger(interval.end) ||
      !Number.isFinite(new Date(interval.start).getTime()) ||
      !Number.isFinite(new Date(interval.end).getTime()) || interval.start >= interval.end) {
    throw new RangeError('El intervalo debe tener timestamps UTC válidos y start < end.');
  }
}

/**
 * Comparación O(1) de intervalos semiabiertos [start, end).
 * No acepta strings ni fechas locales: convertir primero a timestamps UTC.
 * @param {Interval} a
 * @param {Interval} b
 * @returns {boolean}
 */
function intervalsOverlap(a, b) {
  validateInterval(a);
  validateInterval(b);
  return a.start < b.end && b.start < a.end;
}

module.exports = { intervalsOverlap, validateInterval };
