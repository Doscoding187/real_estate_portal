import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { cities, provinces } from '../../drizzle/schema';
import { CITY_GUIDE_FEATURES } from '../../shared/cityGuideFeatures';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import { PROVINCIAL_CONFIGS } from '../../shared/provincialDiscovery';
import { getDb } from '../db';

/** Lightweight discovery for existing city guides, independent of property stock. */
export async function listCityGuides(limit = 12, provinceSlug?: string, query?: string) {
  const db = await getDb();
  const editorialOrder = sql`CASE ${sql.join(
    CITY_GUIDE_FEATURES.map(
      ([province, city], index) =>
        sql`WHEN ${provinces.slug} = ${province} AND ${cities.slug} = ${city} THEN ${index}`,
    ),
    sql` `,
  )} ELSE ${CITY_GUIDE_FEATURES.length} END`;
  const searchPattern = query?.trim()
    ? `%${query.trim().toLowerCase().replace(/[!%_]/g, '!$&')}%`
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
        provinceSlug ? eq(provinces.slug, provinceSlug) : undefined,
        searchPattern ? sql`LOWER(${cities.name}) LIKE ${searchPattern} ESCAPE '!'` : undefined,
        sql`CHAR_LENGTH(TRIM(${cities.slug})) > 0`,
        inArray(
          provinces.slug,
          Object.values(PROVINCIAL_CONFIGS).map(province => province.slug),
        ),
      ),
    )
    .orderBy(editorialOrder, asc(cities.name), asc(cities.id))
    .limit(limit);
  return rows.map(row => ({
    ...row,
    slug: row.slug!,
    provinceSlug: row.provinceSlug!,
    canonicalLocationId: encodeCanonicalLocationId('city', row.id),
  }));
}
