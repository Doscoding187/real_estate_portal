import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockSubmitListingForReview,
  mockArchiveListing,
  mockUpdateListingAgentAssignment,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSubmitListingForReview: vi.fn(),
  mockArchiveListing: vi.fn(),
  mockUpdateListingAgentAssignment: vi.fn(),
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
  submitListingForReview: mockSubmitListingForReview,
  archiveListing: mockArchiveListing,
  updateListingAgentAssignment: mockUpdateListingAgentAssignment,
  updateListingAgentAssignments: vi.fn(),
}));

import { agencyRouter } from '../agencyRouter';

const agencyAdmin = {
  id: 9001,
  role: 'agency_admin',
  email: 'agency-admin@example.com',
  agencyId: 44,
};

const commercialListing = {
  id: 8101,
  title: 'Commercial vacancy',
  propertyType: 'commercial',
  status: 'draft',
  ownerId: agencyAdmin.id,
  agentId: null,
  agencyId: agencyAdmin.agencyId,
  readinessScore: 100,
  publishedAt: null,
  askingPrice: null,
  monthlyRent: '100000.00',
  startingBid: null,
};

function commercialListingSelect() {
  const limit = vi.fn().mockResolvedValue([commercialListing]);
  const where = vi.fn(() => ({ limit }));
  const ownerJoin = vi.fn(() => ({ where }));
  const agentJoin = vi.fn(() => ({ leftJoin: ownerJoin }));
  const from = vi.fn(() => ({ leftJoin: agentJoin }));
  return vi.fn(() => ({ from }));
}

function caller() {
  return agencyRouter.createCaller({
    user: agencyAdmin,
    req: {} as any,
    res: {} as any,
    requestId: 'commercial-agency-boundary',
  } as any);
}

describe('commercial agency workflow boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue({ select: commercialListingSelect() } as any);
  });

  it.each([
    ['assignment', (api: ReturnType<typeof caller>) => api.assignListing({ listingId: 8101, agentId: null })],
    ['submission', (api: ReturnType<typeof caller>) => api.submitListingForReview({ listingId: 8101 })],
    ['archive', (api: ReturnType<typeof caller>) => api.archiveListing({ listingId: 8101 })],
    ['generic detail', (api: ReturnType<typeof caller>) => api.getListingDetail({ listingId: 8101 })],
  ])('hands Commercial %s to the dedicated inventory workflow', async (_operation, invoke) => {
    await expect(invoke(caller())).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Commercial leasing listings are managed through Commercial inventory.',
    });

    expect(mockUpdateListingAgentAssignment).not.toHaveBeenCalled();
    expect(mockSubmitListingForReview).not.toHaveBeenCalled();
    expect(mockArchiveListing).not.toHaveBeenCalled();
  });
});
