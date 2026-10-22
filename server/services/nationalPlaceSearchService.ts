import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { and, eq, inArray, like, or, sql } from 'drizzle-orm';
import { aliasedTable } from 'drizzle-orm';
import { place, placeName, placeRelationship } from '../../drizzle/schema';

/** The same tables joined again for the child side of a relationship. */
const childPlace = aliasedTable(place, 'childPlace');
const childName = aliasedTable(placeName, 'childName');
import { getDb } from '../db-connection';
import type { CanonicalLocationDiscoveryResult } from '../../shared/searchDiscovery';
import type { CanonicalLocationLevel } from '../../shared/locationAuthority';

/**
 * National place discovery, resolved from the canonical Place Authority.
 *
 * The runtime projection holds one province. The Place Authority holds all nine, so public
 * discovery reads the Place Authority and the projection remains a fallback.
 *
 * The release policy is applied exactly as the admission builder set it. A place appears in a
 * public result only when it is released by the licence policy and searchable. The places held
 * by the release policy are excluded until they are individually eligible for release.
 *
 * The canonical handle is the Place identity. The numeric runtime handle belonged to the
 * projection, and the projection does not contain the places outside Gauteng, so there is no
 * numeric handle to preserve for them.
 *
 * The published URL is a separate authority. The registry records the URL and the label we
 * already publish for each place and the canonical Place behind it, so a published link never
 * moves under a customer and a published place never disappears from search. The registry never
 * decides whether a place exists, is searchable or is publishable.
 */

const LEVEL_BY_SCOPE: Record<string, CanonicalLocationLevel> = {
  province: 'province',
  metro_city: 'city',
  locality: 'suburb',
};

const SCOPE_BY_LEVEL: Record<CanonicalLocationLevel, string> = {
  province: 'province',
  city: 'metro_city',
  suburb: 'locality',
};

const TYPE_LABEL_BY_TYPE: Record<string, string> = {
  province: 'Province',
  city: 'City',
  town: 'Town',
  township: 'Township',
  suburb: 'Suburb',
  neighbourhood: 'Neighbourhood',
  locality: 'Locality',
  village: 'Village',
};

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** One published location, bound to the canonical Place identity behind it. */
export interface PublishedPlaceEntry {
  /** The label we publish for this place. */
  label: string;
  /** The published region segment, or null when the place is published under its province. */
  region: string | null;
  /** The published region label, used for display. */
  regionName: string | null;
  /** The published place segment. */
  place: string;
  /** The published path. */
  path: string;
  /** The published level, which decides the published path shape. */
  level: CanonicalLocationLevel;
  provinceSlug: string;
  provinceName: string;
  /** The rule that bound this published location to this Place. */
  matchRule: string;
}

export interface PublishedPlaceRegistry {
  registryVersion: string;
  places: Record<string, PublishedPlaceEntry>;
  unmapped: Array<{
    path: string;
    label: string;
    level: CanonicalLocationLevel;
    region: string | null;
    regionName: string | null;
    place: string;
    provinceSlug: string;
    provinceName: string;
    reason: string;
  }>;
}

const REGISTRY_PATH = 'data/geography-coverage-v0.1/output/gauteng_published_place_registry_v0.2.json';

let publishedRegistry: PublishedPlaceRegistry | null | undefined;

function loadPublishedPlaceRegistry(): PublishedPlaceRegistry | null {
  if (publishedRegistry === undefined) {
    try {
      const path = join(process.cwd(), REGISTRY_PATH);
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as PublishedPlaceRegistry;
      publishedRegistry = parsed?.places ? parsed : null;
    } catch {
      publishedRegistry = null;
    }
  }
  return publishedRegistry;
}

/**
 * The published runtime handle for a published location.
 *
 * The read goes through the registered projection boundary, so the published projection keeps a
 * single reader. The published geography is the only record of a location the Place Authority
 * has not admitted, and it is resolved at the URL we already publish.
 */
