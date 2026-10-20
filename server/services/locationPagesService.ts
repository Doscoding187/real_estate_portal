import { getDb } from '../db';
import {
  provinces,
  cities,
  suburbs,
  properties,
  developments,
  cataloguePublishers,
  developerOrganisations,
} from '../../drizzle/schema';
import { eq, and, desc, sql, inArray, getTableColumns, type SQL } from 'drizzle-orm';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';
import {
  resolvePublicPropertyEligibilities,
  type PublicPropertyEligibilityResolution,
} from './publicPropertyEligibilityService';
import { getPublicPropertyMarketFact, toPublicPropertyDetailDto } from './publicPropertyDto';
import { buildSuburbMarketInsights } from './suburbMarketInsights';
import { safeErrorSummary } from '../_core/safeError';

/**
 * IMPROVED Service for handling location page data aggregation
 * Supporting 3 hierarchical levels: Province -> City -> Suburb
 *
 * This version uses slug columns for better matching and performance
 */
function normalizeLocationSlug(value: string): string {
  return value.trim().toLowerCase();
}

type EligibleLocationProperty = {
  id: number;
  provinceId: number | null;
  cityId: number | null;
  suburbId: number | null;
  price: unknown;
  listingType: string;
  propertyType: string;
  featured: number;
  resolution: PublicPropertyEligibilityResolution;
};

/**
 * Location pages are public inventory summaries, not a second publication
 * authority. Fetch the geographically relevant projection candidates, then
 * retain only IDs admitted by the canonical public-property contract.
 */
async function loadEligibleLocationProperties(
  database: any,
  locationCondition?: SQL<unknown>,
): Promise<EligibleLocationProperty[]> {
  const publicProjectionStatus = inArray(properties.status, ['available', 'published']);
  const candidates = await database
    .select({
      id: properties.id,
    })
    .from(properties)
    .where(
      locationCondition ? and(publicProjectionStatus, locationCondition) : publicProjectionStatus,
    )
    .orderBy(desc(properties.createdAt));

  if (candidates.length === 0) return [];

  const resolutions = await resolvePublicPropertyEligibilities(
    candidates.map((row: any) => Number(row.id)),
  );
  return candidates.flatMap((row: any) => {
    const id = Number(row.id);
    const resolution = resolutions.get(id);
    if (!resolution) return [];
    const property = resolution.property;
    return [
      {
        id,
        provinceId: Number(property.provinceId) || null,
        cityId: Number(property.cityId) || null,
        suburbId: Number(property.suburbId) || null,
        price: property.price,
        listingType: String(property.listingType || ''),
        propertyType: String(property.propertyType || ''),
        featured: Number(property.featured || 0),
        resolution,
      },
    ];
  });
}

function loadPropertyPreviews(rows: readonly EligibleLocationProperty[]) {
  return rows.map(row => toPublicPropertyDetailDto(row.resolution).property);
}

function numericPrice(row: EligibleLocationProperty): number | null {
  if (row.price === null || row.price === undefined || row.price === '') return null;
  const value = Number(row.price);
  return Number.isFinite(value) ? value : null;
}

function averagePropertyPrice(rows: readonly EligibleLocationProperty[]): number | null {
  const prices = rows.map(numericPrice).filter((value): value is number => value !== null);
  if (prices.length === 0) return null;
  return prices.reduce((sum, value) => sum + value, 0) / prices.length;
}

function groupPropertiesByLocation(
  rows: readonly EligibleLocationProperty[],
  field: 'cityId' | 'suburbId',
): Map<number, EligibleLocationProperty[]> {
  const grouped = new Map<number, EligibleLocationProperty[]>();
  rows.forEach(property => {
    const locationId = Number(property[field] || 0);
    if (!locationId) return;
    const existing = grouped.get(locationId) || [];
    existing.push(property);
    grouped.set(locationId, existing);
  });
  return grouped;
}

export type SuburbDevelopmentTypeMix = {
  residential: number;
  mixed_use: number;
  commercial: number;
  land: number;
};

export type SuburbDevelopmentStatusMix = {
  'launching-soon': number;
  selling: number;
  'sold-out': number;
};

export type SuburbDevelopmentPublisher = {
  id: number;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  authorityKind: string | null;
  developmentCount: number;
};

