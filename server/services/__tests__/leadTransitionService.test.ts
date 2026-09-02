import { describe, expect, it } from 'vitest';
import { validateLeadTransition } from '../leadTransitionService';

const viewingLead = (overrides: Record<string, unknown> = {}) =>
  ({
    status: 'viewing_scheduled',
    agentId: 7,
    assignedTo: 42,
    lastContactedAt: '2026-09-01 09:00:00',
    qualificationScore: 0,
    qualificationStatus: 'pending',
    ...overrides,
  }) as any;

describe('lead transition offer-readiness override', () => {
  it('allows an audited affordability confirmation to satisfy only qualification', () => {
    expect(() =>
      validateLeadTransition(viewingLead(), 'offer_sent', { qualificationConfirmed: true }),
    ).not.toThrow();
  });

  it('still requires a recorded first contact', () => {
    expect(() =>
      validateLeadTransition(viewingLead({ lastContactedAt: null }), 'offer_sent', {
        qualificationConfirmed: true,
      }),
    ).toThrow('Lead must be contacted before offer work.');
  });

  it('keeps qualification mandatory when no readiness confirmation exists', () => {
    expect(() => validateLeadTransition(viewingLead(), 'offer_sent')).toThrow(
      'Qualification must be recorded before offer work.',
    );
  });
});
