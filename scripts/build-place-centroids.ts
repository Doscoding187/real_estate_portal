/**
 * Builds data/place-centroids-gauteng-v0.1.json: a place-centre lookup for the
 * Gauteng place guide. Centroids come from the committed Gauteng runtime
 * reference projection (runtime_natural_key, latitude, longitude); each natural
 * key is mapped to a canonical place id through the national canonical place
 * URL projection (the same data resolveCanonicalUrl reads). No database, no
 * network. Nothing is guessed: rows that match no tier are listed and omitted.
 *
 * Usage: pnpm exec tsx scripts/build-place-centroids.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_PATH =
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json';
const URL_PROJECTION_PATH = 'data/place-url-projection-national-v0.1.json';
const OUTPUT_PATH = 'data/place-centroids-gauteng-v0.1.json';
/** Tier 2b/3 matches further than this from the matched parent city are dropped. */
const MAX_PARENT_DISTANCE_KM = 60;

/** Explicit city segment aliases (exact segment substitution, tier 2b only). */
const CITY_SEGMENT_ALIASES: Record<string, readonly string[]> = {
  johannesburg: ['city-of-johannesburg'],
  'city-of-johannesburg': ['johannesburg'],
  pretoria: ['city-of-tshwane', 'tshwane'],
  tshwane: ['city-of-tshwane', 'pretoria'],
  'city-of-tshwane': ['pretoria', 'tshwane'],
  ekurhuleni: ['city-of-ekurhuleni'],
  'city-of-ekurhuleni': ['ekurhuleni'],
};

const OVERRIDES_PATH = 'data/place-centroid-overrides-gauteng-v0.1.json';

type MatchMethod =
  | 'tier1_exact_path'
  | 'tier2_slug_path_context'
  | 'tier2b_city_alias'
  | 'tier3_slug_name_unique'
  | 'manual-reviewed';

type SourceRow = {
  runtime_storage_level: string;
  runtime_natural_key: string;
  runtime_parent_natural_key: string | null;
  name: string;
  slug: string;
  latitude?: number;
  longitude?: number;
};

type UrlEntry = {
  place_id: string;
  preferred_public_name: string;
  search_scope: string;
  path: string;
  path_segment: string;
  province_slug: string;
  path_context: { path_segment?: string } | null;
};

export type PlaceCentroidEntry = {
  canonicalPlaceId: string;
  naturalKey: string;
  level: 'city' | 'suburb';
  parentCityPlaceId: string | null;
  lat: number | null;
  lng: number | null;
  matchMethod: MatchMethod;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}

const lastSegment = (key: string) => key.split('/').pop() ?? key;
const lower = (value: string) => value.trim().toLowerCase();

function uniqueBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T | null> {
  const map = new Map<string, T | null>();
  for (const item of items) {
    const key = keyOf(item);
    map.set(key, map.has(key) ? null : item);
  }
  return map;
}

