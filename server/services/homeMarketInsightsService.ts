import { and, desc, eq, inArray } from 'drizzle-orm';

import { cities, properties, provinces, suburbs } from '../../drizzle/schema';
import { getDb } from '../db';
import { resolvePublicPropertyEligibilities } from './publicPropertyEligibilityService';

const MINIMUM_PRICE_SAMPLE = 3;
const MINIMUM_AREA_SAMPLE = 3;

type PublicSaleProperty = {
  suburbId: number | null;
  price: number | null;
  internalAreaM2: number | null;
};

type CitySummary = {
  id: number;
  name: string;
  slug: string;
  provinceName: string;
  provinceSlug: string;
};

type SuburbSummary = { id: number; name: string; slug: string };

function positiveId(value: unknown): number | null {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function finitePositiveNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function priceBand(price: number): string {
  if (price < 1_000_000) return 'Under R1m';
  if (price < 2_000_000) return 'R1m – R2m';
  if (price < 5_000_000) return 'R2m – R5m';
  if (price < 10_000_000) return 'R5m – R10m';
  return 'R10m+';
}

export type HomeMarketInsight = {
  city: {
    id: number;
    name: string;
    slug: string;
    provinceName: string;
    provinceSlug: string;
  };
  activeListingCount: number;
  medianAskingPrice: number | null;
  typicalAskingPricePerM2: number | null;
  priceDistribution: Array<{ label: string; count: number }>;
  leadingLocalities: Array<{ name: string; slug: string; listingCount: number }>;
};

/**
 * Homepage market intelligence is an aggregate of the existing public-property
 * authority. It deliberately does not query retired price-insight projections,
 * development units, or unpublished property rows.
 *
 * Values are a current asking-inventory snapshot, not transaction evidence or
 * a historical price trend.
 */
export const homeMarketInsightsService = {
  async getHomepageCityInsights(limit = 6): Promise<HomeMarketInsight[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [cityRows, candidateRows, suburbRows] = await Promise.all([
      db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
        })
        .from(cities)
        .innerJoin(provinces, eq(cities.provinceId, provinces.id))
        .orderBy(cities.name),
      db
        .select({ id: properties.id })
        .from(properties)
        .where(
          and(
            inArray(properties.status, ['available', 'published']),
            eq(properties.listingType, 'sale'),
          ),
        )
        .orderBy(desc(properties.createdAt)),
      db.select({ id: suburbs.id, name: suburbs.name, slug: suburbs.slug }).from(suburbs),
    ]);

    if (!candidateRows.length) return [];

    const resolutions = await resolvePublicPropertyEligibilities(
      candidateRows.map(row => Number(row.id)),
    );
    const cityById = new Map<number, CitySummary>();
    cityRows.forEach(row => cityById.set(Number(row.id), row as CitySummary));
    const suburbById = new Map<number, SuburbSummary>();
    suburbRows.forEach(row => suburbById.set(Number(row.id), row as SuburbSummary));
    const propertiesByCity = new Map<number, PublicSaleProperty[]>();

    for (const resolution of resolutions.values()) {
      const property = resolution.property;
      if (String(property.listingType).toLowerCase() !== 'sale') continue;

      const cityId = positiveId(property.cityId);
      if (!cityId || !cityById.has(cityId)) continue;

      const current = propertiesByCity.get(cityId) || [];
      current.push({
        suburbId: positiveId(property.suburbId),
        price: finitePositiveNumber(property.price),
        internalAreaM2: finitePositiveNumber(property.internalAreaM2),
      });
      propertiesByCity.set(cityId, current);
    }

    return Array.from(propertiesByCity.entries())
      .map(([cityId, publicProperties]) => {
        const city = cityById.get(cityId)!;
        const prices = publicProperties
          .map(property => property.price)
          .filter((price): price is number => price !== null);
        const perSquareMetre = publicProperties.flatMap(property =>
          property.price !== null && property.internalAreaM2 !== null
            ? [property.price / property.internalAreaM2]
            : [],
        );
        const distribution = new Map<string, number>();
        prices.forEach(price =>
          distribution.set(priceBand(price), (distribution.get(priceBand(price)) || 0) + 1),
        );
        const localities = new Map<number, number>();
        publicProperties.forEach(property => {
          if (property.suburbId) {
            localities.set(property.suburbId, (localities.get(property.suburbId) || 0) + 1);
          }
        });

        return {
          city: {
            id: Number(city.id),
            name: city.name,
            slug: city.slug,
            provinceName: city.provinceName,
            provinceSlug: city.provinceSlug,
          },
          activeListingCount: publicProperties.length,
          medianAskingPrice: prices.length >= MINIMUM_PRICE_SAMPLE ? median(prices) : null,
          typicalAskingPricePerM2:
            perSquareMetre.length >= MINIMUM_AREA_SAMPLE ? median(perSquareMetre) : null,
          priceDistribution: Array.from(distribution.entries()).map(([label, count]) => ({
            label,
            count,
          })),
          leadingLocalities: Array.from(localities.entries())
            .flatMap(([suburbId, listingCount]) => {
              const suburb = suburbById.get(suburbId);
              return suburb ? [{ name: suburb.name, slug: suburb.slug, listingCount }] : [];
            })
            .sort(
              (left, right) =>
                right.listingCount - left.listingCount || left.name.localeCompare(right.name),
            )
            .slice(0, 3),
        };
      })
      .filter(insight => insight.activeListingCount >= MINIMUM_PRICE_SAMPLE)
      .sort(
        (left, right) =>
          right.activeListingCount - left.activeListingCount ||
          left.city.name.localeCompare(right.city.name),
      )
      .slice(0, limit);
  },
};
