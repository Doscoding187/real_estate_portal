import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';

const {
  apiFetchMock,
  agentWorkspaceMock,
  catalogMock,
  commercialActivationMock,
  setLocationMock,
  submitProofMock,
  useAuthMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  agentWorkspaceMock: vi.fn(),
  catalogMock: vi.fn(),
  commercialActivationMock: vi.fn(),
  setLocationMock: vi.fn(),
  submitProofMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/select-package', setLocationMock],
  useSearch: () => '',
}));

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: (...args: unknown[]) => catalogMock(...args),
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
      agentWorkspace: {
        useQuery: (...args: unknown[]) => agentWorkspaceMock(...args),
      },
      submitLaunchAccessPaymentProof: {
        useMutation: (...args: unknown[]) => submitProofMock(...args),
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import AgentPackageSelection, { CommercialAgentPackageSelection } from './AgentPackageSelection';

const product = {
  productId: 'plan:agent_launch_access',
  productKey: 'agent_launch_access',
  displayName: 'Agent Launch Access',
  audience: 'agent',
  benefits: ['Listing creation and management'],
  limits: { max_active_listings: 50 },
  entitlements: { max_active_listings: 50 },
  term: {
    kind: 'paid_launch_access',
    durationDays: 90,
    autoRenews: false,
  },
  pricing: {
    mode: 'fixed',
    billingInterval: 'once',
    basePrice: { amountMinor: 49900, currency: 'ZAR' },
  },
  action: {
    mode: 'request_invoice',
    target: { kind: 'route', value: '/contact' },
  },
  source: { authority: 'canonical_plans', planId: 42, planKey: 'agent_launch_access' },
} as unknown as CommercialProduct;

const invoice = {
  id: 77,
  invoiceNumber: 'PLI-AGENT-77',
  paymentReference: 'PLAG77-TEST',
  amountDue: 49900,
  status: 'issued',
  commercialTermKind: 'paid_launch_access',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({
    user: { id: 7, role: 'agent' },
    loading: false,
  });
  catalogMock.mockReturnValue({
    data: { products: [product] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
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
  agentWorkspaceMock.mockReturnValue({
    data: {
      activeInvoice: null,
      bankDetails: {
        accountName: 'Property Listify Test',
        bankName: 'Local Test Bank',
        accountNumber: '0000000000',
        branchCode: '000000',
        configurationMessage: null,
      },
      proofStorage: { configured: true },
    },
    isLoading: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  });
  submitProofMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  apiFetchMock.mockImplementation((endpoint: string) => {
    if (endpoint === '/agent/onboarding-status') {
      return Promise.resolve({
        packageSelected: false,
        onboardingComplete: false,
        onboardingStep: 0,
        dashboardUnlocked: false,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'select_package',
        subscriptionTier: 'unassigned',
        subscriptionStatus: 'expired',
        trialStartedAt: null,
        trialEndsAt: null,
      });
    }
    return Promise.resolve({
      ownerType: 'agent',
      ownerId: 7,
      invoice,
      paymentReference: invoice.paymentReference,
      reused: false,
      bankDetails: {
        accountName: 'Property Listify Test',
        bankName: 'Local Test Bank',
        accountNumber: '0000000000',
        branchCode: '000000',
        configurationMessage: null,
      },
    });
  });
});

describe('Agent pre-payment preparation', () => {
  it('keeps the direct package route in preparation without loading commercial data', () => {
    render(<AgentPackageSelection />);

    expect(screen.getByTestId('agent-package-preparation')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Prepare your Agent workspace before commercial activation.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.queryByText('Agent Launch Access')).not.toBeInTheDocument();
    expect(screen.queryByText(/manual EFT/i)).not.toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(agentWorkspaceMock).not.toHaveBeenCalled();
    expect(submitProofMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue Agent setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open preparation workspace' }));

    expect(setLocationMock).toHaveBeenNthCalledWith(1, '/agent/setup');
    expect(setLocationMock).toHaveBeenNthCalledWith(2, '/agent/dashboard');
  });

  it('lands a waiting payer on the dashboard while finance verifies the proof', async () => {
    apiFetchMock.mockImplementation((endpoint: string) => {
      if (endpoint === '/agent/onboarding-status') {
        return Promise.resolve({
          packageSelected: true,
          onboardingComplete: true,
          onboardingStep: 4,
          dashboardUnlocked: true,
          fullFeaturesUnlocked: false,
          recommendedNextStep: 'await_payment_review',
          subscriptionTier: 'agent_launch_access',
          subscriptionStatus: 'payment_under_review',
          trialStartedAt: null,
          trialEndsAt: null,
        });
      }
      return Promise.resolve({});
    });

    render(<CommercialAgentPackageSelection agentLaunchAccessAvailable />);

    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith('/agent/dashboard');
    });
  });

  it('does not open individual billing for a current agency member', async () => {
    apiFetchMock.mockImplementation((endpoint: string) => {
      if (endpoint === '/agent/onboarding-status') {
        return Promise.resolve({
          packageSelected: true,
          onboardingComplete: true,
          onboardingStep: 4,
          dashboardUnlocked: true,
          fullFeaturesUnlocked: false,
          recommendedNextStep: 'await_agency_activation',
          subscriptionTier: 'agency_launch_access',
          subscriptionStatus: 'pending_payment',
          commercial: {
            ownerType: 'agency',
            ownerId: 88,
            ownerSource: 'agency_membership',
          },
          trialStartedAt: null,
          trialEndsAt: null,
        });
      }
      return Promise.resolve({});
    });

    render(<CommercialAgentPackageSelection agentLaunchAccessAvailable />);

    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith('/agent/dashboard');
    });

    const options = agentWorkspaceMock.mock.calls.at(-1)?.[1] as { enabled?: boolean };
    expect(options.enabled).toBe(false);
  });

  it('allows corrected proof for a rejected invoice while finance approval remains required', async () => {
    agentWorkspaceMock.mockReturnValue({
      data: {
        activeInvoice: invoice,
        payments: [
          {
            invoiceId: invoice.id,
            state: 'rejected',
            reviewNote: 'Please upload a legible bank-stamped proof.',
            createdAt: '2026-08-01T10:00:00.000Z',
          },
        ],
        bankDetails: {
          accountName: 'Property Listify Test',
          bankName: 'Local Test Bank',
          accountNumber: '0000000000',
          branchCode: '000000',
          configurationMessage: null,
        },
        proofStorage: { configured: true },
      },
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    apiFetchMock.mockImplementation((endpoint: string) => {
      if (endpoint === '/agent/onboarding-status') {
        return Promise.resolve({
          packageSelected: true,
          onboardingComplete: true,
          onboardingStep: 4,
          dashboardUnlocked: true,
          fullFeaturesUnlocked: false,
          recommendedNextStep: 'complete_payment',
          subscriptionTier: 'agent_launch_access',
          subscriptionStatus: 'pending_payment',
          trialStartedAt: null,
          trialEndsAt: null,
        });
      }
      return Promise.resolve({});
    });

    render(<CommercialAgentPackageSelection agentLaunchAccessAvailable />);

    expect(await screen.findByText('What happens next')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit proof for review' })).toBeInTheDocument();
    expect(screen.getByText('Please upload a legible bank-stamped proof.')).toBeInTheDocument();
  });

  it('opens the mounted paid workflow only for the effective Agent product decision', async () => {
    commercialActivationMock.mockReturnValue({
      data: {
        enabled: true,
        productAvailability: {
          agent_launch_access: true,
          agency_launch_access: false,
          developer_launch_access: false,
        },
      },
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgentPackageSelection />);

    expect(await screen.findByText('You selected Agent Launch Access.')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-package-preparation')).not.toBeInTheDocument();
  });

  it('keeps the Agent workflow closed when another product is available instead', () => {
    commercialActivationMock.mockReturnValue({
      data: {
        enabled: true,
        productAvailability: {
          agent_launch_access: false,
          agency_launch_access: true,
          developer_launch_access: false,
        },
      },
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgentPackageSelection />);

    expect(screen.getByTestId('agent-package-preparation')).toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
  });

  it('keeps paid actions closed while the effective product decision is loading', () => {
    commercialActivationMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgentPackageSelection />);

    expect(screen.getByTestId('agent-package-preparation')).toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
  });

  it('keeps paid actions closed and offers a retry when the product decision fails', () => {
    commercialActivationMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<AgentPackageSelection />);

    expect(screen.getByTestId('agent-package-preparation')).toBeInTheDocument();
    expect(
      screen.getByText('Agent Launch Access could not be verified, so paid actions remain unavailable.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
  });
});
