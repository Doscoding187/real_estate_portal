import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const { mockGetListingById, mockGetEntitlements, mockCountActiveListings } = vi.hoisted(() => ({
  mockGetListingById: vi.fn(),
  mockGetEntitlements: vi.fn(),
  mockCountActiveListings: vi.fn(),
}));

vi.mock('../db', () => ({
  getListingById: mockGetListingById,
  getListingMedia: vi.fn(),
  countActiveListingsByOwner: mockCountActiveListings,
  submitListingForReview: vi.fn(),
  approveListing: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('../services/agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: mockGetEntitlements,
}));

import { listingRouter } from '../listingRouter';

describe('listing entitlement enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCountActiveListings.mockResolvedValue(0);
  });

  it('blocks submitForReview when publish entitlement is not met', async () => {
    mockGetListingById.mockResolvedValue({
      id: 77,
      userId: 10,
    });
    mockGetEntitlements.mockResolvedValue({
      canPublishListings: false,
    });

    const caller = listingRouter.createCaller({
      user: {
        id: 10,
        role: 'agent',
        email: 'agent@example.com',
      } as any,
      req: {} as any,
      res: {} as any,
      requestId: 'test-request',
    } as any);

    let thrown: unknown;
    try {
      await caller.submitForReview({ listingId: 77 });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TRPCError);
    expect((thrown as TRPCError).code).toBe('PRECONDITION_FAILED');
    expect((thrown as TRPCError).message).toContain('Publishing is locked');
  });

  it('blocks submitForReview when max active listing limit is reached', async () => {
    mockGetListingById.mockResolvedValue({
      id: 88,
      userId: 10,
    });
    mockGetEntitlements.mockResolvedValue({
      canPublishListings: true,
      featureFlags: {
        maxActiveListings: 1,
      },
    });
    mockCountActiveListings.mockResolvedValue(1);

    const caller = listingRouter.createCaller({
      user: {
        id: 10,
        role: 'agent',
        email: 'agent@example.com',
      } as any,
      req: {} as any,
      res: {} as any,
      requestId: 'test-request',
    } as any);

    let thrown: unknown;
    try {
      await caller.submitForReview({ listingId: 88 });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TRPCError);
    expect((thrown as TRPCError).code).toBe('PRECONDITION_FAILED');
    expect((thrown as TRPCError).message).toContain('active listing limit');
  });
});
