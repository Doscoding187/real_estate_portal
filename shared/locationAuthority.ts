export type CanonicalLocationLevel = 'province' | 'city' | 'suburb';

/**
 * Canonical public-search location IDs are deliberately typed. A Google Place
 * ID, a slug, and a database row ID must not be interchangeable at a public
 * search boundary.
 *
 * The hyphen form is retained as a read-compatible alias for legacy URLs that
 * were already emitted by the application. New output always uses the colon
 * form.
 */
export function encodeCanonicalLocationId(level: CanonicalLocationLevel, id: number): string {
  return `${level}:${id}`;
}

export function parseCanonicalLocationId(value: unknown): {
  level: CanonicalLocationLevel;
  id: number;
} | null {
  const normalized = String(value ?? '').trim();
  const match = normalized.match(/^(province|city|suburb)(?::|-)(\d+)$/i);
  if (!match) return null;

  const id = Number(match[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    level: match[1].toLowerCase() as CanonicalLocationLevel,
    id,
  };
}

export function isCanonicalLocationId(value: unknown): boolean {
  return parseCanonicalLocationId(value) !== null;
}
