import { and, asc, eq, inArray } from 'drizzle-orm';
import { cities, provinces } from '../../drizzle/schema';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import { getProvinceGuideContent } from '../../shared/provinceGuideContent';
import { getDb } from '../db';
import { publicSearchService } from './publicSearchService';

/** Editorial links require exact verified parent/child identities; no widening or name fallback. */
export async function getProvinceGuidePlaces(provinceSlug: string) {
  const guide = getProvinceGuideContent(provinceSlug);
  if (!guide) return null;
  const db = await getDb();
  const matches = await db
    .select({ id: provinces.id, name: provinces.name, slug: provinces.slug })
    .from(provinces)
    .where(and(eq(provinces.slug, provinceSlug), eq(provinces.status, 'verified')))
    .limit(2);
  if (matches.length !== 1) return null;
  const row = matches[0];
  const slugs = [
    ...new Set(guide.regions.flatMap(region => region.places.map(place => place.citySlug))),
  ];
  const rows = await db
    .select({ id: cities.id, name: cities.name, slug: cities.slug })
    .from(cities)
    .where(
      and(
        eq(cities.provinceId, row.id),
        eq(cities.status, 'verified'),
        inArray(cities.slug, slugs),
      ),
    )
    .orderBy(asc(cities.name), asc(cities.id));
  const frequency = new Map<string | null, number>();
  for (const city of rows) frequency.set(city.slug, (frequency.get(city.slug) || 0) + 1);
  return {
    province: {
      id: row.id,
      name: row.name,
      slug: provinceSlug,
      canonicalLocationId: encodeCanonicalLocationId('province', row.id),
    },
    cities: rows
      .filter(city => city.slug && frequency.get(city.slug) === 1)
      .map(city => ({
        ...city,
        slug: city.slug!,
        canonicalLocationId: encodeCanonicalLocationId('city', city.id),
      })),
  };
}

/** Platform availability, not a price index. Uses the existing publication/entitlement authority. */
export async function getProvinceGuideInventory(provinceSlug: string) {
  const places = await getProvinceGuidePlaces(provinceSlug);
  if (!places) return null;
  const results = await Promise.allSettled(
    (['sale', 'rent'] as const).map(async listingType => {
      const result = await publicSearchService.searchInventory({
        locationId: places.province.canonicalLocationId,
        listingType,
        page: 0,
        pageSize: 1,
      });
      if (!Number.isSafeInteger(result.total) || result.total < 0)
        throw new Error('Invalid public inventory count');
      return result.total;
    }),
  );
  const count = (result: PromiseSettledResult<number>) =>
    result.status === 'fulfilled'
      ? { state: 'ready' as const, total: result.value }
      : { state: 'unavailable' as const, total: null };
  return {
    sale: count(results[0]),
    rent: count(results[1]),
    observedAt: new Date().toISOString(),
    scope: places.province.canonicalLocationId,
  };
}
