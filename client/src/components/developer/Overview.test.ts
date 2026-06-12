import { describe, expect, it } from 'vitest';

import {
  buildOverviewOperatingReview,
  buildOverviewOperatingReadiness,
  buildOverviewPricingHealth,
  getOverviewAuctionLifecycleLabel,
  getOverviewOperatingCopy,
  getOverviewOperatingEventNote,
  parseOverviewOperatingEventJson,
} from './Overview';

describe('Developer Overview operating readiness', () => {
  it('builds sale-native operating copy and private distribution state', () => {
    expect(getOverviewOperatingCopy('for_sale')).toMatchObject({
      engineLabel: 'Sale Engine',
      riskLabel: 'Buyer lead risk',
      readyLabel: 'Qualified buyers',
      outcomeLabel: 'Sales outcomes',
      queueLabel: 'Work buyer queue',
    });

    expect(
      buildOverviewOperatingReadiness({
        development: { name: 'Sale Quarter', transactionType: 'for_sale' },
        stageCounts: { new: 6, qualified: 3, closed_won: 1 },
        attention: { warningCount: 2, breachCount: 1 },
        distributionSettings: { distributionEnabled: false },
      }),
    ).toMatchObject({
      engineLabel: 'Sale Engine',
      riskCount: 3,
      newLeadCount: 6,
      readyCount: 3,
      outcomeCount: 1,
      distributionState: 'Private',
    });
  });

  it('builds rental-native operating readiness with partner-ready distribution', () => {
    expect(
      buildOverviewOperatingReadiness({
        development: { name: 'Rental Quarter', transactionType: 'for_rent' },
        stageCounts: { new: 8, qualified: 5, closed_won: 2 },
        attention: { warningCount: 0, breachCount: 2 },
        distributionSettings: {
          distributionEnabled: true,
          eligiblePartnerCount: 4,
        },
      }),
    ).toMatchObject({
      engineLabel: 'Rental Engine',
      riskLabel: 'Rental lead risk',
      readyLabel: 'Rental-fit leads',
      outcomeLabel: 'Lease outcomes',
      queueLabel: 'Work leasing queue',
      riskCount: 2,
      eligiblePartnerCount: 4,
      distributionState: 'Partner-ready',
    });
  });

  it('builds auction-native operating readiness with active referral pipeline', () => {
    expect(
      buildOverviewOperatingReadiness({
        development: { name: 'Auction Quarter', transactionType: 'auction' },
        stageCounts: { new: 10, qualified: 7, closed_won: 3 },
        attention: { warningCount: 3, breachCount: 0 },
        distributionSettings: {
          distributionEnabled: true,
          eligiblePartnerCount: 2,
        },
        distributionSummary: {
          totalDeals: 5,
        },
      }),
    ).toMatchObject({
      engineLabel: 'Auction Engine',
      riskLabel: 'Bidder lead risk',
      readyLabel: 'Bidder-ready leads',
      outcomeLabel: 'Auction outcomes',
      queueLabel: 'Work bidder queue',
      riskCount: 3,
      referralDealCount: 5,
      distributionState: 'Active referral pipeline',
    });
  });

  it('uses Auction-native lifecycle labels', () => {
    expect(getOverviewAuctionLifecycleLabel('scheduled')).toBe('Scheduled');
    expect(getOverviewAuctionLifecycleLabel('registration_open')).toBe('Registration open');
    expect(getOverviewAuctionLifecycleLabel('active')).toBe('Auction active');
    expect(getOverviewAuctionLifecycleLabel('sold')).toBe('Sold at auction');
  });

  it('returns null without a selected development', () => {
    expect(buildOverviewOperatingReadiness({ development: null })).toBeNull();
  });

  it('builds Sale pricing health from public mirrors and live unit inventory', () => {
    expect(
      buildOverviewPricingHealth({
        development: {
          transactionType: 'for_sale',
          priceFrom: 1_200_000,
          priceTo: 1_650_000,
        },
        inventoryItems: [
          { basePriceFrom: 1_200_000, basePriceTo: 1_450_000 },
          { priceFrom: 1_350_000, priceTo: 1_650_000 },
        ],
      }),
    ).toMatchObject({
      title: 'Sale pricing health',
      status: 'Aligned',
      state: 'aligned',
      publicLabel: 'Public price band',
      inventoryLabel: 'Live unit price band',
    });
  });

  it('flags Rental rent drift before dashboard follow-up relies on stale public pricing', () => {
    const health = buildOverviewPricingHealth({
      development: {
        transactionType: 'for_rent',
        monthlyRentFrom: 14_000,
        monthlyRentTo: 16_000,
      },
      inventoryItems: [
        { monthlyRentFrom: 15_000, monthlyRentTo: 17_500 },
        { monthlyRentFrom: 18_000, monthlyRentTo: 19_000 },
      ],
    });

    expect(health).toMatchObject({
      title: 'Rental pricing health',
      status: 'Review needed',
      state: 'attention',
      publicLabel: 'Public rent range',
      inventoryLabel: 'Live unit rent range',
      actionLabel: 'Review Rental Pricing',
    });
    expect(health?.help).toContain('Review development rent mirrors');
    expect(health?.actionHelp).toContain('align public rent mirrors');
  });

  it('builds Auction bid health without collapsing into sale price language', () => {
    expect(
      buildOverviewPricingHealth({
        development: {
          transactionType: 'auction',
          startingBidFrom: 850_000,
        },
        inventoryItems: [{ startingBid: 850_000 }, { startingBid: 950_000 }],
      }),
    ).toMatchObject({
      title: 'Auction bid health',
      status: 'Aligned',
      publicLabel: 'Public bid from',
      inventoryLabel: 'Live lot bid from',
    });
  });

  it('guides Auction bid drift back into the package editor lane', () => {
    const health = buildOverviewPricingHealth({
      development: {
        transactionType: 'auction',
        startingBidFrom: 800_000,
      },
      inventoryItems: [{ startingBid: 850_000 }],
    });

    expect(health).toMatchObject({
      title: 'Auction bid health',
      status: 'Review needed',
      state: 'attention',
      actionLabel: 'Review Auction Bids',
    });
    expect(health?.actionHelp).toContain('align public bid mirrors');
  });

  it('formats operating event metadata without relying on one JSON shape', () => {
    expect(parseOverviewOperatingEventJson('{"note":"Rental hold requested"}')).toEqual({
      note: 'Rental hold requested',
    });
    expect(parseOverviewOperatingEventJson({ note: 'Buyer callback queued' })).toEqual({
      note: 'Buyer callback queued',
    });
    expect(parseOverviewOperatingEventJson('bad-json')).toEqual({});

    expect(
      getOverviewOperatingEventNote({
        metadata: { note: 'Registration list checked' },
        afterData: { note: 'Fallback' },
      }),
    ).toBe('Registration list checked');
    expect(
      getOverviewOperatingEventNote({
        metadata: null,
        afterData: '{"note":"Fallback afterData note"}',
      }),
    ).toBe('Fallback afterData note');
  });

  it('builds read-only operating review context without merging ownership lanes', () => {
    const review = buildOverviewOperatingReview({
      operatingEvents: [
        {
          eventType: 'distribution_handoff_created',
          toStatus: 'review_requested',
          metadata: { note: 'Manager should review referral context.' },
        },
        {
          eventType: 'lead_stage_changed',
          fromStatus: 'deal_in_progress',
          toStatus: 'closed_won',
          metadata: { displayLabel: 'Lease signed / Let' },
        },
        {
          eventType: 'inventory_status_changed',
          fromStatus: 'held',
          toStatus: 'let',
          metadata: { note: 'Rental unit marked let.' },
        },
      ],
      distributionDeals: [
        {
          latestDleHandoff: {
            status: 'review_requested',
            note: 'Referral review requested by developer.',
            eventAt: '2026-06-11T12:00:00.000Z',
          },
        },
      ],
    });

    expect(review.inventory).toMatchObject({
      state: 'recorded',
      label: 'Inventory outcome',
      detail: 'Rental unit marked let.',
    });
    expect(review.lead).toMatchObject({
      state: 'recorded',
      label: 'Lead synced',
      detail: 'Lease signed / Let',
    });
    expect(review.handoff).toMatchObject({
      state: 'recorded',
      label: 'Review requested',
      detail: 'Referral review requested by developer.',
    });
  });

  it('shows explicit missing operating review states instead of implying automation', () => {
    expect(buildOverviewOperatingReview({ operatingEvents: [], distributionDeals: [] })).toMatchObject({
      inventory: { state: 'missing', label: 'Inventory outcome not recorded' },
      lead: { state: 'missing', label: 'Lead sync not recorded' },
      handoff: { state: 'missing', label: 'Distribution handoff not requested' },
    });
  });
});
