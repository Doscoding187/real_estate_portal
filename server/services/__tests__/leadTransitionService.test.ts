import { describe, expect, it } from 'vitest';
import {
  isTwoWayContactOutcome,
  leadStatusTimestamps,
  validateLeadTransition,
} from '../leadTransitionService';

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
    ).toThrow('A two-way buyer contact must be recorded before offer work.');
  });

  it('keeps qualification mandatory when no readiness confirmation exists', () => {
    expect(() => validateLeadTransition(viewingLead(), 'offer_sent')).toThrow(
      'Qualification must be recorded before offer work.',
    );
  });
});

describe('two-way buyer contact outcomes', () => {
  it.each(['reached', 'replied', 'viewing_booked', 'not_interested'])(
    'recognizes %s as a two-way interaction',
    outcome => {
      expect(isTwoWayContactOutcome(outcome)).toBe(true);
    },
  );

  it.each(['no_answer', 'voicemail', 'invalid_contact', 'follow_up_required', 'other'])(
    'does not treat %s as a two-way interaction',
    outcome => {
      expect(isTwoWayContactOutcome(outcome)).toBe(false);
    },
  );
});

describe('lead stage timestamps', () => {
  it('records first outreach and two-way contact when a viewing is booked', () => {
    const now = '2026-10-15 09:00:00';
    const timestamps = leadStatusTimestamps(
      {
        status: 'new',
        firstRespondedAt: null,
        lastContactedAt: null,
      } as unknown as Parameters<typeof leadStatusTimestamps>[0],
      'viewing_scheduled',
      now,
    );

    expect(timestamps).toMatchObject({
      firstRespondedAt: now,
      lastContactedAt: now,
      funnelStage: 'viewing',
    });
  });
});
