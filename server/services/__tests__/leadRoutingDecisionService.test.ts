import { describe, expect, it } from 'vitest';
import { buildLeadRoutingDecisionPayload, decideLeadRouting } from '../leadRoutingDecisionService';

describe('leadRoutingDecisionService', () => {
  it('routes credit help requests to credit readiness before distribution', () => {
    const decision = decideLeadRouting({
      buyerLeadId: 1,
      creditReportStatus: 'needs_help',
      match: { developmentId: 10, distributionReady: true, submissionAllowed: true },
    });

    expect(decision).toMatchObject({
      outcome: 'route_to_credit_readiness',
      ownerType: 'credit_readiness',
    });
  });

  it('routes distribution-ready submissions to the distribution program', () => {
    const payload = buildLeadRoutingDecisionPayload({
      buyerLeadId: 1,
      sessionId: 2,
      campaignId: 3,
      sourceType: 'meta_ads',
      match: {
        selectedMatchId: 4,
        developmentId: 5,
        distributionReady: true,
        submissionAllowed: true,
      },
    });

    expect(payload).toMatchObject({
      buyerLeadId: 1,
      sessionId: 2,
      campaignId: 3,
      selectedMatchId: 4,
      developmentId: 5,
      sourceType: 'meta_ads',
      outcome: 'route_to_distribution_program',
      ownerType: 'distribution_program',
    });
  });

  it('keeps non-ready development interest in review instead of dropping the lead', () => {
    const decision = decideLeadRouting({
      buyerLeadId: 1,
      preferredContactMethod: 'phone',
      match: { developmentId: 5, distributionReady: false, submissionAllowed: false },
    });

    expect(decision).toMatchObject({
      outcome: 'route_to_general_review',
      ownerType: 'general_review',
    });
  });

  it('respects WhatsApp preference when manual handling is needed', () => {
    const decision = decideLeadRouting({
      buyerLeadId: 1,
      preferredContactMethod: 'whatsapp',
      match: { developmentId: 5, distributionReady: false, submissionAllowed: false },
    });

    expect(decision).toMatchObject({
      outcome: 'route_to_whatsapp_followup',
      ownerType: 'whatsapp',
    });
  });
});
