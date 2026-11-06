const knownVenueIds = new Set(['palermo', 'belgrano']);
const venueOrigin = 'https://sportclub-challenge-fernando-marina.onrender.com';

export function resolveVenueQr(value: string): string | null {
  if (value.length > 256) return null;
  const content = value.trim();
  if (knownVenueIds.has(content)) return content;
  const custom = /^sportclubchallenge:\/\/venues\/([a-z-]+)$/.exec(content);
  if (custom) return knownVenueIds.has(custom[1]) ? custom[1] : null;
  try {
    const url = new URL(content);
    if (url.origin !== venueOrigin || url.username || url.password) return null;
    const match = /^\/venues\/([a-z-]+)\/?$/.exec(url.pathname);
    return match && knownVenueIds.has(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}
