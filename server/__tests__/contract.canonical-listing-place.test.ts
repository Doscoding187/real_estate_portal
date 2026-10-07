import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalListingLocationSchema } from '../../shared/canonicalListingLocation';
import { loadPlaceAdmissionTerritoryRegistry } from '../../shared/placeAdmissionTerritories';
import { loadCanonicalPlacePackage } from '../_core/databaseAuthority/dataAdapters/canonicalPlaces';

const { globalSelect, getDb } = vi.hoisted(() => ({ globalSelect: vi.fn(), getDb: vi.fn() }));
vi.mock('../db', () => ({ getDb }));
import { resolveCanonicalListingPlace } from '../services/canonicalListingPlaceResolver';

const id = 'pl-place-01-000000000000000000000001';
const province = 'pl-place-01-000000000000000000000002';
const location = {
  version: 2,
  canonicalPlaceId: id,
  privateAddress: { streetName: 'Main Road', unitNumber: '7' },
  coordinates: null,
  coordinateSource: 'manual_confirmed',
  locationConfirmationState: 'confirmed',
  publicLocationPrecision: 'approximate',
  providerObservation: null,
};

function databaseWith(rows: unknown[][]) {
  const select = vi.fn();
  for (const result of rows) {
    const query: any = {};
    for (const method of ['from', 'where']) query[method] = () => query;
    query.limit = () => Promise.resolve(result);
    query.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve);
    select.mockReturnValueOnce(query);
  }
  return { select } as any;
}

function selectedRows(overrides = {}) {
  return [
    [
      {
        placeId: id,
        lifecycleStatus: 'active',
        searchEligible: 1,
        searchScope: 'locality',
        ...overrides,
      },
    ],
    [{ toPlaceId: province }],
    [{ scope: 'province', lifecycleStatus: 'active' }],
    [],
    [
      { placeId: id, name: 'Chosen Locality' },
      { placeId: province, name: 'Chosen Province' },
    ],
  ];
}

beforeEach(() => {
  globalSelect.mockReset();
  getDb.mockReset().mockResolvedValue({ select: globalSelect });
});

describe('Prepared Listing assignment against admitted national source rows', () => {
  const registry = loadPlaceAdmissionTerritoryRegistry(process.cwd()).registry;
  it.each(registry.territories)(
    '$displayName supports a manual locality without a city',
    async territory => {
      const { rows } = loadCanonicalPlacePackage(process.cwd(), {
        territoryId: territory.territoryId,
      });
      const selected = rows.places.find(
        row => row.search_scope === 'locality' && row.search_eligible === 1,
      )!;
      expect(selected).toBeDefined();
      const places = new Map(rows.places.map(row => [String(row.place_id), row]));
      const parents = new Map(
        rows.relationships
          .filter(row => row.relationship_type === 'administratively_contains')
          .map(row => [String(row.from_place_id), String(row.to_place_id)]),
      );
      const responses: unknown[][] = [
        [
          {
            placeId: selected.place_id,
            lifecycleStatus: selected.lifecycle_status,
            searchEligible: selected.search_eligible,
            searchScope: selected.search_scope,
          },
        ],
      ];
      let cursor = String(selected.place_id);
      let provinceId: string | null = null;
      while (parents.has(cursor)) {
        const parentId = parents.get(cursor)!;
        const parent = places.get(parentId)!;
        responses.push(
          [{ toPlaceId: parentId }],
          [{ scope: parent.search_scope, lifecycleStatus: parent.lifecycle_status }],
        );
        expect(parent.search_scope).not.toBe('metro_city');
        if (parent.search_scope === 'province') provinceId = parentId;
        cursor = parentId;
      }
      expect(provinceId).not.toBeNull();
      responses.push(
        [],
        rows.names
          .filter(
            row =>
              [selected.place_id, provinceId].includes(String(row.place_id)) &&
              row.name_role === 'preferred_public' &&
              row.name_state === 'active',
          )
          .map(row => ({ placeId: row.place_id, name: row.name })),
      );
      const result = await resolveCanonicalListingPlace(
        { ...location, canonicalPlaceId: selected.place_id },
        {
          database: databaseWith(responses),
          propertyType: 'house',
          publication: true,
        },
      );
      expect(result?.execution).toMatchObject({
        placeId: selected.place_id,
        provincePlaceId: provinceId,
        cityPlaceId: null,
      });
      expect(result?.labels.city).toBeNull();
      expect(getDb).not.toHaveBeenCalled();
    },
  );
});

