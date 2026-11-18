import type { PublicPropertyMarketFact } from './publicPropertyDto';

export const SUBURB_MARKET_PRICE_MIN_SAMPLE = 5;

/** A market fact optionally carrying the internal floor area (m2) for price per m2. */
export type SuburbMarketFact = PublicPropertyMarketFact & {
  internalAreaM2?: number | null;
};

export type SuburbTransactionMarketInsight = {
  listingCount: number;
  pricedListingCount: number;
  medianPrice: number | null;
  /** Rows with both a price and an internal area above zero. */
  pricePerM2SampleCount: number;
  /** Median price per m2 over sized, priced rows; null below the sample threshold. */
  medianPricePerM2: number | null;
  propertyTypes: Array<{
    propertyType: string | null;
    listingCount: number;
    pricedListingCount: number;
    medianPrice: number | null;
  }>;
  bedrooms: Array<{
    bedroomBand: number;
    listingCount: number;
    pricedListingCount: number;
    medianPrice: number | null;
  }>;
};

export type SuburbMarketInsights = {
  asOf: string;
  minimumPriceSample: number;
  sale: SuburbTransactionMarketInsight;
  rent: SuburbTransactionMarketInsight;
  otherTransactionListingCount: number;
};

type GroupFact = {
  listingCount: number;
  prices: number[];
};

function median(values: number[]): number | null {
  if (values.length < SUBURB_MARKET_PRICE_MIN_SAMPLE) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function addToGroup<T>(groups: Map<T, GroupFact>, key: T, price: number | null) {
  const group = groups.get(key) || { listingCount: 0, prices: [] };
  group.listingCount += 1;
  if (price !== null) group.prices.push(price);
  groups.set(key, group);
}

function summarizeTransaction(
  facts: SuburbMarketFact[],
  transactionType: 'sale' | 'rent',
): SuburbTransactionMarketInsight {
  const rows = facts.filter(fact => fact.transactionType === transactionType);
  const prices = rows.flatMap(fact => (fact.price === null ? [] : [fact.price]));
  const perM2 = rows.flatMap(fact =>
    fact.price !== null &&
    typeof fact.internalAreaM2 === 'number' &&
    Number.isFinite(fact.internalAreaM2) &&
    fact.internalAreaM2 > 0
      ? [fact.price / fact.internalAreaM2]
      : [],
  );
  const byPropertyType = new Map<string | null, GroupFact>();
  const byBedrooms = new Map<number, GroupFact>();

  rows.forEach(fact => {
    addToGroup(byPropertyType, fact.propertyType, fact.price);
    if (fact.bedrooms !== null) addToGroup(byBedrooms, Math.min(fact.bedrooms, 5), fact.price);
  });

  return {
    listingCount: rows.length,
    pricedListingCount: prices.length,
    medianPrice: median(prices),
    pricePerM2SampleCount: perM2.length,
    medianPricePerM2: median(perM2),
    propertyTypes: Array.from(byPropertyType.entries())
      .map(([propertyType, group]) => ({
        propertyType,
        listingCount: group.listingCount,
        pricedListingCount: group.prices.length,
        medianPrice: median(group.prices),
      }))
      .sort((left, right) => right.listingCount - left.listingCount),
    bedrooms: Array.from(byBedrooms.entries())
      .map(([bedroomBand, group]) => ({
        bedroomBand,
        listingCount: group.listingCount,
        pricedListingCount: group.prices.length,
        medianPrice: median(group.prices),
      }))
      .sort((left, right) => left.bedroomBand - right.bedroomBand),
  };
}

/**
 * Builds exact-suburb inventory insights from already-eligible public listings.
 * It deliberately excludes auction, rent-to-buy and shared-living offers from
 * the sale/rent medians, and suppresses any median with fewer than five priced
 * listings (Edward decision 2026-11-13/18). These are portal asking prices,
 * never sold prices or a full-market estimate.
 */
export function buildSuburbMarketInsights(
  facts: SuburbMarketFact[],
  calculatedAt = new Date(),
): SuburbMarketInsights {
  return {
    asOf: calculatedAt.toISOString(),
    minimumPriceSample: SUBURB_MARKET_PRICE_MIN_SAMPLE,
    sale: summarizeTransaction(facts, 'sale'),
    rent: summarizeTransaction(facts, 'rent'),
    otherTransactionListingCount: facts.filter(
      fact => fact.transactionType !== 'sale' && fact.transactionType !== 'rent',
    ).length,
  };
}
