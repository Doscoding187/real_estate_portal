import { and, eq, gt, inArray, or, sql, type SQL } from 'drizzle-orm';

import { properties } from '../../drizzle/schema';
import { getDb } from '../db';
import { canonicalPlaceUrlByPlaceId } from './canonicalPlaceUrlService';
import {
  loadCanonicalPlaceSearchProjection,
  type CanonicalPlaceSearchProjection,
} from './canonicalPlaceSearchService';
import { loadHomeProvinceScope } from './homeProvinceScopeService';
import { excludeLandFromGenericPublicProjection } from './landLaunchContainmentService';
import { resolvePublicPropertyEligibilities } from './publicPropertyEligibilityService';

/** A city is only reported when at least this many qualifying listings exist. */
export const MINIMUM_CITY_SAMPLE = 3;
/** Price per m2 is only reported with at least this many sized listings. */
export const MINIMUM_SIZED_SAMPLE = 3;
export const DEFAULT_CITY_INSIGHT_LIMIT = 6;
export const MAX_CITY_INSIGHT_LIMIT = 12;
/**
 * The homepage section is requested by every visitor and the aggregate needs a
 * full public-eligibility pass, so the result is held in-process for 10 minutes.
 * Asking-inventory signals do not need to be fresher than that.
 */
export const HOME_MARKET_INSIGHTS_TTL_MS = 10 * 60 * 1000;

export const ASKING_PRICE_BAND_DEFINITIONS = [
  { key: 'under_1m', label: 'Under R1m', minPrice: 0, maxPrice: 1_000_000 },
  { key: '1m_2m', label: 'R1m – R2m', minPrice: 1_000_000, maxPrice: 2_000_000 },
  { key: '2m_5m', label: 'R2m – R5m', minPrice: 2_000_000, maxPrice: 5_000_000 },
  { key: '5m_10m', label: 'R5m – R10m', minPrice: 5_000_000, maxPrice: 10_000_000 },
  { key: 'over_10m', label: 'Over R10m', minPrice: 10_000_000, maxPrice: null },
] as const;

/** Bands are lower-bound inclusive: exactly R1m is in "R1m – R2m". */
export type AskingPriceBand = {
  key: (typeof ASKING_PRICE_BAND_DEFINITIONS)[number]['key'];
  label: string;
  minPrice: number;
  /** Exclusive upper bound; null for the open-ended top band. */
  maxPrice: number | null;
  count: number;
};

export type HomeMarketCityInsight = {
  placeId: string;
  name: string;
  provinceName: string;
  /** Published canonical city URL path, or null when the city has none. */
  href: string | null;
  activeSaleListings: number;
  medianAskingPrice: number;
  /** Median of price / floor size over sized listings; null below 3 of them. */
  typicalPricePerM2: number | null;
  askingPriceBands: AskingPriceBand[];
  leadingLocality: { name: string; listingCount: number; href: string | null } | null;
  sampleSize: number;
  computedAt: string;
};

type QualifyingListing = {
  price: number;
  sizeM2: number | null;
  cityPlaceId: string;
  cityName: string;
  provinceName: string;
  /** The listing's own place when it sits below city level. */
  locality: { placeId: string; name: string } | null;
};

function positiveNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function publishedPath(placeId: string): string | null {
  const entry = canonicalPlaceUrlByPlaceId(placeId);
  return entry && entry.publication_eligible && entry.lifecycle_status === 'active'
    ? entry.path
    : null;
}

function buildBands(prices: readonly number[]): AskingPriceBand[] {
  return ASKING_PRICE_BAND_DEFINITIONS.map(band => ({
    ...band,
    count: prices.filter(
      price => price >= band.minPrice && (band.maxPrice === null || price < band.maxPrice),
    ).length,
  }));
}