describe('Canonical Listing authoring boundary', () => {
  it.each([
    'provinceId',
    'cityId',
    'suburbId',
    'locationId',
    'province',
    'city',
    'suburb',
    'locationIds',
    'searchAreaId',
    'placeId',
    'providerLabel',
    'address',
  ])('rejects competing or ungoverned field %s', key => {
    expect(canonicalListingLocationSchema.safeParse({ ...location, [key]: 'other' }).success).toBe(
      false,
    );
  });

  it('allows an unresolved private draft without manufacturing an identity', () => {
    expect(
      canonicalListingLocationSchema.safeParse({
        ...location,
        canonicalPlaceId: null,
        privateAddress: null,
        coordinateSource: null,
        locationConfirmationState: 'needs_confirmation',
      }).success,
    ).toBe(true);
  });

  it.each([
    { canonicalPlaceId: null },
    { canonicalPlaceId: 'provider-key' },
    { privateAddress: null },
    { coordinates: { latitude: 0, longitude: 0 } },
    { coordinates: { latitude: -26, longitude: null } },
    { coordinates: { latitude: -26, longitude: 28 }, coordinateSource: null },
    { coordinateSource: 'map' },
    { providerObservation: { providerPlaceId: 'key' } },
  ])('refuses invalid confirmed evidence: %j', patch => {
    expect(canonicalListingLocationSchema.safeParse({ ...location, ...patch }).success).toBe(false);
  });
});

describe('Canonical Listing assignment on the caller transaction', () => {
  it('accepts a direct locality without a city, preserving its identity and private evidence', async () => {
    const database = databaseWith(selectedRows());
    const result = await resolveCanonicalListingPlace(location, {
      database,
      propertyType: 'house',
      publication: true,
    });
    expect(result?.execution).toMatchObject({
      placeId: id,
      cityPlaceId: null,
      provincePlaceId: province,
    });
    expect(result?.labels).toEqual({
      selected: 'Chosen Locality',
      province: 'Chosen Province',
      city: null,
    });
    expect(result?.location.privateAddress?.unitNumber).toBe('7');
    expect(getDb).not.toHaveBeenCalled();
    expect(globalSelect).not.toHaveBeenCalled();
  });

  it('does not use SEO eligibility to reject executable provisional selection', async () => {
    const database = databaseWith(
      selectedRows({ verificationStatus: 'provisional', publicationEligible: 0 }),
    );
    await expect(
      resolveCanonicalListingPlace(location, {
        database,
        propertyType: 'house',
        publication: true,
      }),
    ).resolves.toMatchObject({ execution: { placeId: id } });
  });

  it('keeps an unresolved draft private but refuses it for publication', async () => {
    const draft = {
      ...location,
      canonicalPlaceId: null,
      locationConfirmationState: 'needs_confirmation',
    };
    const database = databaseWith([]);
    await expect(
      resolveCanonicalListingPlace(draft, { database, propertyType: 'house', publication: false }),
    ).resolves.toBeNull();
    await expect(
      resolveCanonicalListingPlace(draft, { database, propertyType: 'house', publication: true }),
    ).rejects.toThrow('location_needs_confirmation');
    expect(database.select).not.toHaveBeenCalled();
  });

  it('refuses an explicitly selected unknown Place even in a draft', async () => {
    await expect(
      resolveCanonicalListingPlace(
        { ...location, locationConfirmationState: 'needs_confirmation' },
        { database: databaseWith([[]]), propertyType: 'house', publication: false },
      ),
    ).rejects.toThrow('unknown_place');
  });

  it.each([
    [{ lifecycleStatus: 'retired' }, 'place_not_active'],
    [{ searchEligible: 0 }, 'place_not_searchable'],
    [{ searchScope: null }, 'place_has_no_searchable_scope'],
  ])('refuses ineligible selection %j', async (patch, reason) => {
    await expect(
      resolveCanonicalListingPlace(location, {
        database: databaseWith(selectedRows(patch)),
        propertyType: 'house',
        publication: true,
      }),
    ).rejects.toThrow(reason);
  });

  it('does not turn a transport failure into an unresolved draft', async () => {
    const database = {
      select: () => {
        throw new Error('transport lost');
      },
    } as any;
    await expect(
      resolveCanonicalListingPlace(location, {
        database,
        propertyType: 'house',
        publication: false,
      }),
    ).rejects.toThrow('transport lost');
  });

  it.each([
    { names: [] },
    {
      names: [
        { placeId: id, name: 'One' },
        { placeId: id, name: 'Two' },
        { placeId: province, name: 'Province' },
      ],
    },
  ])(
    'refuses missing or conflicting preferred labels instead of deriving identity from text',
    async ({ names }) => {
      const rows = selectedRows();
      rows[4] = names as any;
      await expect(
        resolveCanonicalListingPlace(location, {
          database: databaseWith(rows),
          propertyType: 'house',
          publication: true,
        }),
      ).rejects.toThrow(/preferred_label/);
    },
  );

  it('refuses province-only urban publication even when a precise pin exists', async () => {
    const database = databaseWith([
      [
        {
          placeId: province,
          lifecycleStatus: 'active',
          searchEligible: 1,
          searchScope: 'province',
        },
      ],
      [],
    ]);
    await expect(
      resolveCanonicalListingPlace(
        {
          ...location,
          canonicalPlaceId: province,
          coordinates: { latitude: -26, longitude: 28 },
          coordinateSource: 'map',
        },
        { database, propertyType: 'house', publication: true },
      ),
    ).rejects.toThrow('Select a city, town or locality');
  });
});
