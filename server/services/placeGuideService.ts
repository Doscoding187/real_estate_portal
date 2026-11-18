import { and, inArray } from 'drizzle-orm';

import { properties } from '../../drizzle/schema';
import { getDb } from '../db';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';
import { canonicalPlaceUrlByPlaceId } from './canonicalPlaceUrlService';
import { publicListingBaseConditions, publishedPath } from './homeMarketInsightsService';
import {
  haversineKm,
  loadPlaceCentroids,
  type PlaceCentroidEntry,
  type PlaceCentroidIndex,
} from './placeCentroidService';
import { getPublicPropertyMarketFact } from './publicPropertyDto';
import { resolvePublicPropertyEligibilities } from './publicPropertyEligibilityService';
import {
  buildSuburbMarketInsights,
  SUBURB_MARKET_PRICE_MIN_SAMPLE,
  type SuburbMarketFact,
  type SuburbMarketInsights,
} from './suburbMarketInsights';

export const PLACE_GUIDE_MAX_NEIGHBOURHOODS = 5;
export const PLACE_GUIDE_MAX_NEARBY_MARKETS = 4;
/** Nearest same-city places considered before ordering by listing count. */
export const PLACE_GUIDE_NEIGHBOURHOOD_CANDIDATES = 15;

export type PlaceGuideTypeMixItem = {
  propertyType: string | null;
  listingCount: number;
  /** Whole-number percentage of the place's sale + rent listings. */
  sharePct: number;
};

export type PlaceGuideLink = { placeId: string; name: string; canonicalPath: string };

export type PlaceGuide = {
  place: {
    id: string;
    name: string;
    level: 'city' | 'locality';
    canonicalPath: string;
    city: PlaceGuideLink | null;
    province: PlaceGuideLink | null;
    centre: { lat: number; lng: number } | null;
  };
  stats: {
    saleCount: number;
    rentCount: number;
    saleMedian: number | null;
    rentMedian: number | null;
    salePricePerM2Median: number | null;
    /** Priced listings behind each median (suppressed below minimumSample). */
    salePricedSample: number;
    rentPricedSample: number;
    salePricePerM2Sample: number;
    minimumSample: number;
    /** Only present with at least `minimumSample` sale + rent listings. */
    typeMix: PlaceGuideTypeMixItem[] | null;
    asOf: string;
  };
  neighbourhoods: Array<{
    placeId: string;
    name: string;
    canonicalPath: string;
    typeLabel: string;
    listingCount: number;
    distanceKm: number | null;
    // TODO(place-guide cover images): stays null until the image terms clause is decided.
    coverImageUrl: null;
  }>;
  nearbyMarkets: Array<{
    placeId: string;
    name: string;
    canonicalPath: string;
    levelLabel: string;
    distanceKm: number;
    saleCount: number;
    rentCount: number;
    saleMedian: number | null;
    salePricePerM2Median: number | null;
    typeMix: PlaceGuideTypeMixItem[] | null;
    deltas: { saleMedianPct: number | null; pricePerM2Pct: number | null };
  }>;
};

const TYPE_LABELS: Record<string, string> = {
  suburb: 'Suburb',
  neighbourhood: 'Neighbourhood',
  village: 'Village',
  locality: 'Locality',
  town: 'Town',
  city: 'City',
};

const typeLabelFor = (placeType: string | null | undefined) =>
  TYPE_LABELS[String(placeType ?? '')] ?? 'Area';

const roundKm = (value: number) => Math.round(value * 10) / 10;

/** Percentage difference of `other` against `self`, only when both sides are real medians. */
export function percentDelta(self: number | null, other: number | null): number | null {
  if (self === null || other === null || !(self > 0)) return null;
  return Math.round(((other - self) / self) * 100);
}

