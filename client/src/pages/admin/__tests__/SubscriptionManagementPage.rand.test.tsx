import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('wouter', () => ({ useLocation: () => ['/admin', vi.fn()] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/admin/RecordPaymentByReferenceCard', () => ({
  RecordPaymentByReferenceCard: () => null,
}));
vi.mock('@/hooks/useCommercialProductAvailability', () => ({
  useCommercialActivationAvailability: () => ({
    isProductAvailable: () => true,
    unavailableMessage: 'unavailable',
  }),
}));
vi.mock('@/lib/trpc', () => {
  const query = (data: unknown) => ({ useQuery: () => ({ data, isLoading: false, refetch: vi.fn() }) });
  return {
    trpc: {
      useUtils: () => ({}),
      billing: {
        admin: {
          subscriptions: query({ subscriptions: [], total: 0 }),
          plans: query({ plans: [] }),
          financeQueue: query({
            payments: [
              {
                payment: {
                  id: 7,
                  amount: 49900,
                  state: 'under_review',
                  createdAt: '2026-11-01T10:00:00Z',
                  paymentDate: '2026-11-01',
                  paymentReference: 'REF1',
                },
                invoice: { amountDue: 49900, amountPaid: 0, invoiceNumber: 'INV-1' },
                commercialProductKey: 'p',
                noticeHistory: [],
              },
            ],
          }),
          reviewManualPayment: { useMutation: () => ({ mutate, isPending: false }) },
        },
      },
    },
  };
});

import SubscriptionManagementPage, { randToCents } from '../SubscriptionManagementPage';

function openDialog() {
  render(<SubscriptionManagementPage initialTab="verification" />);
  fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
  fireEvent.change(screen.getByLabelText(/Reference shown on the received bank/), {
    target: { value: 'BANKREF' },
  });
  fireEvent.change(screen.getByLabelText(/Finance reconciliation note/), {
    target: { value: 'checked' },
  });
  return screen.getByLabelText(/Verified amount received \(R\)/);
}

describe('proof approval amount in Rand', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    mutate.mockClear();
  });

  it('converts Rand text to integer cents', () => {
    expect(randToCents('499')).toBe(49900);
    expect(randToCents('499.99')).toBe(49999);
    expect(randToCents('0')).toBe(0);
    expect(randToCents('')).toBe(0);
    expect(randToCents('abc')).toBe(0);
  });

  it.each([
    ['499', 49900],
    ['499.99', 49999],
  ])('submits R%s as %i cents', (rand, cents) => {
    const input = openDialog();
    fireEvent.change(input, { target: { value: rand } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm finance approval' }));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ verifiedAmount: cents }));
  });

  it.each(['499.', '1e3', '499.999'])('randToCents rejects %s', value => {
    expect(randToCents(value)).toBe(0);
  });

  it.each(['', '0', '499.', '1e3', '499.999'])('disables approve for "%s"', value => {
    const input = openDialog();
    fireEvent.change(input, { target: { value } });
    expect(screen.getByRole('button', { name: 'Confirm finance approval' })).toBeDisabled();
  });
});
