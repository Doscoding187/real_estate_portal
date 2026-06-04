import { describe, expect, it } from 'vitest';

import {
  buildOverviewOperatingReadiness,
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

  it('returns null without a selected development', () => {
    expect(buildOverviewOperatingReadiness({ development: null })).toBeNull();
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
});
