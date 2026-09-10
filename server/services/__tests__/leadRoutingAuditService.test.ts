import { describe, expect, it } from 'vitest';
import {
  buildLeadRoutingAudit,
  classifyLeadRouting,
  type LeadRoutingAuditRow,
} from '../leadRoutingAuditService';
import type {
  LeadDeliveryAttemptRecord,
  LeadDeliveryRecord,
  LeadDeliverySnapshot,
} from '../leadDeliveryService';

function makeRow(overrides: Partial<LeadRoutingAuditRow> = {}): LeadRoutingAuditRow {
  return {
    id: 1,
    createdAt: '2026-03-25T08:00:00.000Z',
    name: 'Test Lead',
    email: 'lead@example.com',
    propertyId: null,
    developmentId: null,
    agentId: null,
    agencyId: null,
    cataloguePublisherId: null,
    leadSource: 'property_detail',
    source: 'property_detail',
    brandLeadStatus: null,
    leadDeliveryMethod: null,
    deliveryStatus: null,
    deliverySnapshot: null,
    propertyOwnerId: null,
    propertyOwnerRole: null,
    ...overrides,
  };
}

function deliveryEvidence(input: {
  recipientType: 'agent' | 'agency' | 'developer' | 'manual';
  recipientId: number | null;
  leadCustody: 'verified_customer_recipient' | 'platform_managed';
  status?: 'delivered' | 'attention_required';
}): LeadDeliverySnapshot {
  const status = input.status ?? 'delivered';
  const deliveryId = 100 + (input.recipientId || 0);
  const deliveryKey = `lead:1:${input.recipientType}:${input.recipientId ?? 'manual'}`;
  const delivered = status === 'delivered';
  const delivery: LeadDeliveryRecord = {
    id: deliveryId,
    leadId: 1,
    purpose: 'primary_custody',
    routingRevision: 1,
    channel: input.recipientType === 'manual' ? 'manual' : 'crm_export',
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    recipientUserId: null,
    recipientAgentId: input.recipientType === 'agent' ? input.recipientId : null,
    recipientAgencyId: input.recipientType === 'agency' ? input.recipientId : null,
    recipientDeveloperOrganisationId: input.recipientType === 'developer' ? input.recipientId : null,
    recipientPublisherId: null,
    destinationName: null,
    destinationAddress: null,
    destinationSnapshot: null,
    supplyOrigin:
      input.leadCustody === 'platform_managed' ? 'platform_curated' : 'customer_managed',
    leadCustody: input.leadCustody,
    state: delivered ? 'completed' : 'unknown',
    idempotencyKey: deliveryKey,
    dueAt: '2026-03-25 08:00:00.000000',
    maxAttempts: 3,
    completedAt: delivered ? '2026-03-25 08:00:00.000000' : null,
    supersededAt: null,
    createdAt: '2026-03-25 08:00:00.000000',
    updatedAt: '2026-03-25 08:00:00.000000',
  };
  const attempt: LeadDeliveryAttemptRecord = {
    id: String(deliveryId),
    deliveryId,
    deliveryKey,
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    channel: delivery.channel,
    status: delivered ? 'delivered' : 'attention_required',
    attemptCount: 1,
    maxAttempts: 3,
    attemptedAt: '2026-03-25 08:00:00.000000',
    deliveredAt: delivered ? '2026-03-25 08:00:00.000000' : null,
    createdAt: '2026-03-25 08:00:00.000000',
    updatedAt: '2026-03-25 08:00:00.000000',
    supplyOrigin: delivery.supplyOrigin,
    leadCustody: delivery.leadCustody,
    state: delivered ? 'completed' : 'unknown',
  };
  return { current: delivery, attempts: [attempt] };
}

describe('leadRoutingAuditService', () => {
  it('classifies brand capture only leads as attention items', () => {
    const result = classifyLeadRouting(
      makeRow({
        cataloguePublisherId: 44,
        leadDeliveryMethod: 'none',
      }),
    );

    expect(result).toMatchObject({
      routeType: 'brand',
      recipientType: 'brand',
      issue: 'brand_capture_only',
    });
  });

  it('builds routing summary and attention leads', () => {
    const audit = buildLeadRoutingAudit(
      [
        makeRow({
          id: 1,
          cataloguePublisherId: 99,
          leadDeliveryMethod: 'crm_export',
          deliveryStatus: 'delivered',
          deliverySnapshot: deliveryEvidence({
            recipientType: 'developer',
            recipientId: 6,
            leadCustody: 'verified_customer_recipient',
          }),
        }),
        makeRow({
          id: 2,
          agentId: 15,
          leadSource: 'search_results',
          deliveryStatus: 'delivered',
          deliverySnapshot: deliveryEvidence({
            recipientType: 'agent',
            recipientId: 15,
            leadCustody: 'verified_customer_recipient',
          }),
        }),
        makeRow({
          id: 3,
          propertyId: 70,
          leadSource: 'property_detail',
          deliveryStatus: 'attention_required',
          deliverySnapshot: deliveryEvidence({
            recipientType: 'manual',
            recipientId: null,
            leadCustody: 'platform_managed',
            status: 'attention_required',
          }),
        }),
        makeRow({
          id: 4,
          propertyId: 71,
          leadSource: 'homepage',
        }),
        makeRow({
          id: 5,
          cataloguePublisherId: 100,
          leadDeliveryMethod: 'none',
          leadSource: 'development_detail',
        }),
      ],
      { days: 30, attentionLimit: 10 },
    );

    expect(audit.summary).toMatchObject({
      totalLeads: 5,
      brandRoute: 2,
      directRoute: 3,
      brandDeliveredSubscriber: 1,
      brandCapturedOnly: 1,
      brandWithAgentContext: 0,
      directToAgent: 1,
      platformCustody: 1,
      directContextOnly: 1,
      unknownRoute: 0,
    });
    expect(audit.topSources[0]).toMatchObject({
      source: 'property_detail',
      count: 2,
    });
    expect(audit.attentionLeads).toEqual([
      expect.objectContaining({
        id: 3,
        issue: 'platform_custody_review',
      }),
      expect.objectContaining({
        id: 4,
        issue: 'direct_context_without_owner',
      }),
      expect.objectContaining({
        id: 5,
        issue: 'brand_capture_only',
      }),
    ]);
  });

  it('treats an unroutable public property lead as platform custody review', () => {
    expect(
      classifyLeadRouting(
        makeRow({
          propertyId: 77,
          deliveryStatus: 'attention_required',
          deliverySnapshot: deliveryEvidence({
            recipientType: 'manual',
            recipientId: null,
            leadCustody: 'platform_managed',
            status: 'attention_required',
          }),
        }),
      ),
    ).toMatchObject({
      routeType: 'direct',
      recipientType: 'platform',
      issue: 'platform_custody_review',
    });
  });

  it('does not treat a recipient ID without matching delivery evidence as custody', () => {
    expect(
      classifyLeadRouting(
        makeRow({
          propertyId: 77,
          agentId: 900,
          deliveryStatus: 'delivered',
          deliverySnapshot: deliveryEvidence({
            recipientType: 'agency',
            recipientId: 44,
            leadCustody: 'verified_customer_recipient',
          }),
        }),
      ),
    ).toMatchObject({
      recipientType: 'context_only',
      issue: 'recipient_evidence_missing',
    });
  });
});
