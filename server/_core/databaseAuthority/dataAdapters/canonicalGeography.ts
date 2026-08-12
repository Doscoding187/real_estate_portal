import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  ACCEPTED_MIGRATION_HEAD,
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';

export const CANONICAL_GEOGRAPHY_VERSION = 'canonical-geography-v1' as const;

const PROVINCES = [
  { code: 'GP', name: 'Gauteng', slug: 'gauteng', latitude: '-26.2708', longitude: '28.1123' },
  {
    code: 'WC',
    name: 'Western Cape',
    slug: 'western-cape',
    latitude: '-33.2278',
    longitude: '21.8569',
  },
  {
    code: 'KZN',
    name: 'KwaZulu-Natal',
    slug: 'kwazulu-natal',
    latitude: '-29.8587',
    longitude: '31.0218',
  },
] as const;

const CITIES = [
  {
    provinceSlug: 'gauteng',
    name: 'Johannesburg',
    slug: 'johannesburg',
    latitude: '-26.2041',
    longitude: '28.0473',
  },
  {
    provinceSlug: 'gauteng',
    name: 'Pretoria',
    slug: 'pretoria',
    latitude: '-25.7479',
    longitude: '28.2293',
  },
  {
    provinceSlug: 'western-cape',
    name: 'Cape Town',
    slug: 'cape-town',
    latitude: '-33.9249',
    longitude: '18.4241',
  },
  {
    provinceSlug: 'kwazulu-natal',
    name: 'Durban',
    slug: 'durban',
    latitude: '-29.8587',
    longitude: '31.0218',
  },
] as const;

const SUBURBS = [
  {
    citySlug: 'johannesburg',
    name: 'Sandton',
    slug: 'sandton',
    postalCode: '2196',
    latitude: '-26.1076',
    longitude: '28.0567',
  },
] as const;

const REFERENCE_PAYLOAD = Object.freeze({ provinces: PROVINCES, cities: CITIES, suburbs: SUBURBS });
export const CANONICAL_GEOGRAPHY_DIGEST = stableDigest(REFERENCE_PAYLOAD);
export const CANONICAL_GEOGRAPHY_EXPECTED_ROWS = Object.freeze({
  provinces: PROVINCES.length,
  cities: CITIES.length,
  suburbs: SUBURBS.length,
});

export type GeographyReferenceEvidence = AdapterEvidence & {
  expected: { provinces: number; cities: number; suburbs: number };
  verified: { provinces: number; cities: number; suburbs: number };
  migrationHead: typeof ACCEPTED_MIGRATION_HEAD;
};

type RowIdentity = { id: number; name: string; slug: string };

function asId(row: Record<string, unknown>, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Canonical geography ${label} has an invalid ID.`);
  return id;
}

async function ensureProvince(
  connection: AuthoritySqlConnection,
  item: (typeof PROVINCES)[number],
): Promise<RowIdentity> {
  const rows = await queryRows(
    connection,
    'SELECT id, name, code, slug FROM provinces WHERE slug = ?',
    [item.slug],
  );
  if (rows.length > 1)
    throw new Error(`Canonical geography has duplicate province slug ${item.slug}.`);
  if (rows.length === 1) {
    const row = rows[0];
    if (
      String(rowValue(row, 'name')) !== item.name ||
      String(rowValue(row, 'code')) !== item.code
    ) {
      throw new Error(
        `Canonical geography province ${item.slug} conflicts with the approved identity.`,
      );
    }
    return { id: asId(row, `province ${item.slug}`), name: item.name, slug: item.slug };
  }
  const result: any = await connection.execute(
    'INSERT INTO provinces (name, code, latitude, longitude, slug) VALUES (?, ?, ?, ?, ?)',
    [item.name, item.code, item.latitude, item.longitude, item.slug],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Canonical geography could not identify province ${item.slug} after insert.`);
  return { id, name: item.name, slug: item.slug };
}

