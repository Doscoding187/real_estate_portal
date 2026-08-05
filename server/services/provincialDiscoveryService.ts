import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import { getProvincialConfig, type ProvincialJourneyId } from '../../shared/provincialDiscovery';
import { locationPagesService as baseLocationPagesService } from './locationPagesService';
import { publicSearchService, type PublicSearchInventoryResult } from './publicSearchService';
import type { SearchCardResult } from '../../shared/types';

const PROVINCE_PREVIEW_LIMIT = 6;
const MARKET_PREVIEW_LIMIT = 4;
const MAX_MARKETS = 6;

export type ProvincialInventoryState = 'ready' | 'sparse' | 'empty' | 'unavailable';

export interface ProvincialInventoryPreview {
  id: string;
  href: string;
  title: string;
  location: string;
  price: number | null;
  image: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  propertyType: string | null;
  listingType: string | null;
  listingSource: 'manual' | 'development' | null;
}

function inventoryState(result: PublicSearchInventoryResult): ProvincialInventoryState {
  if (result.total <= 0) return 'empty';
  if (result.total < 4 || result.cards.length < 3) return 'sparse';
  return 'ready';
}

function numberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function toPreview(card: SearchCardResult): ProvincialInventoryPreview {
  return {
    id: String(card.id || ''),
    href: String(card.href || (card.id ? `/property/${card.id}` : '/property-for-sale')),
    title: String(card.title || 'Property listing').trim(),
    location: String(card.location || [card.suburb, card.city].filter(Boolean).join(', ')).trim(),
    price: numberOrNull(card.price),
    image: String(card.image || '').trim() || null,
    bedrooms: numberOrNull(card.bedrooms),
    bathrooms: numberOrNull(card.bathrooms),
    area: numberOrNull(card.area),
    propertyType: String(card.propertyType || '').trim() || null,
    listingType: String(card.listingType || '').trim() || null,
    listingSource:
      card.listingSource === 'manual' || card.listingSource === 'development'
        ? card.listingSource
        : null,
  };
}

function toInventorySummary(result: PublicSearchInventoryResult) {
  return {
    state: inventoryState(result),
    total: result.total,
    items: result.cards.map(toPreview),
    sourceCounts: result.sourceCounts,
    pageSize: result.pageSize,
    authority: 'public-search' as const,
  };
}

function toCountSummary(result: PublicSearchInventoryResult | undefined) {
  if (!result) {
    return { state: 'unavailable' as const, total: null, sourceCounts: null };
  }

  return {
    state: inventoryState(result),
    total: result.total,
    sourceCounts: result.sourceCounts,
  };
}

export class ProvincialDiscoveryService {
  async getProvinceData(provinceSlug: string) {
    const config = getProvincialConfig(provinceSlug);
    if (!config) return null;

    const base = await baseLocationPagesService.getProvinceData(config.slug);
    if (!base?.province) return null;

    const province = {
      id: Number(base.province.id),
      canonicalLocationId: encodeCanonicalLocationId('province', Number(base.province.id)),
      name: String(base.province.name || config.name),
      slug: String(base.province.slug || config.slug),
      code: String(base.province.code || config.code),
      latitude: base.province.latitude ? String(base.province.latitude) : null,
      longitude: base.province.longitude ? String(base.province.longitude) : null,
      description: String(base.province.description || '').trim() || null,
    };

    type ProvinceCityRow = {
      id: number;
      name?: string | null;
      slug?: string | null;
      latitude?: string | number | null;
      longitude?: string | number | null;
    };
    const canonicalCities = ((base.cities as ProvinceCityRow[] | undefined) || []).map(city => ({
      id: Number(city.id),
      canonicalLocationId: encodeCanonicalLocationId('city', Number(city.id)),
      name: String(city.name || '').trim(),
      slug: String(city.slug || '')
        .trim()
        .toLowerCase(),
      provinceSlug: province.slug,
      latitude: city.latitude ? String(city.latitude) : null,
      longitude: city.longitude ? String(city.longitude) : null,
    }));
    const cityBySlug = new Map(canonicalCities.map(city => [city.slug, city]));

    const provinceResult = await publicSearchService.searchInventory({
      province: province.slug,
      page: 0,
      pageSize: PROVINCE_PREVIEW_LIMIT,
      sortOption: 'date_desc',
    });

    const countableJourneys = new Set<ProvincialJourneyId>(['buy', 'rent', 'developments']);
    const activeCountJourneys = config.supportedJourneys
      .filter(journey => journey.state === 'active' && countableJourneys.has(journey.id))
      .map(journey => journey.id);
    const activeCountJourneySet = new Set(activeCountJourneys);
    const [buyResult, rentResult, developmentResult] = await Promise.all([
      activeCountJourneySet.has('buy')
        ? publicSearchService.searchInventory({
            province: province.slug,
            listingType: 'sale',
            page: 0,
            pageSize: 1,
            sortOption: 'date_desc',
          })
        : Promise.resolve(undefined),
      activeCountJourneySet.has('rent')
        ? publicSearchService.searchInventory({
            province: province.slug,
            listingType: 'rent',
            page: 0,
            pageSize: 1,
            sortOption: 'date_desc',
          })
        : Promise.resolve(undefined),
      activeCountJourneySet.has('developments')
        ? publicSearchService.searchInventory({
            province: province.slug,
            listingSource: 'development',
            page: 0,
            pageSize: 1,
            sortOption: 'date_desc',
          })
        : Promise.resolve(undefined),
    ]);

    const marketConfigs = config.majorMarkets.slice(0, MAX_MARKETS);
    const marketResults = await Promise.all(
      marketConfigs.map(async market => {
        const city = cityBySlug.get(market.slug);
        if (!city) {
          return {
            config: market,
            city: null,
            result: null,
          };
        }

        const result = await publicSearchService.searchInventory({
          province: province.slug,
          city: city.slug,
          page: 0,
          pageSize: MARKET_PREVIEW_LIMIT,
          sortOption: 'date_desc',
        });
        return { config: market, city, result };
      }),
    );

    return {
      province,
      cities: canonicalCities,
      markets: marketResults.map(({ config: market, city, result }) => ({
        slug: market.slug,
        name: market.name,
        eyebrow: market.eyebrow,
        description: market.description,
        areaSlugs: market.areaSlugs,
        city: city
          ? {
              id: city.id,
              canonicalLocationId: city.canonicalLocationId,
              name: city.name,
              slug: city.slug,
            }
          : null,
        inventory: result ? toInventorySummary(result) : null,
        state: result ? inventoryState(result) : ('unavailable' as const),
      })),
      journeyCounts: {
        buy: toCountSummary(buyResult),
        rent: toCountSummary(rentResult),
        developments: toCountSummary(developmentResult),
      },
      inventoryPreview: toInventorySummary(provinceResult),
      marketSnapshot: {
        state: 'unavailable' as const,
        title: 'Pricing snapshot is not published yet',
        reason:
          'This slice has a trusted live-inventory authority, but no audited public price series. We will show pricing only when the sample and method are defensible.',
        provenance: {
          source: 'Property Listify public search inventory',
          sampleSize: 0,
          asOf: new Date().toISOString(),
          note: 'Inventory totals are asking-listing counts, not concluded transactions or valuations.',
        },
      },
      activeCountJourneys,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const provincialDiscoveryService = new ProvincialDiscoveryService();
