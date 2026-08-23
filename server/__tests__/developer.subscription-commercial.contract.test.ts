import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('developer canonical commercial contract', () => {
  it('resolves developers by profile ownership without auto-creating commercial state', () => {
    const access = readRepoFile('server/services/planAccessService.ts');
    const service = readRepoFile('server/services/developerSubscriptionService.ts');

    expect(access).toContain("ownerType: 'developer'");
    expect(access).toContain('developerOrganisationMemberships.userId');
    expect(service).toContain('getPlanAccessProjectionForDeveloperId');
    expect(service).toContain("ownerType: 'developer'");
    expect(service).toContain('Developer free-trial provisioning is retired');
    expect(service).toContain('return this.getSubscription(developerId);');
    expect(service).not.toContain('SUBSCRIPTION_TIER_LIMITS');
    expect(service).not.toContain('developerSubscriptionLimits');
  });

  it('uses canonical plan entitlements for limits and retains usage only as a domain meter', () => {
    const service = readRepoFile('server/services/developerSubscriptionService.ts');
    const router = readRepoFile('server/developerRouter.ts');

    expect(service).toContain('getCanonicalLimits');
    expect(service).toContain('getPlanAccessProjectionForDeveloperId');
    expect(service).toContain('DeveloperSubscriptionUsage');
    expect(service).toContain('organisation-owned facts');
    expect(service).toContain('evaluateDeveloperLimitAccess');
    expect(service).toContain('developmentPortfolioUnlimited');
    expect(router).toContain('getOperatingHome');
    expect(router).toContain("ownerType: 'developer'");
    expect(router).not.toContain('developerSubscriptionService.checkLimit(');
    expect(router).not.toContain(
      "developerSubscriptionService.incrementUsage(developerId, 'developments')",
    );
    expect(router).not.toContain(
      "developerSubscriptionService.decrementUsage(profile.organisationId, 'developments')",
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

  it('requires verified billing context at the canonical paid Launch Access write boundary', () => {
    const access = readRepoFile('server/services/planAccessService.ts');

    expect(access).toContain("term.kind === 'paid_launch_access'");
    expect(access).toContain("nextStatus !== 'active'");
    expect(access).toContain(
      'Paid Launch Access requires activation through verified billing authority.',
    );
    expect(access).toContain('validatePaidLaunchAccessPayment(');
    expect(access).toContain('verifiedPayment: input.verifiedPayment');
  });

  it('uses the shared catalog and does not preserve hard-coded developer sellable prices', () => {
    const plansPage = readRepoFile('client/src/pages/DeveloperPlans.tsx');
    const billingPanel = readRepoFile('client/src/components/developer/BillingPanel.tsx');
    const settings = readRepoFile('client/src/components/developer/SettingsPanel.tsx');

    expect(plansPage).toContain("useCommercialCatalog('developer')");
    expect(plansPage).toContain('getCommercialPricePresentation');
    expect(plansPage).not.toContain('DEVELOPER_PLANS');
    expect(plansPage).not.toContain('R1,499');
    expect(plansPage).not.toContain('R3,999');
    expect(plansPage).toContain("product.term.kind === 'paid_launch_access'");
    expect(billingPanel).toContain('Request Developer Launch Access');
    expect(billingPanel).not.toContain('Start your free trial');
    expect(billingPanel).not.toContain('Start Free Trial');
    expect(billingPanel).not.toContain('999999');
    // The orphaned MarketingTools surface was removed in DEV-S2; assert it is
    // not reintroduced as a hard-coded pricing path.
    const exists = existsSync(
      path.resolve(process.cwd(), 'client/src/components/developer/MarketingTools.tsx'),
    );
    expect(exists).toBe(false);
    expect(settings).toContain("useCommercialCatalog('developer')");
    expect(settings).not.toContain('R2,499.00');
    expect(settings).not.toContain('subscription?.tier');
    expect(settings).not.toContain('maxDevelopments ?? 1');
    expect(settings).not.toContain('maxLeadsPerMonth ?? 50');
    expect(settings).not.toContain('maxTeamMembers ?? 1');
  });

  it('represents Developer Launch Access as a canonical once-off manual-EFT flow', () => {
    const adapter = readRepoFile(
      'server/_core/databaseAuthority/dataAdapters/canonicalCommercial.ts',
    );
    const billingService = readRepoFile('server/services/billingFoundationService.ts');
    const billingRouter = readRepoFile('server/billingRouter.ts');
    const billingSchema = readRepoFile('drizzle/schema/billing.ts');
    const billingPanel = readRepoFile('client/src/components/developer/BillingPanel.tsx');

    expect(adapter).toContain('commercial_launch_fee_minor: 149900');
    expect(adapter).toContain("commercial_billing_interval: 'once_off'");
    expect(adapter).toContain('price: 149900');
    expect(adapter).toContain('priceMonthly: 0');
    expect(billingSchema).toContain("commercialTermKind: varchar('commercial_term_kind'");
    expect(billingService).toContain('requestDeveloperLaunchAccessInvoice');
    expect(billingService).toContain("commercialTermKind: 'paid_launch_access'");
    expect(billingService).toContain('launchFee === null');
    expect(billingService).toContain('activateSubscriptionForPaidInvoice');
    expect(billingRouter).toContain('developerWorkspace: protectedProcedure');
    expect(billingRouter).toContain('requestDeveloperLaunchAccessInvoice: protectedProcedure');
    expect(billingRouter).toContain('submitDeveloperPaymentProof: protectedProcedure');
    expect(billingPanel).toContain('once-off for 90 days');
    expect(billingPanel).toContain('Submit proof for review');
    expect(billingPanel).not.toContain('Upgrade to a paid plan');
    expect(billingPanel).not.toContain('/month');
  });
});