/** Property-type mix over sale + rent facts; null below the sample threshold. */
export function buildTypeMix(facts: readonly SuburbMarketFact[]): PlaceGuideTypeMixItem[] | null {
  const rows = facts.filter(fact => fact.transactionType !== 'other');
  if (rows.length < SUBURB_MARKET_PRICE_MIN_SAMPLE) return null;
  const counts = new Map<string | null, number>();
  for (const fact of rows) counts.set(fact.propertyType, (counts.get(fact.propertyType) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([propertyType, listingCount]) => ({
      propertyType,
      listingCount,
      sharePct: Math.round((listingCount / rows.length) * 100),
    }))
    .sort(
      (left, right) =>
        right.listingCount - left.listingCount ||
        String(left.propertyType).localeCompare(String(right.propertyType)),
    );
}

type Candidate = { entry: PlaceCentroidEntry; distanceKm: number | null };

/** Candidate selection from the centroid index; pure, no I/O. */
export function selectPlaceGuideCandidates(
  index: PlaceCentroidIndex,
  selfId: string,
  cityPlaceId: string | null,
  level: 'city' | 'suburb',
): { centre: { lat: number; lng: number } | null; neighbourhoodPool: Candidate[]; marketPool: Candidate[] } {
  const self = index.byPlaceId.get(selfId);
  const centre =
    self && self.lat !== null && self.lng !== null ? { lat: self.lat, lng: self.lng } : null;
  const withDistance = (entries: readonly PlaceCentroidEntry[]): Candidate[] =>
    entries.map(entry => ({
      entry,
      distanceKm:
        centre && entry.lat !== null && entry.lng !== null
          ? haversineKm(centre, { lat: entry.lat, lng: entry.lng })
          : null,
    }));
  const byDistance = (left: Candidate, right: Candidate) =>
    (left.distanceKm ?? Infinity) - (right.distanceKm ?? Infinity) ||
    left.entry.canonicalPlaceId.localeCompare(right.entry.canonicalPlaceId);

  const sameLevel = index.entries.filter(
    entry => entry.level === level && entry.canonicalPlaceId !== selfId,
  );
  const sameCity =
    level === 'suburb' && cityPlaceId
      ? sameLevel.filter(entry => entry.parentCityPlaceId === cityPlaceId)
      : [];

  if (!centre) {
    // No centre: same-city places are all candidates (ordered by listing count later).
    return { centre: null, neighbourhoodPool: withDistance(sameCity), marketPool: [] };
  }
  const neighbourhoodPool = withDistance(sameCity.filter(entry => entry.lat !== null))
    .sort(byDistance)
    .slice(0, PLACE_GUIDE_NEIGHBOURHOOD_CANDIDATES);
  // Enough nearest places that removing up to 5 neighbourhoods still leaves 4 markets.
  const marketPool = withDistance(sameLevel.filter(entry => entry.lat !== null))
    .sort(byDistance)
    .slice(0, PLACE_GUIDE_MAX_NEARBY_MARKETS + (level === 'suburb' ? PLACE_GUIDE_MAX_NEIGHBOURHOODS : 0));
  return { centre, neighbourhoodPool, marketPool };
}

type PlaceFacts = { facts: SuburbMarketFact[]; insights: SuburbMarketInsights };

function summarisePlace(facts: SuburbMarketFact[], now: Date): PlaceFacts {
  return { facts, insights: buildSuburbMarketInsights(facts, now) };
}

/**
 * Orders neighbourhood candidates (listing count desc, then distance, then name)
 * and nearby markets (distance, excluding self and the chosen neighbourhoods).
 */
export function orderNeighbourhoods<T extends { listingCount: number; distanceKm: number | null; name: string }>(
  items: readonly T[],
): T[] {
  return [...items]
    .sort(
      (left, right) =>
        right.listingCount - left.listingCount ||
        (left.distanceKm ?? Infinity) - (right.distanceKm ?? Infinity) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, PLACE_GUIDE_MAX_NEIGHBOURHOODS);
}

export const placeGuideService = {
  async getPlaceGuide(placeId: string, index: PlaceCentroidIndex = loadPlaceCentroids()): Promise<PlaceGuide | null> {
    const urlEntry = canonicalPlaceUrlByPlaceId(placeId);
    const canonicalPath = publishedPath(placeId);
    if (!urlEntry || !canonicalPath) return null;
    if (urlEntry.search_scope !== 'locality' && urlEntry.search_scope !== 'metro_city') return null;
    const scope = urlEntry.search_scope;
    const level = scope === 'metro_city' ? 'city' : 'suburb';

    // The city of a locality: from the centroid file when it knows it, otherwise from the place authority.
    let cityPlaceId: string | null =
      scope === 'metro_city' ? placeId : (index.byPlaceId.get(placeId)?.parentCityPlaceId ?? null);
    if (!cityPlaceId && scope === 'locality') {
      const own = await loadCanonicalPlaceSearchProjection(undefined, { placeIds: [placeId] });
      cityPlaceId = own.executions.get(placeId)?.cityPlaceId ?? null;
    }

    const { centre, neighbourhoodPool, marketPool } = selectPlaceGuideCandidates(
      index,
      placeId,
      cityPlaceId,
      level,
    );
    const candidateIds = Array.from(
      new Set([
        placeId,
        ...neighbourhoodPool.map(item => item.entry.canonicalPlaceId),
        ...marketPool.map(item => item.entry.canonicalPlaceId),
      ]),
    );

    // Searchable (labelled) places only, exactly as search does.
    const projection = await loadCanonicalPlaceSearchProjection(undefined, { placeIds: candidateIds });
    const selfExecution = projection.executions.get(placeId);
    if (!selfExecution || !projection.labels.has(placeId) || selfExecution.scope !== scope) {
      return null;
    }
    const usable = (item: Candidate, sameCityOnly: boolean) => {
      const id = item.entry.canonicalPlaceId;
      const execution = projection.executions.get(id);
      return (
        Boolean(execution && projection.labels.has(id) && execution.scope === scope) &&
        (!sameCityOnly || execution!.cityPlaceId === (cityPlaceId ?? selfExecution.cityPlaceId)) &&
        publishedPath(id) !== null
      );
    };
    const neighbours = neighbourhoodPool.filter(item => usable(item, true));
    const markets = marketPool.filter(item => usable(item, false));
    const queryIds = Array.from(
      new Set([
        placeId,
        ...neighbours.map(item => item.entry.canonicalPlaceId),
        ...markets.map(item => item.entry.canonicalPlaceId),
      ]),
    );

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // The only properties query: self and every candidate place together. Same
    // public base conditions as search (see publicListingBaseConditions), then
    // the same resolvePublicPropertyEligibilities gate.
    const rows = await db
      .select({
        id: properties.id,
        listingType: properties.listingType,
        canonicalPlaceId: properties.canonicalPlaceId,
        internalAreaM2: properties.internalAreaM2,
      })
      .from(properties)
      .where(
        and(
          ...publicListingBaseConditions(),
          inArray(properties.listingType, ['sale', 'rent']),
          inArray(properties.canonicalPlaceId, queryIds),
        ),
      );
    const eligible = rows.length
      ? await resolvePublicPropertyEligibilities(rows.map(row => Number(row.id)))
      : new Map<number, never>();

    const factsByPlace = new Map<string, SuburbMarketFact[]>();
    for (const row of rows) {
      const resolution = eligible.get(Number(row.id));
      const id = row.canonicalPlaceId;
      if (!resolution || !id) continue;
      const fact = getPublicPropertyMarketFact(resolution);
      if (fact.transactionType === 'other') continue;
      const area = Number(row.internalAreaM2);
      const list = factsByPlace.get(id) ?? [];
      list.push({ ...fact, internalAreaM2: Number.isFinite(area) && area > 0 ? area : null });
      factsByPlace.set(id, list);
    }

    const now = new Date();
    const summaryOf = (id: string) => summarisePlace(factsByPlace.get(id) ?? [], now);
    const self = summaryOf(placeId);
    const linkFor = (id: string | null | undefined): PlaceGuideLink | null => {
      const entry = id ? canonicalPlaceUrlByPlaceId(id) : null;
      const path = id ? publishedPath(id) : null;
      return entry && path ? { placeId: entry.place_id, name: entry.preferred_public_name, canonicalPath: path } : null;
    };
    const listingCountOf = (id: string) => {
      const { sale, rent } = summaryOf(id).insights;
      return sale.listingCount + rent.listingCount;
    };

    const chosen = orderNeighbourhoods(
      neighbours.map(item => {
        const entry = canonicalPlaceUrlByPlaceId(item.entry.canonicalPlaceId)!;
        return {
          placeId: entry.place_id,
          name: entry.preferred_public_name,
          canonicalPath: publishedPath(entry.place_id)!,
          typeLabel: typeLabelFor(entry.place_type),
          listingCount: listingCountOf(entry.place_id),
          distanceKm: item.distanceKm === null ? null : roundKm(item.distanceKm),
          coverImageUrl: null,
        };
      }),
    );
    const chosenIds = new Set(chosen.map(item => item.placeId));

    const nearbyMarkets = markets
      .filter(item => !chosenIds.has(item.entry.canonicalPlaceId))
      .slice(0, PLACE_GUIDE_MAX_NEARBY_MARKETS)
      .map(item => {
        const entry = canonicalPlaceUrlByPlaceId(item.entry.canonicalPlaceId)!;
        const summary = summaryOf(entry.place_id);
        const { sale, rent } = summary.insights;
        return {
          placeId: entry.place_id,
          name: entry.preferred_public_name,
          canonicalPath: publishedPath(entry.place_id)!,
          levelLabel: typeLabelFor(entry.place_type),
          distanceKm: roundKm(item.distanceKm as number),
          saleCount: sale.listingCount,
          rentCount: rent.listingCount,
          saleMedian: sale.medianPrice,
          salePricePerM2Median: sale.medianPricePerM2,
          typeMix: buildTypeMix(summary.facts),
          deltas: {
            saleMedianPct: percentDelta(self.insights.sale.medianPrice, sale.medianPrice),
            pricePerM2Pct: percentDelta(self.insights.sale.medianPricePerM2, sale.medianPricePerM2),
          },
        };
      });

    const provinceId = urlEntry.province_place_id;
    return {
      place: {
        id: placeId,
        name: urlEntry.preferred_public_name,
        level: scope === 'metro_city' ? 'city' : 'locality',
        canonicalPath,
        city: scope === 'metro_city' ? null : linkFor(cityPlaceId ?? selfExecution.cityPlaceId),
        province: linkFor(provinceId),
        centre,
      },
      stats: {
        saleCount: self.insights.sale.listingCount,
        rentCount: self.insights.rent.listingCount,
        saleMedian: self.insights.sale.medianPrice,
        rentMedian: self.insights.rent.medianPrice,
        salePricePerM2Median: self.insights.sale.medianPricePerM2,
        salePricedSample: self.insights.sale.pricedListingCount,
        rentPricedSample: self.insights.rent.pricedListingCount,
        salePricePerM2Sample: self.insights.sale.pricePerM2SampleCount,
        minimumSample: self.insights.minimumPriceSample,
        typeMix: buildTypeMix(self.facts),
        asOf: self.insights.asOf,
      },
      neighbourhoods: scope === 'metro_city' ? [] : chosen,
      nearbyMarkets,
    };
  },
};
