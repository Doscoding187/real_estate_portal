import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockSelect,
  mockFrom,
  mockWhere,
  mockOrderBy,
  mockLimit,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

import { appRouter } from '../routers';

describe('savedSearch.getAlertHistory contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([
      {
        id: 21,
        savedSearchId: 11,
        userId: 77,
        searchName: 'Joburg apartments',
        title: '2 new matches for Joburg apartments',
        content: 'Johannesburg: 2 new matches.',
        listingSource: 'all',
        notificationFrequency: 'daily',
        totalMatches: 4,
        newMatchCount: 2,
        inAppRequested: 1,
        emailRequested: 1,
        inAppDelivered: 1,
        emailDelivered: 1,
        status: 'delivered',
        retryState: 'not_needed',
        retryCount: 0,
        maxRetryCount: 3,
        nextRetryAt: null,
        lastRetryAt: null,
        actionUrl: '/properties?city=Johannesburg',
        previewMatches: JSON.stringify([
          {
            id: '55',
            title: '2 Bedroom Apartment for Sale in Rosebank',
            href: '/property/55',
            city: 'Johannesburg',
            suburb: 'Rosebank',
            listingType: 'sale',
            listingSource: 'manual',
            price: 1450000,
          },
        ]),
        error: null,
        processedAt: '2026-03-25T07:10:00.000Z',
      },
    ]);

    mockGetDb.mockResolvedValue({
      select: mockSelect,
    });
  });

  it('returns alert history for the authenticated user', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 77, role: 'user' },
    } as any);

    const result = await caller.savedSearch.getAlertHistory({ limit: 5 });

    expect(mockGetDb).toHaveBeenCalledOnce();
    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(result).toEqual([
      expect.objectContaining({
        savedSearchId: 11,
        searchName: 'Joburg apartments',
        inAppDelivered: true,
        emailDelivered: true,
        previewMatches: [
          expect.objectContaining({
            id: '55',
            title: '2 Bedroom Apartment for Sale in Rosebank',
            href: '/property/55',
          }),
        ],
      }),
    ]);
  });
});
