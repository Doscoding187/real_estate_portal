import { describe, expect, it } from 'vitest';
import { buildLeadRoutingConversionReport } from '../leadRoutingConversionReportService';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    createdAt: '2026-03-25T08:00:00.000Z',
    name: 'Lead Example',
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
    status: 'new',
    corrected: false,
    ...overrides,
  } as any;
}

describe('leadRoutingConversionReportService', () => {
  it('builds conversion metrics by route and source', () => {
    const report = buildLeadRoutingConversionReport(
      [
        makeRow({ id: 1, agentId: 11, status: 'qualified' }),
        makeRow({ id: 2, agentId: 11, status: 'converted' }),
        makeRow({ id: 3, developerBrandProfileId: 8, leadDeliveryMethod: 'email', status: 'lost' }),
        makeRow({
          id: 4,
          propertyId: 22,
          propertyOwnerRole: 'visitor',
          status: 'closed',
          corrected: true,
        }),
      ],
      { days: 30 },
    );

    expect(report.summary).toMatchObject({
      totalLeads: 4,
      correctedLeads: 1,
      convertedLeads: 2,
      qualifiedLeads: 3,
      lostLeads: 1,
      conversionRate: 50,
      correctedConversionRate: 100,
    });
    expect(report.sourceBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'property_detail',
          totalLeads: 4,
          convertedLeads: 2,
          conversionRate: 50,
        }),
      ]),
    );
    expect(report.routeBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routeType: 'direct',
          recipientType: 'agent',
          totalLeads: 2,
          convertedLeads: 1,
          conversionRate: 50,
        }),
        expect.objectContaining({
          routeType: 'direct',
          recipientType: 'private',
          correctedLeads: 1,
          convertedLeads: 1,
          conversionRate: 100,
        }),
      ]),
    );
  });
});
