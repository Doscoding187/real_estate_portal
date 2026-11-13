import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  profile: { current: null as Record<string, any> | null },
  places: { results: [] as unknown[] },
  saveServices: vi.fn(),
  refetchProfile: vi.fn(),
  serviceMutationOptions: { current: null as Record<string, any> | null },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      myProviderProfile: {
        useQuery: () => ({
          data: mocks.profile.current,
          isLoading: false,
          isFetching: false,
          refetch: mocks.refetchProfile,
        }),
      },
      registerProviderIdentity: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      upsertProviderProfile: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      replaceProviderServices: {
        useMutation: (options: Record<string, any>) => {
          mocks.serviceMutationOptions.current = options;
          return {
            mutate: (input: unknown) => {
              mocks.saveServices(input);
              options.onSuccess?.([]);
            },
            isPending: false,
          };
        },
      },
      replaceProviderLocations: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    placeAuthority: {
      resolveSearchPlaces: {
        useQuery: () => ({ data: mocks.places, isLoading: false }),
      },
    },
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 7, role: 'service_provider', name: 'Provider Co', email: 'provider@example.test' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useServiceProviderOnboardingStatus', () => ({
  useServiceProviderOnboardingStatus: () => ({
    status: { hasProviderIdentity: true, profileConfigured: true, dashboardUnlocked: true },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/service/profile', vi.fn()] }));
vi.mock('@/components/services/ProNavigation', () => ({ ProNavigation: () => null }));
vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: () => null,
}));
vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import ProProfilePage from './ProProfilePage';

describe('ProProfilePage service-description editing', () => {
  beforeEach(() => {
    mocks.profile.current = {
      providerId: 44,
      companyName: 'Provider Co',
      verificationStatus: 'pending',
      isPublished: false,
      publicationStatus: 'pending_review',
      headline: 'Property repairs',
      bio: 'Local property repair team.',
      services: [
        {
          id: 11,
          code: 'plumbing',
          category: 'home_improvement',
          displayName: 'Plumbing repairs',
          description: 'Old service description.',
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: true,
        },
      ],
      locations: [],
    };
    mocks.saveServices.mockReset();
    mocks.refetchProfile.mockReset();
    mocks.serviceMutationOptions.current = null;
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it('loads, saves and refreshes the provider-owned service description', async () => {
    render(<ProProfilePage />);

    const description = await screen.findByRole('textbox', {
      name: 'Service description for Plumbing repairs',
    });
    expect(description).toHaveValue('Old service description.');
    expect(description).toHaveAttribute('maxLength', '2000');

    fireEvent.change(description, {
      target: { value: 'Repairs taps, water lines and household pipework.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save services' }));

    expect(mocks.saveServices).toHaveBeenCalledWith({
      services: [
        expect.objectContaining({
          id: 11,
          code: 'plumbing',
          description: 'Repairs taps, water lines and household pipework.',
        }),
      ],
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Services updated');
    expect(mocks.refetchProfile).toHaveBeenCalled();
  });

  it('communicates a failed service save', async () => {
    render(<ProProfilePage />);
    await screen.findByRole('textbox', { name: 'Service description for Plumbing repairs' });
    fireEvent.click(screen.getByRole('button', { name: 'Save services' }));

    mocks.serviceMutationOptions.current?.onError?.({ message: 'Service save failed.' });
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Service save failed.'));
  });
});
