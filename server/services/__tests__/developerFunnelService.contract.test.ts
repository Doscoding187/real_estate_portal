import { describe, expect, it } from 'vitest';
import { isLeadTransitionAllowed } from '../../../shared/developerFunnel';
import {
  computeLeadSla,
  deriveCanonicalLeadStage,
  deriveLeadOutcomeReadbackFromEvent,
  evaluateDistributionAssignmentGate,
  getAvailableLeadOwnerTypes,
  normalizeLeadAffordabilityData,
} from '../developerFunnelService';

describe('developer funnel contract', () => {
  it('enforces allowed stage transitions', () => {
    expect(isLeadTransitionAllowed('new', 'contacted')).toBe(true);
    expect(isLeadTransitionAllowed('contacted', 'qualified')).toBe(true);
    expect(isLeadTransitionAllowed('new', 'offer_made')).toBe(false);
    expect(isLeadTransitionAllowed('closed_won', 'qualified')).toBe(false);
  });

  it('derives canonical system stages from lostReason', () => {
    const spamLead = {
      status: 'lost',
      lostReason: 'spam',
      funnelStage: 'interest',
    } as any;
    const duplicateLead = {
      status: 'lost',
      lostReason: 'duplicate',
      funnelStage: 'interest',
    } as any;

    expect(deriveCanonicalLeadStage(spamLead)).toBe('spam');
    expect(deriveCanonicalLeadStage(duplicateLead)).toBe('duplicate');
  });

  it('computes SLA warning/breach windows', () => {
    const now = new Date('2026-03-01T12:00:00.000Z');

    const warningLead = {
      createdAt: '2026-03-01T06:30:00.000Z',
      lastContactedAt: null,
      nextFollowUp: null,
      notes: null,
    } as any;

    const breachLead = {
      createdAt: '2026-02-28T08:00:00.000Z',
      lastContactedAt: null,
      nextFollowUp: null,
      notes: null,
    } as any;

    expect(computeLeadSla(warningLead, now).status).toBe('warning');
    expect(computeLeadSla(breachLead, now).status).toBe('breach');
  });

  it('blocks distribution owner type when distribution is disabled', () => {
    expect(getAvailableLeadOwnerTypes(false)).toEqual(['developer_sales', 'agency', 'unassigned']);
    expect(
      evaluateDistributionAssignmentGate({
        ownerType: 'distribution_partner',
        distributionEnabledForDevelopment: false,
        partnerEligible: true,
        leadEligible: true,
      }),
    ).toEqual({ allowed: false, reason: 'distribution_disabled' });
  });

  it('rejects ineligible distribution partner even when development is enabled', () => {
    expect(
      evaluateDistributionAssignmentGate({
        ownerType: 'distribution_partner',
        distributionEnabledForDevelopment: true,
        partnerEligible: false,
        leadEligible: true,
      }),
    ).toEqual({ allowed: false, reason: 'partner_ineligible' });
  });

  it('allows distribution assignment only when enabled + eligible + distribution lead', () => {
    expect(
      evaluateDistributionAssignmentGate({
        ownerType: 'distribution_partner',
        distributionEnabledForDevelopment: true,
        partnerEligible: true,
        leadEligible: true,
      }),
    ).toEqual({ allowed: true });
  });

  it('derives structured lead outcome readback from DLE operating events', () => {
    expect(
      deriveLeadOutcomeReadbackFromEvent({
        id: 42,
        eventType: 'lead_stage_changed',
        fromStatus: 'deal_in_progress',
        toStatus: 'closed_won',
        metadata: {
          displayLabel: 'Lease signed / Let',
          outcome: 'rental_let',
        },
      }),
    ).toEqual({
      label: 'Lease signed / Let',
      sourceEventId: 42,
      outcome: 'rental_let',
      fromStage: 'deal_in_progress',
      toStage: 'closed_won',
      source: 'development_operating_events',
    });

    expect(
      deriveLeadOutcomeReadbackFromEvent({
        id: 43,
        eventType: 'inventory_status_changed',
        metadata: { displayLabel: 'Sold' },
      }),
    ).toBeNull();

    expect(
      deriveLeadOutcomeReadbackFromEvent({
        id: 44,
        eventType: 'lead_stage_changed',
        metadata: {},
      }),
    ).toBeNull();
  });

  it('normalizes saved qualification context for developer lead read models', () => {
    expect(
      normalizeLeadAffordabilityData(
        JSON.stringify({
          qualificationModel: 'rental_fit',
          qualificationCapacityLabel: 'Estimated rent capacity',
          qualificationMonthlyCapacity: 18000,
        }),
      ),
    ).toEqual({
      qualificationModel: 'rental_fit',
      qualificationCapacityLabel: 'Estimated rent capacity',
      qualificationMonthlyCapacity: 18000,
    });

    expect(normalizeLeadAffordabilityData('not-json')).toBeNull();
    expect(normalizeLeadAffordabilityData(null)).toBeNull();
  });
});
