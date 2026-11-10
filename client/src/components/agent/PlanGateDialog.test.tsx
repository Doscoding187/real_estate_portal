import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  availabilityMock,
  catalogMock,
  workspaceMock,
  submitMock,
  legalChoiceMock,
  requestMock,
  toastMock,
} = vi.hoisted(() => ({
  legalChoiceMock: vi.fn(),
  requestMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  submitMock: vi.fn(),
  workspaceMock: vi.fn(),
  availabilityMock: vi.fn(),
  catalogMock: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/hooks/useCommercialProductAvailability', () => ({
  useCommercialProductAvailability: () => availabilityMock(),
}));
vi.mock('@/hooks/useCommercialCatalog', () => ({ useCommercialCatalog: () => catalogMock() }));
vi.mock('@/hooks/usePaidLegalAcceptance', () => ({
  usePaidLegalAcceptance: () => ({ choice: legalChoiceMock(), reload: vi.fn() }),
}));
vi.mock('@/hooks/useAgentLaunchInvoiceRequest', () => ({
  useAgentLaunchInvoiceRequest: () => ({
    requestInvoice: requestMock,
    isRequestingInvoice: false,
    invoiceResponse: null,
    setInvoiceResponse: vi.fn(),
  }),
}));
vi.mock('@/components/commercial/PaidCommitmentDisclosure', () => ({
  PaidCommitmentDisclosure: () => <div>Commitment disclosure</div>,
}));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, role: 'agent', name: 'Ada Agent', email: 'ada@example.test' } }),
}));
vi.mock('@/components/billing/EftPaymentNoticeForm', () => ({
  usePaymentNoticeRequest: () => ({
    paymentNoticeRequest: (notice: unknown) => notice,
    resetPaymentNoticeRequest: vi.fn(),
  }),
}));
vi.mock('@/lib/commercialCatalog', () => ({
  getCommercialPresentationLimits: () => [],
  getCommercialPricePresentation: () => ({ label: 'R999', period: null }),
  formatCommercialLimitLabel: (k: string) => k,
  formatCommercialLimitValue: (v: unknown) => String(v),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    billing: {
      agentWorkspace: { useQuery: () => workspaceMock() },
      submitLaunchAccessPaymentNotice: {
        useMutation: () => ({ mutateAsync: submitMock, isPending: false }),
      },
    },
  },
}));

import { PlanGateDialog } from './PlanGateDialog';
import { getAccessStep, getPayerDisplayName, localDateIso } from './AgentAccessPanel';

const product = {
  audience: 'agent',
  productKey: 'agent_launch_access',
  displayName: 'Agent Launch Access',
  term: { kind: 'paid_launch_access' },
  benefits: ['Publish listings'],
  pricing: { basePrice: { amountMinor: 99900, currency: 'ZAR' } },
  source: { planId: 5 },
};

beforeEach(() => {
  vi.clearAllMocks();
  legalChoiceMock.mockReturnValue({ accepted: true });
  workspaceMock.mockReturnValue({ data: undefined, refetch: vi.fn() });
  availabilityMock.mockReturnValue({ isAvailable: true, salesPaused: false, isLoading: false });
  catalogMock.mockReturnValue({
    data: { products: [product] },
    isLoading: false,
    refetch: vi.fn(),
  });
});
afterEach(() => cleanup());

describe('PlanGateDialog', () => {
  it('shows step 1 with product, price, term, stepper and the payment reference button', () => {
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Agent Launch Access')).toBeInTheDocument();
    expect(screen.getByText('R999')).toBeInTheDocument();
    expect(screen.getByText(/Once-off, 90 days, no auto-renewal/)).toBeInTheDocument();
    expect(screen.getByText('Publish listings')).toBeInTheDocument();
    expect(screen.getByText('Commitment disclosure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get my payment reference' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Your plan');
    expect(screen.getAllByRole('listitem').filter(li => li.hasAttribute('data-step'))).toHaveLength(
      3,
    );
    expect(document.body.textContent).not.toMatch(/invoice/i);
  });

  it.each([
    ['issued', 2, 'Make payment'],
    ['submitted', 3, 'Finance review'],
  ])('opens directly at the right step for an existing %s invoice', (status, step, heading) => {
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status, paymentReference: 'PLI-REF-9', amountDue: 99900 },
        bankDetails: {
          bankName: 'Test Bank',
          accountName: 'Property Listify',
          accountNumber: '123',
          branchCode: '456',
        },
        payments: [],
      },
      refetch: vi.fn(),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('agent-access-panel')).toHaveAttribute('data-step', String(step));
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(
      (document.body.textContent || '').replace('we email you a paid invoice', ''),
    ).not.toMatch(/invoice/i);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    if (step === 2) {
      expect(screen.getByTestId('payment-reference')).toHaveTextContent('PLI-REF-9');
      expect(
        screen.getByText('Use this exact reference. It identifies your account.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy payment reference' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy account number' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy branch code' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy bank name' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy account holder' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy amount' })).toBeInTheDocument();
    } else {
      expect(
        screen.getByText(/matching your payment to your reference, usually within 1 business day/),
      ).toBeInTheDocument();
      expect(screen.getByText(/we email you a paid invoice/)).toBeInTheDocument();
      expect(screen.getByText('Under review')).toBeInTheDocument();
    }
  });

  it('sends the notice in one click with an automatic name and date', async () => {
    submitMock.mockResolvedValue({});
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'issued', paymentReference: 'PLI-REF-9', amountDue: 99900 },
        bankDetails: {},
        payments: [],
      },
      refetch: vi.fn().mockResolvedValue(undefined),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'I’ve paid' }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][0]).toEqual({
      invoiceId: 9,
      payerName: 'Ada Agent',
      paymentDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('shows a rejected payment reason at step 2', () => {
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'issued', paymentReference: 'PLI-REF-9', amountDue: 99900 },
        bankDetails: {},
        payments: [{ invoiceId: 9, state: 'rejected', reviewNote: 'Amount did not match.' }],
      },
      refetch: vi.fn(),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Amount did not match.')).toBeInTheDocument();
  });

  it('shows a calm notice when paid sales are closed', () => {
    availabilityMock.mockReturnValue({ isAvailable: false, salesPaused: true, isLoading: false });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Paid plans open soon')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Get my payment reference' }),
    ).not.toBeInTheDocument();
  });
});

