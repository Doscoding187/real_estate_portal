import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

const {
  mockSelect,
  mockRedisGet,
  mockRedisSet,
  mockResolveLocation,
  mockResolvePublicPropertyEligibilities,
  mockResolvePublicPropertyEligibilityIds,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockResolveLocation: vi.fn(),
  mockResolvePublicPropertyEligibilities: vi.fn(),
  mockResolvePublicPropertyEligibilityIds: vi.fn(),
}));

vi.mock('../../db', () => ({
  db: { select: mockSelect },
}));

vi.mock('../../lib/redis', () => ({
  redisCache: { get: mockRedisGet, set: mockRedisSet },
  CacheTTL: { FEED_RESULTS: 60 },
}));

vi.mock('../locationResolverService', () => ({
  locationResolver: { resolveLocation: mockResolveLocation },
}));

vi.mock('../publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: mockResolvePublicPropertyEligibilities,
  resolvePublicPropertyEligibilityIds: mockResolvePublicPropertyEligibilityIds,
}));

import {
  buildManualPropertySortOrder,
  PropertySearchService,
} from '../propertySearchService';

function terminalWhereQuery(rows: unknown[]) {
  const query: any = {};
  query.from = vi.fn(() => query);
  query.leftJoin = vi.fn(() => query);
  query.where = vi.fn().mockResolvedValue(rows);
  return query;
}

function pagedQuery(rows: unknown[]) {
  const query: any = {};
  query.from = vi.fn(() => query);
  query.leftJoin = vi.fn(() => query);
  query.where = vi.fn(() => query);
  query.orderBy = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.offset = vi.fn().mockResolvedValue(rows);
  return query;
}

function orderedQuery(rows: unknown[]) {
  const query: any = {};
  query.from = vi.fn(() => query);
  query.where = vi.fn(() => query);
  query.orderBy = vi.fn().mockResolvedValue(rows);
  return query;
}

function candidateQuery(rows: unknown[]) {
  const query: any = {};
  query.from = vi.fn(() => query);
  query.leftJoin = vi.fn(() => query);
  query.where = vi.fn(() => query);
  query.orderBy = vi.fn().mockResolvedValue(rows);
  return query;
}

function publicCoordinateRow(latitude: unknown, longitude: unknown) {
  return {
    id: 701,
    title: 'Public coordinate contract fixture',
    description: 'Approved projection coordinate fixture.',
    price: 1_500_000,
    suburb: 'Sandton',
    address: 'Alice Lane, Sandton, Johannesburg',
    city: 'Johannesburg',
    province: 'Gauteng',
    propertyType: 'house',
    listingType: 'sale',
    bedrooms: 3,
    bathrooms: 2,
    internalAreaM2: 180,
    erfSizeM2: 420,
    landAreaM2: null,
    floorSize: 180,
    erfSize: 420,
    landSize: 420,
    status: 'available',
    listedDate: new Date('2026-08-10T10:00:00Z'),
    mainImage: 'https://cdn.example.test/public-coordinate.jpg',
    sourceListingId: 9201,
    ownerId: 100,
    agentId: 33,
    latitude,
    longitude,
    propertySettings: '{}',
    agentDisplayName: 'Jane Agent',
    agentPhone: '+27110001111',
    agentWhatsapp: '+27110001111',
    agentEmail: 'jane@example.test',
    agencyName: 'Approved Realty',
    videoCount: 0,
  };
}

function configureCoordinateSearch(latitude: unknown, longitude: unknown) {
  mockSelect
    .mockReturnValueOnce(terminalWhereQuery([{ count: 1 }]))
    .mockReturnValueOnce(pagedQuery([publicCoordinateRow(latitude, longitude)]))
    .mockReturnValueOnce(orderedQuery([]));
}

