import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockStatus = vi.fn();
const mockProfile = vi.fn();
const mockProfileLoading = vi.fn(() => false);
const mockReplaceServices = vi.fn();
const mockReplaceLocations = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      myOnboardingStatus: {
        useQuery: () => ({
          data: mockStatus(),
          isLoading: false,
          error: null,
        }),
      },
      myProviderProfile: {
        useQuery: () => ({ data: mockProfile(), isLoading: mockProfileLoading(), error: null }),
      },

      registerProviderIdentity: {
        useMutation: ({ onSuccess }: { onSuccess: (data: unknown) => void }) => ({
          mutate: () => onSuccess({}),
          isPending: false,
          error: null,
        }),
      },
      upsertProviderProfile: {
        useMutation: ({ onSuccess }: { onSuccess: (data: unknown) => void }) => ({
          mutate: () => onSuccess({}),
          isPending: false,
          error: null,
        }),
      },
      replaceProviderServices: {
        useMutation: ({ onSuccess }: { onSuccess: (data: unknown) => void }) => ({
          mutate: (input: unknown) => {
            mockReplaceServices(input);
            onSuccess({});
          },
          isPending: false,
          error: null,
        }),
      },
      replaceProviderLocations: {
        useMutation: ({ onSuccess }: { onSuccess: (data: unknown) => void }) => ({
          mutate: (input: unknown) => {
            mockReplaceLocations(input);
            onSuccess({});
          },
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: 1, role: 'service_provider', name: 'Test Provider', email: 'test@example.com' },
  }),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/service/profile', vi.fn()],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

import { ProviderOnboardingWizard } from '../ProviderOnboardingWizard';

async function clickContinue() {
  const button = screen.getByRole('button', { name: /continue/i });
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument(),
  );
}

