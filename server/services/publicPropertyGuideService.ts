import { and, eq } from 'drizzle-orm';
import { place, placeRelationship } from '../../drizzle/schema/placeAuthority';
import type { PlaceSearchScope } from '../../shared/placeAuthority';
import { getDb } from '../db';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';
import { publicSearchService } from './publicSearchService';

export type PropertyGuideMode = 'sale' | 'rent';

export type PublicPropertyGuideArea = {
  placeId: string;
  label: string;
  listingCount: number;
  href: string;
};

const INVENTORY_QUERY_BATCH_SIZE = 8;

/**
 * Some city guide identities describe the same geographic extent as an
 * administrative municipality, while their locality membership is recorded
 * on the municipality node. This is guide navigation policy only: it does not
 * create a settlement relationship or widen exact-locality search.
 */
const CITY_GUIDE_ADMINISTRATIVE_EXTENTS: Readonly<Record<string, string>> = {
  // Johannesburg city guide → City of Johannesburg local municipality.
  'pl-place-01-21f154cd5d0954c29ec7525f': 'pl-place-01-503de72cc29aa712c0e5a597',
  // Pretoria city guide → City of Tshwane local municipality.
  'pl-place-01-d0401eba0f556a60bb02e528': 'pl-place-01-b903aa4e24582a26d57c7e2e',
};

function searchHref(mode: PropertyGuideMode, placeId: string): string {
  const route = mode === 'sale' ? '/property-for-sale' : '/property-to-rent';
  return `${route}?canonicalPlaceId=${encodeURIComponent(placeId)}`;
}

/**
 * Build a navigational guide for a broad Place. Every count is the `total`
 * returned by the canonical public search service for that exact locality and
 * transaction mode, so the guide cannot drift from public search visibility.
 */
export async function publicPropertyGuideAreas(
  canonicalPlaceId: string,
  listingType: PropertyGuideMode,
): Promise<PublicPropertyGuideArea[]> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const parentProjection = await loadCanonicalPlaceSearchProjection(database, {
    placeIds: [canonicalPlaceId],
  });
  const parent = parentProjection.executions.get(canonicalPlaceId);
  if (
    !parent ||
    !parentProjection.labels.has(canonicalPlaceId) ||
    !(['province', 'metro_city'] as PlaceSearchScope[]).includes(parent.scope)
  ) {
    throw new Error('Property area guides require an active, searchable province or city Place.');
  }

  let localityIds: string[];
  if (parent.scope === 'metro_city') {
    const children = await database
      .select({ placeId: placeRelationship.fromPlaceId })
      .from(placeRelationship)
      .innerJoin(place, eq(place.placeId, placeRelationship.fromPlaceId))
      .where(
        and(
          eq(placeRelationship.toPlaceId, canonicalPlaceId),
          eq(placeRelationship.relationshipType, 'settlement_within'),
          eq(place.lifecycleStatus, 'active'),
          eq(place.searchEligible, 1),
          eq(place.searchScope, 'locality'),
        ),
      );
    localityIds = [...new Set<string>((children as { placeId: string }[]).map(row => row.placeId))];

    const administrativeExtentId = CITY_GUIDE_ADMINISTRATIVE_EXTENTS[canonicalPlaceId];
    if (administrativeExtentId) {
      const administrativeChildren = await database
        .select({ placeId: placeRelationship.fromPlaceId })
        .from(placeRelationship)
        .innerJoin(place, eq(place.placeId, placeRelationship.fromPlaceId))
        .where(
          and(
            eq(placeRelationship.toPlaceId, administrativeExtentId),
            eq(placeRelationship.relationshipType, 'administratively_contains'),
            eq(place.lifecycleStatus, 'active'),
            eq(place.searchEligible, 1),
            eq(place.searchScope, 'locality'),
          ),
        );
      localityIds = [
        ...new Set([
          ...localityIds,
          ...(administrativeChildren as { placeId: string }[]).map(row => row.placeId),
        ]),
      ];
    }
  } else {
    const provinceProjection = await loadCanonicalPlaceSearchProjection(database, {
      placeIds: [canonicalPlaceId],
      includeProvinceMembers: true,
    });
    localityIds = [...provinceProjection.executions.values()]
      .filter(
        execution =>
          execution.scope === 'locality' && execution.provincePlaceId === canonicalPlaceId,
      )
      .map(execution => execution.placeId);
  }

  if (!localityIds.length) return [];

  const localityProjection = await loadCanonicalPlaceSearchProjection(database, {
    placeIds: localityIds,
  });
  const localities = [...new Set(localityIds)].flatMap(placeId => {
    const execution = localityProjection.executions.get(placeId);
    const label = localityProjection.labels.get(placeId)?.label.trim();
    return execution?.scope === 'locality' && label ? [{ placeId, label }] : [];
  });

  const areas: PublicPropertyGuideArea[] = [];
  for (let offset = 0; offset < localities.length; offset += INVENTORY_QUERY_BATCH_SIZE) {
    const batch = localities.slice(offset, offset + INVENTORY_QUERY_BATCH_SIZE);
    const counts = await Promise.all(
      batch.map(async locality => {
        const result = await publicSearchService.searchInventory({
          canonicalPlaceId: locality.placeId,
          listingType,
          page: 0,
          pageSize: 1,
        });
        if (result.locationState !== 'resolved') {
          throw new Error(
            `Public inventory search could not resolve locality ${locality.placeId}.`,
          );
        }
        return { ...locality, listingCount: result.total };
      }),
    );
    areas.push(
      ...counts
        .filter(area => area.listingCount > 0)
        .map(area => ({ ...area, href: searchHref(listingType, area.placeId) })),
    );
  }

  return areas.sort(
    (left, right) =>
      right.listingCount - left.listingCount || left.label.localeCompare(right.label),
  );
}
