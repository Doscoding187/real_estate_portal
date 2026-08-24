import { describe, expect, it } from 'vitest';

import {
  buildAgencyOperatingHome,
  type AgencyOperatingHomeInputs,
} from '../agencyOperatingHome';

const base: AgencyOperatingHomeInputs = {
  agencyId: 1,
  now: new Date('2026-08-24T08:00:00.000Z'),
  leads: {
    newToday: 0,
    unassigned: 0,
    firstResponseOverdueCount: 0,
    oldestOverdueWaitingMinutes: null,
    followUpsOverdueCount: 0,
    oldestOverdueFollowUpName: null,
  },
  listings: {
    pendingReviewCount: 0,
    oldestPendingReviewAgeDays: null,
    rejectedCount: 0,
    unassignedCount: 0,
  },
  publication: {
    ready: true,
    blockers: [],
    facts: {
      verified: true,
      profileComplete: true,
      brandingComplete: true,
      subscriptionStatus: 'active',
      currentPeriodEnd: '2026-11-01 00:00:00',
      daysRemaining: 69,
      capacityUsed: 4,
      capacityMax: 500,
    },
  },
};

describe('agency operating home', () => {
  it('renders an empty clear queue when every canonical signal is healthy', () => {
    const home = buildAgencyOperatingHome(base);

    expect(home.ready).toBe(true);
    expect(home.actions).toHaveLength(0);
    expect(home).toMatchObject({
      brief: {
        leads: { firstResponseOverdueCount: 0 },
        publication: { capacityMax: 500 },
      },
    });
  });

  it('ranks subscription and verification blockers as critical before work signals', () => {
    const home = buildAgencyOperatingHome({
      ...base,
      publication: {
        ready: false,
        blockers: [
          { reason: 'agency_unverified', message: 'The agency must be verified.' },
          { reason: 'subscription_pending_payment', message: 'Payment pending.' },
        ],
        facts: {
          ...base.publication.facts,
          verified: false,
          subscriptionStatus: 'pending_payment',
        },
      },
      leads: {
        newToday: 3,
        unassigned: 2,
        firstResponseOverdueCount: 4,
        oldestOverdueWaitingMinutes: 42,
        followUpsOverdueCount: 1,
        oldestOverdueFollowUpName: 'Thabo M.',
      },
      listings: { pendingReviewCount: 2, oldestPendingReviewAgeDays: 5, rejectedCount: 1, unassignedCount: 1 },
    });

    const codes = home.actions.map(action => action.code);
    expect(codes.indexOf('resolve_publication_blocker')).toBeLessThan(codes.indexOf('respond_sla_breach'));
    expect(home.actions[0].severity).toBe('critical');
    expect(home.actions.filter(a => a.severity === 'critical').map(a => a.code)).toEqual(
      expect.arrayContaining(['respond_sla_breach', 'fix_rejected_listings']),
    );
  });

  it('orders lead SLA above follow-ups above new-lead assignment', () => {
    const home = buildAgencyOperatingHome({
      ...base,
      leads: {
        newToday: 5,
        unassigned: 3,
        firstResponseOverdueCount: 2,
        oldestOverdueWaitingMinutes: 90,
        followUpsOverdueCount: 2,
        oldestOverdueFollowUpName: 'A. Nkosi',
      },
    });

    console.log('HOME', JSON.stringify(home));
    const codes = home.actions.map(action => action.code);
    expect(codes).toEqual([
      'respond_sla_breach',
      'chase_overdue_follow_up',
      'assign_new_leads',
    ]);
    expect(home.actions[0].title).toContain('2 enquiries');
    expect(home.actions[0].title).toContain('15-minute');
    expect(home.actions[0].valueLabel).toContain('90 min');
    expect(home).toMatchObject({
      brief: { leads: { newToday: 5, firstResponseOverdueCount: 2 } },
    });
  });

  it('surfaces review aging, rejections and unassigned inventory as distinct actions', () => {
    const home = buildAgencyOperatingHome({
      ...base,
      listings: {
        pendingReviewCount: 3,
        oldestPendingReviewAgeDays: 6,
        rejectedCount: 2,
        unassignedCount: 4,
      },
    });

    const codes = home.actions.map(action => action.code);
    expect(codes).toContain('review_pending_listings');
    expect(codes).toContain('fix_rejected_listings');
    expect(codes).toContain('assign_unassigned_listings');

    const reviewAction = home.actions.find(a => a.code === 'review_pending_listings');
    expect(reviewAction?.valueLabel).toContain('oldest 6 days');
  });

  it('warns when Launch Access is about to expire', () => {
    const home = buildAgencyOperatingHome({
      ...base,
      publication: {
        ...base.publication,
        facts: { ...base.publication.facts, daysRemaining: 5 },
      },
    });

    const expiryAction = home.actions.find(
      action => action.code === 'resolve_publication_blocker' || action.code === 'renew_launch_access',
    );
    expect(expiryAction).toBeDefined();
    expect(expiryAction?.severity).toBe('warning');
    expect(expiryAction?.valueLabel).toContain('5 days');
  });
});
