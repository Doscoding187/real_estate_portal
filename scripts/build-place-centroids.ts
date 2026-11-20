/**
 * Builds data/place-centroids-gauteng-v0.1.json: a place-centre lookup for the
 * Gauteng place guide. Centroids come from the committed Gauteng runtime
 * reference projection (runtime_natural_key, latitude, longitude); each natural
 * key is mapped to a canonical place id through the national canonical place
 * URL projection (the same data resolveCanonicalUrl reads). No database, no
 * network. Nothing is guessed: rows that match no tier are listed and omitted.
 *
 * After every internal tier (and the reviewed overrides) a committed external
 * file (Wikidata, CC0-1.0, data/place-centroid-external-gauteng-v0.1.json) may
 * fill places that still have no centre. Internal data always wins.
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
const OVERRIDES_PATH = 'data/place-centroid-overrides-gauteng-v0.1.json';
const EXTERNAL_PATH = 'data/place-centroid-external-gauteng-v0.1.json';
/** Tier 2b/3/4 and external matches further than this from the parent city are dropped. */
export const MAX_PARENT_DISTANCE_KM = 60;

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

export type MatchMethod =
  | 'tier1_exact_path'
  | 'tier2_slug_path_context'
  | 'tier2b_city_alias'
  | 'tier3_slug_name_unique'
  | 'tier3b_grid_code'
  | 'tier4_level_bridge'
  | 'manual-reviewed'
  | 'external_wikidata';

export type SourceRow = {
  runtime_storage_level: string;
  runtime_natural_key: string;
  runtime_parent_natural_key: string | null;
  name: string;
  slug: string;
  latitude?: number;
  longitude?: number;
};

