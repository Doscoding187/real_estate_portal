import { describe, expect, it } from 'vitest';
import {
  buildLeadRoutingAudit,
  classifyLeadRouting,
  type LeadRoutingAuditRow,
} from '../leadRoutingAuditService';

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
    developerBrandProfileId: null,
    leadSource: 'property_detail',
    source: 'property_detail',
    brandLeadStatus: null,
    leadDeliveryMethod: null,
    propertyOwnerId: null,
    propertyOwnerRole: null,
    ...overrides,
  };
}

describe('leadRoutingAuditService', () => {
  it('classifies brand capture only leads as attention items', () => {
    const result = classifyLeadRouting(
      makeRow({
        developerBrandProfileId: 44,
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
          developerBrandProfileId: 99,
          leadDeliveryMethod: 'crm_export',
          agentId: 6,
        }),
        makeRow({
          id: 2,
          agentId: 15,
          leadSource: 'search_results',
        }),
        makeRow({
          id: 3,
          propertyId: 70,
          propertyOwnerRole: 'visitor',
          leadSource: 'property_detail',
        }),
        makeRow({
          id: 4,
          propertyId: 71,
          leadSource: 'homepage',
        }),
        makeRow({
          id: 5,
          developerBrandProfileId: 100,
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
      brandWithAgentContext: 1,
      directToAgent: 1,
      directToPrivate: 1,
      directContextOnly: 1,
      unknownRoute: 0,
    });
    expect(audit.topSources[0]).toMatchObject({
      source: 'property_detail',
      count: 2,
    });
    expect(audit.attentionLeads).toEqual([
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
});
