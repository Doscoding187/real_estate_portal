import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockDbSelect,
  mockDbFrom,
  mockDbOrderBy,
  mockDbWhere,
  mockInsertValues,
  mockUpdateSet,
  mockUpdateWhere,
  mockSearchProperties,
  mockSearchDevelopmentListings,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbFrom: vi.fn(),
  mockDbOrderBy: vi.fn(),
  mockDbWhere: vi.fn(),
  mockInsertValues: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchDevelopmentListings: vi.fn(),
}));

vi.mock('../../db-connection', () => ({
  getDb: mockGetDb,
}));

vi.mock('../propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../developmentDerivedListingService', () => ({
  developmentDerivedListingService: {
    searchListings: mockSearchDevelopmentListings,
  },
}));

import { savedSearchNotificationEngine } from '../savedSearchNotificationEngine';

describe('savedSearchNotificationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({ orderBy: mockDbOrderBy });
    mockDbOrderBy.mockReturnValue([{ id: 11 }]);
    mockDbWhere.mockResolvedValue([
      {
        id: 11,
        userId: 7,
        name: 'Johannesburg Apartments',
        criteria: {
          city: 'Johannesburg',
          listingType: 'sale',
          propertyType: 'apartment',
        },
        notificationFrequency: 'daily',
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T08:00:00.000Z',
        lastNotifiedAt: '2026-03-19T08:00:00.000Z',
      },
    ]);

    mockInsertValues.mockResolvedValue([{ insertId: 101 }]);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

    mockGetDb.mockResolvedValue({
      select: mockDbSelect,
      insert: vi.fn(() => ({ values: mockInsertValues })),
      update: vi.fn(() => ({ set: mockUpdateSet })),
    });

    mockSearchProperties.mockResolvedValue({
      total: 2,
      properties: [
        {
          id: '55',
          title: '2 Bedroom Apartment for Sale in Rosebank',
          price: 1450000,
          city: 'Johannesburg',
          suburb: 'Rosebank',
          listingType: 'sale',
          listedDate: new Date('2026-03-21T09:00:00.000Z'),
          images: [{ url: 'https://example.com/property.jpg' }],
        },
        {
          id: '56',
          title: '1 Bedroom Apartment for Sale in Sandton',
          price: 995000,
          city: 'Johannesburg',
          suburb: 'Sandton',
          listingType: 'sale',
          listedDate: new Date('2026-03-20T06:00:00.000Z'),
          images: [],
        },
      ],
    });
    mockSearchDevelopmentListings.mockResolvedValue({
      total: 0,
      items: [],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });
  });

  it('emits notifications for due manual saved searches and updates lastNotifiedAt', async () => {
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 7,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      {
        city: 'Johannesburg',
        propertyType: ['apartment'],
        listingType: 'sale',
      },
      'date_desc',
      1,
      100,
    );
    expect(mockInsertValues).toHaveBeenCalledOnce();
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      scannedSearches: 1,
      dueSearches: 1,
      emittedNotifications: 1,
      dryRun: false,
    });
    expect(result.notifications[0]).toMatchObject({
      savedSearchId: 11,
      userId: 7,
      listingSource: 'all',
      totalMatches: 2,
      newMatchCount: 2,
      actionUrl: '/property/55',
    });
  });

  it('skips notification emission when no new matches exist since lastNotifiedAt', async () => {
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockSearchProperties.mockResolvedValue({
      total: 1,
      properties: [
        {
          id: '55',
          title: '2 Bedroom Apartment for Sale in Rosebank',
          price: 1450000,
          city: 'Johannesburg',
          suburb: 'Rosebank',
          listingType: 'sale',
          listedDate: new Date('2026-03-18T09:00:00.000Z'),
          images: [{ url: 'https://example.com/property.jpg' }],
        },
      ],
    });

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 7,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(result.emittedNotifications).toBe(0);
  });

  it('supports development-only dry runs without writing notifications', async () => {
    mockDbWhere.mockResolvedValue([
      {
        id: 12,
        userId: 9,
        name: 'Off-plan Sandton',
        criteria: {
          city: 'Johannesburg',
          suburb: 'Sandton',
          listingSource: 'development',
        },
        notificationFrequency: 'instant',
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T08:00:00.000Z',
        lastNotifiedAt: null,
      },
    ]);
    mockDbOrderBy.mockReturnValue({ where: mockDbWhere });
    mockSearchProperties.mockResolvedValue({
      total: 0,
      properties: [],
    });
    mockSearchDevelopmentListings.mockResolvedValue({
      total: 2,
      items: [
        {
          id: 'dev-42-unit-a',
          title: '2 Bedroom Apartment for Sale in Sandton',
          price: 2500000,
          city: 'Johannesburg',
          suburb: 'Sandton',
          listingType: 'sale',
          listingSource: 'development',
          listedDate: new Date('2026-03-21T09:30:00.000Z'),
          development: { id: 42, slug: 'sandton-rise' },
          image: 'https://example.com/dev.jpg',
          images: [],
        },
      ],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });

    const result = await savedSearchNotificationEngine.processDueNotifications({
      userId: 9,
      dryRun: true,
      now: new Date('2026-03-21T10:00:00.000Z'),
    });

    expect(mockSearchDevelopmentListings).toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(result.notifications[0]).toMatchObject({
      listingSource: 'development',
      totalMatches: 2,
      newMatchCount: 2,
      actionUrl: '/development/sandton-rise',
    });
  });
});
