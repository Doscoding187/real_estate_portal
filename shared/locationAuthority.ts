import { isCanonicalPlaceId } from './placeAuthority';

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

/**
 * The identity of a canonical public-search location.
 *
 * A location has exactly one identity, and there are two forms of it.
 *
 * `runtime` is the numeric handle of the three-level runtime projection. It
 * exists only for the places the projection carries, which is why it is being
 * retired.
 *
 * `place` is the Place Authority identity. It exists for every place, in every
 * province, and it is the identity the product uses when an agent lists a
 * property.
 *
 * A consumer that accepts only one form is a consumer that can only reach part
 * of the country.
 */
export type CanonicalLocationIdentity =
  | {
      kind: 'runtime';
      level: CanonicalLocationLevel;
      id: number;
      canonicalLocationId: string;
    }
  | {
      kind: 'place';
      placeId: string;
      canonicalLocationId: string;
    };

/**
 * Reads a canonical location identity in either form.
 *
 * The Place Authority identity does not carry its level in the identifier, so
 * the level is read from the result that carries the identity. The identity
 * itself is what this function returns.
 */
export function parseCanonicalLocationIdentity(value: unknown): CanonicalLocationIdentity | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (isCanonicalPlaceId(normalized)) {
    return { kind: 'place', placeId: normalized, canonicalLocationId: normalized };
  }
  const runtime = parseCanonicalLocationId(normalized);
  if (!runtime) return null;
  return {
    kind: 'runtime',
    level: runtime.level,
    id: runtime.id,
    canonicalLocationId: normalized,
  };
}
