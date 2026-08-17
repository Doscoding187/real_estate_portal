import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  GOVERNED_RUNTIME_REFERENCE_ROWS,
  GOVERNED_RUNTIME_REFERENCE_VERSION,
} from './governedRuntimeGeography';

export const CANONICAL_GEOGRAPHY_VERSION = 'canonical-geography-v2' as const;

const PROVINCES = [
  {
    code: 'EC',
    name: 'Eastern Cape',
    slug: 'eastern-cape',
    latitude: '-32.2968',
    longitude: '26.4194',
  },
  {
    code: 'FS',
    name: 'Free State',
    slug: 'free-state',
    latitude: '-28.4541',
    longitude: '26.7968',
  },
  { code: 'GP', name: 'Gauteng', slug: 'gauteng', latitude: '-26.2708', longitude: '28.1123' },
  {
    code: 'KZN',
    name: 'KwaZulu-Natal',
    slug: 'kwazulu-natal',
    latitude: '-29.8587',
    longitude: '31.0218',
  },
  {
    code: 'LP',
    name: 'Limpopo',
    slug: 'limpopo',
    latitude: '-23.4013',
    longitude: '29.4179',
  },
  {
    code: 'MP',
    name: 'Mpumalanga',
    slug: 'mpumalanga',
    latitude: '-25.5653',
    longitude: '30.5279',
  },
  {
    code: 'NC',
    name: 'Northern Cape',
    slug: 'northern-cape',
    latitude: '-29.0467',
    longitude: '21.8569',
  },
  {
    code: 'NW',
    name: 'North West',
    slug: 'north-west',
    latitude: '-26.6639',
    longitude: '25.2838',
  },
  {
    code: 'WC',
    name: 'Western Cape',
    slug: 'western-cape',
    latitude: '-33.2278',
    longitude: '21.8569',
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
    provinceSlug: 'eastern-cape',
    name: 'Gqeberha',
    slug: 'gqeberha',
    latitude: '-33.9608',
    longitude: '25.6022',
  },
  {
    provinceSlug: 'free-state',
    name: 'Bloemfontein',
    slug: 'bloemfontein',
    latitude: '-29.0852',
    longitude: '26.1596',
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
  {
    provinceSlug: 'limpopo',
    name: 'Polokwane',
    slug: 'polokwane',
    latitude: '-23.8962',
    longitude: '29.4486',
  },
  {
    provinceSlug: 'mpumalanga',
    name: 'Mbombela',
    slug: 'mbombela',
    latitude: '-25.4753',
    longitude: '30.9694',
  },
  {
    provinceSlug: 'northern-cape',
    name: 'Kimberley',
    slug: 'kimberley',
    latitude: '-28.7282',
    longitude: '24.7499',
  },
  {
    provinceSlug: 'north-west',
    name: 'Rustenburg',
    slug: 'rustenburg',
    latitude: '-25.6676',
    longitude: '27.2421',
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
  {
    citySlug: 'pretoria',
    name: 'Hatfield',
    slug: 'hatfield',
    postalCode: '0083',
    latitude: '-25.7461',
    longitude: '28.2353',
  },
  {
    citySlug: 'gqeberha',
    name: 'Summerstrand',
    slug: 'summerstrand',
    postalCode: '6001',
    latitude: '-34.0067',
    longitude: '25.6711',
  },
  {
    citySlug: 'bloemfontein',
    name: 'Universitas',
    slug: 'universitas',
    postalCode: '9301',
    latitude: '-29.1312',
    longitude: '26.1893',
  },
  {
    citySlug: 'durban',
    name: 'Umhlanga',
    slug: 'umhlanga',
    postalCode: '4319',
    latitude: '-29.7279',
    longitude: '31.0852',
  },
  {
    citySlug: 'polokwane',
    name: 'Bendor',
    slug: 'bendor',
    postalCode: '0699',
    latitude: '-23.8725',
    longitude: '29.4869',
  },
  {
    citySlug: 'mbombela',
    name: 'Sonheuwel',
    slug: 'sonheuwel',
    postalCode: '1201',
    latitude: '-25.4655',
    longitude: '30.9631',
  },
  {
    citySlug: 'kimberley',
    name: 'Heuwelsig',
    slug: 'heuwelsig',
    postalCode: '8301',
    latitude: '-28.7358',
    longitude: '24.7504',
  },
  {
    citySlug: 'rustenburg',
    name: 'Cashan',
    slug: 'cashan',
    postalCode: '2999',
    latitude: '-25.6597',
    longitude: '27.2472',
  },
  {
    citySlug: 'cape-town',
    name: 'Sea Point',
    slug: 'sea-point',
    postalCode: '8005',
    latitude: '-33.9213',
    longitude: '18.3786',
  },
] as const;

type CityReference = {
  provinceSlug: string;
  name: string;
  slug: string;
  latitude?: string | number;
  longitude?: string | number;
};

type SuburbReference = {
  citySlug: string;
  name: string;
  slug: string;
  postalCode?: string;
  latitude?: string | number;
  longitude?: string | number;
};

const GOVERNED_CITY_REFERENCES: readonly CityReference[] = GOVERNED_RUNTIME_REFERENCE_ROWS
  .filter(
    (row): row is (typeof GOVERNED_RUNTIME_REFERENCE_ROWS)[number] & {
      runtimeParentNaturalKey: string;
    } => row.runtimeStorageLevel === 'city' && Boolean(row.runtimeParentNaturalKey),
  )
  .map(row => ({
    provinceSlug: row.runtimeParentNaturalKey.split('/').slice(-1)[0]!,
    name: row.name,
    slug: row.slug,
    ...(row.latitude !== undefined ? { latitude: row.latitude } : {}),
    ...(row.longitude !== undefined ? { longitude: row.longitude } : {}),
  }));

const GOVERNED_SUBURB_REFERENCES: readonly SuburbReference[] = GOVERNED_RUNTIME_REFERENCE_ROWS
  .filter(
    (row): row is (typeof GOVERNED_RUNTIME_REFERENCE_ROWS)[number] & {
      runtimeParentNaturalKey: string;
    } => row.runtimeStorageLevel === 'suburb' && Boolean(row.runtimeParentNaturalKey),
  )
  .map(row => ({
    citySlug: row.runtimeParentNaturalKey,
    name: row.name,
    slug: row.slug,
    ...(row.postalCode ? { postalCode: row.postalCode } : {}),
    ...(row.latitude !== undefined ? { latitude: row.latitude } : {}),
    ...(row.longitude !== undefined ? { longitude: row.longitude } : {}),
  }));

const REFERENCE_PAYLOAD = Object.freeze({ provinces: PROVINCES, cities: CITIES, suburbs: SUBURBS });
export const CANONICAL_GEOGRAPHY_DIGEST = stableDigest(REFERENCE_PAYLOAD);
export const CANONICAL_GEOGRAPHY_EXPECTED_ROWS = Object.freeze({
  provinces: PROVINCES.length,
  cities: CITIES.length,
  suburbs: SUBURBS.length,
});
export const GOVERNED_RUNTIME_GEOGRAPHY_EXPECTED_ROWS = Object.freeze({
  provinces: new Set([
    ...PROVINCES.map(item => item.slug),
    ...GOVERNED_RUNTIME_REFERENCE_ROWS
      .filter(row => row.runtimeStorageLevel === 'province')
      .map(row => row.runtimeNaturalKey),
  ]).size,
  cities: new Set([
    ...CITIES.map(item => `${item.provinceSlug}/${item.slug}`),
    ...GOVERNED_RUNTIME_REFERENCE_ROWS
      .filter(row => row.runtimeStorageLevel === 'city')
      .map(row => row.runtimeNaturalKey),
  ]).size,
  suburbs: new Set([
    ...SUBURBS.map(item => {
      const city = CITIES.find(candidate => candidate.slug === item.citySlug);
      return `${city?.provinceSlug ?? ''}/${item.citySlug}/${item.slug}`;
    }),
    ...GOVERNED_RUNTIME_REFERENCE_ROWS
      .filter(row => row.runtimeStorageLevel === 'suburb')
      .map(row => row.runtimeNaturalKey),
  ]).size,
});
export const GOVERNED_RUNTIME_REFERENCE_DIGEST = stableDigest(GOVERNED_RUNTIME_REFERENCE_ROWS);
const PROVINCE_SLUG_PLACEHOLDERS = PROVINCES.map(() => '?').join(', ');

export type GeographyReferenceEvidence = AdapterEvidence & {
  expected: { provinces: number; cities: number; suburbs: number };
  verified: { provinces: number; cities: number; suburbs: number };
  runtimeProjection: {
    version: string;
    digest: string;
    expected: { provinces: number; cities: number; suburbs: number };
    rows: number;
  };
  migrationHead: string;
};

type RowIdentity = { id: number; name: string; slug: string };

export function canonicalGeographyIdFromRow(
  row: Record<string, unknown>,
  label: string,
  idField = 'id',
): number {
  const id = Number(rowValue(row, idField));
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Canonical geography ${label} has an invalid ID.`);
  return id;
}

function asId(row: Record<string, unknown>, label: string, idField = 'id'): number {
  return canonicalGeographyIdFromRow(row, label, idField);
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
  item: CityReference,
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
    [provinceId, item.name, item.latitude ?? null, item.longitude ?? null, 1, item.slug],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Canonical geography could not identify city ${item.slug} after insert.`);
  return { id, name: item.name, slug: item.slug };
}

async function ensureSuburb(
  connection: AuthoritySqlConnection,
  item: SuburbReference,
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
      item.postalCode !== undefined && String(rowValue(row, 'postalCode') ?? '') !== item.postalCode
    ) {
      throw new Error(
        `Canonical geography suburb ${item.slug} conflicts with the approved hierarchy.`,
      );
    }
    return { id: asId(row, `suburb ${item.slug}`), name: item.name, slug: item.slug };
  }
  const result: any = await connection.execute(
    'INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode, slug) VALUES (?, ?, ?, ?, ?, ?)',
    [cityId, item.name, item.latitude ?? null, item.longitude ?? null, item.postalCode ?? null, item.slug],
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
      WHERE p.slug IN (${PROVINCE_SLUG_PLACEHOLDERS})
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
    const cityNaturalKey = citySlug ? `${provinceSlug}/${citySlug}` : '';
    if (cityNaturalKey) cityRows.set(cityNaturalKey, row);
    const suburbSlug = String(rowValue(row, 'suburb_slug') ?? '');
    const suburbNaturalKey = suburbSlug ? `${cityNaturalKey}/${suburbSlug}` : '';
    if (suburbNaturalKey) suburbRows.set(suburbNaturalKey, row);
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
    const row = cityRows.get(`${item.provinceSlug}/${item.slug}`);
    if (!row || String(rowValue(row, 'city_name')) !== item.name) {
      throw new Error(`Canonical geography is missing city ${item.slug}.`);
    }
  }
  for (const item of SUBURBS) {
    const city = CITIES.find(candidate => candidate.slug === item.citySlug);
    const row = city ? suburbRows.get(`${city.provinceSlug}/${item.citySlug}/${item.slug}`) : null;
    if (!row || String(rowValue(row, 'suburb_name')) !== item.name) {
      throw new Error(`Canonical geography is missing suburb ${item.slug}.`);
    }
  }
  for (const row of GOVERNED_RUNTIME_REFERENCE_ROWS) {
    if (row.runtimeStorageLevel === 'province') {
      const province = provinceRows.get(row.runtimeNaturalKey);
      if (!province || String(rowValue(province, 'province_name')) !== row.name) {
        throw new Error(`Canonical geography is missing governed province ${row.runtimeNaturalKey}.`);
      }
      continue;
    }

    if (row.runtimeStorageLevel === 'city') {
      const city = cityRows.get(row.runtimeNaturalKey);
      if (!city || String(rowValue(city, 'city_name')) !== row.name) {
        throw new Error(`Canonical geography is missing governed city ${row.runtimeNaturalKey}.`);
      }
      const parent = row.runtimeParentNaturalKey
        ? provinceRows.get(row.runtimeParentNaturalKey)
        : undefined;
      if (
        !parent ||
        Number(rowValue(city, 'city_province_id')) !==
          asId(parent, row.runtimeParentNaturalKey || 'province', 'province_id')
      ) {
        throw new Error(`Governed city ${row.runtimeNaturalKey} is attached to the wrong province.`);
      }
      continue;
    }

    const suburb = suburbRows.get(row.runtimeNaturalKey);
    if (!suburb || String(rowValue(suburb, 'suburb_name')) !== row.name) {
      throw new Error(`Canonical geography is missing governed suburb ${row.runtimeNaturalKey}.`);
    }
    const parent = row.runtimeParentNaturalKey
      ? cityRows.get(row.runtimeParentNaturalKey)
      : undefined;
    if (
      !parent ||
      Number(rowValue(suburb, 'suburb_city_id')) !==
        asId(parent, row.runtimeParentNaturalKey || 'city', 'city_id')
    ) {
      throw new Error(`Governed suburb ${row.runtimeNaturalKey} is attached to the wrong city.`);
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
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  await withTransaction(input.connection, async () => {
    const provinces = new Map<string, RowIdentity>();
    for (const item of PROVINCES)
      provinces.set(item.slug, await ensureProvince(input.connection, item));
    const cities = new Map<string, RowIdentity>();
    for (const item of [...CITIES, ...GOVERNED_CITY_REFERENCES]) {
      const province = provinces.get(item.provinceSlug);
      if (!province)
        throw new Error(
          `Canonical geography configuration is missing province ${item.provinceSlug}.`,
        );
      const city = await ensureCity(input.connection, item, province.id);
      cities.set(`${item.provinceSlug}/${item.slug}`, city);
      if (!cities.has(item.slug)) cities.set(item.slug, city);
    }
    for (const item of [...SUBURBS, ...GOVERNED_SUBURB_REFERENCES]) {
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
    expected: GOVERNED_RUNTIME_GEOGRAPHY_EXPECTED_ROWS,
    verified,
    runtimeProjection: {
      version: GOVERNED_RUNTIME_REFERENCE_VERSION,
      digest: GOVERNED_RUNTIME_REFERENCE_DIGEST,
      expected: GOVERNED_RUNTIME_GEOGRAPHY_EXPECTED_ROWS,
      rows: GOVERNED_RUNTIME_REFERENCE_ROWS.length,
    },
    migrationHead: manifest.document.expectedHead,
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
  const manifest = await requireAcceptedMigrationHead({
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
    expected: GOVERNED_RUNTIME_GEOGRAPHY_EXPECTED_ROWS,
    verified,
    runtimeProjection: {
      version: GOVERNED_RUNTIME_REFERENCE_VERSION,
      digest: GOVERNED_RUNTIME_REFERENCE_DIGEST,
      expected: GOVERNED_RUNTIME_GEOGRAPHY_EXPECTED_ROWS,
      rows: GOVERNED_RUNTIME_REFERENCE_ROWS.length,
    },
    migrationHead: manifest.document.expectedHead,
  };
}
