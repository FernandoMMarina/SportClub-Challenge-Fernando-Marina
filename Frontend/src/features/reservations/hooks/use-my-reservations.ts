import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import type { Reservation } from '@/services/reservations-service';
import { useReservationsStore } from '@/stores/reservations-store';
import { useAuthStore } from '@/stores/auth-store';

export function useMyReservations() {
  const items = useReservationsStore(s => s.items);
  const loading = useReservationsStore(s => s.loading);
  const error = useReservationsStore(s => s.error);
  const pending = useReservationsStore(s => s.pending);
  const load = useReservationsStore(s => s.load);
  const cancel = useReservationsStore(s => s.cancel);
  const source = useAuthStore(s => s.source);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return { items, loading, error, cancelling: pending, available: source !== null, isDemo: source === 'local',
    refresh: load, cancel: (item: Reservation) => cancel(item.id) };
}
