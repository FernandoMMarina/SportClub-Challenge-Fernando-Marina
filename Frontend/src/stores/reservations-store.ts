import venues from '@/data/venues.json';
import { createDemoReservations } from '@/features/reservations/utils/demo-reservations';
import { createLocalSessions } from '@/features/reservations/utils/local-sessions';
import { reservationsService } from '@/services/reservations-service';
import { useAuthStore } from '@/stores/auth-store';
import { createReservationsStore } from './create-reservations-store';

export const useReservationsStore = createReservationsStore({
  context: () => {
    const { user, token, source, expiresAt } = useAuthStore.getState();
    return user && source ? { userId: user.id, token, source, expiresAt } : null;
  },
  api: reservationsService,
  sessions: now => createLocalSessions(venues, now),
  seed: (userId, now) => createDemoReservations(venues, userId, now),
});

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.token !== previous.token || state.source !== previous.source) {
    useReservationsStore.getState().reset();
  }
});
