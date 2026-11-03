import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  CanonicalPlaceUrlEntry,
  CanonicalPlaceUrlProjection,
} from '../../shared/canonicalPlaceUrlProjection';

const PROJECTION_PATH = 'data/place-url-projection-national-v0.1.json';
const PROJECTION_ID = 'property-listify-national-canonical-place-url-projection-v0.1';

let projection: CanonicalPlaceUrlProjection | undefined;
let byPath: Map<string, CanonicalPlaceUrlEntry> | undefined;
let byPlaceId: Map<string, CanonicalPlaceUrlEntry> | undefined;

function loadProjection(): CanonicalPlaceUrlProjection {
  if (projection) return projection;
  const bytes = readFileSync(resolve(process.cwd(), PROJECTION_PATH), 'utf8');
  const parsed = JSON.parse(bytes) as CanonicalPlaceUrlProjection;
  if (
    parsed.schema_version !== '0.1' ||
    parsed.projection_id !== PROJECTION_ID ||
    !Array.isArray(parsed.entries)
  ) {
    throw new Error('Canonical Place URL projection has an unsupported shape.');
  }

  const paths = new Map<string, CanonicalPlaceUrlEntry>();
  const places = new Map<string, CanonicalPlaceUrlEntry>();
  for (const entry of parsed.entries) {
    if (
      !entry.place_id ||
      !entry.path.startsWith('/') ||
      entry.path.includes('?') ||
      entry.path.includes('#') ||
      paths.has(entry.path) ||
      places.has(entry.place_id)
    ) {
      throw new Error('Canonical Place URL projection contains an invalid or duplicate route.');
    }
    paths.set(entry.path, entry);
    places.set(entry.place_id, entry);
  }

  projection = parsed;
  byPath = paths;
  byPlaceId = places;
  return parsed;
}

export function canonicalPlaceUrlByPath(path: string): CanonicalPlaceUrlEntry | null {
  loadProjection();
  return byPath!.get(path) ?? null;
}

export function canonicalPlaceUrlByPlaceId(placeId: string): CanonicalPlaceUrlEntry | null {
  loadProjection();
  return byPlaceId!.get(placeId) ?? null;
}

/** Public sitemap entries must pass the authority's separate publication gate. */
export function publishedCanonicalPlaceUrls(): CanonicalPlaceUrlEntry[] {
  return loadProjection().entries.filter(
    entry =>
      entry.publication_eligible &&
      entry.verification_status === 'verified' &&
      entry.lifecycle_status === 'active',
  );
}
