import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DeveloperSubscriptionService,
  evaluateDeveloperLimitAccess,
} from '../developerSubscriptionService';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('DeveloperSubscriptionService canonical authority contract', () => {
  it('does not create a developer subscription from onboarding/package selection', async () => {
    await expect(new DeveloperSubscriptionService().createSubscription(42)).rejects.toThrow(
      'free-trial provisioning is retired',
    );
  });

  it('allows a paid launch portfolio without substituting a numeric magic quota', () => {
    expect(
      evaluateDeveloperLimitAccess({ entitled: true, current: 200, max: null, unlimited: true }),
    ).toBe(true);
    expect(
      evaluateDeveloperLimitAccess({ entitled: false, current: 0, max: null, unlimited: true }),
    ).toBe(false);
    expect(
      evaluateDeveloperLimitAccess({ entitled: true, current: 4, max: 5, unlimited: false }),
    ).toBe(true);
    expect(
      evaluateDeveloperLimitAccess({ entitled: true, current: 5, max: 5, unlimited: false }),
    ).toBe(false);
  });

  it('derives developer subscription state from canonical plan access', () => {
    const service = readRepoFile('server/services/developerSubscriptionService.ts');

    expect(service).toContain('getPlanAccessProjectionForDeveloperId');
    expect(service).toContain('projection.subscription.status');
    expect(service).toContain('projection.currentPlan.id');
    expect(service).toContain('getCanonicalLimits');
    expect(service).not.toContain('developerSubscriptionLimits');
    expect(service).not.toContain('SUBSCRIPTION_TIER_LIMITS');
  });

  it('retains usage metering without allowing the meter anchor to grant access', () => {
    const service = readRepoFile('server/services/developerSubscriptionService.ts');

    expect(service).toContain('developerSubscriptionUsage');
    expect(service).toContain('subscription.commercial.entitled &&');
    expect(service).toContain('developmentPortfolioUnlimited');
    expect(service).toContain('its tier/status/limits are never read as authority');
    expect(service).toContain('Legacy developer tier updates are retired');
    expect(service).not.toContain('.update(developerSubscriptions)');
  });

  it('reads trial expiry without mutating the legacy developer row', () => {
    const service = readRepoFile('server/services/developerSubscriptionService.ts');

    expect(service).toContain('getPlanAccessProjectionForDeveloperId(developerId)');
    expect(service).toContain("projection.subscription.status === 'expired'");
    expect(service).not.toContain("status: 'expired',\n          updatedAt");
  });
});
