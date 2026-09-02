import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_LEAD_OFFER_READINESS,
  isAgentLeadOfferReadinessComplete,
  parseAgentLeadOfferReadiness,
  serializeAgentLeadOfferReadiness,
} from '../agentLeadOfferReadiness';

describe('agent lead offer-readiness activity contract', () => {
  it('round-trips a complete activity snapshot', () => {
    const readiness = {
      viewingCompleted: true,
      feedbackLogged: true,
      affordabilityConfirmed: true,
    };

    const parsed = parseAgentLeadOfferReadiness(JSON.stringify(serializeAgentLeadOfferReadiness(readiness)));

    expect(parsed).toEqual(readiness);
    expect(isAgentLeadOfferReadinessComplete(parsed!)).toBe(true);
  });

  it('does not mistake unrelated activity metadata for offer evidence', () => {
    expect(parseAgentLeadOfferReadiness('{"kind":"follow_up","version":1}')).toBeNull();
    expect(parseAgentLeadOfferReadiness('{not valid json')).toBeNull();
    expect(isAgentLeadOfferReadinessComplete(DEFAULT_AGENT_LEAD_OFFER_READINESS)).toBe(false);
  });
});
