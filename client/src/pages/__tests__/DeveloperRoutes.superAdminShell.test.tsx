import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('wouter', async importOriginal => {
  const actual = await importOriginal<typeof import('wouter')>();
  return {
    ...actual,
    Redirect: ({ to }: { to: string }) => {
      redirectMock(to);
      return null;
    },
  };
});

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => authMock() }));
vi.mock('@/hooks/useDeveloperOnboardingStatus', () => ({
  useDeveloperOnboardingStatus: () => ({
    status: { hasProfile: true, profileRejected: false, profileStatus: 'approved' },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/developer/DeveloperLayout', () => ({
  DeveloperLayout: ({ children }: { children: ReactNode }) =>
    createElement('div', null, 'Developer layout', children),
}));
vi.mock('@/components/developer/Overview', () => ({ default: () => 'Overview' }));
vi.mock('@/components/developer/DevelopmentsList', () => ({ default: () => 'Developments' }));
vi.mock('@/components/developer/LeadsManager', () => ({ default: () => 'Leads' }));
vi.mock('@/components/developer/SettingsPanel', () => ({ default: () => 'Settings' }));
vi.mock('@/components/developer/TeamManagement', () => ({ default: () => 'Team' }));
vi.mock('@/components/developer/AnalyticsPanel', () => ({ default: () => 'Analytics' }));
vi.mock('@/components/developer/BillingPanel', () => ({ default: () => 'Billing' }));
vi.mock('@/pages/CreateDevelopment', () => ({ default: () => 'Create development' }));
vi.mock('@/pages/DeveloperPlans', () => ({ default: () => 'Plans' }));
vi.mock('@/pages/DeveloperPublisherPage', () => ({ default: () => 'Publisher' }));
vi.mock('@/pages/developer/DevelopmentHome', () => ({ default: () => 'Development Home' }));

import DeveloperRoutes from '../DeveloperRoutes';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('super admin inside /developer/*', () => {
  it('sends the wizard to the admin route with the query preserved', () => {
    authMock.mockReturnValue({ user: { id: 1, role: 'super_admin' }, loading: false });
    window.history.pushState({}, '', '/developer/create-development?id=5&cataloguePublisherId=9');
    render(createElement(DeveloperRoutes));
    expect(redirectMock).toHaveBeenCalledWith(
      '/admin/publisher/developments/new?id=5&cataloguePublisherId=9',
    );
    expect(screen.queryByText('Developer layout')).not.toBeInTheDocument();
  });

  it('sends every other developer URL to /admin', () => {
    authMock.mockReturnValue({ user: { id: 1, role: 'super_admin' }, loading: false });
    window.history.pushState({}, '', '/developer/subscription');
    render(createElement(DeveloperRoutes));
    expect(redirectMock).toHaveBeenCalledWith('/admin');
    expect(screen.queryByText('Developer layout')).not.toBeInTheDocument();
  });

  it('keeps the developer layout for a real developer', () => {
    authMock.mockReturnValue({ user: { id: 2, role: 'property_developer' }, loading: false });
    window.history.pushState({}, '', '/developer/create-development?draftId=4');
    render(createElement(DeveloperRoutes));
    expect(screen.getByText(/Developer layout/)).toBeInTheDocument();
    expect(screen.getByText(/Create development/)).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
