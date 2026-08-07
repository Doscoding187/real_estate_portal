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

  it('acknowledges but does not apply legacy Stripe events', () => {
    const source = readRepoFile('server/_core/stripeWebhooks.ts');
    const handlerStart = source.indexOf('export const handleStripeWebhook');
    const providerCheck = source.indexOf('// Check if Stripe is configured', handlerStart);
    const guard = source.slice(handlerStart, providerCheck);

    expect(source).toContain('export const LEGACY_STRIPE_WEBHOOK_DISABLED = true');
    expect(guard).toContain('legacy_stripe_disabled');
    expect(guard).toContain('canonicalAuthority');
    expect(guard).toContain('mutationsApplied: 0');
    expect(guard).not.toContain('.update(');
    expect(guard).not.toContain('.insert(');
  });

  it('keeps the local simulated webhook from creating paid-looking state', () => {
    const source = readRepoFile('server/devRouter.ts');
    const handlerStart = source.indexOf('triggerWebhookManual: protectedProcedure');
    const mutationStart = source.indexOf('.mutation', handlerStart);
    const agencyWrite = source.indexOf('.update(agencies)', mutationStart);
    const guard = source.slice(mutationStart, agencyWrite);

    expect(source).toContain('export const LEGACY_DEV_WEBHOOK_DISABLED = true');
    expect(guard).toContain('LEGACY_DEV_WEBHOOK_DISABLED');
    expect(guard).toContain("code: 'NOT_FOUND'");
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
