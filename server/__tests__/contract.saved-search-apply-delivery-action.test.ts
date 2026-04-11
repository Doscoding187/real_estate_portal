import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSavedSearchDeliveryActionToken } from '../services/savedSearchDeliveryActionTokenService';

const {
  mockGetDb,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

import { appRouter } from '../routers';

describe('savedSearch.applyDeliveryActionByToken contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([
      {
        id: 11,
        userId: 77,
        name: 'Joburg apartments',
        criteria: {
          city: 'Johannesburg',
          __deliveryPreferences: {
            emailEnabled: true,
            inAppEnabled: true,
          },
        },
        notificationFrequency: 'daily',
        createdAt: '2026-03-21T10:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        lastNotifiedAt: null,
      },
    ]);

    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

    mockGetDb.mockResolvedValue({
      select: mockSelect,
      update: vi.fn(() => ({ set: mockUpdateSet })),
    });
  });

  it('pauses a saved search from a signed public token', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.savedSearch.applyDeliveryActionByToken({
      token: createSavedSearchDeliveryActionToken(
        {
          action: 'pause',
          savedSearchId: 11,
          userId: 77,
        },
        { secret: 'saved-search-delivery-action-dev-only' },
      ),
    });

    expect(mockUpdateSet).toHaveBeenCalledWith({
      notificationFrequency: 'never',
      criteria: {
        city: 'Johannesburg',
        __deliveryPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
        },
      },
    });
    expect(result).toMatchObject({
      success: true,
      action: 'pause',
      message: 'Saved-search alerts have been paused.',
      savedSearch: {
        id: 11,
        notificationFrequency: 'never',
        emailEnabled: true,
        inAppEnabled: true,
      },
    });
  });

  it('turns off email delivery without pausing in-app notifications', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.savedSearch.applyDeliveryActionByToken({
      token: createSavedSearchDeliveryActionToken(
        {
          action: 'unsubscribe_email',
          savedSearchId: 11,
          userId: 77,
        },
        { secret: 'saved-search-delivery-action-dev-only' },
      ),
    });

    expect(mockUpdateSet).toHaveBeenCalledWith({
      notificationFrequency: 'daily',
      criteria: {
        city: 'Johannesburg',
        __deliveryPreferences: {
          emailEnabled: false,
          inAppEnabled: true,
        },
      },
    });
    expect(result).toMatchObject({
      success: true,
      action: 'unsubscribe_email',
      message: 'Saved-search email alerts have been turned off.',
      savedSearch: {
        id: 11,
        notificationFrequency: 'daily',
        emailEnabled: false,
        inAppEnabled: true,
      },
    });
  });
});
