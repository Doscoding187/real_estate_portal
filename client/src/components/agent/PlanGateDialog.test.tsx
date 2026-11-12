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
  invoiceResponseMock,
  authMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  invoiceResponseMock: vi.fn(),
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
    invoiceResponse: invoiceResponseMock(),
    setInvoiceResponse: vi.fn(),
  }),
}));
vi.mock('@/components/commercial/PaidCommitmentDisclosure', () => ({
  PaidCommitmentDisclosure: () => <div>Commitment disclosure</div>,
}));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => authMock(),
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
  invoiceResponseMock.mockReturnValue(null);
  authMock.mockReturnValue({
    loading: false,
    user: { id: 1, role: 'agent', name: 'Ada Agent', email: 'ada@example.test' },
  });
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
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your plan' })).toBeInTheDocument();
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
        screen.getByText(
          'Use the reference shown exactly. We match payments by reference; a missing or wrong reference delays activation.',
        ),
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
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});

describe('plan gate details', () => {
  it('keeps the payment reference button disabled until the terms are accepted', () => {
    legalChoiceMock.mockReturnValue(null);
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('disables the payment reference button for blocked journey states', () => {
    render(<PlanGateDialog open onOpenChange={vi.fn()} blockedReason="Contact support." />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByText('Contact support.')).toBeInTheDocument();
  });

  it('requests a payment reference once on a double click', async () => {
    let release: () => void = () => {};
    requestMock.mockImplementation(() => new Promise<void>(r => (release = r)));
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Next' });
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
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
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

  it('shows the interim cancellation notice with a link to the Terms under the bank details', () => {
    withInvoice();
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    const notice = screen.getByTestId('payment-cancellation-notice');
    expect(notice).toHaveTextContent(
      'You may cancel within 7 days of payment for a full refund. Other refunds are handled under our Terms.',
    );
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/terms');
  });

  it('shows the early access title, the agent name and email, and an Edit in profile link', () => {
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Early access' })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Agent Launch Access is open now. You're one of the first agents on PropertyListify.",
      ),
    ).toBeInTheDocument();
    const account = screen.getByTestId('plan-account');
    expect(account).toHaveTextContent('Ada Agent');
    expect(account).toHaveTextContent('ada@example.test');
    expect(screen.getByRole('link', { name: 'Edit in profile' })).toHaveAttribute(
      'href',
      '/agent/settings?tab=profile',
    );
    expect(document.body.textContent).not.toMatch(/selected group|waitlist|coming soon|limited/i);
  });

  it('keeps the live Get access header in every closed or unknown state', () => {
    const expectLiveHeader = () => {
      expect(screen.getByRole('heading', { name: 'Get access' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'Your profile is open. A plan unlocks listings, publishing and enquiries.',
        ),
      ).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/open now|Early access/);
    };
    availabilityMock.mockReturnValue({ isAvailable: false, salesPaused: true, isLoading: false });
    const first = render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expectLiveHeader();
    first.unmount();
    availabilityMock.mockReturnValue({ isAvailable: true, salesPaused: false, isLoading: true });
    const second = render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expectLiveHeader();
    second.unmount();
    availabilityMock.mockReturnValue({ isAvailable: true, salesPaused: false, isLoading: false });
    render(<PlanGateDialog open onOpenChange={vi.fn()} blockedReason="Contact support." />);
    expectLiveHeader();
  });

  it('has no Back button when sales are paused or blocked with a reference', () => {
    availabilityMock.mockReturnValue({ isAvailable: false, salesPaused: true, isLoading: false });
    withInvoice();
    const first = render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('payment-reference')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    first.unmount();
    availabilityMock.mockReturnValue({ isAvailable: true, salesPaused: false, isLoading: false });
    render(<PlanGateDialog open onOpenChange={vi.fn()} blockedReason="Contact support." />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('shows Loading... instead of Not set while the account loads', () => {
    authMock.mockReturnValue({ loading: true, user: null });
    const first = render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('plan-account')).toHaveTextContent('Loading...');
    expect(screen.getByTestId('plan-account')).not.toHaveTextContent('Not set');
    first.unmount();
    authMock.mockReturnValue({ loading: false, user: { id: 1, name: '', email: '' } });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('plan-account')).toHaveTextContent('Not set');
  });

  it('renders the plan term from the catalog product when it carries one', () => {
    catalogMock.mockReturnValue({
      data: {
        products: [{ ...product, term: { ...product.term, durationDays: 60, autoRenews: false } }],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Once-off, 60 days, no auto-renewal.')).toBeInTheDocument();
  });

  it('requests a reference on Next when there is none yet', async () => {
    requestMock.mockResolvedValue(undefined);
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }));
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('Back returns from step 2 to the plan step and Next shows the reference again', async () => {
    withInvoice();
    const user = userEvent.setup();
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('payment-reference')).toHaveTextContent('PLI-REF-9');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Your plan' })).toBeInTheDocument();
    expect(screen.getByTestId('plan-account')).toHaveTextContent('ada@example.test');
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Your plan');
    expect(screen.queryByTestId('payment-reference')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(requestMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('payment-reference')).toHaveTextContent('PLI-REF-9');
    expect(screen.getByRole('heading', { name: 'Make payment' })).toHaveFocus();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Make payment');
  });

  it('uses a full-height sheet below sm and a 2xl dialog from sm up, with pinned step buttons', () => {
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    const dialog = screen.getByTestId('early-access-dialog');
    expect(dialog.className).toContain('h-dvh');
    expect(dialog.className).toContain('w-full');
    expect(dialog.className).toContain('sm:max-w-2xl');
    expect(dialog.className).toContain('flex-col');
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next.parentElement?.className).toContain('shrink-0');
    expect(next.parentElement?.className).toContain('border-t');
  });

  it('shows Paid plans open soon only when there is no payment reference', () => {
    availabilityMock.mockReturnValue({ isAvailable: false, salesPaused: true, isLoading: false });
    render(<PlanGateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Paid plans open soon')).toBeInTheDocument();
  });
});
