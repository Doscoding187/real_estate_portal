/**
 * Integration Test: ProviderOnboardingWizard
 *
 * Asserts that stepping through all 5 wizard steps with mocked mutations
 * reaches the "You're live!" completion screen.
 *
 * Requirements: 12.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock tRPC mutations and status query
// ---------------------------------------------------------------------------

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      myOnboardingStatus: {
        useQuery: () => ({
          data: {
            hasProviderIdentity: false,
            profileConfigured: false,
            servicesConfigured: false,
            locationsConfigured: false,
            onboardingStep: 0,
            dashboardUnlocked: false,
            fullFeaturesUnlocked: false,
            recommendedNextStep: '/service/profile',
            provider: null,
          },
          isLoading: false,
          error: null,
        }),
      },
      myProviderProfile: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
        }),
      },
      registerProviderIdentity: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: () => { onSuccess({}); },
          isPending: false,
          error: null,
        }),
      },
      upsertProviderProfile: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: () => { onSuccess({}); },
          isPending: false,
          error: null,
        }),
      },
      replaceProviderServices: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: () => { onSuccess({}); },
          isPending: false,
          error: null,
        }),
      },
      replaceProviderLocations: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: () => { onSuccess({}); },
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

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { ProviderOnboardingWizard } from '../ProviderOnboardingWizard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clickContinue() {
  const btn = screen.getByRole('button', { name: /continue/i });
  fireEvent.click(btn);
  await waitFor(() => expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProviderOnboardingWizard — integration', () => {
  it('shows Step 1 of 5 on initial render', () => {
    render(<ProviderOnboardingWizard />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('completes all 5 steps and reaches the "You\'re live!" completion screen', async () => {
    render(<ProviderOnboardingWizard />);

    // Step 1: Business Basics — enter company name and continue
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    const companyInput = screen.getByLabelText(/business name/i);
    fireEvent.change(companyInput, { target: { value: 'Acme Plumbing' } });
    await clickContinue();

    // Step 2: Profile Details
    await waitFor(() => expect(screen.getByText('Step 2 of 5')).toBeInTheDocument());
    await clickContinue();

    // Step 3: Services Offered — default row is present, continue
    await waitFor(() => expect(screen.getByText('Step 3 of 5')).toBeInTheDocument());
    // Fill in a service name to enable Continue
    const serviceNameInput = screen.getByPlaceholderText(/geyser replacement/i);
    fireEvent.change(serviceNameInput, { target: { value: 'Plumbing repair' } });
    await clickContinue();

    // Step 4: Coverage Areas — fill city to enable Continue
    await waitFor(() => expect(screen.getByText('Step 4 of 5')).toBeInTheDocument());
    const cityInput = screen.getByPlaceholderText(/johannesburg/i);
    fireEvent.change(cityInput, { target: { value: 'Cape Town' } });
    await clickContinue();

    // Step 5: Subscription Plan — click Go live
    await waitFor(() => expect(screen.getByText('Step 5 of 5')).toBeInTheDocument());
    const goLiveBtn = screen.getByRole('button', { name: /go live/i });
    fireEvent.click(goLiveBtn);

    // Completion screen
    await waitFor(() => {
      expect(screen.getByText("You're live!")).toBeInTheDocument();
    });
  });

  it('renders the WizardProgressIndicator on each step 1–5', async () => {
    render(<ProviderOnboardingWizard />);

    // Step 1
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('does NOT render WizardProgressIndicator on the completion screen', async () => {
    render(<ProviderOnboardingWizard />);

    // Navigate through all steps
    const companyInput = screen.getByLabelText(/business name/i);
    fireEvent.change(companyInput, { target: { value: 'Test Co' } });
    await clickContinue();
    await waitFor(() => screen.getByText('Step 2 of 5'));
    await clickContinue();
    await waitFor(() => screen.getByText('Step 3 of 5'));
    const svcInput = screen.getByPlaceholderText(/geyser replacement/i);
    fireEvent.change(svcInput, { target: { value: 'Electrical' } });
    await clickContinue();
    await waitFor(() => screen.getByText('Step 4 of 5'));
    const cityInput = screen.getByPlaceholderText(/johannesburg/i);
    fireEvent.change(cityInput, { target: { value: 'Durban' } });
    await clickContinue();
    await waitFor(() => screen.getByText('Step 5 of 5'));
    fireEvent.click(screen.getByRole('button', { name: /go live/i }));

    await waitFor(() => screen.getByText("You're live!"));

    // No progress bar on completion screen
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
