import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { homeQuerySpy } = vi.hoisted(() => ({
  homeQuerySpy: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'property_developer' },
    loading: false,
  }),
}));

vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: null }),
}));

vi.mock('@/hooks/useDeveloperOnboardingStatus', () => ({
  useDeveloperOnboardingStatus: () => ({
    status: { hasProfile: true, profileRejected: false, profileStatus: 'approved' },
    isLoading: false,
  }),
}));

vi.mock('@/components/developer/DeveloperLayout', () => ({
  DeveloperLayout: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/developer/Overview', () => ({ default: () => 'Overview' }));
vi.mock('@/components/developer/DevelopmentsList', () => ({
  default: () => 'Developments list',
}));
vi.mock('@/components/developer/MessagesCenter', () => ({ default: () => 'Messages' }));
vi.mock('@/components/developer/LeadsManager', () => ({ default: () => 'Leads' }));
vi.mock('@/components/developer/SettingsPanel', () => ({ default: () => 'Settings' }));
vi.mock('@/components/developer/TeamManagement', () => ({ default: () => 'Team' }));
vi.mock('@/components/developer/AnalyticsPanel', () => ({ default: () => 'Analytics' }));
vi.mock('@/components/developer/BillingPanel', () => ({ default: () => 'Billing' }));
vi.mock('@/pages/CreateDevelopment', () => ({
  default: () => 'Canonical creation flow',
}));
vi.mock('@/pages/DeveloperPlans', () => ({ default: () => 'Plans' }));
vi.mock('@/pages/DeveloperPublisherPage', () => ({ default: () => 'Catalogue Publisher' }));
vi.mock('@/pages/developer/DevelopmentHome', () => ({
  default: () => {
    homeQuerySpy();
    return 'Development Home';
  },
}));

import DeveloperRoutes from '../DeveloperRoutes';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('Development Home route registration', () => {
  beforeEach(() => {
    homeQuerySpy.mockClear();
    window.history.pushState({}, '', '/developer/developments/new');
  });

  it('routes /new to the canonical creation flow without rendering Development Home or its query', async () => {
    render(createElement(DeveloperRoutes));

    await waitFor(() => {
      expect(screen.getByText('Canonical creation flow')).toBeInTheDocument();
    });

    expect(screen.queryByText('Development Home')).not.toBeInTheDocument();
    expect(homeQuerySpy).not.toHaveBeenCalled();
  });

  it('registers the static creation route before Development Home and the portfolio list', () => {
    const source = readRepoFile('client/src/pages/DeveloperRoutes.tsx');
    const newRoute = source.indexOf('<Route path="/developer/developments/new">');
    const homeRoute = source.indexOf(
      '<Route path="/developer/developments/:developmentId" component={DevelopmentHome} />',
    );
    const listRoute = source.indexOf(
      '<Route path="/developer/developments" component={DevelopmentsList} />',
    );

    expect(newRoute).toBeGreaterThan(-1);
    expect(homeRoute).toBeGreaterThan(newRoute);
    expect(listRoute).toBeGreaterThan(homeRoute);
  });

  it('keeps the Home query behind a positive numeric development ID and defaults the UI range to 30 days', () => {
    const source = readRepoFile('client/src/pages/developer/DevelopmentHome.tsx');

    expect(source).toContain('Number.isInteger(developmentId) && developmentId > 0');
    expect(source).toContain("useState<'7d' | '30d' | '90d'>('30d')");
    expect(source).toContain('{ developmentId, range }');
    expect(source).toContain('if (!hasValidDevelopmentId) return <PrivateNotFound />;');
  });

  it('uses Development Home as the owned portfolio open action while retaining wizard edit navigation', () => {
    const source = readRepoFile('client/src/components/developer/DevelopmentsList.tsx');

    expect(source).toContain('development.nextAction!.href');
    expect(source).toContain(
      'setLocation(`/developer/create-development?id=${development.identity.id}`)',
    );
  });

  it('redirects the retired static performance page to working analytics', () => {
    const routes = readRepoFile('client/src/pages/DeveloperRoutes.tsx');

    expect(routes).toContain('<Route path="/developer/performance">');
    expect(routes).toContain('<Redirect to="/developer/analytics" />');
    expect(routes).not.toContain('DeveloperPerformancePage');
    expect(
      existsSync(path.resolve(process.cwd(), 'client/src/pages/DeveloperPerformancePage.tsx')),
    ).toBe(false);
  });
});