export type SuburbDevelopmentSummary = {
  total: number;
  byType: SuburbDevelopmentTypeMix;
  byStatus: SuburbDevelopmentStatusMix;
  priceFromMinimum: number | null;
  priceToMaximum: number | null;
  publishers: SuburbDevelopmentPublisher[];
};

export const EMPTY_SUBURB_DEVELOPMENT_SUMMARY: SuburbDevelopmentSummary = {
  total: 0,
  byType: { residential: 0, mixed_use: 0, commercial: 0, land: 0 },
  byStatus: { 'launching-soon': 0, selling: 0, 'sold-out': 0 },
  priceFromMinimum: null,
  priceToMaximum: null,
  publishers: [],
};

async function loadSuburbDevelopmentSummary(
  db: any,
  scope: { suburbName: string; suburbId: number; cityName: string },
): Promise<SuburbDevelopmentSummary> {
  const rows = await db
    .select({
      id: developments.id,
      developmentType: developments.developmentType,
      status: developments.status,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      publisherId: cataloguePublishers.id,
      publisherName: cataloguePublishers.name,
      publisherSlug: cataloguePublishers.slug,
      publisherLogoUrl: cataloguePublishers.logoUrl,
      publisherAuthorityKind: cataloguePublishers.authorityKind,
    })
    .from(developments)
    .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
    .where(
      and(
        sql`TRIM(LOWER(${developments.suburb})) = LOWER(${scope.suburbName})`,
        sql`(TRIM(LOWER(${developments.city})) = LOWER(${scope.cityName}) OR ${developments.locationId} = ${scope.suburbId})`,
        publicDevelopmentEligibilityConditions(),
      ),
    )
    .limit(200);

  const summary: SuburbDevelopmentSummary = {
    total: rows.length,
    byType: { residential: 0, mixed_use: 0, commercial: 0, land: 0 },
    byStatus: { 'launching-soon': 0, selling: 0, 'sold-out': 0 },
    priceFromMinimum: null,
    priceToMaximum: null,
    publishers: [],
  };
  const publishersById = new Map<number, SuburbDevelopmentPublisher>();

  rows.forEach((row: any) => {
    const type = String(row.developmentType || '') as keyof SuburbDevelopmentTypeMix;
    if (type in summary.byType) summary.byType[type] += 1;
    const status = String(row.status || '') as keyof SuburbDevelopmentStatusMix;
    if (status in summary.byStatus) summary.byStatus[status] += 1;

    const priceFrom = Number(row.priceFrom || 0);
    if (priceFrom > 0) {
      summary.priceFromMinimum =
        summary.priceFromMinimum === null
          ? priceFrom
          : Math.min(summary.priceFromMinimum, priceFrom);
    }
    const priceTo = Number(row.priceTo || 0);
    if (priceTo > 0) {
      summary.priceToMaximum =
        summary.priceToMaximum === null ? priceTo : Math.max(summary.priceToMaximum, priceTo);
    }

    const publisherId = Number(row.publisherId || 0);
    const publisherName = String(row.publisherName || '').trim();
    if (!publisherId || !publisherName) return;
    const existing = publishersById.get(publisherId);
    if (existing) {
      existing.developmentCount += 1;
      return;
    }
    publishersById.set(publisherId, {
      id: publisherId,
      name: publisherName,
      slug: row.publisherSlug ? String(row.publisherSlug) : null,
      logoUrl: row.publisherLogoUrl ? String(row.publisherLogoUrl) : null,
      authorityKind: row.publisherAuthorityKind ? String(row.publisherAuthorityKind) : null,
      developmentCount: 1,
    });
  });

  summary.publishers = [...publishersById.values()]
    .sort(
      (left, right) =>
        right.developmentCount - left.developmentCount || left.name.localeCompare(right.name),
    )
    .slice(0, 8);

  return summary;
}

