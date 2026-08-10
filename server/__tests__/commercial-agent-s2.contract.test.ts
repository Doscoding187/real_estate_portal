import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

describe('commercial monetization S2 agent authority', () => {
  it('selects a canonical plan by id and does not write user-level commercial state', () => {
    const route = readRepoFile('server/routes/agentOnboarding.ts');
    const service = readRepoFile('server/services/agentOnboardingService.ts');

    expect(route).toContain('planId: z.number().int().positive()');
    expect(route).not.toContain('AGENT_ONBOARDING_TIER_VALUES');
    expect(service).toContain("getCommercialCatalog('agent')");
    expect(service).toContain('product.source.planId === planId');
    expect(service).toContain('Free agent trials are retired');
    expect(service).toContain('manual-EFT invoice and verified payment');
    expect(route).toContain('request-launch-access-invoice');
    expect(service).not.toContain('user.plan');
    expect(service).not.toContain('user.trialStatus');
    expect(service).not.toContain('user.trialStartedAt');
    expect(service).not.toContain('user.trialEndsAt');
    expect(service).not.toContain('user.subscriptionTier');
    expect(service).not.toContain('user.subscriptionStatus');
  });

  it('derives agent entitlement from canonical subscription and plan entitlements only', () => {
    const access = readRepoFile('server/services/planAccessService.ts');
    const entitlements = readRepoFile('server/services/agentEntitlementService.ts');

    expect(access).not.toContain('const DEFAULT_AGENT_PLAN');
    expect(access).not.toContain("user.role === 'agent' ||");
    expect(access).not.toContain('user.plan');
    expect(access).not.toContain('user.trialStatus');
    expect(entitlements).not.toContain('user.plan');
    expect(entitlements).not.toContain('user.subscriptionTier');
    expect(entitlements).not.toContain('applyTierEntitlementMinimums');
    expect(entitlements).toContain('isPaidSubscriptionEntitled');
    expect(entitlements).toContain('getEntitlementNumber(entitlements,');
  });

  it('blocks legacy agent subscription operations before they reach legacy tables', () => {
    const router = readRepoFile('server/subscriptionRouter.ts');

    expect(router).toContain('rejectLegacyAgentCommercialPath');
    expect(router).toContain('Legacy agent subscription operations are retired');
    expect(router).toContain("plan.category !== 'agent' && plan.category !== 'developer'");
    expect(router).toContain("WHERE sp.category NOT IN ('agent', 'developer')");
    expect(router).toContain(
      "if (input.category === 'agent') rejectLegacyAgentCommercialPath(ctx)",
    );
    expect(router).toContain('Legacy agent and developer trial administration is retired');
  });

  it('keeps agent publication tied to an active canonical agent plan', () => {
    const publication = readRepoFile('server/services/listingPublicationEntitlementService.ts');

    expect(publication).toContain("plan.segment !== 'agent'");
    expect(publication).toContain('maxActiveListings <= 0');
    expect(publication).toContain('subscriptionFailure(subscription, now)');
  });

  it('removes the obsolete public agent price authority', () => {
    const packagePage = readRepoFile('client/src/pages/agent/AgentPackageSelection.tsx');
    const app = readRepoFile('client/src/App.tsx');
    const funnel = readRepoFile('client/src/pages/advertise/AgentFunnelPage.tsx');

    expect(packagePage).toContain('useCommercialCatalog');
    expect(packagePage).not.toContain('fallbackMonthlyCents');
    expect(packagePage).not.toContain('ANNUAL_DISCOUNT');
    expect(packagePage).not.toContain('AGENT_TRIAL_DAYS');
    expect(packagePage).not.toContain('R2,499');
    expect(app).not.toContain("import('./pages/advertise/AgentOnboardingPage')");
    expect(app).toContain('<Redirect to="/role-selection" />');
    expect(funnel).toContain("import AgentProductLandingPage from './AgentProductLandingPage'");
    expect(funnel).toContain('return <AgentProductLandingPage />');
  });
});
