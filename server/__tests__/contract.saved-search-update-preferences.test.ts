import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockSelect,
  mockFromInitial,
  mockFromUpdated,
  mockWhereInitial,
  mockWhereUpdated,
  mockLimitInitial,
  mockLimitUpdated,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFromInitial: vi.fn(),
  mockFromUpdated: vi.fn(),
  mockWhereInitial: vi.fn(),
  mockWhereUpdated: vi.fn(),
  mockLimitInitial: vi.fn(),
  mockLimitUpdated: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

import { appRouter } from '../routers';

describe('savedSearch.updatePreferences contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect
      .mockReturnValueOnce({ from: mockFromInitial })
      .mockReturnValueOnce({ from: mockFromUpdated });
    mockFromInitial.mockReturnValue({ where: mockWhereInitial });
    mockWhereInitial.mockReturnValue({ limit: mockLimitInitial });
    mockLimitInitial.mockResolvedValue([
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

    mockFromUpdated.mockReturnValue({ where: mockWhereUpdated });
    mockWhereUpdated.mockReturnValue({ limit: mockLimitUpdated });
    mockLimitUpdated.mockResolvedValue([
      {
        id: 11,
        userId: 77,
        name: 'Joburg apartments',
        criteria: {
          city: 'Johannesburg',
          __deliveryPreferences: {
            emailEnabled: false,
            inAppEnabled: true,
          },
        },
        notificationFrequency: 'never',
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

  it('updates cadence and delivery flags for the authenticated user', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 77, role: 'user' },
    } as any);

    const result = await caller.savedSearch.updatePreferences({
      id: 11,
      notificationFrequency: 'never',
      emailEnabled: false,
      inAppEnabled: true,
    });

    expect(mockUpdateSet).toHaveBeenCalledWith({
      notificationFrequency: 'never',
      criteria: {
        city: 'Johannesburg',
        __deliveryPreferences: {
          emailEnabled: false,
          inAppEnabled: true,
        },
      },
    });
    expect(result).toMatchObject({
      id: 11,
      notificationFrequency: 'never',
      emailEnabled: false,
      inAppEnabled: true,
      criteria: {
        city: 'Johannesburg',
      },
    });
  });
});
