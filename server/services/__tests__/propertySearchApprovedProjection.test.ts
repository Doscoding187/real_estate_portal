import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockRedisGet, mockRedisSet, mockResolveLocation } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockResolveLocation: vi.fn(),
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

import { PropertySearchService } from '../propertySearchService';

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

describe('manual property Search approved projection authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockResolveLocation.mockResolvedValue(null);
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
            propertySettings: '{}',
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
});
