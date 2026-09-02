import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveAgencyJourneyAccessState } from '../../shared/agencyJourney';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('Agency end-to-end journey truth', () => {
  const router = readRepoFile('server/agencyRouter.ts');
  const hook = readRepoFile('client/src/hooks/useAgencyOnboardingStatus.ts');
  const appRoutes = readRepoFile('client/src/App.tsx');

  it('uses one typed journey authority instead of returning route strings from the server', () => {
    expect(router).toContain('deriveAgencyJourneyAccessState');
    expect(router).not.toContain("recommendedNextStep: '/agency/setup'");
    expect(router).not.toContain("recommendedNextStep: '/agency/billing/subscription'");
    expect(router).toContain('subscriptionStatus: accessState.billingStatus');
    expect(router).not.toContain('subscriptionStatus: agency.subscriptionStatus');
  });

  it('keeps an Agency owner at the business identity checkpoint before activation', () => {
    expect(
      deriveAgencyJourneyAccessState({
        hasAgency: true,
        profileConfigured: true,
        brandingConfigured: false,
        billingActivated: false,
        teamReady: false,
        subscriptionStatus: 'not_started',
      }),
    ).toEqual({
      dashboardUnlocked: true,
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'complete_agency_brand',
    });
  });

  it('keeps finance review distinct from the next management action', () => {
    expect(
      deriveAgencyJourneyAccessState({
        hasAgency: true,
        profileConfigured: true,
        brandingConfigured: true,
        billingActivated: false,
        teamReady: false,
        subscriptionStatus: 'payment_under_review',
      }).recommendedNextStep,
    ).toBe('await_payment_review');

    expect(
      deriveAgencyJourneyAccessState({
        hasAgency: true,
        profileConfigured: true,
        brandingConfigured: true,
        billingActivated: true,
        teamReady: false,
        subscriptionStatus: 'active',
      }).recommendedNextStep,
    ).toBe('invite_team');
  });

  it('does not turn a transient status failure into a false setup redirect', () => {
    expect(hook).toContain('if (statusQuery.error || !status) return;');
    expect(hook).not.toContain('if (statusQuery.error) {\n      if (window.location.pathname');
  });

  it('keeps Agency setup behind the dedicated owner-account boundary', () => {
    const segment = appRoutes.slice(appRoutes.indexOf('<Route path="/agency/setup">'));
    expect(segment).toContain('role="agency_admin"');
    expect(segment).toContain('unauthenticatedAuthEntry="register"');
    expect(segment).toContain('roleMismatchFallback={AGENCY_SETUP_ROLE_MISMATCH_FALLBACK}');
  });
});