async function resolvePublishedRuntimeHandle(
  entry: {
    level: CanonicalLocationLevel;
    region: string | null;
    place: string;
    provinceSlug: string;
  },
): Promise<{ handle: string; parentHandle?: string; status?: string } | null> {
  const { resolvePublishedPlaceScope } = await import('./geographyAuthorityService');
  const scope = await resolvePublishedPlaceScope({
    placeSlug: entry.place,
    provinceSlug: entry.provinceSlug,
    citySlug: entry.region,
  });
  if (!scope) return null;
  return {
    handle: scope.canonicalLocationId,
    parentHandle: scope.parentCanonicalLocationId,
    status: scope.status,
  };
}

/**
 * The runtime query handles for the published places in a result set, in one read.
 */
async function resolveRuntimeHandles(
  entries: readonly PublishedPlaceEntry[],
): Promise<
  Map<string, { canonicalLocationId: string; parentCanonicalLocationId?: string; status: string }>
> {
  const handles = new Map<
    string,
    { canonicalLocationId: string; parentCanonicalLocationId?: string; status: string }
  >();
  if (!entries.length) return handles;
  const { resolvePublishedPlaceScopes } = await import('./geographyAuthorityService');
  const resolved = await resolvePublishedPlaceScopes({
    places: entries.map(entry => ({
      placeSlug: entry.place,
      provinceSlug: entry.provinceSlug,
      citySlug: entry.region,
    })),
  });
  for (const entry of entries) {
    if (!entry.region) continue;
    const handle = resolved.get(`${entry.provinceSlug}/${entry.region}/${entry.place}`);
    if (handle) handles.set(entry.path, handle);
  }
  return handles;
}

interface AncestorRow {
  childPlaceId: string;
  parentPlaceId: string;
  parentName: string;
  parentType: string;
  parentScope: string | null;
  /** The child's own name and scope, so a container can be resolved to the scope it holds. */
  childName?: string;
  childScope?: string | null;
}

interface PlaceRow {
  placeId: string;
  placeType: string;
  searchScope: string | null;
  verificationStatus: string;
  name: string;
}

let administrativeGraph: Promise<AncestorRow[]> | null = null;

async function loadAdministrativeGraph(db: any): Promise<AncestorRow[]> {
  if (!administrativeGraph) administrativeGraph = readAdministrativeGraph(db);
  return administrativeGraph;
}

async function readAdministrativeGraph(db: any): Promise<AncestorRow[]> {
  return (await db
    .select({
      childPlaceId: placeRelationship.fromPlaceId,
      parentPlaceId: placeRelationship.toPlaceId,
      parentName: placeName.name,
      parentType: place.placeType,
      parentScope: place.searchScope,
      childName: childName.name,
      childScope: childPlace.searchScope,
    })
    .from(placeRelationship)
    .innerJoin(place, eq(place.placeId, placeRelationship.toPlaceId))
    .innerJoin(childPlace, eq(childPlace.placeId, placeRelationship.fromPlaceId))
    .innerJoin(
      placeName,
      and(
        eq(placeName.placeId, place.placeId),
        eq(placeName.nameRole, 'preferred_public'),
        eq(placeName.nameState, 'active'),
      ),
    )
    .innerJoin(
      childName,
      and(
        eq(childName.placeId, childPlace.placeId),
        eq(childName.nameRole, 'preferred_public'),
        eq(childName.nameState, 'active'),
      ),
    )
    .where(
      eq(placeRelationship.relationshipType, 'administratively_contains'),
    )) as unknown as AncestorRow[];
}

export interface NationalPlaceSearchOptions {
  limit?: number;
  query: string;
}

/**
 * Find the places a customer may search, with the hierarchy context they need to choose one.
 *
 * A place is offered only when the release policy releases it and the Place Authority marks
 * it searchable. A place we already publish is offered under the label and the URL we already
 * publish, whether or not the Place Authority's own preferred spelling differs.
 */