function summariseCity(listings: readonly QualifyingListing[], computedAt: string) {
  const first = listings[0];
  const prices = listings.map(listing => listing.price);
  const sized = listings.flatMap(listing =>
    listing.sizeM2 !== null ? [listing.price / listing.sizeM2] : [],
  );
  const localityCounts = new Map<string, { name: string; count: number }>();
  for (const listing of listings) {
    if (!listing.locality) continue;
    const current = localityCounts.get(listing.locality.placeId);
    if (current) current.count += 1;
    else localityCounts.set(listing.locality.placeId, { name: listing.locality.name, count: 1 });
  }
  const [leading] = Array.from(localityCounts.entries()).sort(
    ([, left], [, right]) => right.count - left.count || left.name.localeCompare(right.name),
  );
  return {
    placeId: first.cityPlaceId,
    name: first.cityName,
    provinceName: first.provinceName,
    href: publishedPath(first.cityPlaceId),
    activeSaleListings: listings.length,
    medianAskingPrice: median(prices) as number,
    typicalPricePerM2: sized.length >= MINIMUM_SIZED_SAMPLE ? median(sized) : null,
    askingPriceBands: buildBands(prices),
    leadingLocality: leading
      ? {
          name: leading[1].name,
          listingCount: leading[1].count,
          href: publishedPath(leading[0]),
        }
      : null,
    sampleSize: listings.length,
    computedAt,
  } satisfies HomeMarketCityInsight;
}

/**
 * Base predicate: the same conditions public property search applies
 * (published/available, not commercial, source-listing backed, assigned to a
 * canonical Place, Land excluded). Final eligibility is decided by
 * resolvePublicPropertyEligibilities.
 */
export function publicListingBaseConditions(): SQL[] {
  return [
    or(eq(properties.status, 'available'), eq(properties.status, 'published'))!,
    sql`${properties.propertyType} <> 'commercial'`,
    sql`${properties.sourceListingId} IS NOT NULL`,
    sql`${properties.canonicalPlaceId} IS NOT NULL`,
    excludeLandFromGenericPublicProjection(),
  ];
}

/** Base predicate restricted to sale listings with a price. */
function candidateConditions(): SQL[] {
  return [
    ...publicListingBaseConditions(),
    eq(properties.listingType, 'sale'),
    gt(properties.price, 0),
  ];
}

type Candidate = {
  id: unknown;
  price: unknown;
  sizeM2: unknown;
  canonicalPlaceId: string | null;
};

function groupByCity(
  candidates: readonly Candidate[],
  eligible: ReadonlyMap<number, unknown>,
  projection: CanonicalPlaceSearchProjection,
): Map<string, QualifyingListing[]> {
  const byCity = new Map<string, QualifyingListing[]>();
  for (const row of candidates) {
    const price = positiveNumber(row.price);
    const placeId = row.canonicalPlaceId;
    if (price === null || !placeId || !eligible.has(Number(row.id))) continue;
    const label = projection.labels.get(placeId);
    const execution = projection.executions.get(placeId);
    if (!label || !execution) continue;
    // A listing belongs to a city when its own place is the city, or it sits
    // below one. Province-level places have no city.
    const cityPlaceId = execution.scope === 'metro_city' ? execution.placeId : execution.cityPlaceId;
    if (execution.scope === 'province' || !cityPlaceId || !label.city) continue;
    const list = byCity.get(cityPlaceId) ?? [];
    list.push({
      price,
      sizeM2: positiveNumber(row.sizeM2),
      cityPlaceId,
      cityName: label.city,
      provinceName: label.province,
      locality:
        execution.scope === 'locality' && label.locality
          ? { placeId: execution.placeId, name: label.locality }
          : null,
    });
    byCity.set(cityPlaceId, list);
  }
  return byCity;
}

function citySummaries(
  byCity: ReadonlyMap<string, QualifyingListing[]>,
  computedAt: string,
): HomeMarketCityInsight[] {
  return Array.from(byCity.values())
    .filter(listings => listings.length >= MINIMUM_CITY_SAMPLE)
    .map(listings => summariseCity(listings, computedAt))
    .sort(
      (left, right) =>
        right.activeSaleListings - left.activeSaleListings || left.name.localeCompare(right.name),
    );
}

// Floor size follows the listing cards: COALESCE(internal_area_m2, area).
const candidateSelection = {
  id: properties.id,
  price: properties.price,
  sizeM2: sql<string | number | null>`CAST(COALESCE(${properties.internalAreaM2}, ${properties.area}) AS DECIMAL(14,2))`,
  canonicalPlaceId: properties.canonicalPlaceId,
};

