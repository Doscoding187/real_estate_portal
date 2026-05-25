import { describe, expect, it } from 'vitest';
import { buildLeadDevelopmentMatchRows } from '../leadRoutingMatchPersistenceService';

describe('leadRoutingMatchPersistenceService', () => {
  it('builds auditable match rows and marks the selected development separately', () => {
    const rows = buildLeadDevelopmentMatchRows({
      buyerLeadId: 42,
      sessionId: 7,
      campaignId: 3,
      sourceType: 'google_ads',
      selectedDevelopmentId: 101,
      matches: [
        {
          developmentId: 101,
          matchScore: 82.45678,
          matchLabel: 'good_match',
          matchReasons: [{ code: 'city_match', points: 34 }],
          incomeEligible: true,
          locationMatch: true,
          campaignEligible: true,
          distributionReady: false,
          submissionAllowed: false,
        },
        {
          developmentId: 202,
          matchScore: 41,
          matchLabel: 'needs_review',
          incomeEligible: false,
          locationMatch: false,
          campaignEligible: false,
          distributionReady: true,
          submissionAllowed: true,
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      buyerLeadId: 42,
      sessionId: 7,
      campaignId: 3,
      developmentId: 101,
      matchScore: '82.4568',
      matchLabel: 'good_match',
      incomeEligible: 1,
      locationMatch: 1,
      selectedByBuyer: 1,
    });
    expect(rows[1]).toMatchObject({
      developmentId: 202,
      distributionReady: 1,
      submissionAllowed: 1,
      selectedByBuyer: 0,
    });
  });

  it('clamps unsafe scores before persistence', () => {
    const [row] = buildLeadDevelopmentMatchRows({
      buyerLeadId: 1,
      selectedDevelopmentId: 1,
      matches: [
        {
          developmentId: 1,
          matchScore: 130,
          matchLabel: 'good_match',
          incomeEligible: true,
          locationMatch: true,
          campaignEligible: false,
          distributionReady: false,
          submissionAllowed: false,
        },
      ],
    });

    expect(row.matchScore).toBe('100.0000');
  });
});
