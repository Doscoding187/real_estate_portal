/**
 * Decision D3: thin place pages open for visitors but stay out of search engines.
 *
 * A published place is indexable when it is hand-approved (shared/placeIndexAllowlist.ts) or its
 * page scope holds at least one public sale/rent listing or accepted development:
 * - province: every searchable place in the province (its members);
 * - metro_city: the city itself plus the localities its guide lists;
 * - locality: itself.
 * The same function feeds the page robots flag and sitemap-places.xml.
 */
import { getDb } from '../db';
import { isPlaceIndexAllowlistedPath } from '../../shared/placeIndexAllowlist';
import type { CanonicalPlaceUrlEntry } from '../../shared/canonicalPlaceUrlProjection';
import { publishedCanonicalPlaceUrls } from './canonicalPlaceUrlService';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';
import { countAcceptedDevelopmentsByPlace } from './developmentPlaceAssignmentService';
import { metroCityGuideLocalityIds } from './publicPropertyGuideService';
import { propertySearchService } from './propertySearchService';

export type PlaceInventoryCount = { listings: number; developments: number };

export const PLACE_INVENTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const CITY_GUIDE_QUERY_CHUNK = 400;

type Cached<T> = { at: number; value: T };
let countsCache: Cached<Map<string, PlaceInventoryCount>> | null = null;
let countsInflight: Promise<Map<string, PlaceInventoryCount>> | null = null;
let indexableEntriesCache: Cached<CanonicalPlaceUrlEntry[]> | null = null;

export function resetPlaceIndexabilityCache(): void {
  countsCache = null;
  countsInflight = null;
  indexableEntriesCache = null;
}

/**
 * Public listings (sale + rent) and accepted developments per canonical Place, cached in memory
 * for a short TTL. Listing counts use the exact public predicate of property search
 * (`PropertySearchService.countPublicListingsByCanonicalPlace`); development counts use accepted
 * site assignments grouped by Place. Exported so other consumers share one definition.
 */
export async function publicPlaceInventoryCounts(
  now: number = Date.now(),
): Promise<Map<string, PlaceInventoryCount>> {
  if (countsCache && now - countsCache.at < PLACE_INVENTORY_CACHE_TTL_MS) {
    return countsCache.value;
  }
  if (!countsInflight) {
    countsInflight = (async () => {
      const [listings, developments] = await Promise.all([
        propertySearchService.countPublicListingsByCanonicalPlace(),
        countAcceptedDevelopmentsByPlace(),
      ]);
      const merged = new Map<string, PlaceInventoryCount>();
      for (const [placeId, count] of listings) {
        merged.set(placeId, { listings: count, developments: 0 });
      }
      for (const [placeId, count] of developments) {
        merged.set(placeId, { listings: merged.get(placeId)?.listings ?? 0, developments: count });
      }
      countsCache = { at: Date.now(), value: merged };
      return merged;
    })().finally(() => {
      countsInflight = null;
    });
  }
  return countsInflight;
}

/**
 * Indexability for published places. Pass place IDs to evaluate a subset; omit for every
 * published place. Unknown or unpublished IDs are false.
 */
export async function placeIndexability(
  placeIds?: readonly string[],
): Promise<Map<string, boolean>> {
  const requested = placeIds ? new Set(placeIds) : null;
  const entries = publishedCanonicalPlaceUrls().filter(
    entry => !requested || requested.has(entry.place_id),
  );
  const result = new Map<string, boolean>();
  for (const id of requested ?? []) result.set(id, false);

  const pending = entries.filter(entry => {
    if (isPlaceIndexAllowlistedPath(entry.path)) {
      result.set(entry.place_id, true);
      return false;
    }
    result.set(entry.place_id, false);
    return true;
  });
  if (!pending.length) return result;

  const counts = await publicPlaceInventoryCounts();
  const countedIds = [...counts]
    .filter(([, count]) => count.listings + count.developments > 0)
    .map(([placeId]) => placeId);
  if (!countedIds.length) return result;

  // Same searchability gate as public search: unlabeled Places never surface inventory.
  const projection = await loadCanonicalPlaceSearchProjection(undefined, { placeIds: countedIds });
  const searchable = new Set(countedIds.filter(id => projection.labels.has(id)));
  const provincesWithInventory = new Set<string>();
  for (const id of searchable) {
    const execution = projection.executions.get(id);
    if (execution) provincesWithInventory.add(execution.provincePlaceId);
  }

  const citiesToCheck: string[] = [];
  for (const entry of pending) {
    if (entry.search_scope === 'province') {
      if (provincesWithInventory.has(entry.place_id)) result.set(entry.place_id, true);
    } else if (searchable.has(entry.place_id)) {
      result.set(entry.place_id, true);
    } else if (entry.search_scope === 'metro_city') {
      citiesToCheck.push(entry.place_id);
    }
  }

  if (citiesToCheck.length) {
    const database = await getDb();
    if (!database) throw new Error('Database not available');
    for (let offset = 0; offset < citiesToCheck.length; offset += CITY_GUIDE_QUERY_CHUNK) {
      const chunk = citiesToCheck.slice(offset, offset + CITY_GUIDE_QUERY_CHUNK);
      const childrenByCity = await metroCityGuideLocalityIds(database, chunk);
      for (const cityId of chunk) {
        if ((childrenByCity.get(cityId) ?? []).some(childId => searchable.has(childId))) {
          result.set(cityId, true);
        }
      }
    }
  }
  return result;
}

/** Published place URLs that are indexable now; cached for the sitemap. */
export async function indexablePublishedPlaceUrls(
  now: number = Date.now(),
): Promise<CanonicalPlaceUrlEntry[]> {
  if (indexableEntriesCache && now - indexableEntriesCache.at < PLACE_INVENTORY_CACHE_TTL_MS) {
    return indexableEntriesCache.value;
  }
  const indexable = await placeIndexability();
  const value = publishedCanonicalPlaceUrls().filter(entry => indexable.get(entry.place_id));
  indexableEntriesCache = { at: now, value };
  return value;
}
