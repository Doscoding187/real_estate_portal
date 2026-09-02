import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveAgentJourneyAccessState } from '../../shared/agentJourney';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('agent pre-activation journey truth', () => {
  const service = readRepoFile('server/services/agentOnboardingService.ts');
  const entitlements = readRepoFile('server/services/agentEntitlementService.ts');
  const hook = readRepoFile('client/src/hooks/useAgentOnboardingStatus.ts');
  const appRoutes = readRepoFile('client/src/App.tsx');
  const authRoutes = readRepoFile('server/_core/authRoutes.ts');

  it('exposes profile approval state in the onboarding payload', () => {
    expect(service).toContain("const approvalStatus = agent?.status ?? 'pending'");
    expect(service).toContain('approvalStatus: onboardingState.approvalStatus');
    expect(service).not.toContain('dashboardUnlocked: packageSelected');
  });

  it('advances identity progression without requiring payment first', () => {
    expect(service).not.toContain('let onboardingStep = packageSelected');
    expect(service).toContain('deriveAgentJourneyAccessState');
  });

  it('stops bouncing unpaid agents out of professional-identity surfaces', () => {
    expect(hook).not.toContain("setLocation('/agent/select-package')");
  });

  it('lands email verification inside the setup journey', () => {
    expect(authRoutes).toContain("return '/agent/setup?verified=true';");
    expect(authRoutes).not.toContain('/agent/select-package?verified=true');
  });

  it('preserves return context on the gated agent routes', () => {
    for (const route of [
      '/agent/dashboard',
      '/agent/listings',
      '/agent/leads',
      '/agent/canvassing',
      '/agent/marketing',
      '/agent/earnings',
      '/agent/analytics',
      '/agent/productivity',
      '/agent/settings',
      '/agent/select-package',
      '/agent/setup',
      '/agent/referrals',
    ]) {
      const segment = appRoutes.slice(appRoutes.indexOf(route));
      expect(segment, route).toContain('unauthenticatedAuthEntry="signin"');
    }
  });

  it('keeps payment and verification states distinct from expiry', () => {
    expect(
      deriveAgentJourneyAccessState({
        onboardingComplete: true,
        onboardingStep: 4,
        coreContactReady: true,
        emailVerified: true,
        approvalStatus: 'approved',
        subscriptionStatus: 'pending_payment',
      }),
    ).toEqual({ fullFeaturesUnlocked: false, recommendedNextStep: 'complete_payment' });

    expect(
      deriveAgentJourneyAccessState({
        onboardingComplete: true,
        onboardingStep: 4,
        coreContactReady: true,
        emailVerified: true,
        approvalStatus: 'approved',
        subscriptionStatus: 'payment_under_review',
      }),
    ).toEqual({ fullFeaturesUnlocked: false, recommendedNextStep: 'await_payment_review' });

    expect(
      deriveAgentJourneyAccessState({
        onboardingComplete: true,
        onboardingStep: 4,
        coreContactReady: true,
        emailVerified: true,
        approvalStatus: 'approved',
        subscriptionStatus: 'expired',
      }),
    ).toEqual({ fullFeaturesUnlocked: false, recommendedNextStep: 'renew_launch_access' });
  });

  it('sends a finished unpaid profile to Launch Access instead of back to setup', () => {
    expect(
      deriveAgentJourneyAccessState({
        onboardingComplete: true,
        onboardingStep: 4,
        coreContactReady: true,
        emailVerified: true,
        approvalStatus: 'approved',
        subscriptionStatus: 'unassigned',
      }),
    ).toEqual({ fullFeaturesUnlocked: false, recommendedNextStep: 'select_package' });
  });

  it('does not call the workspace ready before email and profile approval are complete', () => {
    expect(
      deriveAgentJourneyAccessState({
        onboardingComplete: true,
        onboardingStep: 4,
        coreContactReady: true,
        emailVerified: false,
        approvalStatus: 'approved',
        subscriptionStatus: 'active',
      }),
    ).toEqual({ fullFeaturesUnlocked: false, recommendedNextStep: 'verify_email' });

    expect(
      deriveAgentJourneyAccessState({
        onboardingComplete: true,
        onboardingStep: 4,
        coreContactReady: true,
        emailVerified: true,
        approvalStatus: 'pending',
        subscriptionStatus: 'active',
      }),
    ).toEqual({ fullFeaturesUnlocked: false, recommendedNextStep: 'await_profile_approval' });

    expect(entitlements).toContain("const agentApproved = agent?.status === 'approved'");
    expect(entitlements).toContain('agentApproved &&');
  });
});
