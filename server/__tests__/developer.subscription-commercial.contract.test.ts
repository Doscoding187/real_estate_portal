import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('developer canonical commercial contract', () => {
  it('resolves developers by profile ownership and creates only canonical trial state', () => {
    const access = readRepoFile('server/services/planAccessService.ts');
    const service = readRepoFile('server/services/developerSubscriptionService.ts');

    expect(access).toContain("ownerType: 'developer'");
    expect(access).toContain('developers.userId');
    expect(access).toContain('getDeveloperTrialPlan');
    expect(service).toContain('getPlanAccessProjectionForDeveloperId');
    expect(service).toContain("ownerType: 'developer'");
    expect(service).toContain("status: 'trial'");
    expect(service).not.toContain('SUBSCRIPTION_TIER_LIMITS');
    expect(service).not.toContain('developerSubscriptionLimits');
  });

  it('uses canonical plan entitlements for limits and retains usage only as a domain meter', () => {
    const service = readRepoFile('server/services/developerSubscriptionService.ts');
    const router = readRepoFile('server/developerRouter.ts');

    expect(service).toContain('getCanonicalLimits');
    expect(service).toContain('getPlanAccessProjectionForDeveloperId');
    expect(service).toContain('developerSubscriptionUsage');
    expect(service).toContain('its tier/status/limits are never read as authority');
    expect(service).toContain('subscription.commercial.entitled && current < max');
    expect(router).toContain('developerSubscriptionService.checkLimit(');
    expect(router).toContain(
      "developerSubscriptionService.incrementUsage(developerId, 'developments')",
    );
    expect(router).toContain(
      "developerSubscriptionService.decrementUsage(profile.id, 'developments')",
    );
  });

  it('does not allow legacy tier mutation or unauthorised subscription reads', () => {
    const service = readRepoFile('server/services/developerSubscriptionService.ts');
    const router = readRepoFile('server/routes/developerSubscriptions.ts');
    const middleware = readRepoFile('server/middleware/subscriptionTierEnforcement.ts');
    const developerRoutes = readRepoFile('client/src/pages/DeveloperRoutes.tsx');

    expect(service).toContain('Legacy developer tier updates are retired');
    expect(service).not.toContain('.update(developerSubscriptions)');
    expect(router).toContain('canAccessDeveloper');
    expect(router).toContain('CANONICAL_PLAN_CHANGE_REQUIRED');
    expect(router).not.toContain('developerSubscriptionService.updateTier');
    expect(middleware).toContain('getDeveloperByUserId');
    expect(middleware).not.toContain('req.user?.developerId');
    expect(middleware).not.toContain(
      'req.user?.id, // sometimes the developer row ID is the user ID',
    );
    expect(developerRoutes).not.toContain('DeveloperCampaignsPage');
    expect(developerRoutes).not.toContain('path="/developer/campaigns"');
  });

  it('uses the shared catalog and does not preserve hard-coded developer sellable prices', () => {
    const plansPage = readRepoFile('client/src/pages/DeveloperPlans.tsx');
    const marketingTools = readRepoFile('client/src/components/developer/MarketingTools.tsx');
    const settings = readRepoFile('client/src/components/developer/SettingsPanel.tsx');

    expect(plansPage).toContain("useCommercialCatalog('developer')");
    expect(plansPage).toContain('getCommercialPricePresentation');
    expect(plansPage).not.toContain('DEVELOPER_PLANS');
    expect(plansPage).not.toContain('R1,499');
    expect(plansPage).not.toContain('R3,999');
    expect(marketingTools).not.toContain('R499');
    expect(marketingTools).not.toContain('Select Package');
    expect(settings).toContain("useCommercialCatalog('developer')");
    expect(settings).not.toContain('R2,499.00');
    expect(settings).not.toContain('subscription?.tier');
    expect(settings).not.toContain('maxDevelopments ?? 1');
    expect(settings).not.toContain('maxLeadsPerMonth ?? 50');
    expect(settings).not.toContain('maxTeamMembers ?? 1');
  });
});
