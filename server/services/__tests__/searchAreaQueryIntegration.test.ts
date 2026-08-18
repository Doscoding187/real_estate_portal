import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockResolvePublicLocation,
  mockResolveSearchArea,
  mockSearchProperties,
  mockSearchListings,
} = vi.hoisted(() => ({
  mockResolvePublicLocation: vi.fn(),
  mockResolveSearchArea: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchListings: vi.fn(),
}));

vi.mock('../locationResolverService', () => ({
  locationResolver: {
    resolvePublicLocation: mockResolvePublicLocation,
  },
}));

vi.mock('../propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../developmentDerivedListingService', () => ({
  developmentDerivedListingService: {
    searchListings: mockSearchListings,
  },
}));

vi.mock('../searchAreaAuthority', () => ({
  searchAreaAuthority: {
    resolveSearchArea: mockResolveSearchArea,
  },
}));

import { publicSearchService, PublicSearchService } from '../publicSearchService';
import type { SearchAreaResolution } from '../searchAreaAuthority';

const resolvedSearchArea = {
  status: 'available' as const,
  summary: {
    kind: 'search_area' as const,
    searchAreaId: 'johannesburg-sandton',
    label: 'Sandton',
    parentCanonicalLocationId: 'city:12',
    parentLabel: 'Johannesburg',
    lifecycle: 'active' as const,
    availability: 'available' as const,
    supportedJourneys: ['buy', 'rent'] as const,
    definitionVersion: 1,
  },
  definition: {
    searchAreaId: 'johannesburg-sandton',
    definitionVersion: 1,
    label: 'Sandton',
    parentCanonicalLocationId: 'city:12',
    anchorCanonicalLocationId: 'suburb:34',
    memberCanonicalLocationIds: ['suburb:34', 'suburb:35'],
    supportedJourneys: ['buy', 'rent'] as const,
    lifecycle: 'active' as const,
    boundary: { kind: 'canonical_members' as const },
    parent: {
      canonicalLocationId: 'city:12',
      level: 'city' as const,
      name: 'Johannesburg',
      slug: 'johannesburg',
      parentCanonicalLocationId: 'province:1',
    },
    anchor: {
      canonicalLocationId: 'suburb:34',
      level: 'suburb' as const,
      name: 'Sandton',
      slug: 'sandton',
      parentCanonicalLocationId: 'city:12',
    },
    members: [
      {
        canonicalLocationId: 'suburb:34',
        level: 'suburb' as const,
        name: 'Sandton',
        slug: 'sandton',
        parentCanonicalLocationId: 'city:12',
      },
      {
        canonicalLocationId: 'suburb:35',
        level: 'suburb' as const,
        name: 'Rosebank',
        slug: 'rosebank',
        parentCanonicalLocationId: 'city:12',
      },
    ],
    authorityKey: 'search-area:johannesburg-sandton:v1',
  },
} satisfies Extract<SearchAreaResolution, { status: 'available' | 'preview' }>;

const resolvedSuburb = {
  status: 'resolved' as const,
  location: {
    level: 'suburb' as const,
    province: { id: 1, name: 'Gauteng', slug: 'gauteng', code: 'GP' },
    city: { id: 12, name: 'Johannesburg', slug: 'johannesburg', provinceId: 1 },
    suburb: { id: 34, name: 'Sandton', slug: 'sandton', cityId: 12 },
    confidence: 'exact' as const,
    fallbackLevel: 'none' as const,
    originalIntent: 'sandton, johannesburg, gauteng',
  },
};

function card(kind: 'property' | 'development', id: string) {
  return {
    kind,
    id,
    href: `/${kind}/${id}`,
    title: id,
    location: 'Sandton, Johannesburg, Gauteng',
    city: 'Johannesburg',
    province: 'Gauteng',
    price: 1,
    image: null,
    images: [],
    propertyType: 'house',
    listingType: 'sale',
    listingSource: kind === 'property' ? 'manual' : 'development',
    listedDate: new Date('2026-07-01T00:00:00.000Z'),
  };
}

