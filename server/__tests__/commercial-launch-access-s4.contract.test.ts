import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_AGENT_LAUNCH_ACCESS,
  CANONICAL_AGENCY_LAUNCH_ACCESS,
  CANONICAL_DEVELOPER_LAUNCH_ACCESS,
  CANONICAL_LAUNCH_ACCESS_PRODUCTS,
} from '../_core/databaseAuthority/dataAdapters/canonicalCommercial';
import { getConfiguredLaunchFeeMinor, resolveCommercialTerm } from '../services/commercialTerm';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('commercial monetization S4 paid Launch Access contract', () => {
  it('defines the approved once-off 90-day launch ladder without monthly semantics', () => {
    const products = [
      [CANONICAL_AGENT_LAUNCH_ACCESS, 49900],
      [CANONICAL_AGENCY_LAUNCH_ACCESS, 99900],
      [CANONICAL_DEVELOPER_LAUNCH_ACCESS, 149900],
    ] as const;

    for (const [product, amount] of products) {
      expect(resolveCommercialTerm(product)).toEqual({
        kind: 'paid_launch_access',
        durationDays: 90,
        requiresVerifiedPayment: true,
        autoRenews: false,
      });
      expect(getConfiguredLaunchFeeMinor(product)).toBe(amount);
      expect(product.price).toBe(amount);
      expect(product.priceMonthly).toBe(0);
      expect(product.metadata.commercial_billing_interval).toBe('once_off');
      expect(product.metadata.commercial_action_mode).toBe('request_invoice');
      if (product.segment === 'agent' || product.segment === 'agency') {
        expect(product.metadata.commercial_launch_access_mode).toBe(
          'full_supported_capability_cohort',
        );
        expect(product.metadata.commercial_feature_access_policy).toBe(
          'all_supported_canonical_capabilities',
        );
        expect(product.metadata.commercial_resource_limit_policy).toBe(
          'explicit_launch_safeguard',
        );
        expect(product.metadata.commercial_learning_cohort).toBe('launch_access');
      }
    }
  });

  it('provisions Agent and Agency products from explicit data on a clean baseline', () => {
    expect(CANONICAL_AGENT_LAUNCH_ACCESS.limits).toEqual({ max_active_listings: 50 });
    expect(CANONICAL_AGENT_LAUNCH_ACCESS.entitlements).toEqual({
      max_active_listings: 50,
      has_commission_tracking: false,
      has_revenue_dashboard: false,
    });
    expect(CANONICAL_AGENT_LAUNCH_ACCESS.features).not.toContain('Commission tracking');
    expect(CANONICAL_AGENCY_LAUNCH_ACCESS.limits).toEqual({ max_active_listings: 500 });
    expect(CANONICAL_AGENCY_LAUNCH_ACCESS.entitlements).toEqual({
      max_active_listings: 500,
      has_commission_tracking: true,
      has_revenue_dashboard: true,
      has_team_dashboard: true,
      has_lead_routing: true,
    });

    const adapter = readRepoFile(
      'server/_core/databaseAuthority/dataAdapters/canonicalCommercial.ts',
    );
    expect(CANONICAL_LAUNCH_ACCESS_PRODUCTS).toHaveLength(3);
    expect(adapter).toContain("commercial_entitlement_source: 'explicit_launch_capabilities'");
    expect(adapter).not.toContain('getSupportedEntitlementSource');
    expect(adapter).not.toContain('SELECT * FROM plans WHERE segment = ?');
    expect(adapter).not.toContain('commercial_entitlement_source_plan');
  });

  it('uses one owner-scoped manual-EFT lifecycle for all three audiences', () => {
    const billing = readRepoFile('server/services/billingFoundationService.ts');
    const router = readRepoFile('server/billingRouter.ts');

    expect(billing).toContain('requestPaidLaunchAccessInvoice');
    expect(billing).toContain('submitPaidLaunchAccessPaymentProof');
    expect(billing).toContain('lockLaunchBillingState');
    expect(billing).toContain('lockLaunchInvoice');
    expect(billing).toContain("commercialTermKind: 'paid_launch_access'");
    expect(billing).toContain("entitlement_starts_on_verified_activation: true");
    expect(billing).toContain("commercial_auto_renews: false");
    expect(router).toContain('requestLaunchAccessInvoice: protectedProcedure');
    expect(router).toContain('submitLaunchAccessPaymentProof: protectedProcedure');
  });

  it('contains the old automatic launch free-trial bypasses', () => {
    const agentOnboarding = readRepoFile('server/services/agentOnboardingService.ts');
    const agencyRouter = readRepoFile('server/agencyRouter.ts');
    const legacyRouter = readRepoFile('server/subscriptionRouter.ts');

    expect(agentOnboarding).toContain('Free agent trials are retired');
    expect(agentOnboarding).toContain('manual-EFT invoice and verified payment');
    expect(agentOnboarding).not.toContain("status: 'trial'");
    expect(agencyRouter).toContain('Free agency trials are retired');
    expect(agencyRouter).toContain('allowPendingPayment');
    expect(legacyRouter).toContain('Legacy agency free trials are retired');
  });

  it('removes stale public pricing and permanent lock-in claims', () => {
    const cms = readRepoFile('client/src/services/cms/defaultContent.ts');
    const agentFunnel = readRepoFile('client/src/pages/advertise/AgentFunnelPage.tsx');
    const agencyComingSoon = readRepoFile('client/src/pages/advertise/AgencyComingSoonPage.tsx');

    expect(cms).not.toContain('R499/month');
    expect(cms).not.toContain('R2,999/month');
    expect(agentFunnel).not.toContain('14-Day Free Trial');
    expect(agentFunnel).not.toContain('Start Your Free Trial');
    expect(agencyComingSoon).not.toContain('locked-in pricing');
  });

  it('keeps proof documents owner-private, including independent agents', () => {
    const billing = readRepoFile('server/services/billingFoundationService.ts');
    expect(billing).toContain("document.ownerType === 'agent'");
    expect(billing).toContain('input.user.role === \'agent\'');
    expect(billing).toContain('getInvoiceForOwnerOrThrow');
  });
});
