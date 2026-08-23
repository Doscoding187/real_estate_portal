import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';

const {
  apiFetchMock,
  agentWorkspaceMock,
  catalogMock,
  setLocationMock,
  submitProofMock,
  useAuthMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  agentWorkspaceMock: vi.fn(),
  catalogMock: vi.fn(),
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
    success: vi.fn(),
  },
}));

import AgentPackageSelection from './AgentPackageSelection';

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

describe('Agent paid Launch Access conversion', () => {
  it('requests the canonical invoice and exposes EFT/proof handoff in place', async () => {
    render(<AgentPackageSelection />);

    const requestButton = await screen.findByRole('button', {
      name: /Get Agent Launch Access/i,
    });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/agent/request-launch-access-invoice',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ planId: 42 }),
        }),
      );
    });

    expect(setLocationMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/PLI-AGENT-77/)).toBeInTheDocument();
    expect(screen.getByText('Manual EFT instructions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit proof for review' })).toBeInTheDocument();
  });
});
