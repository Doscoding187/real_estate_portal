import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('developer subscription commercial contract', () => {
  it('bootstraps an actual free-trial subscription for new developer profiles', () => {
    const router = readRepoFile('server/developerRouter.ts');
    const service = readRepoFile('server/services/developerSubscriptionService.ts');

    expect(router).toContain('developerSubscriptionService.ensureSubscription(profile.id)');
    expect(service).toContain('async ensureSubscription(developerId: number)');
    expect(service).toContain('return existing || this.createSubscription(developerId);');
  });

  it('does not present unpaid paid plans as immediately active', () => {
    const router = readRepoFile('server/developerRouter.ts');
    const plansPage = readRepoFile('client/src/pages/DeveloperPlans.tsx');

    expect(router).toContain("status: 'sales_assisted' as const");
    expect(router).toContain('Your current entitlement has not changed.');
    expect(plansPage).toContain('Request Invoice');
    expect(plansPage).toContain('Paid developer plans are activated after an invoice and payment verification.');
    expect(plansPage).not.toContain('activated instantly for testing');
  });
});
