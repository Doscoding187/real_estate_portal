import type { PublicPropertyMarketFact } from './publicPropertyDto';

export const SUBURB_MARKET_PRICE_MIN_SAMPLE = 10;

export type SuburbTransactionMarketInsight = {
  listingCount: number;
  pricedListingCount: number;
  medianPrice: number | null;
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
  facts: PublicPropertyMarketFact[],
  transactionType: 'sale' | 'rent',
): SuburbTransactionMarketInsight {
  const rows = facts.filter(fact => fact.transactionType === transactionType);
  const prices = rows.flatMap(fact => (fact.price === null ? [] : [fact.price]));
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
 * the sale/rent medians, and suppresses any median with fewer than ten priced
 * listings. These are portal asking prices, never sold prices or a full-market
 * estimate.
 */
export function buildSuburbMarketInsights(
  facts: PublicPropertyMarketFact[],
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
