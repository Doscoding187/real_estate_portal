import { and, eq, inArray } from 'drizzle-orm';
import { place, placeRelationship } from '../../drizzle/schema/placeAuthority';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';
import type { PlaceReadDatabase } from './placeDiscoveryService';

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

/**
 * Locality IDs a city guide lists, for one or many city guides. This is the single
 * child-selection rule: `settlement_within` children plus the administrative extent
 * children above. Page indexability reuses it so a city is only indexable when its guide
 * could list at least one area with inventory.
 */
export async function metroCityGuideLocalityIds(
  database: PlaceReadDatabase,
  cityIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byCity = new Map<string, Set<string>>(cityIds.map(id => [id, new Set<string>()]));
  const requested = [...new Set(cityIds)];
  if (!requested.length) return new Map();

  const children = await database
    .select({ placeId: placeRelationship.fromPlaceId, parentId: placeRelationship.toPlaceId })
    .from(placeRelationship)
    .innerJoin(place, eq(place.placeId, placeRelationship.fromPlaceId))
    .where(
      and(
        inArray(placeRelationship.toPlaceId, requested),
        eq(placeRelationship.relationshipType, 'settlement_within'),
        eq(place.lifecycleStatus, 'active'),
        eq(place.searchEligible, 1),
        eq(place.searchScope, 'locality'),
      ),
    );
  for (const row of children as { placeId: string; parentId: string }[]) {
    byCity.get(row.parentId)?.add(row.placeId);
  }

  const citiesByExtent = new Map<string, string[]>();
  for (const cityId of requested) {
    const extentId = CITY_GUIDE_ADMINISTRATIVE_EXTENTS[cityId];
    if (extentId) citiesByExtent.set(extentId, [...(citiesByExtent.get(extentId) ?? []), cityId]);
  }
  if (citiesByExtent.size) {
    const administrativeChildren = await database
      .select({ placeId: placeRelationship.fromPlaceId, parentId: placeRelationship.toPlaceId })
      .from(placeRelationship)
      .innerJoin(place, eq(place.placeId, placeRelationship.fromPlaceId))
      .where(
        and(
          inArray(placeRelationship.toPlaceId, [...citiesByExtent.keys()]),
          eq(placeRelationship.relationshipType, 'administratively_contains'),
          eq(place.lifecycleStatus, 'active'),
          eq(place.searchEligible, 1),
          eq(place.searchScope, 'locality'),
        ),
      );
    for (const row of administrativeChildren as { placeId: string; parentId: string }[]) {
      for (const cityId of citiesByExtent.get(row.parentId) ?? [])
        byCity.get(cityId)?.add(row.placeId);
    }
  }
  return new Map([...byCity].map(([cityId, ids]) => [cityId, [...ids]]));
}


/**
 * The canonical Places whose developments a search for `placeId` should include:
 * the place itself plus the localities beneath it, using the same child rules the
 * area guides use (no new data).
 *   - locality: only itself (exact match).
 *   - metro city: its `settlement_within` localities, plus the administrative
 *     extent localities for the cities that have one (City of Johannesburg, Tshwane).
 *   - province: every locality whose provincial bound is that province.
 * A place that is not searchable resolves to itself only.
 */
export async function developmentSearchPlaceIds(
  database: PlaceReadDatabase,
  placeId: string,
): Promise<string[]> {
  const projection = await loadCanonicalPlaceSearchProjection(database, { placeIds: [placeId] });
  const execution = projection.executions.get(placeId);
  if (!execution || !projection.labels.has(placeId)) return [placeId];
  if (execution.scope === 'metro_city') {
    const children = (await metroCityGuideLocalityIds(database, [placeId])).get(placeId) ?? [];
    return [...new Set([placeId, ...children])];
  }
  if (execution.scope === 'province') {
    const members = await loadCanonicalPlaceSearchProjection(database, {
      placeIds: [placeId],
      includeProvinceMembers: true,
    });
    const localities = [...members.executions.values()]
      .filter(item => item.scope === 'locality' && item.provincePlaceId === placeId)
      .map(item => item.placeId);
    return [...new Set([placeId, ...localities])];
  }
  return [placeId];
}
