import { describe, expect, it } from 'vitest';

import {
  buildDeveloperOperatingHome,
  buildDevelopmentOperatingSummary,
} from '../developerOperatingHome';

const validDevelopment = {
  id: 42,
  name: 'Harbour Heights',
  canonicalPlaceId: 'pl-place-01-000000000000000000000001',
  slug: 'harbour-heights',
  address: '1 Harbour Road',
  transactionType: 'for_sale',
  approvalStatus: 'approved',
  isPublished: 1,
  publishedAt: new Date('2026-01-01'),
  description:
    'A valid persisted description that contains more than fifty characters for testing.',
  images: JSON.stringify([{ url: 'https://example.com/harbour.jpg' }]),
  highlights: JSON.stringify(['One', 'Two', 'Three']),
  ownershipType: 'sectional-title',
  developmentType: 'residential',
  rejectionNote: null,
};

const validUnitType = {
  id: 'unit-42',
  developmentId: 42,
  name: 'Two bedroom apartment',
  label: 'Two bedroom apartment',
  isActive: 1,
  totalUnits: 10,
  availableUnits: 6,
  reservedUnits: 1,
  priceFrom: 1_000_000,
  priceTo: 1_200_000,
  basePriceFrom: 1_000_000,
  basePriceTo: 1_200_000,
  monthlyRentFrom: null,
  monthlyRentTo: null,
  startingBid: null,
  reservePrice: null,
  auctionStartDate: null,
  auctionEndDate: null,
};

const leadSummary = {
  demand: {
    range: '30d' as const,
    capturedLeadCount: 2,
    newLeadCount: 1,
    recentLeads: [],
    sources: [],
  },
  funnel: {
    stages: {
      new: 1,
      contacted: 0,
      qualified: 0,
      viewing: 0,
      offer: 0,
      dealInProgress: 0,
      closedWon: 0,
      closedLost: 0,
    },
    openLeadCount: 1,
    closedWonCount: 0,
    slaWarningCount: 0,
    slaBreachCount: 0,
  },
};

const portfolioLeadSummary = {
  ...leadSummary,
  demand: {
    ...leadSummary.demand,
    capturedLeadCount: 8,
  },
  funnel: {
    ...leadSummary.funnel,
    stages: {
      new: 1,
      contacted: 1,
      qualified: 1,
      viewing: 1,
      offer: 1,
      dealInProgress: 1,
      closedWon: 1,
      closedLost: 1,
    },
    openLeadCount: 6,
    closedWonCount: 1,
  },
};

describe('developer operating home', () => {
  it('keeps a blank changes-requested review authoritative', () => {
    const summary = buildDevelopmentOperatingSummary({
      development: { ...validDevelopment, approvalStatus: 'draft', isPublished: 0 } as any,
      geography: { canonicalPlaceId: null, locationLabels: [] },
      persistedUnitTypes: [validUnitType] as any,
      reviewRows: [
        {
          id: 9,
          status: 'changes_requested',
          submittedAt: new Date('2026-02-01'),
          reviewedAt: new Date('2026-02-02'),
          reviewNotes: '   ',
          rejectionReason: null,
        },
      ] as any,
      leadSummary,
      commercialAccess: {
        eligible: true,
        reason: 'active_launch_access',
        status: 'active',
        planName: 'developer_launch_access',
        planDisplayName: 'Launch Access',
        expiresAt: '2026-05-01 00:00:00',
      },
    });

    expect(summary.lifecycle.state).toBe('changes_required');
    expect(summary.nextAction?.code).toBe('review_requested_changes');
  });

  it('keeps approved work private and gives Launch Access the deterministic next action', () => {
    const summary = buildDevelopmentOperatingSummary({
      development: validDevelopment as any,
      geography: { canonicalPlaceId: null, locationLabels: [] },
      persistedUnitTypes: [validUnitType] as any,
      reviewRows: [],
      leadSummary,
      commercialAccess: {
        eligible: false,
        reason: 'expired_launch_access',
        status: 'expired',
        planName: 'developer_launch_access',
        planDisplayName: 'Launch Access',
        expiresAt: '2026-01-31 00:00:00',
      },
    });

    expect(summary.lifecycle.state).toBe('approved_private');
    expect(summary.lifecycle.publicEligible).toBe(false);
    expect(summary.publication.commercialAccessRequired).toBe(true);
    expect(summary.nextAction?.code).toBe('activate_launch_access');
    expect(summary.attention.items[0]?.type).toBe('commercial_access_required');
  });

  it('aggregates server-ranked actions and canonical inventory across the portfolio', () => {
    const privateSummary = buildDevelopmentOperatingSummary({
      development: {
        ...validDevelopment,
        id: 43,
        name: 'Private Park',
        approvalStatus: 'draft',
        isPublished: 0,
      } as any,
      geography: { canonicalPlaceId: null, locationLabels: [] },
      persistedUnitTypes: [validUnitType] as any,
      reviewRows: [],
      leadSummary: portfolioLeadSummary,
      commercialAccess: {
        eligible: true,
        reason: 'active_launch_access',
        status: 'active',
        planName: 'developer_launch_access',
        planDisplayName: 'Launch Access',
        expiresAt: null,
      },
    });
    const liveSummary = buildDevelopmentOperatingSummary({
      development: validDevelopment as any,
      geography: { canonicalPlaceId: null, locationLabels: [] },
      persistedUnitTypes: [validUnitType] as any,
      reviewRows: [],
      leadSummary: portfolioLeadSummary,
      commercialAccess: {
        eligible: true,
        reason: 'active_launch_access',
        status: 'active',
        planName: 'developer_launch_access',
        planDisplayName: 'Launch Access',
        expiresAt: null,
      },
    });

    const home = buildDeveloperOperatingHome({
      range: '30d',
      developments: [liveSummary, privateSummary],
      commercialAccess: {
        eligible: true,
        reason: 'active_launch_access',
        status: 'active',
        planName: 'developer_launch_access',
        planDisplayName: 'Launch Access',
        expiresAt: null,
      },
    });

    expect(home.portfolio).toMatchObject({
      developmentCount: 2,
      readiness: { readyDevelopmentCount: 2, blockedDevelopmentCount: 0 },
      inventory: {
        totalUnits: 20,
        availableUnits: 12,
        trackedDevelopmentCount: 2,
        configuredDevelopmentCount: 2,
      },
      leads: {
        capturedLeadCount: 16,
        openLeadCount: 12,
        stageCounts: {
          new: 2,
          contacted: 2,
          qualified: 2,
          viewing: 2,
          offer: 2,
          dealInProgress: 2,
          closedWon: 2,
          closedLost: 2,
        },
      },
    });
    expect(home.portfolio.nextAction?.developmentId).toBe(43);
  });
});