async function ensureCity(
  connection: AuthoritySqlConnection,
  item: (typeof CITIES)[number],
  provinceId: number,
): Promise<RowIdentity> {
  const rows = await queryRows(
    connection,
    'SELECT id, name, slug, provinceId FROM cities WHERE provinceId = ? AND slug = ?',
    [provinceId, item.slug],
  );
  if (rows.length > 1) throw new Error(`Canonical geography has duplicate city slug ${item.slug}.`);
  if (rows.length === 1) {
    const row = rows[0];
    if (
      String(rowValue(row, 'name')) !== item.name ||
      Number(rowValue(row, 'provinceId')) !== provinceId
    ) {
      throw new Error(
        `Canonical geography city ${item.slug} conflicts with the approved hierarchy.`,
      );
    }
    return { id: asId(row, `city ${item.slug}`), name: item.name, slug: item.slug };
  }
  const result: any = await connection.execute(
    'INSERT INTO cities (provinceId, name, latitude, longitude, isMetro, slug) VALUES (?, ?, ?, ?, ?, ?)',
    [provinceId, item.name, item.latitude, item.longitude, 1, item.slug],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Canonical geography could not identify city ${item.slug} after insert.`);
  return { id, name: item.name, slug: item.slug };
}

async function ensureSuburb(
  connection: AuthoritySqlConnection,
  item: (typeof SUBURBS)[number],
  cityId: number,
): Promise<RowIdentity> {
  const rows = await queryRows(
    connection,
    'SELECT id, name, slug, cityId, postalCode FROM suburbs WHERE cityId = ? AND slug = ?',
    [cityId, item.slug],
  );
  if (rows.length > 1)
    throw new Error(`Canonical geography has duplicate suburb slug ${item.slug}.`);
  if (rows.length === 1) {
    const row = rows[0];
    if (
      String(rowValue(row, 'name')) !== item.name ||
      Number(rowValue(row, 'cityId')) !== cityId ||
      String(rowValue(row, 'postalCode') ?? '') !== item.postalCode
    ) {
      throw new Error(
        `Canonical geography suburb ${item.slug} conflicts with the approved hierarchy.`,
      );
    }
    return { id: asId(row, `suburb ${item.slug}`), name: item.name, slug: item.slug };
  }
  const result: any = await connection.execute(
    'INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode, slug) VALUES (?, ?, ?, ?, ?, ?)',
    [cityId, item.name, item.latitude, item.longitude, item.postalCode, item.slug],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Canonical geography could not identify suburb ${item.slug} after insert.`);
  return { id, name: item.name, slug: item.slug };
}

