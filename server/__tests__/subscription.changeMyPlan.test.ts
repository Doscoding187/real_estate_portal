import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetPlanAccessProjectionForUserId,
  mockGetPlanById,
  mockSetSubscriptionPlanForOwner,
  mockGetEntitlementsForPlanId,
  mockEnforceActiveListingLimitByOwner,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockGetPlanAccessProjectionForUserId: vi.fn(),
  mockGetPlanById: vi.fn(),
  mockSetSubscriptionPlanForOwner: vi.fn(),
  mockGetEntitlementsForPlanId: vi.fn(),
  mockEnforceActiveListingLimitByOwner: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('../services/subscriptionService', () => ({}));

vi.mock('../db', () => ({
  getDb: vi.fn(),
  countActiveListingsByOwner: vi.fn(),
  enforceActiveListingLimitByOwner: mockEnforceActiveListingLimitByOwner,
}));

vi.mock('../services/planAccessService', () => ({
  getPlanCatalog: vi.fn(),
  getPlanById: mockGetPlanById,
  getPlanAccessProjectionForUserId: mockGetPlanAccessProjectionForUserId,
  setSubscriptionPlanForOwner: mockSetSubscriptionPlanForOwner,
  getEntitlementsForPlanId: mockGetEntitlementsForPlanId,
  getEntitlementNumber: (
    entitlements: Record<string, unknown>,
    key: string,
    defaultValue = 0,
  ): number => {
    const value = entitlements[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return defaultValue;
  },
}));

vi.mock('../services/agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: vi.fn(),
}));

vi.mock('../_core/auditLog', () => ({
  AuditActions: {
    UPDATE_SUBSCRIPTION: 'UPDATE_SUBSCRIPTION',
  },
  logAudit: mockLogAudit,
}));

import { subscriptionRouter } from '../subscriptionRouter';

describe('subscription.changeMyPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSubscriptionPlanForOwner.mockResolvedValue({
      id: 91,
      ownerType: 'agent',
      ownerId: 42,
      status: 'active',
      trialEndsAt: null,
      billingCycleAnchor: null,
      metadata: null,
    });
    mockLogAudit.mockResolvedValue(undefined);
  });

  it('enforces listing limit when downgrading to a capped plan', async () => {
    mockGetPlanAccessProjectionForUserId
      .mockResolvedValueOnce({
        ownerType: 'agent',
        ownerId: 42,
        currentPlan: {
          id: 2,
          name: 'agent_pro',
          displayName: 'Agent Pro',
          segment: 'agent',
          priceMonthly: 129900,
          trialDays: 30,
          metadata: null,
        },
        subscription: {
          id: 77,
          ownerType: 'agent',
          ownerId: 42,
          status: 'active',
          trialEndsAt: null,
          billingCycleAnchor: null,
          metadata: null,
        },
        entitlements: {},
        trialStatus: 'none',
        trialEndsAt: null,
        trialDaysRemaining: null,
      })
      .mockResolvedValueOnce({
        ownerType: 'agent',
        ownerId: 42,
        currentPlan: {
          id: 1,
          name: 'agent_starter',
          displayName: 'Agent Starter',
          segment: 'agent',
          priceMonthly: 49900,
          trialDays: 30,
          metadata: null,
        },
        subscription: {
          id: 77,
          ownerType: 'agent',
          ownerId: 42,
          status: 'active',
          trialEndsAt: null,
          billingCycleAnchor: null,
          metadata: null,
        },
        entitlements: {},
        trialStatus: 'none',
        trialEndsAt: null,
        trialDaysRemaining: null,
      });

    mockGetPlanById.mockResolvedValue({
      id: 1,
      name: 'agent_starter',
      displayName: 'Agent Starter',
      segment: 'agent',
      priceMonthly: 49900,
      trialDays: 30,
      metadata: null,
    });
    mockGetEntitlementsForPlanId.mockResolvedValue({
      max_active_listings: 5,
    });
    mockEnforceActiveListingLimitByOwner.mockResolvedValue({
      totalActiveBefore: 7,
      keptActive: 5,
      demotedCount: 2,
      demotedListingIds: [901, 902],
    });

    const caller = subscriptionRouter.createCaller({
      user: {
        id: 42,
        role: 'agent',
        email: 'agent@example.com',
      } as any,
      req: {} as any,
      res: {} as any,
      requestId: 'test-request',
    } as any);

    const result = await caller.changeMyPlan({ planId: 1 });

    expect(mockEnforceActiveListingLimitByOwner).toHaveBeenCalledWith(42, 5);
    expect(mockSetSubscriptionPlanForOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'agent',
        ownerId: 42,
        planId: 1,
        metadata: expect.objectContaining({
          listing_limit_enforcement: expect.objectContaining({
            demoted_count: 2,
          }),
        }),
      }),
    );
    expect(result.listing_limit_enforcement).toEqual(
      expect.objectContaining({
        maxAllowed: 5,
        totalActiveBefore: 7,
        demotedCount: 2,
      }),
    );
  });

  it('skips listing enforcement when upgrading', async () => {
    mockGetPlanAccessProjectionForUserId
      .mockResolvedValueOnce({
        ownerType: 'agent',
        ownerId: 42,
        currentPlan: {
          id: 1,
          name: 'agent_starter',
          displayName: 'Agent Starter',
          segment: 'agent',
          priceMonthly: 49900,
          trialDays: 30,
          metadata: null,
        },
        subscription: {
          id: 77,
          ownerType: 'agent',
          ownerId: 42,
          status: 'active',
          trialEndsAt: null,
          billingCycleAnchor: null,
          metadata: null,
        },
        entitlements: {},
        trialStatus: 'none',
        trialEndsAt: null,
        trialDaysRemaining: null,
      })
      .mockResolvedValueOnce({
        ownerType: 'agent',
        ownerId: 42,
        currentPlan: {
          id: 2,
          name: 'agent_pro',
          displayName: 'Agent Pro',
          segment: 'agent',
          priceMonthly: 129900,
          trialDays: 30,
          metadata: null,
        },
        subscription: {
          id: 77,
          ownerType: 'agent',
          ownerId: 42,
          status: 'active',
          trialEndsAt: null,
          billingCycleAnchor: null,
          metadata: null,
        },
        entitlements: {},
        trialStatus: 'none',
        trialEndsAt: null,
        trialDaysRemaining: null,
      });

    mockGetPlanById.mockResolvedValue({
      id: 2,
      name: 'agent_pro',
      displayName: 'Agent Pro',
      segment: 'agent',
      priceMonthly: 129900,
      trialDays: 30,
      metadata: null,
    });

    const caller = subscriptionRouter.createCaller({
      user: {
        id: 42,
        role: 'agent',
        email: 'agent@example.com',
      } as any,
      req: {} as any,
      res: {} as any,
      requestId: 'test-request',
    } as any);

    const result = await caller.changeMyPlan({ planId: 2 });

    expect(mockGetEntitlementsForPlanId).not.toHaveBeenCalled();
    expect(mockEnforceActiveListingLimitByOwner).not.toHaveBeenCalled();
    expect(result.action).toBe('upgrade');
    expect(result.listing_limit_enforcement).toBeNull();
  });
});
