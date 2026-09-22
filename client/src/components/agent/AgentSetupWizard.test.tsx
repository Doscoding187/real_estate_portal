import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiFetchMock,
  commercialActivationMock,
  profileQueryMock,
  publishProfileMutationMock,
  saveProfileMutationMock,
  saveProfileMutateAsyncMock,
  setLocationMock,
  toastErrorMock,
  toastSuccessMock,
  uploadMutationMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  commercialActivationMock: vi.fn(),
  profileQueryMock: vi.fn(),
  publishProfileMutationMock: vi.fn(),
  saveProfileMutationMock: vi.fn(),
  saveProfileMutateAsyncMock: vi.fn(),
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
    billing: {
      commercialActivation: {
        useQuery: (...args: unknown[]) => commercialActivationMock(...args),
      },
    },
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
  LocationAutocomplete: ({ onLocationSelect }: { onLocationSelect: (location: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onLocationSelect({
          id: 34,
          name: 'Sandton',
          type: 'suburb',
          cityName: 'Johannesburg',
          provinceName: 'Gauteng',
          canonicalLocationId: 'suburb:34',
        })
      }
    >
      Select Sandton coverage
    </button>
  ),
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
  commercialActivationMock.mockReturnValue({
    data: {
      enabled: false,
      productAvailability: {
        agent_launch_access: false,
        agency_launch_access: false,
        developer_launch_access: false,
      },
    },
    isError: false,
    refetch: vi.fn(),
  });
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
  saveProfileMutateAsyncMock.mockResolvedValue({});
  saveProfileMutationMock.mockReturnValue({
    data: null,
    isPending: false,
    mutateAsync: saveProfileMutateAsyncMock,
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
  it('opens the preparation workspace after profile completion without forcing payment', async () => {
    apiFetchMock.mockResolvedValue({ recommendedNextStep: 'select_package' });
    render(<AgentSetupWizard />);
    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Setup' }));
    await waitFor(() => expect(setLocationMock).toHaveBeenCalledWith('/agent/dashboard'));
    expect(setLocationMock).not.toHaveBeenCalledWith('/agent/select-package');
  });
  it('submits a typed canonical coverage identity instead of its display label', async () => {
    render(<AgentSetupWizard />);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Sandton coverage' }));
    expect(screen.getByText('Sandton, Johannesburg, Gauteng')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() =>
      expect(saveProfileMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ areasServed: ['suburb:34'] }),
      ),
    );
  });

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

  it('saves a corrected rejected profile without trying to republish it', async () => {
    profileQueryMock.mockReturnValue({
      data: {
        agent: {
          displayName: 'Test Agent',
          phone: '+27820000000',
          socialLinks: {},
          areasServed: [],
          status: 'rejected',
        },
        entitlements: { profileCompletionScore: 100 },
      },
      isLoading: false,
    });
    const publishProfile = vi.fn();
    publishProfileMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: publishProfile,
    });

    render(<AgentSetupWizard />);

    expect(
      screen.getByText(/rejected status remains in place until an authorised reviewer/i),
    ).toBeInTheDocument();
    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Setup' }));

    await waitFor(() => expect(setLocationMock).toHaveBeenCalledWith('/agent/dashboard'));
    expect(saveProfileMutateAsyncMock).toHaveBeenCalled();
    expect(publishProfile).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Your corrected profile has been saved. It remains rejected until an authorised reviewer reconsiders it.',
    );
  });
});
