import { resolveVenueIntent } from '../features/venues/utils/resolve-venue-intent';
import { useAuthStore } from '../stores/auth-store';
import { usePendingVenueStore } from '../stores/pending-venue-store';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const session = useAuthStore.getState();
    const authenticated = session.user !== null && (session.expiresAt === null || session.expiresAt > Date.now());
    const intent = resolveVenueIntent(path, authenticated);
    if (!intent) return path;
    usePendingVenueStore.getState().setVenue(intent.pendingVenueId);
    return intent.path;
  } catch {
    return '/';
  }
}
