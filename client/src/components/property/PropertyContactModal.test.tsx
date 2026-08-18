import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyContactModal } from './PropertyContactModal';

const testState = vi.hoisted(() => ({
  mutationOptions: null as null | {
    onSuccess: (result: unknown) => void;
    onError: (error: { data?: { code?: string } }) => void;
  },
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    leads: {
      create: {
        useMutation: (options: {
          onSuccess: (result: unknown) => void;
          onError: (error: { data?: { code?: string } }) => void;
        }) => {
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
    error: testState.toastError,
  },
}));

function renderWhatsAppCapture(summary = 'Qualified for up to R2 000 000') {
  const onClose = vi.fn();
  render(
    <PropertyContactModal
      isOpen
      onClose={onClose}
      propertyId={501}
      propertyTitle="Agency listing"
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

function publishError(code?: string) {
  expect(testState.mutationOptions).not.toBeNull();
  act(() => testState.mutationOptions!.onError({ data: { code } }));
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
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    testState.mutationOptions = null;
    testState.mutate.mockReset();
    testState.toastSuccess.mockReset();
    testState.toastError.mockReset();
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('opens the direct action only for a verified external recipient', () => {
    const { onClose } = renderWhatsAppCapture();

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
    expect(screen.getByRole('heading', { name: 'Enquiry received' })).toBeInTheDocument();
    expect(
      screen.getByText('Your enquiry was sent to the verified recipient.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/27820000000'),
    );
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
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
    expect(screen.queryByRole('link', { name: 'Open WhatsApp' })).not.toBeInTheDocument();
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
    fireEvent.submit(screen.getByRole('button', { name: 'Send enquiry' }).closest('form')!);

    expect(testState.mutate).toHaveBeenCalledTimes(1);
    const payload = testState.mutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ propertyId: 502 });
    expect(payload).not.toHaveProperty('agentId');
    expect(payload).not.toHaveProperty('agencyId');
  });

  it('keeps practical enquiry choices and remains usable in a short viewport', () => {
    render(
      <PropertyContactModal
        isOpen
        onClose={vi.fn()}
        propertyId={503}
        propertyTitle="Agency-owned listing"
        agentName="Northside Property Group"
        agentPhone="+27 82 000 0000"
        agentEmail="agency@example.com"
      />,
    );

    expect(screen.getAllByText('General enquiry').length).toBeGreaterThan(0);
    expect(screen.queryByText('Make an Offer')).not.toBeInTheDocument();
    expect(screen.queryByText('Financing Options')).not.toBeInTheDocument();
    expect(screen.queryByText('+27 82 000 0000')).not.toBeInTheDocument();
    expect(screen.queryByText('agency@example.com')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('max-h-[calc(100dvh-1rem)]', 'overflow-y-auto');
  });

  it('presents a viewing as a delivered request rather than a guaranteed appointment or follow-up', () => {
    render(
      <PropertyContactModal
        isOpen
        onClose={vi.fn()}
        propertyId={505}
        propertyTitle="Garden apartment"
        agentName="Northside Property Group"
        intent="viewing_request"
        successMessage="Your viewing request was delivered. This is not a confirmed appointment; the representative can contact you to arrange a suitable time."
      />,
    );

    expect(
      screen.getByText(/This does not confirm an appointment; if they can accommodate it/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/will follow up/i)).not.toBeInTheDocument();

    publishSuccess({
      deliveryStatus: 'delivered',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agency',
      recipientId: 77,
    });

    expect(screen.getByText(/This is not a confirmed appointment/)).toBeInTheDocument();
    expect(screen.queryByText(/will follow up/i)).not.toBeInTheDocument();
  });

  it('keeps entered details and shows a retryable persistence error in the dialog', () => {
    render(
      <PropertyContactModal
        isOpen
        onClose={vi.fn()}
        propertyId={504}
        propertyTitle="Retry-safe listing"
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
    fireEvent.submit(screen.getByRole('button', { name: 'Send enquiry' }).closest('form')!);
    publishError('INTERNAL_SERVER_ERROR');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not save your enquiry. Your details are still here, so you can try again.',
    );
    expect(screen.getByLabelText(/Your Name/)).toHaveValue('Prospective Buyer');
    expect(screen.getByLabelText(/Message/)).toHaveValue('Please share more details.');
  });
});
