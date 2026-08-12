import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyContactModal } from './PropertyContactModal';

const testState = vi.hoisted(() => ({
  mutationOptions: null as null | { onSuccess: (result: unknown) => void },
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    leads: {
      create: {
        useMutation: (options: { onSuccess: (result: unknown) => void }) => {
          testState.mutationOptions = options;
          return { mutate: testState.mutate, isPending: false };
        },
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: testState.toastSuccess,
    error: vi.fn(),
  },
}));

function renderWhatsAppCapture(summary = 'Qualified for up to R2 000 000') {
  const onClose = vi.fn();
  render(
    <PropertyContactModal
      isOpen
      onClose={onClose}
      propertyId={501}
      propertyTitle="Verified listing"
      successMessage="Your enquiry was sent to the verified recipient."
      successAction={{
        type: 'whatsapp',
        phone: '+27 82 000 0000',
        message: summary,
      }}
    />,
  );
  return { onClose };
}

function publishSuccess(result: unknown) {
  expect(testState.mutationOptions).not.toBeNull();
  act(() => testState.mutationOptions!.onSuccess(result));
}

describe('PropertyContactModal recipient-action custody', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterAll(() => vi.unstubAllGlobals());

  beforeEach(() => {
    testState.mutationOptions = null;
    testState.mutate.mockReset();
    testState.toastSuccess.mockReset();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('opens the direct action only for a verified external recipient', () => {
    renderWhatsAppCapture();

    publishSuccess({
      deliveryStatus: 'delivered',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agent',
      recipientId: 33,
    });

    expect(window.open).toHaveBeenCalledTimes(1);
    const openedUrl = new URL(String(vi.mocked(window.open).mock.calls[0]?.[0]));
    expect(openedUrl.hostname).toBe('wa.me');
    expect(openedUrl.pathname).toBe('/27820000000');
    expect(openedUrl.searchParams.get('text')).toBe('Qualified for up to R2 000 000');
    expect(testState.toastSuccess).toHaveBeenCalledWith(
      'Your enquiry was sent to the verified recipient.',
    );
  });

  it('blocks attention-required recipient actions and reports verification custody truthfully', () => {
    renderWhatsAppCapture();

    publishSuccess({
      deliveryStatus: 'attention_required',
      leadCustody: 'attention_required',
      recipientType: 'manual',
      recipientId: null,
    });

    expect(window.open).not.toHaveBeenCalled();
    expect(testState.toastSuccess).toHaveBeenCalledWith(
      'Your enquiry was captured by Property Listify. Recipient verification is required before direct contact.',
    );
  });

  it('blocks platform-managed recipient actions and confirms Property Listify custody', () => {
    renderWhatsAppCapture();

    publishSuccess({
      deliveryStatus: 'attention_required',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
    });

    expect(window.open).not.toHaveBeenCalled();
    expect(testState.toastSuccess).toHaveBeenCalledWith(
      'Your enquiry was captured by Property Listify. Our team will review the request.',
    );
  });

  it('fails closed when recipient authority is missing despite a delivered status', () => {
    renderWhatsAppCapture();

    publishSuccess({ deliveryStatus: 'delivered' });

    expect(window.open).not.toHaveBeenCalled();
    expect(testState.toastSuccess).toHaveBeenCalledWith(
      'Your enquiry was captured by Property Listify. Direct recipient contact is not yet authorized.',
    );
  });

  it('does not send the qualification summary to an unauthorized contact', () => {
    const qualificationSummary = 'Income R90 000; affordability R2 000 000';
    renderWhatsAppCapture(qualificationSummary);

    publishSuccess({
      deliveryStatus: 'attention_required',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
    });

    expect(window.open).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(window.open).mock.calls)).not.toContain(qualificationSummary);
  });

  it('submits a public property enquiry without client-owned recipient ids', () => {
    render(
      <PropertyContactModal
        isOpen
        onClose={vi.fn()}
        propertyId={502}
        propertyTitle="Agency-owned listing"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Your Name/), {
      target: { value: 'Prospective Buyer' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/), {
      target: { value: 'buyer@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: 'Please share more details.' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Send Inquiry' }).closest('form')!);

    expect(testState.mutate).toHaveBeenCalledTimes(1);
    const payload = testState.mutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ propertyId: 502 });
    expect(payload).not.toHaveProperty('agentId');
    expect(payload).not.toHaveProperty('agencyId');
  });
});