describe('Search Area public query integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveSearchArea.mockResolvedValue(resolvedSearchArea);
    mockSearchProperties.mockResolvedValue({ cards: [card('property', 'p-1')], total: 1 });
    mockSearchListings.mockResolvedValue({ cards: [card('development', 'd-1')], total: 1 });
  });

  it('expands an active Search Area through the server-owned boundary for Buy', async () => {
    const result = await publicSearchService.searchInventory({
      searchAreaId: 'johannesburg-sandton',
      listingType: 'sale',
      page: 0,
      pageSize: 2,
    });

    expect(mockResolveSearchArea).toHaveBeenCalledWith('johannesburg-sandton', {
      journey: 'buy',
    });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.not.objectContaining({ memberCanonicalLocationIds: expect.anything() }),
      'date_desc',
      1,
      2,
      expect.objectContaining({
        authorityKey: 'search-area:johannesburg-sandton:v1',
        parentCityId: 12,
        memberCanonicalLocationIds: ['suburb:34', 'suburb:35'],
        memberSuburbIds: [34, 35],
      }),
      { publicOnly: true },
    );
    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.anything(),
      'date_desc',
      1,
      2,
      expect.objectContaining({
        authorityKey: 'search-area:johannesburg-sandton:v1',
        memberSuburbIds: [34, 35],
      }),
    );
    expect(result).toMatchObject({
      locationState: 'resolved',
      searchAreaContext: {
        searchAreaId: 'johannesburg-sandton',
        availability: 'available',
      },
      total: 2,
    });
  });

  it('does not choose a journey when a Search Area request is neutral', async () => {
    const result = await publicSearchService.searchInventory({
      searchAreaId: 'johannesburg-sandton',
    });

    expect(result).toMatchObject({
      cards: [],
      total: 0,
      locationState: 'unavailable',
    });
    expect(result.locationMessage).toContain('Buy or Rent');
    expect(mockResolveSearchArea).not.toHaveBeenCalled();
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('keeps a locality refinement inside the explicit Search Area members', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb);

    await publicSearchService.searchInventory({
      searchAreaId: 'johannesburg-sandton',
      locationId: 'suburb:34',
      listingType: 'rent',
    });

    expect(mockResolveSearchArea).toHaveBeenCalledWith('johannesburg-sandton', {
      journey: 'rent',
    });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalLocation: expect.objectContaining({ suburbId: 34 }) }),
      'date_desc',
      1,
      12,
      expect.objectContaining({
        memberCanonicalLocationIds: ['suburb:34'],
        memberSuburbIds: [34],
      }),
      { publicOnly: true },
    );
  });

  it('does not allow browser-supplied membership to override the registry', async () => {
    await publicSearchService.searchInventory({
      searchAreaId: 'johannesburg-sandton',
      listingType: 'sale',
      ...({ memberCanonicalLocationIds: ['suburb:99'] } as Record<string, unknown>),
    } as any);

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ memberSuburbIds: [34, 35] }),
      { publicOnly: true },
    );
  });

  it('fails closed when the authority cannot resolve the Search Area', async () => {
    mockResolveSearchArea.mockResolvedValueOnce({
      status: 'unavailable',
      searchAreaId: 'johannesburg-sandton',
      reason: 'preview_only',
    });

    const result = await new PublicSearchService({
      resolveSearchArea: mockResolveSearchArea,
    }).searchInventory({
      searchAreaId: 'johannesburg-sandton',
      listingType: 'sale',
    });

    expect(result).toMatchObject({ cards: [], total: 0, locationState: 'unavailable' });
    expect(result.locationMessage).toContain('preview');
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('fails closed when an injected resolver returns a preview resolution', async () => {
    mockResolveSearchArea.mockResolvedValueOnce({
      ...resolvedSearchArea,
      status: 'preview' as const,
      summary: {
        ...resolvedSearchArea.summary,
        lifecycle: 'preview' as const,
        availability: 'preview' as const,
      },
      definition: {
        ...resolvedSearchArea.definition,
        lifecycle: 'preview' as const,
      },
    });

    const result = await new PublicSearchService({
      resolveSearchArea: mockResolveSearchArea,
    }).searchInventory({
      searchAreaId: 'johannesburg-sandton',
      listingType: 'sale',
    });

    expect(result).toMatchObject({
      cards: [],
      total: 0,
      page: 0,
      locationState: 'unavailable',
    });
    expect(result.locationMessage).toContain('preview');
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('executes a preview Search Area only through the server-controlled acceptance mode', async () => {
    mockResolveSearchArea.mockResolvedValueOnce({
      ...resolvedSearchArea,
      status: 'preview' as const,
      summary: {
        ...resolvedSearchArea.summary,
        lifecycle: 'preview' as const,
        availability: 'preview' as const,
      },
      definition: {
        ...resolvedSearchArea.definition,
        lifecycle: 'preview' as const,
      },
    });

    const result = await new PublicSearchService(
      { resolveSearchArea: mockResolveSearchArea },
      undefined,
      { executionMode: 'controlled_acceptance' },
    ).searchInventory({
      searchAreaId: 'johannesburg-sandton',
      listingType: 'sale',
      page: 0,
      pageSize: 2,
    });

    expect(mockResolveSearchArea).toHaveBeenCalledWith('johannesburg-sandton', {
      journey: 'buy',
      includePreview: true,
    });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.anything(),
      'date_desc',
      1,
      2,
      expect.objectContaining({
        authorityKey: 'search-area:johannesburg-sandton:v1',
        memberSuburbIds: [34, 35],
      }),
      { publicOnly: true },
    );
    expect(result).toMatchObject({
      total: 2,
      locationState: 'resolved',
      searchAreaContext: {
        lifecycle: 'preview',
        availability: 'preview',
      },
    });
  });

  it('does not widen when a locality is not an explicit Search Area member', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce({
      ...resolvedSuburb,
      location: {
        ...resolvedSuburb.location,
        suburb: { id: 99, name: 'Pretoria East', slug: 'pretoria-east', cityId: 12 },
      },
    });

    const result = await publicSearchService.searchInventory({
      searchAreaId: 'johannesburg-sandton',
      locationId: 'suburb:99',
      listingType: 'sale',
    });

    expect(result).toMatchObject({ cards: [], total: 0, locationState: 'unavailable' });
    expect(result.locationMessage).toContain('approved member');
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('passes canonical sibling locations as one server-derived OR boundary for Buy', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb).mockResolvedValueOnce({
      ...resolvedSuburb,
      location: {
        ...resolvedSuburb.location,
        suburb: { id: 35, name: 'Rosebank', slug: 'rosebank', cityId: 12 },
      },
    });

    const result = await publicSearchService.searchInventory({
      locationIds: ['suburb:35', 'suburb:34'],
      listingType: 'sale',
      page: 0,
      pageSize: 2,
    });

    const propertyBoundary = mockSearchProperties.mock.calls[0]?.[4];
    const developmentBoundary = mockSearchListings.mock.calls[0]?.[4];
    expect(propertyBoundary).toEqual(developmentBoundary);
    expect(propertyBoundary).toMatchObject({
      kind: 'canonical_locations',
      level: 'suburb',
      parentCanonicalLocationId: 'city:12',
      members: [
        expect.objectContaining({ canonicalLocationId: 'suburb:34', suburbId: 34 }),
        expect.objectContaining({ canonicalLocationId: 'suburb:35', suburbId: 35 }),
      ],
    });
    expect(propertyBoundary).not.toHaveProperty('memberCanonicalLocationIds');
    expect(
      result.multiLocationContext?.locations.map(location => location.canonicalLocationId),
    ).toEqual(['suburb:34', 'suburb:35']);
  });

  it('keeps Rent multi-location scope distinct and fails the whole request when one member is invalid', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb).mockResolvedValueOnce({
      ...resolvedSuburb,
      location: {
        ...resolvedSuburb.location,
        suburb: { id: 35, name: 'Rosebank', slug: 'rosebank', cityId: 12 },
      },
    });

    await publicSearchService.searchInventory({
      locationIds: ['suburb:34', 'suburb:35'],
      listingType: 'rent',
    });
    expect(mockResolvePublicLocation).toHaveBeenCalledTimes(2);
    expect(mockSearchProperties.mock.calls[0]?.[0]).toMatchObject({ listingType: 'rent' });

    vi.clearAllMocks();
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb).mockResolvedValueOnce({
      status: 'unresolved' as const,
      location: null,
      message: 'Rosebank is unavailable.',
    });

    const invalidResult = await publicSearchService.searchInventory({
      locationIds: ['suburb:34', 'suburb:99'],
      listingType: 'rent',
    });
    expect(invalidResult).toMatchObject({ cards: [], total: 0, locationState: 'unresolved' });
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('does not widen mixed-parent canonical siblings', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb).mockResolvedValueOnce({
      ...resolvedSuburb,
      location: {
        ...resolvedSuburb.location,
        city: { id: 99, name: 'Cape Town', slug: 'cape-town', provinceId: 2 },
        suburb: { id: 35, name: 'Sea Point', slug: 'sea-point', cityId: 99 },
        province: { id: 2, name: 'Western Cape', slug: 'western-cape', code: 'WC' },
      },
    });

    const result = await publicSearchService.searchInventory({
      locationIds: ['suburb:34', 'suburb:35'],
      listingType: 'sale',
    });

    expect(result).toMatchObject({ cards: [], total: 0, locationState: 'unavailable' });
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('unions explicit Search Area identities server-side without exposing memberships', async () => {
    const secondSearchArea = {
      ...resolvedSearchArea,
      summary: {
        ...resolvedSearchArea.summary,
        searchAreaId: 'johannesburg-rosebank',
        label: 'Rosebank',
      },
      definition: {
        ...resolvedSearchArea.definition,
        searchAreaId: 'johannesburg-rosebank',
        authorityKey: 'search-area:johannesburg-rosebank:v1',
        anchorCanonicalLocationId: 'suburb:35',
        memberCanonicalLocationIds: ['suburb:35'],
        anchor: {
          ...resolvedSearchArea.definition.anchor,
          canonicalLocationId: 'suburb:35',
          name: 'Rosebank',
          slug: 'rosebank',
        },
        members: [
          {
            ...resolvedSearchArea.definition.members[1],
            canonicalLocationId: 'suburb:35',
            name: 'Rosebank',
            slug: 'rosebank',
          },
        ],
      },
    };
    mockResolveSearchArea
      .mockResolvedValueOnce(resolvedSearchArea)
      .mockResolvedValueOnce(secondSearchArea);

    await publicSearchService.searchInventory({
      searchAreaIds: ['johannesburg-rosebank', 'johannesburg-sandton'],
      listingType: 'sale',
    });

    const boundary = mockSearchProperties.mock.calls[0]?.[4];
    expect(boundary).toMatchObject({
      memberCanonicalLocationIds: ['suburb:34', 'suburb:35'],
      memberSuburbIds: [34, 35],
    });
    expect(boundary).not.toHaveProperty('searchAreaIds');
    expect(boundary).not.toHaveProperty('members[0].canonicalLocationId');
  });

  it('fails the complete Search Area OR when one selected area is preview-only', async () => {
    mockResolveSearchArea
      .mockResolvedValueOnce({
        ...resolvedSearchArea,
        status: 'preview' as const,
        summary: {
          ...resolvedSearchArea.summary,
          lifecycle: 'preview' as const,
          availability: 'preview' as const,
        },
        definition: { ...resolvedSearchArea.definition, lifecycle: 'preview' as const },
      })
      .mockResolvedValueOnce(resolvedSearchArea);

    const result = await publicSearchService.searchInventory({
      searchAreaIds: ['johannesburg-sandton', 'johannesburg-rosebank'],
      listingType: 'rent',
    });

    expect(result).toMatchObject({ cards: [], total: 0, locationState: 'unavailable' });
    expect(result.locationMessage).toContain('preview');
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });
});
