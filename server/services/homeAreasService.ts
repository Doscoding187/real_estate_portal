import { and, inArray } from 'drizzle-orm';

import { properties } from '../../drizzle/schema';
import { getDb } from '../db';
import { loadHomeProvinceScope } from './homeProvinceScopeService';
import {
  HOME_MARKET_INSIGHTS_TTL_MS,
  publicListingBaseConditions,
  publishedPath,
} from './homeMarketInsightsService';
import { resolvePublicPropertyEligibilities } from './publicPropertyEligibilityService';

export const DEFAULT_POPULAR_AREA_LIMIT = 8;
export const MAX_POPULAR_AREA_LIMIT = 12;

export type HomePopularArea = {
  placeId: string;
  name: string;
  kind: 'city' | 'suburb';
  /** Published canonical URL path; areas without one are never returned. */
  href: string;
  /** Publicly visible sale + rent listings. */
  listingCount: number;
  saleCount: number;
  rentCount: number;
};

export type HomePopularAreasResult = {
  province: { placeId: string; name: string; href: string | null };
  areas: HomePopularArea[];
  /** Publicly visible sale + rent listings in the whole province. */
  totalListings: number;
  computedAt: string;
};

/**
 * Well-known cities per province, in display priority. Keys are normalised
 * province names (lower case, hyphens as spaces); a name is only used when it
 * resolves to a published city-level place of that province.
 */
const FALLBACK_PRIORITY: Record<string, readonly string[]> = {
  gauteng: [
    'Johannesburg',
    'Pretoria',
    'Sandton',
    'Centurion',
    'Midrand',
    'Randburg',
    'Roodepoort',
    'Soweto',
    'Benoni',
    'Boksburg',
    'Kempton Park',
    'Alberton',
  ],
  'western cape': [
    'Cape Town',
    'Stellenbosch',
    'Paarl',
    'George',
    'Somerset West',
    'Knysna',
    'Hermanus',
    'Mossel Bay',
  ],
  'kwazulu natal': ['Durban', 'Pietermaritzburg', 'Ballito', 'Richards Bay', 'Newcastle'],
  'eastern cape': ['Gqeberha', 'East London', 'Mthatha', 'Jeffreys Bay'],
  'free state': ['Bloemfontein', 'Welkom', 'Bethlehem'],
  limpopo: ['Polokwane', 'Tzaneen', 'Thohoyandou'],
  mpumalanga: ['Mbombela', 'Emalahleni', 'Secunda', 'Middelburg'],
  'north west': ['Rustenburg', 'Mahikeng', 'Mafikeng', 'Potchefstroom', 'Klerksdorp'],
  'northern cape': ['Kimberley', 'Upington'],
};

/** The place authority labels some provinces in Afrikaans. */
const PROVINCE_KEY_ALIASES: Record<string, string> = { 'noord kaap': 'northern cape' };

function normalise(value: string): string {
  return value.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function priorityRank(provinceName: string, cityName: string): number {
  const key = normalise(provinceName);
  const list = FALLBACK_PRIORITY[PROVINCE_KEY_ALIASES[key] ?? key] ?? [];
  const index = list.findIndex(name => normalise(name) === normalise(cityName));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

async function computePopularAreas(
  provincePlaceId: string,
  limit: number,
): Promise<HomePopularAreasResult> {
  const scope = await loadHomeProvinceScope(provincePlaceId);
  const { projection } = scope;
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Query 1: the only properties read, limited to the province's places.
  const candidates = scope.memberPlaceIds.length
    ? await db
        .select({
          id: properties.id,
          listingType: properties.listingType,
          canonicalPlaceId: properties.canonicalPlaceId,
        })
        .from(properties)
        .where(
          and(
            ...publicListingBaseConditions(),
            inArray(properties.listingType, ['sale', 'rent']),
            inArray(properties.canonicalPlaceId, scope.memberPlaceIds),
          ),
        )
    : [];
  const eligible = candidates.length
    ? await resolvePublicPropertyEligibilities(candidates.map(row => Number(row.id)))
    : new Map<number, unknown>();

  const counts = new Map<string, { sale: number; rent: number }>();
  let totalListings = 0;
  for (const row of candidates) {
    const placeId = row.canonicalPlaceId;
    if (!placeId || !eligible.has(Number(row.id))) continue;
    const execution = projection.executions.get(placeId);
    if (!execution || !projection.labels.has(placeId)) continue;
    totalListings += 1;
    const cityPlaceId = execution.scope === 'metro_city' ? execution.placeId : execution.cityPlaceId;
    if (execution.scope === 'province' || !cityPlaceId) continue;
    const current = counts.get(cityPlaceId) ?? { sale: 0, rent: 0 };
    if (row.listingType === 'sale') current.sale += 1;
    else current.rent += 1;
    counts.set(cityPlaceId, current);
  }

  const toArea = (cityPlaceId: string, sale: number, rent: number): HomePopularArea | null => {
    const label = projection.labels.get(cityPlaceId);
    const href = publishedPath(cityPlaceId);
    if (!label || !href) return null;
    return {
      placeId: cityPlaceId,
      name: label.label,
      kind: label.placeType === 'suburb' ? 'suburb' : 'city',
      href,
      listingCount: sale + rent,
      saleCount: sale,
      rentCount: rent,
    };
  };

  const areas = Array.from(counts.entries())
    .flatMap(([placeId, { sale, rent }]) => {
      const area = toArea(placeId, sale, rent);
      return area ? [area] : [];
    })
    .sort((left, right) => right.listingCount - left.listingCount || left.name.localeCompare(right.name))
    .slice(0, limit);

  if (areas.length < limit) {
    const taken = new Set(areas.map(area => area.placeId));
    const fallback = Array.from(projection.executions.values())
      .filter(
        execution =>
          execution.scope === 'metro_city' &&
          execution.provincePlaceId === provincePlaceId &&
          !taken.has(execution.placeId),
      )
      .flatMap(execution => {
        const area = toArea(execution.placeId, 0, 0);
        return area ? [area] : [];
      })
      .sort(
        (left, right) =>
          priorityRank(scope.province.name, left.name) -
            priorityRank(scope.province.name, right.name) || left.name.localeCompare(right.name),
      );
    areas.push(...fallback.slice(0, limit - areas.length));
  }

  return {
    province: {
      ...scope.province,
      href: publishedPath(provincePlaceId),
    },
    areas,
    totalListings,
    computedAt: new Date().toISOString(),
  };
}

const cache = new Map<string, { at: number; value: HomePopularAreasResult }>();

export function resetHomeAreasCache(): void {
  cache.clear();
}

/** Popular cities of a province with how many public listings each has. */
export const homeAreasService = {
  async getPopularAreasByProvince({
    provincePlaceId,
    limit = DEFAULT_POPULAR_AREA_LIMIT,
  }: {
    provincePlaceId: string;
    limit?: number;
  }): Promise<HomePopularAreasResult> {
    const boundedLimit = Math.min(
      MAX_POPULAR_AREA_LIMIT,
      Math.max(1, Math.floor(Number(limit) || DEFAULT_POPULAR_AREA_LIMIT)),
    );
    const key = JSON.stringify({ provincePlaceId, limit: boundedLimit });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < HOME_MARKET_INSIGHTS_TTL_MS) return hit.value;
    const value = await computePopularAreas(provincePlaceId, boundedLimit);
    cache.set(key, { at: Date.now(), value });
    return value;
  },
};
