import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { cities, provinces, suburbs } from '../../drizzle/schema';
import { CITY_GUIDE_FEATURES } from '../../shared/cityGuideFeatures';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import { getDb } from '../db';

/**
 * The geography authority service is the single seam through which runtime code may read
 * location identity.
 *
 * Today that identity comes from the three-level `provinces` / `cities` / `suburbs` runtime
 * projection. That projection is a compatibility read of the canonical Place Authority, not a
 * second authority: it is retired in favour of the Place Authority reader. This service is the
 * registered temporary boundary for that retirement, recorded as DBX-PLACE-PROJECTION-READ.
 *
 * Rules this service keeps, so that no consumer has to re-implement them:
 *
 * - A place is only offered to a consumer when its own status is `verified`.
 * - A place is never widened: an unknown or ambiguous place is not resolved to its parent.
 * - A slug that two rows claim is refused rather than guessed.
 * - Numeric identifiers never leave this service. Consumers receive the canonical location id.
 *
 * No consumer may import the location tables directly. The contract test
 * `server/__tests__/contract.geography-authority-single-read.test.ts` holds that rule.
 */

export interface RuntimeProvinceScope {
  id: number;
  name: string;
  slug: string;
  canonicalLocationId: string;
}

export interface RuntimeCityScope {
  id: number;
  name: string;
  slug: string;
  canonicalLocationId: string;
}

export interface RuntimePlaceScope {
  /** A city or town scope, or a suburb scope under a city. */
  level: 'city' | 'suburb';
  id: number;
  name: string;
  slug: string;
  /** The city a suburb scope sits under. Absent for a city scope. */
  parentCitySlug?: string;
  canonicalLocationId: string;
}

export interface RuntimeCityGuideCandidate extends RuntimeCityScope {
  provinceName: string;
  provinceSlug: string;
}

/** The one verified province for a slug, or nothing. A missing or duplicated province is refused. */
export async function resolveVerifiedProvinceScope(
  provinceSlug: string,
): Promise<RuntimeProvinceScope | null> {
  const db = await getDb();
  const matches = await db
    .select({ id: provinces.id, name: provinces.name, slug: provinces.slug })
    .from(provinces)
    .where(and(eq(provinces.slug, provinceSlug), eq(provinces.status, 'verified')))
    .limit(2);
  if (matches.length !== 1) return null;
  const row = matches[0];
  return {
    id: row.id,
    name: row.name,
    slug: provinceSlug,
    canonicalLocationId: encodeCanonicalLocationId('province', row.id),
  };
}

/**
 * The place scopes a province guide may link to, resolved by their exact slug within the
 * province. A slug is a city scope or a suburb scope under one of the province's cities.
 * A slug claimed by more than one place is refused rather than guessed, and a suburb whose
 * own city is not usable is refused with it.
 */
export async function listVerifiedPlaceScopes(input: {
  provinceId: number;
  slugs: readonly string[];
}): Promise<RuntimePlaceScope[]> {
  const db = await getDb();
  const slugs = [...new Set(input.slugs.filter(Boolean))];
  if (!slugs.length) return [];

  const cityRows = await db
    .select({ id: cities.id, name: cities.name, slug: cities.slug })
    .from(cities)
    .where(
      and(
        eq(cities.provinceId, input.provinceId),
        eq(cities.status, 'verified'),
        inArray(cities.slug, slugs),
      ),
    )
    .orderBy(asc(cities.name), asc(cities.id));

  const suburbRows = await db
    .select({
      id: suburbs.id,
      name: suburbs.name,
      slug: suburbs.slug,
      citySlug: cities.slug,
    })
    .from(suburbs)
    .innerJoin(cities, eq(suburbs.cityId, cities.id))
    .where(
      and(
        eq(cities.provinceId, input.provinceId),
        eq(cities.status, 'verified'),
        eq(suburbs.status, 'verified'),
        inArray(suburbs.slug, slugs),
      ),
    )
    .orderBy(asc(suburbs.name), asc(suburbs.id));

  const claims = new Map<string, number>();
  for (const row of [...cityRows, ...suburbRows]) {
    claims.set(row.slug, (claims.get(row.slug) || 0) + 1);
  }

  const places: RuntimePlaceScope[] = [];
  for (const row of cityRows) {
    if (claims.get(row.slug) !== 1) continue;
    places.push({
      level: 'city',
      id: row.id,
      name: row.name,
      slug: row.slug,
      canonicalLocationId: encodeCanonicalLocationId('city', row.id),
    });
  }
  for (const row of suburbRows) {
    if (claims.get(row.slug) !== 1) continue;
    places.push({
      level: 'suburb',
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentCitySlug: row.citySlug,
      canonicalLocationId: encodeCanonicalLocationId('suburb', row.id),
    });
  }
  return places;
}

/**
 * The city scopes available for guide discovery, in editorial order. A city qualifies when its
 * own record and its province are both verified and the province is a configured province.
 */
export async function listCityGuideCandidates(input: {
  limit: number;
  provinceSlug?: string;
  query?: string;
  provinceSlugs: readonly string[];
}): Promise<RuntimeCityGuideCandidate[]> {
  const db = await getDb();
  const editorialOrder = sql`CASE ${sql.join(
    CITY_GUIDE_FEATURES.map(
      ([province, city], index) =>
        sql`WHEN ${provinces.slug} = ${province} AND ${cities.slug} = ${city} THEN ${index}`,
    ),
    sql` `,
  )} ELSE ${CITY_GUIDE_FEATURES.length} END`;
  const searchPattern = input.query?.trim()
    ? `%${input.query.trim().toLowerCase().replace(/[!%_]/g, '!$&')}%`
    : undefined;

  const rows = await db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
      provinceName: provinces.name,
      provinceSlug: provinces.slug,
    })
    .from(cities)
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .where(
      and(
        eq(cities.status, 'verified'),
        eq(provinces.status, 'verified'),
        input.provinceSlug ? eq(provinces.slug, input.provinceSlug) : undefined,
        searchPattern ? sql`LOWER(${cities.name}) LIKE ${searchPattern} ESCAPE '!'` : undefined,
        sql`CHAR_LENGTH(TRIM(${cities.slug})) > 0`,
        inArray(provinces.slug, [...input.provinceSlugs]),
      ),
    )
    .orderBy(editorialOrder, asc(cities.name), asc(cities.id))
    .limit(input.limit);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug!,
    provinceName: row.provinceName,
    provinceSlug: row.provinceSlug,
    canonicalLocationId: encodeCanonicalLocationId('city', row.id),
  }));
}
