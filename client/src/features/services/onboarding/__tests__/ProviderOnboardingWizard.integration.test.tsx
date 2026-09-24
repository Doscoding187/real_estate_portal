import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
        useQuery: () => ({ data: null, isLoading: false, error: null }),
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
          mutate: () => onSuccess({}),
          isPending: false,
          error: null,
        }),
      },
      replaceProviderLocations: {
        useMutation: ({ onSuccess }: { onSuccess: (data: unknown) => void }) => ({
          mutate: () => onSuccess({}),
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
  it('shows the five-step setup flow', () => {
    render(<ProviderOnboardingWizard />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
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

  it('does not promise paid placement or Explore publishing', () => {
    render(<ProviderOnboardingWizard />);
    expect(screen.queryByText(/paid plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/go live/i)).not.toBeInTheDocument();
  });
});