export const locationPagesService = {
  async getPopularCities(limit = 12) {
    const db = await getDb();

    const [rows, eligibleProperties] = await Promise.all([
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
      loadEligibleLocationProperties(db),
    ]);

    const propertiesByCity = groupPropertiesByLocation(eligibleProperties, 'cityId');

    return rows
      .map(row => ({
        id: row.id,
        name: row.name,
        slug:
          row.slug ||
          row.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        provinceName: row.provinceName,
        provinceSlug:
          row.provinceSlug ||
          row.provinceName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        listingCount: propertiesByCity.get(Number(row.id))?.length || 0,
      }))
      .filter(row => row.listingCount > 0)
      .sort(
        (left, right) =>
          right.listingCount - left.listingCount || left.name.localeCompare(right.name),
      )
      .slice(0, limit);
  },

  /**
   * Get data for Province Page (Level 1)
   */
  async getProvinceData(provinceSlug: string) {
    console.log(`[LocationPages] getProvinceData called with slug: "${provinceSlug}"`);

    const db = await getDb();

    const normalizedProvinceSlug = normalizeLocationSlug(provinceSlug);
    const [province] = await db
      .select()
      .from(provinces)
      .where(eq(provinces.slug, normalizedProvinceSlug))
      .limit(1);

    if (!province) {
      console.log(`[LocationPages] Province not found for slug: "${provinceSlug}"`);
      return null;
    }

    console.log(`[LocationPages] Found province: ${province.name} (id: ${province.id})`);

    // Secondary queries wrapped individually so a single failure doesn't kill the whole page
    let cityList: any[] = [];
    let featuredDevelopments: any[] = [];
    let trendingSuburbs: any[] = [];
    let eligibleProperties: EligibleLocationProperty[] = [];

    try {
      eligibleProperties = await loadEligibleLocationProperties(
        db,
        eq(properties.provinceId, province.id),
      );
    } catch (error) {
      console.warn(
        '[LocationPages] Public property eligibility failed for province',
        safeErrorSummary(error),
      );
      throw error;
    }

    try {
      const provinceCities = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          isMetro: cities.isMetro,
        })
        .from(cities)
        .where(eq(cities.provinceId, province.id))
        .orderBy(cities.name);
      const propertiesByCity = groupPropertiesByLocation(eligibleProperties, 'cityId');
      cityList = provinceCities
        .map(city => {
          const cityProperties = propertiesByCity.get(Number(city.id)) || [];
          return {
            ...city,
            listingCount: cityProperties.length,
            avgPrice: averagePropertyPrice(cityProperties),
          };
        })
        .sort(
          (left, right) =>
            right.listingCount - left.listingCount || left.name.localeCompare(right.name),
        )
        .slice(0, 12);
    } catch (error) {
      console.warn('[LocationPages] City list query failed for province', safeErrorSummary(error));
      throw error;
    }

    try {
      featuredDevelopments = await db
        .select({ ...getTableColumns(developments) })
        .from(developments)
        .leftJoin(
          cataloguePublishers,
          eq(developments.cataloguePublisherId, cataloguePublishers.id),
        )
        .leftJoin(
          developerOrganisations,
          eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
        )
        .where(
          and(
            sql`TRIM(LOWER(${developments.province})) = LOWER(${province.name})`,
            publicDevelopmentEligibilityConditions(),
          ),
        )
        .limit(6);
    } catch (error) {
      console.warn(
        '[LocationPages] Developments query failed for province',
        safeErrorSummary(error),
      );
      throw error;
    }

    try {
      const provinceSuburbs = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityName: cities.name,
          citySlug: cities.slug,
        })
        .from(suburbs)
        .leftJoin(cities, eq(suburbs.cityId, cities.id))
        .where(eq(cities.provinceId, province.id))
        .orderBy(suburbs.name);
      const propertiesBySuburb = groupPropertiesByLocation(eligibleProperties, 'suburbId');
      trendingSuburbs = provinceSuburbs
        .map(suburb => ({
          ...suburb,
          listingCount: propertiesBySuburb.get(Number(suburb.id))?.length || 0,
        }))
        .sort(
          (left, right) =>
            right.listingCount - left.listingCount || left.name.localeCompare(right.name),
        )
        .slice(0, 10);
    } catch (error) {
      console.warn(
        '[LocationPages] Trending suburbs query failed for province',
        safeErrorSummary(error),
      );
      throw error;
    }

    const averagePrice = averagePropertyPrice(eligibleProperties);

    return {
      province,
      cities: cityList,
      featuredDevelopments,
      trendingSuburbs,
      stats: {
        totalListings: eligibleProperties.length,
        avgPrice: Math.round(averagePrice || 0),
      },
    };
  },

  /**
   * Get data for City Page (Level 2)
   */
  async getCityData(
    provinceSlug: string,
    citySlug: string,
    options?: { includeInventoryPreview?: boolean; suburbLimit?: number },
  ) {
    console.log(
      `[LocationPages] getCityData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}"`,
    );

    try {
      const db = await getDb();

      const [city] = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          provinceId: cities.provinceId,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
          isMetro: cities.isMetro,
          latitude: cities.latitude,
          longitude: cities.longitude,
        })
        .from(cities)
        .innerJoin(provinces, eq(cities.provinceId, provinces.id))
        .where(
          and(
            eq(cities.slug, normalizeLocationSlug(citySlug)),
            eq(provinces.slug, normalizeLocationSlug(provinceSlug)),
          ),
        )
        .limit(1);

      if (!city) {
        console.log(`[LocationPages] City not found for slug: "${citySlug}"`);

        return null;
      }

      console.log(`[LocationPages] Found city: ${city.name} (id: ${city.id})`);

      const eligibleProperties = await loadEligibleLocationProperties(
        db,
        eq(properties.cityId, city.id),
      );

      // 2. Popular Suburbs in City. Property metrics are derived only from
      // canonical public IDs, while the geography catalogue remains complete.
      const citySuburbs = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          latitude: suburbs.latitude,
          longitude: suburbs.longitude,
        })
        .from(suburbs)
        .where(eq(suburbs.cityId, city.id))
        .orderBy(suburbs.name);

      const propertiesBySuburb = groupPropertiesByLocation(eligibleProperties, 'suburbId');
      const suburbList = citySuburbs
        .map(suburb => {
          const suburbProperties = propertiesBySuburb.get(Number(suburb.id)) || [];
          const saleProperties = suburbProperties.filter(
            property => property.listingType === 'sale',
          );
          const rentalProperties = suburbProperties.filter(
            property => property.listingType === 'rent',
          );
          const marketInsights = buildSuburbMarketInsights(
            suburbProperties.map(property => getPublicPropertyMarketFact(property.resolution)),
          );
          return {
            ...suburb,
            listingCount: suburbProperties.length,
            propertiesForSale: saleProperties.length,
            propertiesForRent: rentalProperties.length,
            minimumPriceSample: marketInsights.minimumPriceSample,
            medianSalePrice: marketInsights.sale.medianPrice,
            pricedListingsForSale: marketInsights.sale.pricedListingCount,
            medianRentalPrice: marketInsights.rent.medianPrice,
            pricedListingsForRent: marketInsights.rent.pricedListingCount,
          };
        })
        .sort(
          (left, right) =>
            right.listingCount - left.listingCount || left.name.localeCompare(right.name),
        )
        .slice(0, Math.min(Math.max(options?.suburbLimit ?? 12, 1), 200));

      console.log(`[LocationPages] Found ${suburbList.length} suburbs`);

      // Neutral geography pages may expose aggregate counts and insights, but
      // must not fetch a journey-specific listing preview before a journey is
      // explicitly selected.
      const includeInventoryPreview = options?.includeInventoryPreview ?? true;
      const featuredProperties = includeInventoryPreview
        ? loadPropertyPreviews(
            eligibleProperties.filter(property => Number(property.featured || 0) === 1).slice(0, 6),
          )
        : [];

      // 4. Developments in City (match by city name, trim whitespace, also include suburb matches)
      // Cascading: show developments where city matches OR suburb is in this city's suburbs
      const cityDevelopments = await db
        .select({ ...getTableColumns(developments) })
        .from(developments)
        .leftJoin(
          cataloguePublishers,
          eq(developments.cataloguePublisherId, cataloguePublishers.id),
        )
        .leftJoin(
          developerOrganisations,
          eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
        )
        .where(
          and(
            sql`(TRIM(LOWER(${developments.city})) = LOWER(${city.name}) OR TRIM(LOWER(${developments.suburb})) IN (SELECT LOWER(name) FROM suburbs WHERE cityId = ${city.id}))`,
            publicDevelopmentEligibilityConditions(),
          ),
        )
        .limit(8);

      // Always return city data, even if no listings exist (show empty state)
      console.log(
        `[LocationPages] Returning city data with ${featuredProperties.length} properties`,
      );

      // 5. Property Type Stats (for PropertyTypeExplorer)
      const propertiesByType = new Map<string, EligibleLocationProperty[]>();
      eligibleProperties.forEach(property => {
        const type = String(property.propertyType || 'other');
        const existing = propertiesByType.get(type) || [];
        existing.push(property);
        propertiesByType.set(type, existing);
      });
      const propertyTypeStats = Array.from(propertiesByType.entries()).map(([type, rows]) => ({
        type,
        count: rows.length,
        avgPrice: averagePropertyPrice(rows),
      }));
      const averagePrice = averagePropertyPrice(eligibleProperties);

      // 6. Top Localities (Suburbs) by demand/inventory (for LocationTopLocalities)
      // We'll use the suburbList we already fetched, but maybe we need more stats if not present
      // The suburbList query (see above in file, assumed existing) might need enhancement or we just process it.
      // Let's assume suburbList is list of suburbs. We want to sort them by listing count or similar.
      // The previous 'suburbList' query (lines 90-110 approx) likely joins with listings count.
      // Let's verify existing suburbs query first. If it has counts, we are good.

      return {
        city,
        suburbs: suburbList || [],
        featuredProperties: featuredProperties || [],
        developments: cityDevelopments || [],
        stats: {
          totalListings: eligibleProperties.length,
          avgPrice: Number(averagePrice || 0),
        },
        propertyTypes: propertyTypeStats.map((pt: any) => ({
          type: pt.type,
          count: Number(pt.count),
          avgPrice: Math.round(Number(pt.avgPrice) || 0),
        })),
        // We can just reuse suburbs for TopLocalities if it has the data,
        // but let's ensure it's sorted by volume for "Top" feel
        topLocalities: (suburbList || [])
          .sort((a: any, b: any) => Number(b.listingCount || 0) - Number(a.listingCount || 0))
          .slice(0, 10),
      };
    } catch (error) {
      console.error('[LocationPages] Error in getCityData:', safeErrorSummary(error));
      throw error;
    }
  },

  /**
   * Get data for Suburb Page (Level 3)
   */
  async getSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    console.log(
      `[LocationPages] getSuburbData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}", suburbSlug="${suburbSlug}"`,
    );

    const db = await getDb();

    const [suburb] = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        cityId: suburbs.cityId,
        cityName: cities.name,
        citySlug: cities.slug,
        provinceName: provinces.name,
        provinceSlug: provinces.slug,
        latitude: suburbs.latitude,
        longitude: suburbs.longitude,
      })
      .from(suburbs)
      .innerJoin(cities, eq(suburbs.cityId, cities.id))
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(
        and(
          eq(suburbs.slug, normalizeLocationSlug(suburbSlug)),
          eq(cities.slug, normalizeLocationSlug(citySlug)),
          eq(provinces.slug, normalizeLocationSlug(provinceSlug)),
        ),
      )
      .limit(1);

    if (!suburb) {
      console.log(`[LocationPages] Suburb not found for slug: "${suburbSlug}"`);

      return null;
    }

    console.log(`[LocationPages] Found suburb: ${suburb.name} (id: ${suburb.id})`);

    // 2. Listing Stats — public location summaries use the same final
    // provenance/custody eligibility as search, detail and enquiry.
    let eligibleProperties: EligibleLocationProperty[] = [];
    try {
      eligibleProperties = await loadEligibleLocationProperties(
        db,
        eq(properties.suburbId, suburb.id),
      );
    } catch (error) {
      console.warn(
        '[LocationPages] Public property eligibility failed for suburb',
        safeErrorSummary(error),
      );
      throw error;
    }

    const rentalCount = eligibleProperties.filter(
      property => property.listingType === 'rent',
    ).length;
    const saleCount = eligibleProperties.filter(property => property.listingType === 'sale').length;
    const averagePrice = averagePropertyPrice(eligibleProperties);
    const marketInsights = buildSuburbMarketInsights(
      eligibleProperties.map(property => getPublicPropertyMarketFact(property.resolution)),
    );

    let suburbDevelopments = EMPTY_SUBURB_DEVELOPMENT_SUMMARY;
    try {
      suburbDevelopments = await loadSuburbDevelopmentSummary(db, {
        suburbName: suburb.name,
        suburbId: Number(suburb.id),
        cityName: suburb.cityName,
      });
    } catch (error) {
      console.warn(
        '[LocationPages] Suburb development summary failed',
        safeErrorSummary(error),
      );
    }

    return {
      suburb,
      stats: {
        totalListings: eligibleProperties.length,
        avgPrice: Math.round(averagePrice || 0),
        rentalCount,
        saleCount,
      },
      marketInsights,
      developments: suburbDevelopments,
    };
  },
};
