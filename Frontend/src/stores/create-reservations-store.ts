import { create } from 'zustand';
import { describeReservationError, type Reservation, type Session } from '../services/reservations-service.ts';
import { intervalsOverlap } from '../features/reservations/utils/local-sessions.ts';

class ReservationRuleError extends Error {}

type Context = { userId: string; token: string | null; source: 'local' | 'api'; expiresAt: number | null };
type Api = { listMine: (token: string) => Promise<Reservation[]>; listSessions: (token: string) => Promise<Session[]>;
  book: (token: string, id: string) => Promise<Reservation>; cancel: (token: string, id: string) => Promise<Reservation> };
type Options = { context: () => Context | null; api: () => Api; sessions: (now: number) => Session[];
  seed: (userId: string, now: number) => Reservation[]; clock?: () => number };
type State = {
  items: Reservation[] | null; sessions: Session[]; loading: boolean; pending: string | null; error: string | null;
  reset: () => void; load: () => Promise<void>; book: (id: string) => Promise<boolean>; cancel: (id: string) => Promise<boolean>;
};

export function createReservationsStore(options: Options) {
  const clock = options.clock ?? Date.now;
  let owner = '';
  let generation = 0;
  let nextId = 0;
  const empty = { items: null, sessions: [], loading: false, pending: null, error: null };
  return create<State>((set, get) => {
    const identity = (c: Context | null) => c ? JSON.stringify([c.userId, c.source, c.token]) : '';
    function context() {
      const c = options.context();
      if (!c || (c.source === 'api' && (!c.token || (c.expiresAt !== null && c.expiresAt <= clock())))) throw new ReservationRuleError('Tu sesión venció. Volvé a ingresar.');
      return c;
    }
    function initialize(c: Context) {
      if (owner === identity(c)) return;
      generation++;
      owner = identity(c);
      set({ ...empty, ...(c.source === 'local' ? { items: options.seed(c.userId, clock()), sessions: options.sessions(clock()) } : {}) });
    }
    const current = (c: Context, version: number) => generation === version && identity(options.context()) === identity(c);
    async function mutate(kind: 'book' | 'cancel', id: string): Promise<boolean> {
      let c: Context;
      try { c = context(); } catch (cause) { set({ error: (cause as Error).message }); return false; }
      initialize(c);
      if (get().pending || get().loading) return false;
      const version = ++generation;
      set({ pending: `${kind}:${id}`, error: null });
      try {
        const items = get().items ?? [];
        let result: Reservation;
        if (kind === 'book') {
          const session = get().sessions.find(s => s.id === id);
          if (!session || session.startsAt <= clock()) throw new ReservationRuleError('La clase ya comenzó o no está disponible.');
          if (items.some(r => r.status === 'CONFIRMED' && r.sessionId === id)) throw new ReservationRuleError('Ya tenés una reserva para esa clase.');
          if (items.some(r => r.status === 'CONFIRMED' && intervalsOverlap(session, r.session))) throw new ReservationRuleError('La clase se superpone con otra de tus reservas.');
          if (c.source === 'local') {
            if (items.filter(r => r.status === 'CONFIRMED' && r.sessionId === id).length >= session.capacity) throw new ReservationRuleError('La clase no tiene cupos disponibles.');
            result = { id: `local-${clock()}-${++nextId}`, userId: c.userId, sessionId: id, status: 'CONFIRMED', createdAt: clock(), cancelledAt: null, session };
          } else result = await options.api().book(c.token!, id);
        } else {
          const item = items.find(r => r.id === id && r.userId === c.userId);
          if (!item) throw new ReservationRuleError('No encontramos esa reserva.');
          if (item.status === 'CANCELLED') return true;
          if (item.session.startsAt <= clock()) throw new ReservationRuleError('La clase ya comenzó y no se puede cancelar.');
          result = c.source === 'local' ? { ...item, status: 'CANCELLED', cancelledAt: clock() } : await options.api().cancel(c.token!, id);
        }
        if (!current(c, version)) return false;
        if (result.userId !== c.userId) throw new ReservationRuleError('La respuesta no corresponde a tu cuenta.');
        set({ items: kind === 'book' ? [...(get().items ?? []), result] : (get().items ?? []).map(r => r.id === id ? result : r) });
        return true;
      } catch (cause: unknown) {
        if (current(c, version)) set({ error: cause instanceof ReservationRuleError ? cause.message : describeReservationError(cause) });
        return false;
      } finally { if (current(c, version)) set({ pending: null }); }
    }
    return { ...empty,
      reset: () => { generation++; owner = ''; set(empty); },
      load: async () => {
        let c: Context;
        try { c = context(); } catch { get().reset(); return; }
        initialize(c);
        if (c.source === 'local' || get().loading || get().pending) return;
        const version = ++generation;
        set({ loading: true, error: null });
        try {
          const api = options.api();
          const [items, sessions] = await Promise.all([api.listMine(c.token!), api.listSessions(c.token!)]);
          if (!current(c, version)) return;
          if (items.some(item => item.userId !== c.userId)) throw new ReservationRuleError('Reservas de otra cuenta.');
          set({ items, sessions });
        } catch (cause: unknown) { if (current(c, version)) set({ error: describeReservationError(cause) }); }
        finally { if (current(c, version)) set({ loading: false }); }
      },
      book: id => mutate('book', id), cancel: id => mutate('cancel', id),
    };
  });
}
