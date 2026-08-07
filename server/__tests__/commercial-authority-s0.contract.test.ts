import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

describe('commercial monetization S0 authority containment', () => {
  it('rejects legacy paid subscription creation before any legacy write', () => {
    const source = readRepoFile('server/subscriptionRouter.ts');
    const start = source.indexOf('createSubscription: protectedProcedure');
    const end = source.indexOf('/**\n   * Upgrade subscription', start);
    const createSection = source.slice(start, end);

    expect(createSection).toContain("code: 'PRECONDITION_FAILED'");
    expect(createSection).toContain('Legacy paid subscription activation is disabled');
    expect(createSection).not.toContain('INSERT INTO user_subscriptions');
    expect(createSection).not.toContain("status = 'active_paid'");
  });

  it('rejects immediate legacy upgrades while preserving non-paid compatibility reads', () => {
    const source = readRepoFile('server/services/subscriptionService.ts');
    const start = source.indexOf('export async function upgradeSubscription');
    const end = source.indexOf('export async function downgradeSubscription', start);
    const upgradeSection = source.slice(start, end);

    expect(upgradeSection).toContain('if (immediate)');
    expect(upgradeSection).toContain('Legacy paid subscription upgrades are disabled');
    expect(upgradeSection).not.toContain("status = 'active_paid'");
  });

  it('removes the historical Stripe webhook from the active server surface', () => {
    const source = readRepoFile('server/_core/index.ts');

    expect(source).not.toContain("from './stripeWebhooks'");
    expect(source).not.toContain('/api/webhooks/stripe');
  });

  it('does not expose a development payment-activation mutation', () => {
    const router = readRepoFile('server/routers.ts');
    const onboarding = readRepoFile('client/src/pages/OnboardingSuccess.tsx');

    expect(router).not.toContain("import { devRouter } from './devRouter'");
    expect(router).not.toContain('mutableAppRouterConfig.dev');
    expect(onboarding).not.toContain('triggerWebhookManual');
    expect(onboarding).not.toContain('Auto-triggering webhook');
  });

  it('exposes the catalog as a read-only canonical billing boundary', () => {
    const router = readRepoFile('server/billingRouter.ts');
    const catalog = readRepoFile('server/services/commercialCatalogService.ts');

    expect(router).toContain('commercialCatalog: publicProcedure');
    expect(router).toContain('getCommercialCatalog');
    expect(catalog).toContain("authority: 'canonical_plans'");
    expect(catalog).toContain("entitlements: 'plan_entitlements'");
    expect(catalog).not.toMatch(/\.insert\s*\(/);
    expect(catalog).not.toMatch(/\.update\s*\(/);
    expect(catalog).not.toMatch(/\.delete\s*\(/);
    expect(catalog).not.toMatch(/\.transaction\s*\(/);
  });
});