export type UrlEntry = {
  place_id: string;
  preferred_public_name: string;
  search_scope: string;
  path: string;
  path_segment: string;
  province_slug: string;
  path_context: { place_id?: string; path_segment?: string } | null;
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

export type CentroidOverride = { naturalKey: string; canonicalPath: string; reason: string };

export type ExternalEntry = {
  /** Canonical URL path without the leading slash, e.g. gauteng/city-of-johannesburg/bryanston. */
  naturalKey: string;
  lat: number;
  lng: number;
  qid: string;
  label: string;
  note?: string;
};

export type ExternalFile = {
  version: string;
  source: { name: string; licence: string; url: string; retrievedAt: string };
  entries: ExternalEntry[];
};

export type BuildResult = {
  output: PlaceCentroidEntry[];
  matched: Map<string, { entry: UrlEntry; method: MatchMethod }>;
  unresolved: SourceRow[];
  dropped: Array<{ naturalKey: string; method: MatchMethod; reason: string }>;
  externalRejected: Array<{ naturalKey: string; reason: string }>;
  externalApplied: number;
  externalUnchecked: number;
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
/** Name comparison for the level bridge: case-insensitive, curly apostrophes folded. */
const bridgeName = (value: string) => lower(value).replace(/[‘’]/g, "'");

/**
 * "C.E. 1" and "CE1" are the same Vanderbijlpark/Vereeniging grid code: strip
 * dots and spaces, lower-case. Only the CE/CW/SE/SW/NW families qualify.
 */
export function normaliseGridCode(name: string): string | null {
  const code = name.toLowerCase().replace(/[.\s]/g, '');
  return /^(ce|cw|se|sw|nw)\d+$/.test(code) ? code : null;
}

function uniqueBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T | null> {
  const map = new Map<string, T | null>();
  for (const item of items) {
    const key = keyOf(item);
    map.set(key, map.has(key) ? null : item);
  }
  return map;
}

export function buildPlaceCentroids(input: {
  rows: readonly SourceRow[];
  entries: readonly UrlEntry[];
  overrides: readonly CentroidOverride[];
  external?: ExternalFile | null;
}): BuildResult {
  const rows = input.rows.filter(
    row => row.runtime_storage_level === 'city' || row.runtime_storage_level === 'suburb',
  );
  const entries = input.entries.filter(entry => entry.province_slug === 'gauteng');

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
  const dropped: BuildResult['dropped'] = [];
  const centreOf = (row: SourceRow) =>
    typeof row.latitude === 'number' && typeof row.longitude === 'number'
      ? { lat: row.latitude, lng: row.longitude }
      : null;
  const rowByKey = new Map(rows.map(row => [row.runtime_natural_key, row]));

  const claim = (row: SourceRow, entry: UrlEntry | null | undefined, method: MatchMethod) => {
    if (!entry || taken.has(entry.place_id)) return false;
    // Reviewed overrides and the level bridge may map a source city row to a locality URL entry.
    if (
      method !== 'manual-reviewed' &&
      method !== 'tier4_level_bridge' &&
      entry.search_scope !== scopeOf(row.runtime_storage_level)
    ) {
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

  // Tier 3b: grid codes ("C.E. 1" vs "CE1"), unique on both sides.
  const gridRowByCode = uniqueBy(
    rows.filter(row => row.runtime_storage_level === 'suburb' && normaliseGridCode(row.name)),
    row => normaliseGridCode(row.name)!,
  );
  const gridEntryByCode = uniqueBy(
    entries.filter(
      entry => entry.search_scope === 'locality' && normaliseGridCode(entry.preferred_public_name),
    ),
    entry => normaliseGridCode(entry.preferred_public_name)!,
  );
  for (const row of pending(r => r.runtime_storage_level === 'suburb')) {
    const code = normaliseGridCode(row.name);
    if (!code || gridRowByCode.get(code) !== row) continue;
    claim(row, gridEntryByCode.get(code), 'tier3b_grid_code');
  }

  // Reviewed manual tier: only for keys no automatic tier resolved, path must exist.
  for (const override of input.overrides) {
    const row = rowByKey.get(override.naturalKey);
    const entry = byPath.get(override.canonicalPath);
    if (!override.reason || !row || !entry || matched.has(override.naturalKey)) {
      throw new Error(`Invalid or unnecessary centroid override: ${override.naturalKey}`);
    }
    if (!claim(row, entry, 'manual-reviewed')) {
      throw new Error(`Centroid override rejected: ${override.naturalKey}`);
    }
  }

  // The parent city of a URL entry: its path_context place, else an aliased city path,
  // restricted to cities that matched a runtime row. Centre may be null (no coordinates).
  const cityByPlaceId = () => {
    const map = new Map<string, { placeId: string; centre: { lat: number; lng: number } | null }>();
    for (const [key, hit] of matched) {
      if (hit.entry.search_scope !== 'metro_city') continue;
      map.set(hit.entry.place_id, {
        placeId: hit.entry.place_id,
        centre: centreOf(rowByKey.get(key)!),
      });
    }
    return map;
  };
  const parentCityOf = (entry: UrlEntry, cities: ReturnType<typeof cityByPlaceId>) => {
    const context = entry.path_context;
    if (!context) return null;
    const candidates: Array<string | undefined> = [context.place_id];
    for (const alias of (context.path_segment && CITY_SEGMENT_ALIASES[context.path_segment]) || [])
      candidates.push(byPath.get(`/gauteng/${alias}`)?.place_id);
    for (const placeId of candidates) {
      const city = placeId ? cities.get(placeId) : undefined;
      if (city) return city;
    }
    return null;
  };

  // Tier 4: a runtime city-level row with coordinates supplies the centre of the one URL
  // locality with the same slug and name, provided the URL parent city centre is known and
  // the row is within MAX_PARENT_DISTANCE_KM of it. One URL entry per runtime row.
  const cities = cityByPlaceId();
  const localityBySlugName = new Map<string, UrlEntry[]>();
  for (const entry of entries) {
    if (entry.search_scope !== 'locality') continue;
    const key = `${entry.path_segment}|${bridgeName(entry.preferred_public_name)}`;
    localityBySlugName.set(key, [...(localityBySlugName.get(key) ?? []), entry]);
  }
  for (const row of pending(r => r.runtime_storage_level === 'city')) {
    const own = centreOf(row);
    if (!own || rowByNameKey.get(`city|${row.slug}|${lower(row.name)}`) !== row) continue;
    const candidates = (localityBySlugName.get(`${row.slug}|${bridgeName(row.name)}`) ?? []).filter(
      entry => !taken.has(entry.place_id),
    );
    if (candidates.length !== 1) continue;
    const parent = parentCityOf(candidates[0], cities);
    if (!parent?.centre) continue;
    const km = haversineKm(own, parent.centre);
    if (km > MAX_PARENT_DISTANCE_KM) {
      dropped.push({
        naturalKey: row.runtime_natural_key,
        method: 'tier4_level_bridge',
        reason: `${km.toFixed(1)} km from URL parent city centroid`,
      });
      continue;
    }
    claim(row, candidates[0], 'tier4_level_bridge');
  }

  const parentOfMatched = (hit: { entry: UrlEntry; method: MatchMethod }, row: SourceRow) => {
    const parentKey = row.runtime_parent_natural_key;
    if (hit.method === 'tier4_level_bridge')
      return parentCityOf(hit.entry, cities)?.placeId ?? null;
    return row.runtime_storage_level === 'suburb' && parentKey
      ? (matched.get(parentKey)?.entry.place_id ?? null)
      : null;
  };

  const output: PlaceCentroidEntry[] = [];
  for (const row of rows) {
    const hit = matched.get(row.runtime_natural_key);
    if (!hit) continue;
    const centre = centreOf(row);
    output.push({
      canonicalPlaceId: hit.entry.place_id,
      naturalKey: row.runtime_natural_key,
      // The URL entry's scope is the runtime truth for a manual or bridged match.
      level:
        hit.method === 'manual-reviewed' || hit.method === 'tier4_level_bridge'
          ? hit.entry.search_scope === 'metro_city'
            ? 'city'
            : 'suburb'
          : (row.runtime_storage_level as 'city' | 'suburb'),
      parentCityPlaceId: parentOfMatched(hit, row),
      lat: centre?.lat ?? null,
      lng: centre?.lng ?? null,
      matchMethod: hit.method,
    });
  }

  // External tier (last): fills places that still have no centre. Internal data always wins.
  const externalRejected: BuildResult['externalRejected'] = [];
  let externalApplied = 0;
  let externalUnchecked = 0;
  const outputByPlaceId = new Map(output.map(item => [item.canonicalPlaceId, item]));
  for (const ext of input.external?.entries ?? []) {
    const entry = byPath.get(`/${ext.naturalKey}`);
    if (!entry || entry.search_scope !== 'locality') {
      externalRejected.push({ naturalKey: ext.naturalKey, reason: 'not a Gauteng locality path' });
      continue;
    }
    const existing = outputByPlaceId.get(entry.place_id);
    if (existing && existing.lat !== null && existing.lng !== null) {
      externalRejected.push({
        naturalKey: ext.naturalKey,
        reason: 'internal data already has a centre',
      });
      continue;
    }
    if (taken.has(entry.place_id) && !existing) continue;
    const parent = parentCityOf(entry, cities);
    if (parent?.centre) {
      const km = haversineKm({ lat: ext.lat, lng: ext.lng }, parent.centre);
      if (km > MAX_PARENT_DISTANCE_KM) {
        externalRejected.push({
          naturalKey: ext.naturalKey,
          reason: `${km.toFixed(1)} km from parent city centroid`,
        });
        continue;
      }
    } else {
      externalUnchecked += 1;
    }
    externalApplied += 1;
    if (existing) {
      existing.lat = ext.lat;
      existing.lng = ext.lng;
      existing.matchMethod = 'external_wikidata';
      existing.parentCityPlaceId ??= parent?.placeId ?? null;
    } else {
      const created: PlaceCentroidEntry = {
        canonicalPlaceId: entry.place_id,
        naturalKey: ext.naturalKey,
        level: 'suburb',
        parentCityPlaceId: parent?.placeId ?? null,
        lat: ext.lat,
        lng: ext.lng,
        matchMethod: 'external_wikidata',
      };
      output.push(created);
      outputByPlaceId.set(created.canonicalPlaceId, created);
    }
  }
  output.sort((a, b) => a.canonicalPlaceId.localeCompare(b.canonicalPlaceId));

  return {
    output,
    matched,
    unresolved: rows.filter(row => !matched.has(row.runtime_natural_key)),
    dropped,
    externalRejected,
    externalApplied,
    externalUnchecked,
  };
}

function main() {
  const sourceBytes = readFileSync(resolve(process.cwd(), SOURCE_PATH));
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  const rows = (JSON.parse(sourceBytes.toString('utf8')) as { rows: SourceRow[] }).rows;
  const entries = (
    JSON.parse(readFileSync(resolve(process.cwd(), URL_PROJECTION_PATH), 'utf8')) as {
      entries: UrlEntry[];
    }
  ).entries;
  const overrides = (
    JSON.parse(readFileSync(resolve(process.cwd(), OVERRIDES_PATH), 'utf8')) as {
      overrides: CentroidOverride[];
    }
  ).overrides;
  const externalBytes = readFileSync(resolve(process.cwd(), EXTERNAL_PATH));
  const external = JSON.parse(externalBytes.toString('utf8')) as ExternalFile;

  const result = buildPlaceCentroids({ rows, entries, overrides, external });

  writeFileSync(
    resolve(process.cwd(), OUTPUT_PATH),
    `${JSON.stringify(
      {
        source: { path: SOURCE_PATH, sha256: sourceSha256 },
        urlProjection: { path: URL_PROJECTION_PATH },
        overrides: { path: OVERRIDES_PATH },
        external: {
          path: EXTERNAL_PATH,
          sha256: createHash('sha256').update(externalBytes).digest('hex'),
          source: external.source,
        },
        generatedAt: new Date().toISOString(),
        entries: result.output,
      },
      null,
      1,
    )}\n`,
  );

  const perTier: Record<string, number> = {};
  for (const { method } of result.matched.values()) perTier[method] = (perTier[method] ?? 0) + 1;
  if (result.externalApplied) perTier.external_wikidata = result.externalApplied;
  const centred = new Set(
    result.output.filter(item => item.lat !== null).map(item => item.canonicalPlaceId),
  );
  const localities = entries.filter(
    entry => entry.province_slug === 'gauteng' && entry.search_scope === 'locality',
  );
  const missing = localities.filter(entry => !centred.has(entry.place_id));
  console.log(
    JSON.stringify(
      {
        sourceRows: rows.length,
        matched: result.matched.size,
        unmatched: result.unresolved.length,
        perTier,
        matchedWithoutCoordinates: result.output.filter(item => item.lat === null).length,
        droppedBySanity: result.dropped,
        externalRejected: result.externalRejected,
        externalWithoutParentCheck: result.externalUnchecked,
        unresolvedNaturalKeys: result.unresolved.map(row => row.runtime_natural_key),
        gautengLocalities: localities.length,
        localitiesWithoutCentre: missing.length,
        localitiesWithoutCentrePaths: missing.map(entry => entry.path),
      },
      null,
      1,
    ),
  );
}

if (process.argv[1]?.endsWith('build-place-centroids.ts')) main();
