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
 * by the release policy, including the 720 Gauteng records under review, are excluded until
 * they are individually eligible for release.
 *
 * The canonical handle is the Place identity. The numeric runtime handle belonged to the
 * projection, and the projection does not contain the places outside Gauteng, so there is no
 * numeric handle to preserve for them.
 */

const RELEASED_LICENSING = ['permissive_supported', 'mixed_odbl_supported'] as const;

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
  parentPlaceId: string | null;
  provincePlaceId: string | null;
  provinceName: string | null;
  cityPlaceId: string | null;
  cityName: string | null;
}

export interface NationalPlaceSearchOptions {
  limit?: number;
  query: string;
}

/**
 * Find the places a customer may search, with the hierarchy context they need to choose one.
 * A place is offered only when the release policy releases it and the Place Authority marks
 * it searchable.
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

  const rows = (await db
    .select({
      placeId: place.placeId,
      placeType: place.placeType,
      searchScope: place.searchScope,
      verificationStatus: place.verificationStatus,
      name: placeName.name,
      parentPlaceId: placeRelationship.toPlaceId,
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
    .leftJoin(
      placeRelationship,
      and(
        eq(placeRelationship.fromPlaceId, place.placeId),
        eq(placeRelationship.relationshipType, 'administratively_contains'),
      ),
    )
    .where(
      and(
        eq(place.searchEligible, 1),
        inArray(place.licensingClassification, [...RELEASED_LICENSING]),
        or(
          like(sql`LOWER(${placeName.name})`, pattern),
          like(sql`LOWER(${placeName.normalizedName})`, pattern),
        ),
      ),
    )
    .limit(limit * 4)) as unknown as Array<
    Omit<PlaceRow, 'provincePlaceId' | 'provinceName' | 'cityPlaceId' | 'cityName'>
  >;

  if (!rows.length) return [];

  // The hierarchy context comes from the same authority, so a result is never described with
  // a parent that the Place Authority does not assert.
  const candidateIds = rows.map(row => row.placeId);
  // The whole administrative graph is read once and walked in memory. The graph is small
  // compared with the rest of the platform, and one read keeps the search fast.
  const edges = (await db
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
   * The region segment of a public path.
   *
   * This is a URL and display convention, not an administrative claim. A place's direct ancestor
   * is often a municipality container rather than a searchable scope, so the container is
   * resolved to the city or town scope it holds: the scope whose name the container names, or the
   * single scope it holds, or otherwise the container's own name with its municipal form removed.
   * The rule is versioned with the release policy, so a published URL never changes under a
   * customer.
   */
  const regionFor = (placeId: string): { name: string; slug: string } | undefined => {
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
    const level = LEVEL_BY_SCOPE[row.searchScope || ''];
    if (!level) continue;
    const provinceAncestor = ancestorByScope(row.placeId, 'province');
    const cityAncestor = ancestorByScope(row.placeId, 'metro_city');
    const provinceName = level === 'province' ? row.name : (provinceAncestor?.parentName ?? null);
    const region = level === 'province' ? undefined : regionFor(row.placeId);
    const provinceSlug = provinceName ? slugify(provinceName) : undefined;
    const regionSlug = region?.slug;
    const placeSlug = level === 'province' ? undefined : slugify(row.name);
    // A place that is its own region, such as a city that is also its municipality's seat,
    // is written once. The published form for those is province/place.
    const path =
      regionSlug && placeSlug && regionSlug === placeSlug
        ? [provinceSlug, placeSlug].filter(Boolean).join('/')
        : [provinceSlug, regionSlug, placeSlug].filter(Boolean).join('/');

    results.push({
      kind: 'canonical_location',
      canonicalLocationId: row.placeId,
      factualLocationId: row.placeId,
      label: row.name,
      factualLevel: level,
      searchScopeKind: SCOPE_BY_LEVEL[level] as 'province' | 'metro_city' | 'locality',
      display: {
        typeLabel: TYPE_LABEL_BY_TYPE[row.placeType] || 'Place',
        contextLabel:
          level === 'province'
            ? undefined
            : [provinceName, region?.name].filter(Boolean).join(' · '),
      },
      provinceSlug: provinceSlug || '',
      ...(regionSlug ? { citySlug: regionSlug } : {}),
      ...(level === 'suburb' && placeSlug ? { suburbSlug: placeSlug } : {}),
      ...(ancestorsFor(row.placeId)[0]
        ? { parentCanonicalLocationId: ancestorsFor(row.placeId)[0].parentPlaceId }
        : {}),
      ...(provinceName ? { provinceName } : {}),
      ...(region ? { cityName: region.name } : {}),
      status: row.verificationStatus,
      canonicalPath: `/${path}`,
      source: 'canonical_geography',
    });
    if (results.length >= limit) break;
  }
  return results;
}
