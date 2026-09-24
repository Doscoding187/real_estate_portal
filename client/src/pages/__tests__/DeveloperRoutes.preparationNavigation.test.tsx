import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { onboardingStatusMock } = vi.hoisted(() => ({
  onboardingStatusMock: vi.fn(),
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
  useDeveloperOnboardingStatus: (...args: unknown[]) => onboardingStatusMock(...args),
}));

vi.mock('@/hooks/useCommercialProductAvailability', () => ({
  useCommercialProductAvailability: () => ({
    isAvailable: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/developer/DeveloperLayout', () => ({
  DeveloperLayout: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/developer/Overview', () => ({ default: () => 'Overview' }));
vi.mock('@/components/developer/DevelopmentsList', () => ({ default: () => 'Developments' }));
vi.mock('@/components/developer/MessagesCenter', () => ({ default: () => 'Messages' }));
vi.mock('@/components/developer/LeadsManager', () => ({ default: () => 'Leads' }));
vi.mock('@/components/developer/SettingsPanel', () => ({ default: () => 'Settings' }));
vi.mock('@/components/developer/TeamManagement', () => ({ default: () => 'Team' }));
vi.mock('@/components/developer/AnalyticsPanel', () => ({ default: () => 'Analytics' }));
vi.mock('@/components/developer/BillingPanel', () => ({ default: () => 'Billing preparation' }));
vi.mock('@/pages/CreateDevelopment', () => ({ default: () => 'Create development' }));
vi.mock('@/pages/DeveloperPlans', () => ({ default: () => 'Plans' }));
vi.mock('@/pages/DeveloperPublisherPage', () => ({ default: () => 'Publisher' }));
vi.mock('@/pages/developer/DevelopmentHome', () => ({ default: () => 'Development Home' }));

import DeveloperRoutes from '../DeveloperRoutes';

beforeEach(() => {
  onboardingStatusMock.mockReturnValue({
    status: { hasProfile: true, profileRejected: false, profileStatus: 'pending' },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Developer preparation navigation', () => {
  it.each(['/developer/subscription', '/developer/settings/subscription'])(
    'keeps a pending organisation on the safe preparation route for %s',
    pathname => {
      window.history.pushState({}, '', pathname);

      render(createElement(DeveloperRoutes));

      expect(screen.getByText('Billing preparation')).toBeInTheDocument();
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    },
  );
});
