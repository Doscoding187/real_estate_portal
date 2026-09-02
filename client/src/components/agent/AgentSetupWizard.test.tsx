import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiFetchMock,
  profileQueryMock,
  publishProfileMutationMock,
  saveProfileMutationMock,
  setLocationMock,
  toastErrorMock,
  toastSuccessMock,
  uploadMutationMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  profileQueryMock: vi.fn(),
  publishProfileMutationMock: vi.fn(),
  saveProfileMutationMock: vi.fn(),
  setLocationMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  uploadMutationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/setup', setLocationMock],
  useSearch: () => '',
}));

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getMyProfileOnboarding: {
        useQuery: (...args: unknown[]) => profileQueryMock(...args),
      },
      updateMyProfileOnboarding: {
        useMutation: (...args: unknown[]) => saveProfileMutationMock(...args),
      },
      publishProfile: {
        useMutation: (...args: unknown[]) => publishProfileMutationMock(...args),
      },
    },
    upload: {
      presign: {
        useMutation: (...args: unknown[]) => uploadMutationMock(...args),
      },
    },
  },
}));

vi.mock('@/components/location/LocationAutocomplete', () => ({
  LocationAutocomplete: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    loading: vi.fn(),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

import { AgentSetupWizard } from './AgentSetupWizard';

beforeEach(() => {
  vi.clearAllMocks();
  profileQueryMock.mockReturnValue({
    data: {
      agent: {
        displayName: 'Test Agent',
        phone: '+27820000000',
        socialLinks: {},
        areasServed: [],
      },
      entitlements: { profileCompletionScore: 100 },
    },
    isLoading: false,
  });
  saveProfileMutationMock.mockReturnValue({
    data: null,
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({}),
  });
  publishProfileMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({ isPublic: true }),
  });
  uploadMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
});

describe('AgentSetupWizard completion', () => {
  it('hands off to a retryable dashboard state when the post-save status lookup fails', async () => {
    apiFetchMock.mockRejectedValue(new Error('Status service unavailable'));

    render(<AgentSetupWizard />);

    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Setup' }));

    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith('/agent/dashboard');
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Your public profile is now live. Opening your workspace so you can continue.',
    );
    expect(toastErrorMock).toHaveBeenCalledWith(
      'We could not confirm your next setup step. Your workspace will let you retry shortly.',
    );
  });
});