describe('manual property Search approved projection authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockResolveLocation.mockResolvedValue(null);
    mockResolvePublicPropertyEligibilities.mockReset();
    mockResolvePublicPropertyEligibilityIds.mockReset();
  });

  it.each([
    'price_asc',
    'price_desc',
    'date_desc',
    'date_asc',
    'suburb_asc',
    'suburb_desc',
  ] as const)('adds a stable ascending property-ID tie-breaker for %s', sortOption => {
    const dialect = new MySqlDialect();
    const order = buildManualPropertySortOrder(sortOption).map(value =>
      dialect.sqlToQuery(value).sql,
    );

    expect(order).toHaveLength(2);
    expect(order[1]).toBe('`properties`.`id` asc');
  });

  it('builds a canonical card from properties + propertyImages without reading listing state', async () => {
    mockSelect
      .mockReturnValueOnce(terminalWhereQuery([{ count: 1 }]))
      .mockReturnValueOnce(
        pagedQuery([
          {
            id: 501,
            title: 'Approved projection title',
            description: 'Approved projection description.',
            price: 2_500_000,
            suburb: 'Sandton',
            address: 'Sandton, Johannesburg',
            city: 'Johannesburg',
            province: 'Gauteng',
            propertyType: 'house',
            listingType: 'sale',
            bedrooms: 3,
            bathrooms: 2,
            internalAreaM2: 180,
            erfSizeM2: 420,
            landAreaM2: null,
            floorSize: 180,
            erfSize: 420,
            landSize: 180,
            status: 'available',
            listedDate: new Date('2026-08-10T10:00:00Z'),
            mainImage: 'https://cdn.example.test/private-candidate-photo.jpg',
            sourceListingId: 9001,
            ownerId: 100,
            agentId: 33,
            propertySettings: JSON.stringify({
              corePropertyInformation: {
                bathrooms: { status: 'known', value: 2 },
              },
            }),
            agentDisplayName: 'Jane Agent',
            agentPhone: '+27110001111',
            agentWhatsapp: '+27110001111',
            agentEmail: 'jane@example.test',
            agencyName: 'Approved Realty',
            videoCount: 0,
          },
        ]),
      )
      .mockReturnValueOnce(
        orderedQuery([
          {
            propertyId: 501,
            imageUrl: 'properties/draft-501/approved-card-photo.jpg',
            isPrimary: 1,
          },
        ]),
      );

    const service = new PropertySearchService();
    const result = await service.searchProperties({}, 'date_desc', 1, 12);

    expect(mockSelect).toHaveBeenCalledTimes(3);
    expect(result.properties[0]).toMatchObject({
      id: '501',
      title: 'Approved projection title',
      price: 2_500_000,
      bedrooms: 3,
      bathrooms: 2,
      mainImage: '/api/local-media/object?key=properties%2Fdraft-501%2Fapproved-card-photo.jpg',
    });
    expect(result.properties[0]).not.toHaveProperty('sourceListingId');
    expect(result.cards[0]).toMatchObject({
      kind: 'property',
      id: '501',
      propertyId: 501,
      href: '/property/501',
      image: '/api/local-media/object?key=properties%2Fdraft-501%2Fapproved-card-photo.jpg',
    });
    expect(JSON.stringify(result)).not.toContain('private-candidate-photo');
  });

  it('allows properties.mainImage only on the explicit unlinked legacy path', async () => {
    mockSelect
      .mockReturnValueOnce(terminalWhereQuery([{ count: 1 }]))
      .mockReturnValueOnce(
        pagedQuery([
          {
            id: 77,
            title: 'Legacy projection',
            description: 'Legacy projection-only inventory.',
            price: 900_000,
            suburb: 'Centurion',
            city: 'Pretoria',
            province: 'Gauteng',
            propertyType: 'house',
            listingType: 'sale',
            bedrooms: 2,
            bathrooms: 1,
            area: 90,
            status: 'available',
            listedDate: new Date('2026-08-10T10:00:00Z'),
            mainImage: 'https://cdn.example.test/legacy-main.jpg',
            sourceListingId: null,
            propertySettings: '{}',
            videoCount: 0,
          },
        ]),
      )
      .mockReturnValueOnce(orderedQuery([]));

    const result = await new PropertySearchService().searchProperties({}, 'date_desc', 1, 12);

    expect(result.properties[0].mainImage).toBe('https://cdn.example.test/legacy-main.jpg');
    expect(result.cards[0].propertyId).toBe(77);
  });

  it.each([
    ['valid pair', -26.1076, 28.0567, -26.1076, 28.0567],
    ['missing pair', null, null, null, null],
    ['partial pair', -26.1076, null, null, null],
    ['zero pair', 0, 0, null, null],
    ['non-finite pair', Number.NaN, 28.0567, null, null],
    ['out-of-range pair', -91, 28.0567, null, null],
  ])(
    'preserves public Search coordinate semantics for %s',
    async (_label, latitude, longitude, expectedLatitude, expectedLongitude) => {
      configureCoordinateSearch(latitude, longitude);

      const result = await new PropertySearchService().searchProperties({}, 'date_desc', 1, 12);

      expect(result.properties[0].latitude).toBe(expectedLatitude);
      expect(result.properties[0].longitude).toBe(expectedLongitude);
      expect(result.cards[0].latitude).toBe(expectedLatitude ?? undefined);
      expect(result.cards[0].longitude).toBe(expectedLongitude ?? undefined);
    },
  );

  it.each([1, 2, 2.5, 3])(
    'preserves the approved %s bathroom value for listing-backed Search cards',
    async bathrooms => {
      mockSelect
        .mockReturnValueOnce(terminalWhereQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          pagedQuery([
            {
              id: 601,
              title: 'Canonical bathroom fixture',
              description: 'Approved projection fixture.',
              price: 1_000_000,
              suburb: 'Sandton',
              address: 'Sandton, Johannesburg',
              city: 'Johannesburg',
              province: 'Gauteng',
              propertyType: 'house',
              listingType: 'sale',
              bedrooms: 3,
              // Simulate the legacy INT projection rounding 2.5 to 3.
              bathrooms: bathrooms === 2.5 ? 3 : bathrooms,
              internalAreaM2: 180,
              erfSizeM2: 420,
              landAreaM2: null,
              floorSize: 180,
              erfSize: 420,
              landSize: 420,
              status: 'available',
              listedDate: new Date('2026-08-10T10:00:00Z'),
              mainImage: 'https://cdn.example.test/approved-bathroom-photo.jpg',
              sourceListingId: 9101,
              ownerId: 100,
              agentId: 33,
              propertySettings: JSON.stringify({
                corePropertyInformation: {
                  bathrooms: { status: 'known', value: bathrooms },
                },
              }),
              agentDisplayName: 'Jane Agent',
              agentPhone: '+27110001111',
              agentWhatsapp: '+27110001111',
              agentEmail: 'jane@example.test',
              agencyName: 'Approved Realty',
              videoCount: 0,
            },
          ]),
        )
        .mockReturnValueOnce(orderedQuery([]));

      const result = await new PropertySearchService().searchProperties({}, 'date_desc', 1, 12);

      expect(result.properties[0].bathrooms).toBe(bathrooms);
      expect(result.cards[0].bathrooms).toBe(bathrooms);
    },
  );

  it('filters public search candidates through the canonical approved-property authority before pagination', async () => {
    mockSelect
      .mockReturnValueOnce(candidateQuery([{ id: 501 }, { id: 502 }]))
      .mockReturnValueOnce(pagedQuery([
        {
          id: 501,
          title: 'Canonical public result',
          description: 'Approved projection fixture.',
          price: 1_000_000,
          suburb: 'Sandton',
          address: 'Sandton, Johannesburg',
          city: 'Johannesburg',
          province: 'Gauteng',
          propertyType: 'house',
          listingType: 'sale',
          bedrooms: 3,
          bathrooms: 2,
          internalAreaM2: 180,
          erfSizeM2: 420,
          landAreaM2: null,
          floorSize: 180,
          erfSize: 420,
          landSize: 420,
          status: 'available',
          listedDate: new Date('2026-08-10T10:00:00Z'),
          mainImage: 'https://cdn.example.test/public.jpg',
          sourceListingId: 9001,
          ownerId: 100,
          agentId: 33,
          propertySettings: '{}',
          agentDisplayName: 'Jane Agent',
          agentPhone: '+27110001111',
          agentWhatsapp: '+27110001111',
          agentEmail: 'jane@example.test',
          agencyName: 'Approved Realty',
          videoCount: 0,
        },
      ]))
      .mockReturnValueOnce(orderedQuery([]));
    mockResolvePublicPropertyEligibilities.mockResolvedValue(
      new Map([
        [
          501,
          {
            property: { id: 501 },
            images: [],
            publicIdentity: {
              role: 'agent',
              provenance: 'agent',
              name: 'Jane Agent',
              organizationName: 'Approved Realty',
              agentId: 33,
            },
          },
        ],
      ]),
    );

    const result = await new PropertySearchService().searchProperties(
      {},
      'date_desc',
      1,
      12,
      undefined,
      { publicOnly: true },
    );

    expect(mockResolvePublicPropertyEligibilities).toHaveBeenCalledWith([501, 502]);
    expect(result).toMatchObject({ total: 1, hasMore: false });
    expect(result.properties).toHaveLength(1);
    expect(result.properties[0].id).toBe('501');
  });
});
