import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPaidSubscriptionRowEntitled } from '../services/planAccessService';

const NOW = new Date('2026-08-23T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('canonical paid-entitlement row predicate', () => {
  it('accepts an active term with a future period end', () => {
    expect(
      isPaidSubscriptionRowEntitled(
        { status: 'active', currentPeriodEnd: new Date(NOW.getTime() + DAY).toISOString() },
        NOW,
      ),
    ).toBe(true);
  });

  it('accepts grace_period and a missing period end (matches established loaders)', () => {
    expect(
      isPaidSubscriptionRowEntitled({ status: 'grace_period', currentPeriodEnd: null }, NOW),
    ).toBe(true);
    expect(isPaidSubscriptionRowEntitled({ status: 'active', currentPeriodEnd: null }, NOW)).toBe(
      true,
    );
  });

  it('fails closed on an elapsed or malformed period end', () => {
    expect(
      isPaidSubscriptionRowEntitled(
        { status: 'active', currentPeriodEnd: new Date(NOW.getTime() - DAY).toISOString() },
        NOW,
      ),
    ).toBe(false);
    expect(
      isPaidSubscriptionRowEntitled({ status: 'active', currentPeriodEnd: 'not-a-date' }, NOW),
    ).toBe(false);
  });

  it('rejects non-paid statuses', () => {
    for (const status of ['trial', 'expired', 'pending_payment', 'payment_under_review', null]) {
      expect(isPaidSubscriptionRowEntitled({ status, currentPeriodEnd: null }, NOW)).toBe(false);
    }
  });
});

describe('activation-to-renewal continuity wiring', () => {
  it('notifies and emails the solo agent on captured organic enquiries', () => {
    const capture = readRepoFile('server/services/publicLeadCaptureService.ts');
    expect(capture).toContain('notifyAgentOfNewLead');
    expect(capture).toContain("type: 'lead_assigned'");
    expect(capture).toContain('sendNewLeadNotificationEmail');
  });

  it('runs the launch-expiry notice scheduler on boot with idempotent notices', () => {
    const scheduler = readRepoFile('server/services/commercialTermNoticeScheduler.ts');
    expect(scheduler).toContain('launch_expiry_7d');
    expect(scheduler).toContain('launch_expiry_1d');
    expect(scheduler).toContain("json_unquote(json_extract(n.data, '$.notice'))");

    const boot = readRepoFile('server/_core/index.ts');
    expect(boot).toContain('commercialTermNoticeScheduler.start()');
    expect(scheduler).toContain('u.firstName as firstName');
    expect(scheduler).not.toContain('u.first_name');
  });

  it('speaks the expired truth in the agent status strip and CRM lock', () => {
    const strip = readRepoFile('client/src/components/agent/AgentStatusStrip.tsx');
    expect(strip).toContain("expired: 'Launch Access expired'");
    expect(strip).toContain("status.subscriptionStatus === 'expired'");

    const leads = readRepoFile('client/src/pages/AgentLeads.tsx');
    expect(leads).toContain('Your Launch Access term has expired');
    expect(leads).toContain('Renew Launch Access');
  });

  it('routes demand leads only to commercially active recipients', () => {
    const demand = readRepoFile('server/services/demandEngineService.ts');
    expect(demand).toContain('isPaidSubscriptionRowEntitled');
    expect(demand).toContain('if (!routing?.eligible) continue;');
  });

  it('aligns land and commercial-office custody with the canonical rule', () => {
    const capture = readRepoFile('server/services/publicLeadCaptureService.ts');
    expect(capture).toContain('isRecipientCommerciallyDeliverable');
    expect(capture).toMatch(/landEligibility\.eligible/);
    expect(capture).toMatch(/commercialEligibility\.eligible/);
  });

  it('surfaces the already-computed proof metrics', () => {
    const panel = readRepoFile('client/src/components/agent/AgentPresenceProof.tsx');
    expect(panel).toContain('summary.areaGuideOpens');
    expect(panel).toContain('summary.shares');
  });
});
