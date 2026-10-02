import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockExecute, mockInsert, mockValues } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockExecute: vi.fn(),
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));

import { commercialTermNoticeScheduler } from '../commercialTermNoticeScheduler';

describe('commercial term notice scheduler', () => {
  afterEach(() => {
    commercialTermNoticeScheduler.stop();
    vi.clearAllMocks();
  });

  it('queues all three canonical expiry windows for a Developer organisation owner', async () => {
    mockGetDb.mockResolvedValue({
      execute: mockExecute,
      insert: mockInsert,
    });
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);

    const row = {
      subscriptionId: 71,
      ownerId: 902,
      ownerType: 'developer',
      periodEnd: '2026-09-19 12:00:00',
      userId: 1202,
      email: 'owner@example.test',
      firstName: 'Owner',
    };
    mockExecute
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([row]);

    await expect(commercialTermNoticeScheduler.tick()).resolves.toEqual({ sent: 3 });
    expect(mockValues).toHaveBeenCalledTimes(3);

    const notices = mockValues.mock.calls.map(([value]) => value);
    expect(notices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 1202,
          type: 'system_alert',
          data: expect.stringContaining('"notificationType":"launch_access_expiry_notice"'),
        }),
        expect.objectContaining({
          data: expect.stringContaining('"notice":"launch_expiry_1d"'),
        }),
        expect.objectContaining({
          data: expect.stringContaining('"notificationType":"launch_access_expired"'),
        }),
      ]),
    );

    for (const [value] of mockValues.mock.calls) {
      const data = JSON.parse(value.data);
      expect(data).toMatchObject({
        subscriptionId: 71,
        ownerType: 'developer',
        ownerId: 902,
        recipientUserId: 1202,
        providerDelivery: 'b10_notification_consumer',
      });
    }
  });
});
