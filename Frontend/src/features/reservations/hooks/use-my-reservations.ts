import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { canCancelReservation, describeReservationError, reservationsService, type Reservation } from '@/services/reservations-service';
import venues from '@/data/venues.json';
import { createDemoReservations } from '@/features/reservations/utils/demo-reservations';
import { useAuthStore } from '@/stores/auth-store';

export function useMyReservations() {
  const token = useAuthStore(state => state.token);
  const source = useAuthStore(state => state.source);
  const userId = useAuthStore(state => state.user?.id);
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const active = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const cancelLock = useRef(false);
  const version = useRef(0);
  const isDemo = source === 'local';
  const available = isDemo || (source === 'api' && !!token);

  const load = useCallback(async () => {
    if (!token || source !== 'api') return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++version.current;
    setLoading(true);
    setError(null);
    try {
      const data = await reservationsService().listMine(token, request.signal);
      if (active.current && !request.signal.aborted && current === version.current && useAuthStore.getState().token === token) {
        if (data.some(item => item.userId !== userId)) throw new Error('Identidad de reserva inválida.');
        setItems(data);
      }
    } catch (cause: unknown) {
      if (active.current && !request.signal.aborted && current === version.current) setError(describeReservationError(cause));
    } finally {
      if (active.current && current === version.current) setLoading(false);
    }
  }, [token, source, userId]);

  useFocusEffect(useCallback(() => {
    active.current = true;
    if (source === 'local' && userId) {
      setItems(createDemoReservations(venues, userId));
      setError(null);
      setLoading(false);
    } else {
      setItems(null);
      void load();
    }
    return () => { active.current = false; controller.current?.abort(); version.current++; };
  }, [load, source, userId]));

  async function cancel(item: Reservation): Promise<void> {
    if (!token || !available || cancelLock.current || !canCancelReservation(item)) return;
    cancelLock.current = true;
    setCancelling(item.id);
    setError(null);
    // Una consulta anterior no puede pisar una cancelación confirmada.
    controller.current?.abort();
    version.current++;
    setLoading(false);
    try {
      const result = await reservationsService().cancel(token, item.id);
      if (active.current && useAuthStore.getState().token === token && result.userId === userId) {
        setItems(current => current?.map(reservation => reservation.id === result.id ? result : reservation) ?? null);
        await load();
      }
    } catch (cause: unknown) {
      if (active.current && useAuthStore.getState().token === token) setError(describeReservationError(cause));
    } finally {
      cancelLock.current = false;
      if (active.current) setCancelling(null);
    }
  }

  return { items, loading, error, cancelling, available, isDemo, refresh: load, cancel };
}
