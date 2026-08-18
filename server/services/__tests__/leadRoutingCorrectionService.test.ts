import { describe, expect, it } from 'vitest';

import {
  buildLeadRoutingCorrectionPlan,
  correctLeadRouting,
  requirePlatformOperationsCustody,
} from '../leadRoutingCorrectionService';
import type { ResolvedLeadOwnership } from '../publicLeadCaptureService';

function customerResolution(
  overrides: Partial<ResolvedLeadOwnership> = {},
): ResolvedLeadOwnership {
  return {
    propertyId: 91,
    agencyId: 44,
    agentId: 12,
    supplyOrigin: 'customer_managed',
    leadCustody: 'verified_customer_recipient',
    recipientType: 'agent',
    recipientId: 12,
    leadDeliveryMethod: 'crm_export',
    reason: null,
    ...overrides,
  };
}

describe('leadRoutingCorrectionService', () => {
  it('exports the correction entry point', () => {
    expect(typeof correctLeadRouting).toBe('function');
  });

  it('restores only the agent authorized by canonical property provenance', () => {
    expect(
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'agent', agentId: 12 },
        customerResolution(),
      ),
    ).toMatchObject({
      agentId: 12,
      agencyId: 44,
      recipientType: 'agent',
      recipientId: 12,
      leadCustody: 'verified_customer_recipient',
      deliveryStatus: 'delivered',
    });

    expect(() =>
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'agent', agentId: 999 },
        customerResolution(),
      ),
    ).toThrow('not the canonical recipient');
  });

  it('rejects an agency or developer that merely exists but is unrelated to the supply', () => {
    expect(() =>
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'agency', agencyId: 44 },
        customerResolution(),
      ),
    ).toThrow('requested agency');

    expect(() =>
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'developer', cataloguePublisherId: 77 },
        customerResolution(),
      ),
    ).toThrow('requested developer');
  });

  it('restores a developer only through the canonical publisher relationship', () => {
    const developer = customerResolution({
      propertyId: undefined,
      developmentId: 31,
      agentId: undefined,
      agencyId: undefined,
      developerId: 5,
      cataloguePublisherId: 77,
      recipientType: 'developer',
      recipientId: 5,
      brandLeadStatus: 'delivered_subscriber',
    });

    expect(
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'developer', cataloguePublisherId: 77 },
        developer,
      ),
    ).toMatchObject({
      cataloguePublisherId: 77,
      recipientType: 'developer',
      recipientId: 5,
      deliveryStatus: 'delivered',
    });
  });

  it('keeps unresolved historical leads in explicit platform operations custody', () => {
    expect(
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'platform' },
        null,
        'Property is no longer publicly eligible.',
      ),
    ).toMatchObject({
      agentId: null,
      agencyId: null,
      cataloguePublisherId: null,
      recipientType: 'manual',
      recipientId: null,
      leadCustody: 'platform_managed',
      deliveryStatus: 'attention_required',
      reason: 'Property is no longer publicly eligible.',
    });
  });

  it('does not override an actionable canonical customer recipient with platform custody', () => {
    expect(() =>
      buildLeadRoutingCorrectionPlan(
        { leadId: 8, routeType: 'platform' },
        customerResolution(),
      ),
    ).toThrow('actionable canonical recipient');
  });

  it('allows completion only when the latest durable attempt proves platform custody', () => {
    const platformAttempt = {
      id: 'delivery-platform',
      deliveryKey: 'manual:platform',
      recipientType: 'manual' as const,
      recipientId: null,
      channel: 'manual' as const,
      status: 'attention_required' as const,
      attemptCount: 1,
      maxAttempts: 3,
      attemptedAt: '2026-08-17 10:00:00',
      deliveredAt: null,
      createdAt: '2026-08-17 10:00:00',
      updatedAt: '2026-08-17 10:00:00',
      supplyOrigin: 'platform_curated' as const,
      leadCustody: 'platform_managed' as const,
    };

    expect(
      requirePlatformOperationsCustody({
        deliveryStatus: 'attention_required',
        deliveryAttempts: [platformAttempt],
        agentId: null,
        agencyId: null,
      }).latestAttempt,
    ).toMatchObject({ id: 'delivery-platform', leadCustody: 'platform_managed' });

    expect(() =>
      requirePlatformOperationsCustody({
        deliveryStatus: 'attention_required',
        deliveryAttempts: [],
        agentId: null,
        agencyId: null,
      }),
    ).toThrow('explicitly platform-custodied');
  });
});
