import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isLeadTransitionAllowed } from '../../../shared/developerFunnel';

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock('../../db', () => ({ db: { select: mockSelect } }));

import {
  computeLeadSla,
  deriveCanonicalLeadStage,
  evaluateDistributionAssignmentGate,
  getAvailableLeadOwnerTypes,
  getCanonicalLeadSource,
  getDevelopmentHomeRangeBoundary,
  getOwnedDevelopmentHomeLeadSummary,
} from '../developerFunnelService';

describe('developer funnel contract', () => {
  beforeEach(() => vi.clearAllMocks());

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
    const archivedLead = {
      status: 'lost',
      lostReason: 'archived',
      funnelStage: 'interest',
    } as any;
    const viewingScheduledLead = { status: 'viewing_scheduled', funnelStage: 'viewing' } as any;
    const viewingCompletedLead = { status: 'qualified', funnelStage: 'viewing' } as any;

    expect(deriveCanonicalLeadStage(spamLead)).toBe('spam');
    expect(deriveCanonicalLeadStage(duplicateLead)).toBe('duplicate');
    expect(deriveCanonicalLeadStage(archivedLead)).toBe('archived');
    expect(deriveCanonicalLeadStage(viewingScheduledLead)).toBe('viewing_scheduled');
    expect(deriveCanonicalLeadStage(viewingCompletedLead)).toBe('viewing_completed');
  });

  it('keeps every V1 headline SQL branch equivalent to canonical stage derivation', () => {
    const cases = [
      [{ status: 'new', funnelStage: 'interest' }, 'new'],
      [{ status: 'contacted', funnelStage: 'affordability' }, 'contacted'],
      [{ status: 'qualified', funnelStage: 'qualification' }, 'qualified'],
      [{ status: 'qualified', funnelStage: 'viewing' }, 'viewing_completed'],
      [{ status: 'viewing_scheduled', funnelStage: 'viewing' }, 'viewing_scheduled'],
      [{ status: 'offer_sent', funnelStage: 'offer' }, 'offer_made'],
      [{ status: 'converted', funnelStage: 'bond' }, 'deal_in_progress'],
      [{ status: 'closed', funnelStage: 'sale' }, 'closed_won'],
      [{ status: 'lost', funnelStage: 'interest', lostReason: 'no budget' }, 'closed_lost'],
      [{ status: 'lost', funnelStage: 'interest', lostReason: 'spam' }, 'spam'],
      [{ status: 'lost', funnelStage: 'interest', lostReason: 'duplicate' }, 'duplicate'],
      [{ status: 'lost', funnelStage: 'interest', lostReason: 'archived' }, 'archived'],
    ] as const;

    for (const [lead, expected] of cases) {
      expect(deriveCanonicalLeadStage(lead as never)).toBe(expected);
    }

    const service = readFileSync(new URL('../developerFunnelService.ts', import.meta.url), 'utf8');
    expect(service).toContain("${leads.status} = 'qualified' AND ${leads.funnelStage} = 'viewing'");
    expect(service).toContain("${leads.status} = 'viewing_scheduled'");
    expect(service).toContain("${leads.status} = 'offer_sent'");
    expect(service).toContain("${leads.status} = 'converted'");
    expect(service).toContain("${leads.status} = 'closed'");
    expect(service).toContain("NOT IN ('spam', 'duplicate', 'archived')");
  });

  it('processes a 251-lead SLA cohort through stable 250-row ID cursor batches', async () => {
    const warningRows = Array.from({ length: 250 }, (_, index) => ({
      id: index + 1,
      createdAt: '2026-03-01T07:00:00.000Z',
      lastContactedAt: null,
      nextFollowUp: null,
      notes: null,
    }));
    const breachRow = {
      id: 251,
      createdAt: '2026-02-28T07:00:00.000Z',
      lastContactedAt: null,
      nextFollowUp: null,
      notes: null,
    };
    const responses = [
      [
        {
          capturedLeadCount: 251,
          new: 251,
          contacted: 0,
          qualified: 0,
          viewing: 0,
          offer: 0,
          dealInProgress: 0,
          closedWon: 0,
          closedLost: 0,
        },
      ],
      [],
      [],
      warningRows,
      [breachRow],
    ];
    mockSelect.mockImplementation(() => {
      const value = Promise.resolve(responses.shift() || []);
      const chain = Object.assign(value, {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        groupBy: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => value),
      });
      return chain;
    });

    const summary = await getOwnedDevelopmentHomeLeadSummary({
      developmentId: 42,
      range: '7d',
      now: new Date('2026-03-01T12:00:00.000Z'),
    });

    expect(summary.funnel.slaWarningCount).toBe(250);
    expect(summary.funnel.slaBreachCount).toBe(1);
    expect(mockSelect).toHaveBeenCalledTimes(5);
  });

  it('uses trimmed leadSource, then trimmed source, then the visible unknown fallback', () => {
    expect(
      getCanonicalLeadSource({ leadSource: '  development_detail  ', source: 'referral' } as any),
    ).toBe('development_detail');
    expect(getCanonicalLeadSource({ leadSource: ' ', source: ' referral ' } as any)).toBe(
      'referral',
    );
    expect(getCanonicalLeadSource({ leadSource: null, source: '   ' } as any)).toBe(
      'Unknown source',
    );
  });

  it('derives the selected-period lower boundary from one supplied timestamp', () => {
    const now = new Date('2026-03-01T12:00:00.000Z');
    expect(getDevelopmentHomeRangeBoundary('7d', now)).toEqual({
      from: '2026-02-22T12:00:00.000Z',
      to: '2026-03-01T12:00:00.000Z',
    });
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
});