describe('plan gate details', () => {
  it('keeps the payment reference button disabled until the terms are accepted', () => {
    legalChoiceMock.mockReturnValue(null);
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Get my payment reference' })).toBeDisabled();
  });

  it('disables the payment reference button for blocked journey states', () => {
    render(<PlanGateDialog open onOpenChange={vi.fn()} blockedReason="Contact support." />);
    expect(screen.getByRole('button', { name: 'Get my payment reference' })).toBeDisabled();
    expect(screen.getByText('Contact support.')).toBeInTheDocument();
  });

  it('requests a payment reference once on a double click', async () => {
    let release: () => void = () => {};
    requestMock.mockImplementation(() => new Promise<void>(r => (release = r)));
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Get my payment reference' });
    button.click();
    button.click();
    expect(requestMock).toHaveBeenCalled();
    release();
  });

  it('sends the paid notice once on a double click', async () => {
    let release: (v: unknown) => void = () => {};
    submitMock.mockImplementation(() => new Promise(r => (release = r)));
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'issued', paymentReference: 'R', amountDue: 1 },
        bankDetails: {},
        payments: [],
      },
      refetch: vi.fn().mockResolvedValue(undefined),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'I’ve paid' });
    button.click();
    button.click();
    expect(submitMock).toHaveBeenCalledTimes(1);
    release({});
  });

  it('shows an error toast when copying fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'issued', paymentReference: 'R', amountDue: 1 },
        bankDetails: {},
        payments: [],
      },
      refetch: vi.fn(),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy payment reference' }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
  });

  it('maps every invoice status explicitly', () => {
    expect(getAccessStep('draft', false)).toBe(1);
    expect(getAccessStep('issued', false)).toBe(2);
    expect(getAccessStep('partially_paid', false)).toBe(2);
    expect(getAccessStep('overdue', false)).toBe(2);
    expect(getAccessStep('submitted', false)).toBe(3);
    expect(getAccessStep('paid', false)).toBe('active');
    expect(getAccessStep('void', false)).toBe(1);
    expect(getAccessStep('cancelled', false)).toBe(1);
    expect(getAccessStep('expired', false)).toBe(1);
    expect(getAccessStep(undefined, false)).toBe(1);
  });

  it('goes back to step 1 for a void invoice and shows active for a paid one', () => {
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'void', paymentReference: 'R', amountDue: 1 },
        bankDetails: {},
        payments: [],
      },
      refetch: vi.fn(),
    });
    const { unmount } = render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Get my payment reference' })).toBeInTheDocument();
    unmount();
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'paid', paymentReference: 'R', amountDue: 1 },
        bankDetails: {},
        payments: [],
      },
      refetch: vi.fn(),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('agent-access-active')).toBeInTheDocument();
  });

  it('falls back from display name to email local part to a generic name', () => {
    expect(getPayerDisplayName({ name: ' Ada ', email: 'x@y.z' })).toBe('Ada');
    expect(getPayerDisplayName({ name: '', email: 'ada.l@example.test' })).toBe('ada.l');
    expect(getPayerDisplayName(null)).toBe('Agent');
    expect(localDateIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('existing payment reference when sales are paused or blocked', () => {
  const withInvoice = () =>
    workspaceMock.mockReturnValue({
      data: {
        activeInvoice: { id: 9, status: 'issued', paymentReference: 'PLI-REF-9', amountDue: 99900 },
        bankDetails: { bankName: 'Test Bank' },
        payments: [],
      },
      refetch: vi.fn(),
    });

  it('still shows the reference and hides I’ve paid when sales are paused', () => {
    availabilityMock.mockReturnValue({ isAvailable: false, salesPaused: true, isLoading: false });
    withInvoice();
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('payment-reference')).toHaveTextContent('PLI-REF-9');
    expect(screen.queryByRole('button', { name: 'I’ve paid' })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Already paid\? Finance matches payments by your reference/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Paid plans open soon')).not.toBeInTheDocument();
  });

  it('still shows the reference and hides I’ve paid when the journey is blocked', () => {
    withInvoice();
    render(<PlanGateDialog open onOpenChange={vi.fn()} blockedReason="Contact support." />);
    expect(screen.getByTestId('payment-reference')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I’ve paid' })).not.toBeInTheDocument();
    expect(screen.getByText('Contact support.')).toBeInTheDocument();
  });

  it('shows Paid plans open soon only when there is no payment reference', () => {
    availabilityMock.mockReturnValue({ isAvailable: false, salesPaused: true, isLoading: false });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Paid plans open soon')).toBeInTheDocument();
  });
});
