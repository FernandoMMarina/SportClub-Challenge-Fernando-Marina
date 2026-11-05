const knownVenueIds = new Set(['palermo', 'belgrano']);

export function resolveVenueQr(value: string): string | null {
  if (value.length > 256) return null;
  const content = value.trim();
  const match = /^sportclubchallenge:\/\/venues\/([a-z-]+)$/.exec(content);
  const id = match ? match[1] : content;
  return knownVenueIds.has(id) ? id : null;
}