describe('ProviderOnboardingWizard', () => {
  beforeEach(() => {
    mockStatus.mockReset();
    mockProfile.mockReset();
    mockProfileLoading.mockReset();
    mockProfileLoading.mockReturnValue(false);
    mockReplaceServices.mockReset();

    mockReplaceLocations.mockReset();
    mockStatus.mockReturnValue({
      hasProviderIdentity: false,
      profileConfigured: false,
      servicesConfigured: false,
      locationsConfigured: false,
      onboardingStep: 0,
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: '/service/profile',
      provider: null,
    });
    mockProfile.mockReturnValue(null);
  });

  it('shows the five-step setup flow', () => {
    render(<ProviderOnboardingWizard />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('does not expose editable steps while an existing profile is still hydrating', () => {
    mockStatus.mockReturnValue({
      hasProviderIdentity: true,
      profileConfigured: true,
      servicesConfigured: false,
      locationsConfigured: false,
      onboardingStep: 2,
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: '/service/profile',
      provider: null,
    });
    mockProfileLoading.mockReturnValue(true);

    render(<ProviderOnboardingWizard />);

    expect(screen.getByText(/loading your provider profile/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('completes setup with a truthful directory-review state', async () => {
    render(<ProviderOnboardingWizard />);

    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: 'Acme Plumbing' },
    });
    await clickContinue();
    await waitFor(() => expect(screen.getByText('Step 2 of 5')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: 'Clear property services' },
    });
    fireEvent.change(screen.getByLabelText(/about your business/i), {
      target: { value: 'We provide clear property services.' },
    });
    fireEvent.change(screen.getByLabelText(/contact email/i), {
      target: { value: 'hello@acme.example' },
    });
    await clickContinue();

    await waitFor(() => expect(screen.getByText('Step 3 of 5')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/geyser replacement/i), {
      target: { value: 'Plumbing repair' },
    });
    await clickContinue();
    await waitFor(() => expect(screen.getByText('Step 4 of 5')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/johannesburg/i), {
      target: { value: 'Cape Town' },
    });
    await clickContinue();
    await waitFor(() => expect(screen.getByText('Step 5 of 5')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }));

    await waitFor(() => {
      expect(screen.getByText('Profile setup complete')).toBeInTheDocument();
    });
    expect(screen.getByText(/not publicly published yet/i)).toBeInTheDocument();
  });

  it('does not render editable steps before existing profile hydration completes', () => {
    mockStatus.mockReturnValue({
      hasProviderIdentity: true,
      profileConfigured: true,
      servicesConfigured: false,
      locationsConfigured: false,
      onboardingStep: 2,
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: '/service/profile',
      provider: null,
    });
    mockProfileLoading.mockReturnValue(true);

    render(<ProviderOnboardingWizard />);

    expect(screen.getByText(/loading your provider profile/i)).toBeInTheDocument();
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
  });

  it('hydrates existing service and location metadata before editing', async () => {
    mockStatus.mockReturnValue({
      hasProviderIdentity: true,
      profileConfigured: true,
      servicesConfigured: false,
      locationsConfigured: false,
      onboardingStep: 2,
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: '/service/profile',
      provider: null,
    });
    mockProfile.mockReturnValue({
      companyName: 'Existing Provider',
      headline: 'Existing headline',
      bio: 'Existing bio',
      contactEmail: 'hello@example.com',
      contactPhone: '',
      websiteUrl: '',
      services: [
        {
          id: 41,
          code: 'plumbing',
          displayName: 'Plumbing repairs',
          description: 'Existing description',
          category: 'home_improvement',
          minPrice: 250,
          maxPrice: 900,
          currency: 'ZAR',
          isActive: false,
        },
      ],
      locations: [
        {
          id: 51,
          suburb: 'Sandton',
          city: 'Johannesburg',
          province: 'Gauteng',
          countryCode: 'ZA',
          postalCode: '2196',
          radiusKm: 40,
          isPrimary: true,
        },
      ],
    });

    render(<ProviderOnboardingWizard />);
    await waitFor(() => expect(screen.getByText('Step 3 of 5')).toBeInTheDocument());
    expect(screen.getByLabelText(/service name/i)).toHaveValue('Plumbing repairs');
    const activeToggle = screen.getByLabelText(/available for requests/i);
    expect(activeToggle).not.toBeChecked();
    fireEvent.click(activeToggle);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText('Step 4 of 5')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(mockReplaceServices).toHaveBeenCalled());
    expect(mockReplaceServices.mock.calls[0]?.[0]).toEqual({
      services: [
        expect.objectContaining({
          id: 41,
          code: 'plumbing',
          description: 'Existing description',
          minPrice: 250,
          maxPrice: 900,
          currency: 'ZAR',
          isActive: true,
        }),
      ],
    });
    expect(mockReplaceLocations.mock.calls[0]?.[0]).toEqual({
      locations: [
        expect.objectContaining({
          id: 51,
          countryCode: 'ZA',
          postalCode: '2196',
          radiusKm: 40,
          isPrimary: true,
        }),
      ],
    });
  });

  it('lets a provider remove a persisted service and persisted coverage area', async () => {
    mockStatus.mockReturnValue({
      hasProviderIdentity: true,
      profileConfigured: true,
      servicesConfigured: false,
      locationsConfigured: false,
      onboardingStep: 2,
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: '/service/profile',
      provider: null,
    });
    mockProfile.mockReturnValue({
      companyName: 'Existing Provider',
      headline: 'Existing headline',
      bio: 'Existing bio',
      contactEmail: 'hello@example.com',
      contactPhone: '',
      websiteUrl: '',
      services: [
        {
          id: 41,
          code: 'plumbing',
          displayName: 'Plumbing repairs',
          description: 'Existing description',
          category: 'home_improvement',
          minPrice: 250,
          maxPrice: 900,
          currency: 'ZAR',
          isActive: true,
        },
        {
          id: 42,
          code: 'electrical',
          displayName: 'Electrical work',
          description: '',
          category: 'home_improvement',
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: true,
        },
      ],
      locations: [
        {
          id: 51,
          suburb: 'Sandton',
          city: 'Johannesburg',
          province: 'Gauteng',
          countryCode: 'ZA',
          postalCode: '2196',
          radiusKm: 40,
          isPrimary: true,
        },
        {
          id: 52,
          suburb: 'Arcadia',
          city: 'Pretoria',
          province: 'Gauteng',
          countryCode: 'ZA',
          postalCode: '0008',
          radiusKm: 20,
          isPrimary: false,
        },
      ],
    });

    render(<ProviderOnboardingWizard />);
    await waitFor(() => expect(screen.getByText('Step 3 of 5')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Remove service 2' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText('Step 4 of 5')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Remove area 2' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(mockReplaceServices).toHaveBeenCalled());
    expect(mockReplaceServices.mock.calls[0]?.[0]).toEqual({
      services: [expect.objectContaining({ id: 41, code: 'plumbing' })],
    });
    await waitFor(() => expect(mockReplaceLocations).toHaveBeenCalled());
    expect(mockReplaceLocations.mock.calls[0]?.[0]).toEqual({
      locations: [expect.objectContaining({ id: 51, suburb: 'Sandton' })],
    });
  });

  it('does not promise paid placement or Explore publishing', () => {
    render(<ProviderOnboardingWizard />);
    expect(screen.queryByText(/paid plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/go live/i)).not.toBeInTheDocument();
  });
});