async function computeCityInsights(limit: number): Promise<HomeMarketCityInsight[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Query 1: the only properties read.
  const candidates = await db
    .select(candidateSelection)
    .from(properties)
    .where(and(...candidateConditions()));
  if (!candidates.length) return [];

  const projection = await loadCanonicalPlaceSearchProjection(undefined, {
    placeIds: Array.from(
      new Set<string>(
        candidates.flatMap(row => (row.canonicalPlaceId ? [String(row.canonicalPlaceId)] : [])),
      ),
    ),
  });
  const eligible = await resolvePublicPropertyEligibilities(candidates.map(row => Number(row.id)));

  const computedAt = new Date().toISOString();
  return citySummaries(groupByCity(candidates, eligible, projection), computedAt).slice(0, limit);
}

export const MAX_PROVINCE_CITY_INSIGHTS = 8;

export type HomeProvinceInsights = {
  /**
   * Whole-province figures; null when fewer than 3 qualifying listings.
   * leadingLocality is the CITY with the most qualifying listings.
   */
  province: HomeMarketCityInsight | null;
  cities: HomeMarketCityInsight[];
};

async function computeProvinceInsights(provincePlaceId: string): Promise<HomeProvinceInsights> {
  const scope = await loadHomeProvinceScope(provincePlaceId);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Query 1: the only properties read, limited to the province's places.
  const candidates = scope.memberPlaceIds.length
    ? await db
        .select(candidateSelection)
        .from(properties)
        .where(
          and(...candidateConditions(), inArray(properties.canonicalPlaceId, scope.memberPlaceIds)),
        )
    : [];
  const computedAt = new Date().toISOString();
  if (!candidates.length) return { province: null, cities: [] };

  const eligible = await resolvePublicPropertyEligibilities(candidates.map(row => Number(row.id)));
  const byCity = groupByCity(candidates, eligible, scope.projection);
  const all = Array.from(byCity.values()).flat();
  let province: HomeMarketCityInsight | null = null;
  if (all.length >= MINIMUM_CITY_SAMPLE) {
    const leadingCity = Array.from(byCity.values()).sort(
      (left, right) =>
        right.length - left.length || left[0].cityName.localeCompare(right[0].cityName),
    )[0];
    const summary = summariseCity(all, computedAt);
    province = {
      ...summary,
      placeId: scope.province.placeId,
      name: scope.province.name,
      provinceName: scope.province.name,
      href: publishedPath(scope.province.placeId),
      leadingLocality: {
        name: leadingCity[0].cityName,
        listingCount: leadingCity.length,
        href: publishedPath(leadingCity[0].cityPlaceId),
      },
    };
  }
  return {
    province,
    cities: citySummaries(byCity, computedAt).slice(0, MAX_PROVINCE_CITY_INSIGHTS),
  };
}

const cache = new Map<string, { at: number; value: HomeMarketCityInsight[] }>();
const provinceCache = new Map<string, { at: number; value: HomeProvinceInsights }>();

export function resetHomeMarketInsightsCache(): void {
  cache.clear();
  provinceCache.clear();
}

/**
 * Current asking-inventory signals computed from published sale listings.
 * Not completed sales, not a valuation, and no trend (there is no history).
 */
export const homeMarketInsightsService = {
  async getHomepageCityInsights({
    limit = DEFAULT_CITY_INSIGHT_LIMIT,
  }: { limit?: number } = {}): Promise<HomeMarketCityInsight[]> {
    const boundedLimit = Math.min(
      MAX_CITY_INSIGHT_LIMIT,
      Math.max(1, Math.floor(Number(limit) || DEFAULT_CITY_INSIGHT_LIMIT)),
    );
    const key = JSON.stringify({ limit: boundedLimit });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < HOME_MARKET_INSIGHTS_TTL_MS) return hit.value;
    const value = await computeCityInsights(boundedLimit);
    cache.set(key, { at: Date.now(), value });
    return value;
  },

  /** Province-level figures plus the province's cities with enough listings. */
  async getProvinceInsights({
    provincePlaceId,
  }: {
    provincePlaceId: string;
  }): Promise<HomeProvinceInsights> {
    const key = JSON.stringify({ provincePlaceId });
    const hit = provinceCache.get(key);
    if (hit && Date.now() - hit.at < HOME_MARKET_INSIGHTS_TTL_MS) return hit.value;
    const value = await computeProvinceInsights(provincePlaceId);
    provinceCache.set(key, { at: Date.now(), value });
    return value;
  },
};
