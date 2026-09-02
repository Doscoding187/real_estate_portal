import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';

const { onboardingStatusMock, refetchSpy } = vi.hoisted(() => ({
  onboardingStatusMock: vi.fn(),
  refetchSpy: vi.fn(),
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
vi.mock('@/components/developer/BillingPanel', () => ({ default: () => 'Billing' }));
vi.mock('@/pages/CreateDevelopment', () => ({ default: () => 'Create development' }));
vi.mock('@/pages/DeveloperPlans', () => ({ default: () => 'Plans' }));
vi.mock('@/pages/DeveloperPublisherPage', () => ({ default: () => 'Publisher' }));
vi.mock('@/pages/developer/DevelopmentHome', () => ({ default: () => 'Development Home' }));

import DeveloperRoutes from '../DeveloperRoutes';

function approvedStatusState() {
  return {
    status: { hasProfile: true, profileRejected: false, profileStatus: 'approved' },
    isLoading: false,
    isError: false,
    refetch: refetchSpy,
  };
}

beforeEach(() => {
  window.history.pushState({}, '', '/developer/dashboard');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Developer workspace onboarding-status failure handling', () => {
  it('never mistakes a failed status query for a missing organisation', () => {
    onboardingStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      isError: true,
      error: { message: 'Internal Server Error' },
      refetch: refetchSpy,
    });

    render(createElement(DeveloperRoutes));

    expect(screen.getByText('Unable to verify your developer account state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });

  it('recovers into the workspace after a successful retry', async () => {
    onboardingStatusMock.mockReturnValueOnce({
      status: null,
      isLoading: false,
      isError: true,
      error: { message: 'Internal Server Error' },
      refetch: refetchSpy,
    });

    const { rerender } = render(createElement(DeveloperRoutes));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchSpy).toHaveBeenCalledTimes(1);

    onboardingStatusMock.mockReturnValue(approvedStatusState());
    rerender(createElement(DeveloperRoutes));

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });
});