export async function verifyCanonicalGeographyReferenceData(
  connection: AuthoritySqlConnection,
): Promise<GeographyReferenceEvidence['verified']> {
  const rows = await queryRows(
    connection,
    `SELECT p.id AS province_id, p.name AS province_name, p.code AS province_code, p.slug AS province_slug,
            c.id AS city_id, c.name AS city_name, c.slug AS city_slug, c.provinceId AS city_province_id,
            s.id AS suburb_id, s.name AS suburb_name, s.slug AS suburb_slug, s.cityId AS suburb_city_id
       FROM provinces p
       LEFT JOIN cities c ON c.provinceId = p.id
       LEFT JOIN suburbs s ON s.cityId = c.id
      WHERE p.slug IN (?, ?, ?)
      ORDER BY p.slug, c.slug, s.slug`,
    PROVINCES.map(item => item.slug),
  );
  const provinceRows = new Map<string, Record<string, unknown>>();
  const cityRows = new Map<string, Record<string, unknown>>();
  const suburbRows = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const provinceSlug = String(rowValue(row, 'province_slug') ?? '');
    if (provinceSlug) provinceRows.set(provinceSlug, row);
    const citySlug = String(rowValue(row, 'city_slug') ?? '');
    if (citySlug) cityRows.set(citySlug, row);
    const suburbSlug = String(rowValue(row, 'suburb_slug') ?? '');
    if (suburbSlug) suburbRows.set(suburbSlug, row);
    if (
      citySlug &&
      Number(rowValue(row, 'city_province_id')) !== Number(rowValue(row, 'province_id'))
    ) {
      throw new Error(`Canonical geography city ${citySlug} is attached to the wrong province.`);
    }
    if (
      suburbSlug &&
      Number(rowValue(row, 'suburb_city_id')) !== Number(rowValue(row, 'city_id'))
    ) {
      throw new Error(`Canonical geography suburb ${suburbSlug} is attached to the wrong city.`);
    }
  }
  for (const item of PROVINCES) {
    const row = provinceRows.get(item.slug);
    if (!row) throw new Error(`Canonical geography is missing province ${item.slug}.`);
    if (
      String(rowValue(row, 'province_name')) !== item.name ||
      String(rowValue(row, 'province_code')) !== item.code
    ) {
      throw new Error(
        `Canonical geography province ${item.slug} has an unexpected approved identity.`,
      );
    }
  }
  for (const item of CITIES) {
    const row = cityRows.get(item.slug);
    if (!row || String(rowValue(row, 'city_name')) !== item.name) {
      throw new Error(`Canonical geography is missing city ${item.slug}.`);
    }
  }
  for (const item of SUBURBS) {
    const row = suburbRows.get(item.slug);
    if (!row || String(rowValue(row, 'suburb_name')) !== item.name) {
      throw new Error(`Canonical geography is missing suburb ${item.slug}.`);
    }
  }
  return {
    provinces: provinceRows.size,
    cities: cityRows.size,
    suburbs: suburbRows.size,
  };
}

export async function prepareCanonicalGeography(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<GeographyReferenceEvidence> {
  assertOperation(input.decision, ['reference-seed', 'foundation-seed']);
  const ownership = requireReferenceAdapterTarget(input.authority, input.profileRoot);
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  await withTransaction(input.connection, async () => {
    const provinces = new Map<string, RowIdentity>();
    for (const item of PROVINCES)
      provinces.set(item.slug, await ensureProvince(input.connection, item));
    const cities = new Map<string, RowIdentity>();
    for (const item of CITIES) {
      const province = provinces.get(item.provinceSlug);
      if (!province)
        throw new Error(
          `Canonical geography configuration is missing province ${item.provinceSlug}.`,
        );
      cities.set(item.slug, await ensureCity(input.connection, item, province.id));
    }
    for (const item of SUBURBS) {
      const city = cities.get(item.citySlug);
      if (!city)
        throw new Error(`Canonical geography configuration is missing city ${item.citySlug}.`);
      await ensureSuburb(input.connection, item, city.id);
    }
  });
  const verified = await verifyCanonicalGeographyReferenceData(input.connection);
  return {
    ...ownership,
    adapter: 'canonical-geography',
    version: CANONICAL_GEOGRAPHY_VERSION,
    digest: CANONICAL_GEOGRAPHY_DIGEST,
    expected: CANONICAL_GEOGRAPHY_EXPECTED_ROWS,
    verified,
    migrationHead: ACCEPTED_MIGRATION_HEAD,
  };
}

export async function verifyCanonicalGeography(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<GeographyReferenceEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification', 'readiness']);
  const ownership = requireReferenceAdapterTarget(input.authority, input.profileRoot);
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  const verified = await verifyCanonicalGeographyReferenceData(input.connection);
  return {
    ...ownership,
    adapter: 'canonical-geography',
    version: CANONICAL_GEOGRAPHY_VERSION,
    digest: CANONICAL_GEOGRAPHY_DIGEST,
    expected: CANONICAL_GEOGRAPHY_EXPECTED_ROWS,
    verified,
    migrationHead: ACCEPTED_MIGRATION_HEAD,
  };
}
