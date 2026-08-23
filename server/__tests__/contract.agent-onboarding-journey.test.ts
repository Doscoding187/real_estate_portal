import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('agent pre-activation journey truth', () => {
  const service = readRepoFile('server/services/agentOnboardingService.ts');
  const hook = readRepoFile('client/src/hooks/useAgentOnboardingStatus.ts');
  const appRoutes = readRepoFile('client/src/App.tsx');
  const authRoutes = readRepoFile('server/_core/authRoutes.ts');

  it('exposes profile approval state in the onboarding payload', () => {
    expect(service).toContain("approvalStatus: agent?.status ?? 'pending'");
    expect(service).not.toContain('dashboardUnlocked: packageSelected');
  });

  it('advances identity progression without requiring payment first', () => {
    expect(service).not.toContain('let onboardingStep = packageSelected');
    expect(service).toContain('fullFeaturesUnlocked: onboardingComplete && packageSelected');
  });

  it('stops bouncing unpaid agents out of professional-identity surfaces', () => {
    expect(hook).not.toContain("setLocation('/agent/select-package')");
  });

  it('lands email verification inside the setup journey', () => {
    expect(authRoutes).toContain("return '/agent/setup?verified=true';");
    expect(authRoutes).not.toContain("/agent/select-package?verified=true");
  });

  it('preserves return context on the gated agent routes', () => {
    for (const route of ['/agent/dashboard', '/agent/select-package', '/agent/setup']) {
      const segment = appRoutes.slice(appRoutes.indexOf(route));
      expect(segment, route).toContain('unauthenticatedAuthEntry="signin"');
    }
  });
});