export async function searchNationalPlaces(
  options: NationalPlaceSearchOptions,
): Promise<CanonicalLocationDiscoveryResult[]> {
  const db = await getDb();
  if (!db) return [];

  const query = options.query.trim();
  if (!query) return [];
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 20);
  const pattern = `%${query.toLowerCase()}%`;

  const registry = loadPublishedPlaceRegistry();
  const registryEntries = registry ? Object.entries(registry.places) : [];

  // The published locations whose published label carries the query. A place we publish under
  // a name the Place Authority does not carry as a searchable public name is still found,
  // because the published label is what a customer types.
  const publishedMatches = registryEntries
    .filter(([, entry]) => entry.label.toLowerCase().includes(query.toLowerCase()))
    .map(([placeId]) => placeId);

  const rows = (await db
    .select({
      placeId: place.placeId,
      placeType: place.placeType,
      searchScope: place.searchScope,
      verificationStatus: place.verificationStatus,
      name: placeName.name,
    })
    .from(place)
    .innerJoin(
      placeName,
      and(
        eq(placeName.placeId, place.placeId),
        eq(placeName.nameRole, 'preferred_public'),
        eq(placeName.nameState, 'active'),
        eq(placeName.isSearchable, 1),
      ),
    )
    .where(
      and(
        // A place appears in a public result when the release policy released it and the
        // Place Authority marks it searchable. The licensing classification no longer
        // withholds a place from search: the release policy admits traceable places, and
        // publication as a guide page stays the stricter gate.
        eq(place.searchEligible, 1),
        or(
          like(sql`LOWER(${placeName.name})`, pattern),
          like(sql`LOWER(${placeName.normalizedName})`, pattern),
        ),
      ),
    )
    .limit(limit * 4)) as unknown as PlaceRow[];

  const seen = new Set(rows.map(row => row.placeId));
  const missingPublished = publishedMatches.filter(placeId => !seen.has(placeId));
  if (missingPublished.length) {
    // A published place whose canonical name is not a searchable public name is fetched by
    // identity. The place record still comes from the Place Authority; only the label and the
    // URL come from the published registry.
    const extra = (await db
      .select({
        placeId: place.placeId,
        placeType: place.placeType,
        searchScope: place.searchScope,
        verificationStatus: place.verificationStatus,
      })
      .from(place)
      .where(and(eq(place.searchEligible, 1), inArray(place.placeId, missingPublished)))) as unknown as
      Array<Omit<PlaceRow, 'name'>>;
    for (const row of extra) {
      rows.push({ ...row, name: registry?.places[row.placeId]?.label ?? '' });
    }
  }

  if (!rows.length) return [];

  // The hierarchy context comes from the same authority, so a result is never described with
  // a parent that the Place Authority does not assert.
  // The administrative graph is reference data. It is read once and kept for the life of the
  // process, so a search does not re-read it.
  const edges = await loadAdministrativeGraph(db);

  const ancestorsByChild = new Map<string, AncestorRow[]>();
  for (const edge of edges) {
    const chain = ancestorsByChild.get(edge.childPlaceId) ?? [];
    chain.push(edge);
    ancestorsByChild.set(edge.childPlaceId, chain);
  }

  // The chain is walked transitively: a place's ancestors include its grandparent, so a city
  // reaches its province through the municipality that contains it.
  const ancestorsFor = (placeId: string): AncestorRow[] => {
    const chain: AncestorRow[] = [];
    const seen = new Set<string>([placeId]);
    let cursor = placeId;
    for (let depth = 0; depth < 6; depth += 1) {
      const direct = ancestorsByChild.get(cursor);
      if (!direct || !direct.length) break;
      for (const ancestor of direct) {
        if (seen.has(ancestor.parentPlaceId)) continue;
        seen.add(ancestor.parentPlaceId);
        chain.push(ancestor);
      }
      cursor = direct[0].parentPlaceId;
    }
    return chain;
  };

  const ancestorByScope = (placeId: string, scope: string): AncestorRow | undefined =>
    ancestorsFor(placeId).find(ancestor => ancestor.parentScope === scope);

  // The scopes each container holds, so a municipality can be resolved to its city or town.
  const scopesByContainer = new Map<string, AncestorRow[]>();
  for (const edge of edges) {
    if (edge.childScope !== 'metro_city') continue;
    const held = scopesByContainer.get(edge.parentPlaceId) ?? [];
    if (!edge.childName) continue;
    held.push({ ...edge, parentName: edge.childName, parentScope: edge.childScope });
    scopesByContainer.set(edge.parentPlaceId, held);
  }

  const MUNICIPAL_SUFFIX =
    /\s+(metropolitan municipality|local municipality|district municipality|metro municipality)$/i;

  /**
   * The runtime query handle for the published places in this result set.
   *
   * The public search execution still resolves a city scope through the published projection,
   * because the Place Authority has no reviewed city-to-suburb membership rule yet. The handle
   * is read in one pass, through the registered projection boundary, and only for the places we
   * already publish.
   */
  const publishedEntries = rows
    .map(row => registry?.places[row.placeId])
    .filter((entry): entry is PublishedPlaceEntry => Boolean(entry));
  const runtimeHandles = await resolveRuntimeHandles(publishedEntries);

  /**
   * The region segment of a public path for a place the registry does not bind.
   *
   * This is a URL and display convention, not an administrative claim. A place's direct ancestor
   * is often a municipality container rather than a searchable scope, so the container is
   * resolved to the city or town scope it holds: the scope whose name the container names, or
   * the single scope it holds, or otherwise the container's own name with its municipal form
   * removed. The rule is versioned with the release policy, so a published URL never changes
   * under a customer.
   */
  const derivedRegionFor = (placeId: string): { name: string; slug: string } | undefined => {
    const scoped = ancestorByScope(placeId, 'metro_city');
    if (scoped) return { name: scoped.parentName, slug: slugify(scoped.parentName) };

    const container = ancestorsFor(placeId)[0];
    if (!container) return undefined;
    const held = scopesByContainer.get(container.parentPlaceId) ?? [];
    const containerName = container.parentName.toLowerCase();
    const named = held.find(scope => containerName.includes(scope.parentName.toLowerCase()));
    if (named) return { name: named.parentName, slug: slugify(named.parentName) };
    if (held.length === 1) return { name: held[0].parentName, slug: slugify(held[0].parentName) };
    const stripped = container.parentName.replace(MUNICIPAL_SUFFIX, '').trim();
    return { name: stripped, slug: slugify(stripped) };
  };

  const results: CanonicalLocationDiscoveryResult[] = [];
  for (const row of rows) {
    const published = registry?.places[row.placeId];
    const canonicalLevel = LEVEL_BY_SCOPE[row.searchScope || ''];
    if (!published && !canonicalLevel) continue;

    const provinceAncestor = ancestorByScope(row.placeId, 'province');
    const provinceName = published
      ? published.provinceName
      : canonicalLevel === 'province'
        ? row.name
        : (provinceAncestor?.parentName ?? null);

    let level: CanonicalLocationLevel;
    let label: string;
    let regionName: string | null;
    let regionSlug: string | undefined;
    let placeSlug: string | undefined;
    let canonicalPath: string;

    if (published) {
      // A place we already publish is offered under the label and the URL we already publish.
      // The published level decides the path shape, because the published path is the shape
      // customers already hold. A published city is its own city scope, and a published suburb
      // sits under the city scope the published path names.
      level = published.level;
      label = published.label;
      regionName = published.regionName;
      regionSlug = published.level === 'city' ? published.place : (published.region ?? undefined);
      placeSlug = published.level === 'suburb' ? published.place : undefined;
      canonicalPath = published.path;
    } else {
      level = canonicalLevel as CanonicalLocationLevel;
      label = row.name;
      const region = level === 'province' ? undefined : derivedRegionFor(row.placeId);
      regionName = region?.name ?? null;
      regionSlug = level === 'city' ? slugify(row.name) : region?.slug;
      placeSlug = level === 'suburb' ? slugify(row.name) : undefined;
      const provinceSlug = provinceName ? slugify(provinceName) : undefined;
      const path =
        regionSlug && placeSlug && regionSlug === placeSlug
          ? [provinceSlug, placeSlug].filter(Boolean).join('/')
          : [provinceSlug, regionSlug, placeSlug].filter(Boolean).join('/');
      canonicalPath = `/${path}`;
    }

    const parent = ancestorsFor(row.placeId)[0];

    results.push({
      kind: 'canonical_location',
      canonicalLocationId: row.placeId,
      ...(published && runtimeHandles.get(published.path)
        ? { runtimeLocationId: runtimeHandles.get(published.path)!.canonicalLocationId }
        : {}),
      label,
      factualLevel: level,
      searchScopeKind: SCOPE_BY_LEVEL[level] as 'province' | 'metro_city' | 'locality',
      display: {
        typeLabel: TYPE_LABEL_BY_TYPE[row.placeType] || 'Place',
        // The context is the place's immediate published parent, so a suggestion reads
        // "Melville, Johannesburg" rather than "Gauteng, Johannesburg". The province stays
        // on the result for a consumer that needs to disambiguate two places of the same
        // name in the same parent.
        contextLabel:
          level === 'province' ? undefined : level === 'city' ? provinceName ?? undefined : regionName ?? undefined,
      },
      provinceSlug: published ? published.provinceSlug : provinceName ? slugify(provinceName) : '',
      ...(regionSlug ? { citySlug: regionSlug } : {}),
      ...(placeSlug ? { suburbSlug: placeSlug } : {}),
      ...(parent ? { parentCanonicalLocationId: parent.parentPlaceId } : {}),
      ...(provinceName ? { provinceName } : {}),
      ...(regionName ? { cityName: regionName } : {}),
      status: row.verificationStatus,
      canonicalPath,
      source: 'canonical_geography',
    });
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * The published locations the Place Authority has not admitted.
 *
 * A published location that the Place Authority does not carry has no canonical identity. The
 * published geography is the only record of it, so the published runtime projection remains the
 * resolver for those locations, at the URL we already publish, until the Place Authority admits
 * them.
 *
 * The set is bounded by the published-place registry, every result says which authority
 * answered, and the removal condition is objective: the location is admitted to the Place
 * Authority and leaves the registry's unmapped list.
 */
export async function searchPublishedProjectionFallback(
  options: NationalPlaceSearchOptions,
): Promise<CanonicalLocationDiscoveryResult[]> {
  const registry = loadPublishedPlaceRegistry();
  if (!registry?.unmapped.length) return [];

  const query = options.query.trim().toLowerCase();
  if (!query) return [];

  const wanted = registry.unmapped.filter(entry =>
    entry.label.toLowerCase().includes(query),
  );
  if (!wanted.length) return [];

  const db = await getDb();
  if (!db) return [];

  const results: CanonicalLocationDiscoveryResult[] = [];
  for (const entry of wanted) {
    const resolved = await resolvePublishedRuntimeHandle(entry);
    if (!resolved) continue;
    results.push({
      kind: 'canonical_location',
      canonicalLocationId: resolved.handle,
      label: entry.label,
      factualLevel: entry.level,
      searchScopeKind: entry.level === 'city' ? 'metro_city' : 'locality',
      display: {
        typeLabel: entry.level === 'city' ? 'City' : 'Suburb',
        contextLabel:
          entry.level === 'province'
            ? undefined
            : [entry.provinceName ?? entry.provinceSlug, entry.regionName]
                .filter(Boolean)
                .join(' · '),
      },
      provinceSlug: entry.provinceSlug,
      ...(entry.region ? { citySlug: entry.region } : {}),
      ...(entry.level === 'suburb' ? { suburbSlug: entry.place } : {}),
      ...(resolved.parentHandle ? { parentCanonicalLocationId: resolved.parentHandle } : {}),
      ...(entry.provinceName ? { provinceName: entry.provinceName } : {}),
      ...(entry.regionName ? { cityName: entry.regionName } : {}),
      status: resolved.status,
      canonicalPath: entry.path,
      source: 'published_projection',
    });
  }
  return results;
}

/**
 * The published locations a customer may search, from both authorities.
 *
 * The Place Authority answers first. A published location the Place Authority does not carry
 * is added from the published projection, so no published link disappears from search while the
 * canonical authority catches up.
 */
export async function searchPublicPlaceSuggestions(
  options: NationalPlaceSearchOptions,
): Promise<CanonicalLocationDiscoveryResult[]> {
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 20);
  const canonical = await searchNationalPlaces({ query: options.query, limit });
  const covered = new Set(canonical.map(result => result.canonicalPath));
  const merged = [...canonical];
  for (const result of await searchPublishedProjectionFallback({ query: options.query })) {
    if (merged.length >= limit) break;
    if (covered.has(result.canonicalPath)) continue;
    covered.add(result.canonicalPath);
    merged.push(result);
  }
  return merged;
}
