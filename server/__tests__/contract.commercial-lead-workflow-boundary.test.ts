import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockCommercialLeadContextCandidateIds,
  mockLoadCommercialLeadContext,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockCommercialLeadContextCandidateIds: vi.fn(),
  mockLoadCommercialLeadContext: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  getAgencyDashboardStats: vi.fn(),
  getAgencyPerformanceData: vi.fn(),
  getAgencyRecentLeads: vi.fn(),
  getAgencyRecentListings: vi.fn(),
  getLeadConversionStats: vi.fn(),
  getAgencyCommissionStats: vi.fn(),
  getAgentPerformanceLeaderboard: vi.fn(),
  submitListingForReview: vi.fn(),
  archiveListing: vi.fn(),
  updateListingAgentAssignment: vi.fn(),
  updateListingAgentAssignments: vi.fn(),
}));

vi.mock('../services/commercialLeadContextService', () => ({
  COMMERCIAL_LEAD_DEDICATED_WORKFLOW_MESSAGE:
    'Commercial enquiries stay linked to their verified marketing listing and require the dedicated Commercial workflow for viewings or offers.',
  commercialLeadContextCandidateIds: mockCommercialLeadContextCandidateIds,
  loadCommercialLeadContext: mockLoadCommercialLeadContext,
  loadCommercialLeadContexts: vi.fn(),
}));

import { agencyRouter } from '../agencyRouter';

const agencyAdmin = {
  id: 9001,
  role: 'agency_admin',
  email: 'agency-admin@example.com',
  agencyId: 44,
};

function caller() {
  return agencyRouter.createCaller({
    user: agencyAdmin,
    req: {} as any,
    res: {} as any,
    requestId: 'commercial-lead-workflow-boundary',
  } as any);
}

function createSelectSequence(results: unknown[]) {
  const queue = [...results];
  return vi.fn(() => {
    const where = vi.fn(() => {
      const result: any[] = (queue.shift() as any[]) || [];
      result.limit = vi.fn(async () => result);
      return result;
    });
    const from = vi.fn(() => ({ where }));
    return { from };
  });
}

const commercialLead = {
  id: 808,
  agencyId: 44,
  agentId: 33,
  listingId: 901,
  propertyId: null,
  name: 'Tenant One',
  status: 'new',
};

describe('Commercial lead workflow boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommercialLeadContextCandidateIds.mockImplementation((rows: unknown) =>
      (Array.isArray(rows) ? rows : [])
        .filter(row => row?.id && row?.listingId && !row?.propertyId)
        .map(row => Number(row.id)),
    );
    mockLoadCommercialLeadContext.mockResolvedValue({
      listingId: 901,
      commercialAvailabilityId: 701,
    });
  });

  it('rejects generic viewing scheduling for a Commercial enquiry before it can select generic inventory', async () => {
    const select = createSelectSequence([
      [commercialLead],
      [{ id: 33, agencyId: 44, userId: 101, status: 'approved' }],
      [{ agentId: 33, status: 'active', effectiveFrom: null, effectiveTo: null }],
    ]);
    const insert = vi.fn();
    mockGetDb.mockResolvedValue({ select, insert } as any);

    await expect(
      caller().scheduleLeadViewing({
        leadId: 808,
        agentId: 33,
        scheduledAt: '2026-10-12T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message:
        'Commercial enquiries stay linked to their verified marketing listing and require the dedicated Commercial workflow for viewings or offers.',
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects generic offer/deal creation for a Commercial enquiry', async () => {
    const select = createSelectSequence([[commercialLead]]);
    const insert = vi.fn();
    mockGetDb.mockResolvedValue({ select, insert } as any);

    await expect(
      caller().createDeal({
        leadId: 808,
        transactionType: 'rental',
        interestStatus: 'wants_offer',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message:
        'Commercial enquiries stay linked to their verified marketing listing and require the dedicated Commercial workflow for viewings or offers.',
    });

    expect(insert).not.toHaveBeenCalled();
  });
});
