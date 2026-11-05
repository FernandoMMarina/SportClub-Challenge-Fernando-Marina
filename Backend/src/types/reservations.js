/**
 * Contratos JSDoc; Branch y Activity reutilizan venues.json, sin otro catálogo.
 * @typedef {typeof import('../data/venues.json')[number]} Branch
 * @typedef {Branch['classes'][number]} Activity
 * @typedef {{start: number, end: number}} Interval Timestamps Unix en milisegundos UTC.
 * @typedef {{id: string, branchId: string, activityId: string, startsAt: number,
 *   endsAt: number, capacity: number}} Session
 * @typedef {{id: string, userId: string, sessionId: string,
 *   status: 'CONFIRMED' | 'CANCELLED', createdAt: number, cancelledAt: number | null}} Reservation
 * @typedef {{sessions: Session[], reservations: Reservation[]}} ReservationState
 * @typedef {{sessionId: string}} CreateReservationDTO
 * @typedef {{branchId?: string, activityId?: string}} SessionFilters
 * @typedef {Session & {confirmedCount: number, remainingCapacity: number, bookable: boolean}} SessionAvailability
 */
module.exports = {};
