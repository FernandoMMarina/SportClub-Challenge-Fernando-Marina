import { resolveVenueQr } from './resolve-venue-qr.ts';

export function resolveVenueIntent(path: string, authenticated: boolean) {
  // Expo Router can provide an absolute URL or a relative app path.
  const candidate = path.startsWith('/venues/')
    ? `sportclubchallenge:/${path}` : path;
  const id = resolveVenueQr(candidate);
  if (!id) return null;
  return { path: authenticated ? `/venues/${id}` : '/login', pendingVenueId: authenticated ? null : id };
}