function main() {
  const sourceBytes = readFileSync(resolve(process.cwd(), SOURCE_PATH));
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  const rows = (JSON.parse(sourceBytes.toString('utf8')) as { rows: SourceRow[] }).rows.filter(
    row => row.runtime_storage_level === 'city' || row.runtime_storage_level === 'suburb',
  );
  const entries = (
    JSON.parse(readFileSync(resolve(process.cwd(), URL_PROJECTION_PATH), 'utf8')) as {
      entries: UrlEntry[];
    }
  ).entries.filter(entry => entry.province_slug === 'gauteng');

  const byPath = new Map(entries.map(entry => [entry.path, entry]));
  const scopeOf = (level: string) => (level === 'city' ? 'metro_city' : 'locality');

  // Tier 3 uniqueness maps (slug AND name, per level, on both sides).
  const rowByNameKey = uniqueBy(
    rows,
    row => `${row.runtime_storage_level}|${row.slug}|${lower(row.name)}`,
  );
  const entryByNameKey = uniqueBy(
    entries,
    entry =>
      `${entry.search_scope === 'metro_city' ? 'city' : 'suburb'}|${entry.path_segment}|${lower(entry.preferred_public_name)}`,
  );

  const taken = new Set<string>();
  const matched = new Map<string, { entry: UrlEntry; method: MatchMethod }>();
  const dropped: Array<{ naturalKey: string; method: MatchMethod; reason: string }> = [];
  const centreOf = (row: SourceRow) =>
    typeof row.latitude === 'number' && typeof row.longitude === 'number'
      ? { lat: row.latitude, lng: row.longitude }
      : null;
  const rowByKey = new Map(rows.map(row => [row.runtime_natural_key, row]));

  const claim = (row: SourceRow, entry: UrlEntry | null | undefined, method: MatchMethod) => {
    if (!entry || taken.has(entry.place_id)) return false;
    // Reviewed overrides may bridge a source city row to a locality URL entry.
    if (method !== 'manual-reviewed' && entry.search_scope !== scopeOf(row.runtime_storage_level)) {
      return false;
    }
    if (method !== 'tier1_exact_path' && method !== 'tier2_slug_path_context') {
      const parentKey = row.runtime_parent_natural_key;
      const parentMatch = parentKey ? matched.get(parentKey) : undefined;
      const parentRow = parentKey ? rowByKey.get(parentKey) : undefined;
      const own = centreOf(row);
      const parentCentre = parentRow ? centreOf(parentRow) : null;
      if (row.runtime_storage_level === 'suburb' && parentMatch && own && parentCentre) {
        const km = haversineKm(own, parentCentre);
        if (km > MAX_PARENT_DISTANCE_KM) {
          dropped.push({
            naturalKey: row.runtime_natural_key,
            method,
            reason: `${km.toFixed(1)} km from parent city centroid`,
          });
          return false;
        }
      }
    }
    taken.add(entry.place_id);
    matched.set(row.runtime_natural_key, { entry, method });
    return true;
  };

  // Cities first (so suburbs can use their parent's centroid), then suburbs.
  const ordered = [...rows].sort(
    (a, b) =>
      Number(a.runtime_storage_level === 'suburb') - Number(b.runtime_storage_level === 'suburb'),
  );
  const pending = (predicate: (row: SourceRow) => boolean) =>
    ordered.filter(row => !matched.has(row.runtime_natural_key) && predicate(row));
  const parentSegmentOf = (row: SourceRow) =>
    row.runtime_parent_natural_key ? lastSegment(row.runtime_parent_natural_key) : null;

  // Tier 1: exact path.
  for (const row of pending(() => true))
    claim(row, byPath.get(`/${row.runtime_natural_key}`), 'tier1_exact_path');

  // Tier 2: slug + path_context segment equals the parent segment.
  const bySlugContext = new Map<string, UrlEntry[]>();
  for (const entry of entries) {
    const context = entry.path_context?.path_segment;
    if (!context) continue;
    const key = `${entry.path_segment}|${context}`;
    bySlugContext.set(key, [...(bySlugContext.get(key) ?? []), entry]);
  }
  const uniqueContextMatch = (row: SourceRow, parentSegment: string) => {
    const candidates = (bySlugContext.get(`${row.slug}|${parentSegment}`) ?? []).filter(
      entry => !taken.has(entry.place_id),
    );
    return candidates.length === 1 ? candidates[0] : null;
  };
  for (const row of pending(r => r.runtime_storage_level === 'suburb')) {
    const parentSegment = parentSegmentOf(row);
    if (parentSegment)
      claim(row, uniqueContextMatch(row, parentSegment), 'tier2_slug_path_context');
  }

  // Tier 2b: committed city alias table, exact segment substitution.
  for (const row of pending(r => r.runtime_storage_level === 'suburb')) {
    const parentSegment = parentSegmentOf(row);
    for (const alias of (parentSegment && CITY_SEGMENT_ALIASES[parentSegment]) || []) {
      if (claim(row, uniqueContextMatch(row, alias), 'tier2b_city_alias')) break;
    }
  }

  // Tier 3: slug AND name unique on both sides within Gauteng.
  for (const row of pending(() => true)) {
    const key = `${row.runtime_storage_level}|${row.slug}|${lower(row.name)}`;
    if (rowByNameKey.get(key) !== row) continue;
    claim(row, entryByNameKey.get(key), 'tier3_slug_name_unique');
  }

  // Reviewed manual tier: only for keys no automatic tier resolved, path must exist.
  const overrides = (
    JSON.parse(readFileSync(resolve(process.cwd(), OVERRIDES_PATH), 'utf8')) as {
      overrides: Array<{ naturalKey: string; canonicalPath: string; reason: string }>;
    }
  ).overrides;
  for (const override of overrides) {
    const row = rowByKey.get(override.naturalKey);
    const entry = byPath.get(override.canonicalPath);
    if (!override.reason || !row || !entry || matched.has(override.naturalKey)) {
      throw new Error(`Invalid or unnecessary centroid override: ${override.naturalKey}`);
    }
    if (!claim(row, entry, 'manual-reviewed')) {
      throw new Error(`Centroid override rejected: ${override.naturalKey}`);
    }
  }

  const output: PlaceCentroidEntry[] = [];
  for (const row of rows) {
    const hit = matched.get(row.runtime_natural_key);
    if (!hit) continue;
    const centre = centreOf(row);
    const parentKey = row.runtime_parent_natural_key;
    output.push({
      canonicalPlaceId: hit.entry.place_id,
      naturalKey: row.runtime_natural_key,
      // The URL entry's scope is the runtime truth for a manual bridge.
      level:
        hit.method === 'manual-reviewed'
          ? hit.entry.search_scope === 'metro_city'
            ? 'city'
            : 'suburb'
          : (row.runtime_storage_level as 'city' | 'suburb'),
      parentCityPlaceId:
        row.runtime_storage_level === 'suburb' && parentKey
          ? (matched.get(parentKey)?.entry.place_id ?? null)
          : null,
      lat: centre?.lat ?? null,
      lng: centre?.lng ?? null,
      matchMethod: hit.method,
    });
  }
  output.sort((a, b) => a.canonicalPlaceId.localeCompare(b.canonicalPlaceId));

  writeFileSync(
    resolve(process.cwd(), OUTPUT_PATH),
    `${JSON.stringify(
      {
        source: { path: SOURCE_PATH, sha256: sourceSha256 },
        urlProjection: { path: URL_PROJECTION_PATH },
        overrides: { path: OVERRIDES_PATH },
        generatedAt: new Date().toISOString(),
        entries: output,
      },
      null,
      1,
    )}\n`,
  );

  const perTier: Record<string, number> = {};
  for (const { method } of matched.values()) perTier[method] = (perTier[method] ?? 0) + 1;
  const unresolved = rows.filter(row => !matched.has(row.runtime_natural_key));
  console.log(
    JSON.stringify(
      {
        sourceRows: rows.length,
        matched: matched.size,
        unmatched: unresolved.length,
        perTier,
        matchedWithoutCoordinates: output.filter(item => item.lat === null).length,
        droppedBySanity: dropped,
        unresolvedNaturalKeys: unresolved.map(row => row.runtime_natural_key),
      },
      null,
      1,
    ),
  );
}

main();
