import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, setLocationMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/agent/dashboard', setLocationMock] }));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, role: 'agent' }, loading: false }),
}));
vi.mock('@/lib/api', () => ({ apiFetch: (...args: unknown[]) => apiFetchMock(...args) }));
vi.mock('@/hooks/useCommercialProductAvailability', () => ({
  useCommercialProductAvailability: () => ({ isAvailable: false, isLoading: false }),
}));

import { useAgentOnboardingStatus } from './useAgentOnboardingStatus';

beforeEach(() => vi.clearAllMocks());

describe('useAgentOnboardingStatus workspace-first', () => {
  it('still redirects an unverified agent to the verify journey', async () => {
    apiFetchMock.mockResolvedValue({ recommendedNextStep: 'verify_email', dashboardUnlocked: false });
    renderHook(() => useAgentOnboardingStatus({ requireDashboardUnlocked: true }));
    await waitFor(() => expect(setLocationMock).toHaveBeenCalledWith('/agent/setup'));
  });

  it('does not redirect a verified, non-entitled agent', async () => {
    apiFetchMock.mockResolvedValue({
      recommendedNextStep: 'select_package',
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
    });
    const { result } = renderHook(() => useAgentOnboardingStatus({ requireDashboardUnlocked: true }));
    await waitFor(() => expect(result.current.status).not.toBeNull());
    expect(setLocationMock).not.toHaveBeenCalled();
  });
});
