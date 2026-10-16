import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
const { mutation, options, state } = vi.hoisted(() => ({
  mutation: vi.fn(),
  options: {
    current: null as {
      onError: (error: { data: { code: string } }) => void;
      onSuccess: (result: {
        deliveryStatus: string;
        leadCustody: string;
        recipientType: string;
        recipientId: number;
      }) => void;
    } | null,
  },
  state: { pending: false },
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    leads: {
      create: {
        useMutation: (config: unknown) => {
          options.current = config as NonNullable<typeof options.current>;
          return { mutate: mutation, isPending: state.pending };
        },
      },
    },
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { AgentProfileEnquiryDialog } from './AgentProfileEnquiryDialog';
function fill(container: HTMLElement) {
  fireEvent.change(within(container).getByLabelText(/Your name/), {
    target: { value: 'Local Preview Visitor' },
  });
  fireEvent.change(within(container).getByLabelText(/Email address/), {
    target: { value: 'preview@example.test' },
  });
  fireEvent.change(within(container).getByLabelText(/Phone number/), {
    target: { value: '082 123 4567' },
  });
  fireEvent.change(within(container).getByLabelText(/Message|How can Jane help/), {
    target: { value: 'Please tell me more about your current listings.' },
  });
}
describe('agent profile inline enquiry', () => {
  beforeEach(() => {
    mutation.mockReset();
    state.pending = false;
  });
  afterEach(cleanup);
  it.each(['inline', 'dialog'] as const)('requires a phone number in the %s form', presentation => {
    render(
      <AgentProfileEnquiryDialog
        agentId={42}
        agentName="Jane"
        presentation={presentation}
        open
        onOpenChange={() => {}}
      />,
    );
    const form = screen.getByTestId(`agent-profile-enquiry-${presentation}`);
    fill(form);
    fireEvent.click(within(form).getByLabelText(/I agree to be contacted/));
    const phone = within(form).getByLabelText(/Phone number/);
    expect(phone).toBeRequired();
    fireEvent.change(phone, { target: { value: '   ' } });
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation).not.toHaveBeenCalled();
    expect(within(form).getByRole('alert').textContent).toContain('enter your phone number');
    fireEvent.change(phone, { target: { value: 'not a number' } });
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation).not.toHaveBeenCalled();
    expect(within(form).getByRole('alert').textContent).toContain('valid phone number');
    fireEvent.change(phone, { target: { value: ' +27 (82) 123-4567 ' } });
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation).toHaveBeenCalledWith(expect.objectContaining({ phone: '+27 (82) 123-4567' }));
  });
  it('requires consent before sending a correctly routed inline enquiry', () => {
    render(
      <AgentProfileEnquiryDialog
        agentId={42}
        agentName="Jane"
        presentation="inline"
        open
        onOpenChange={() => {}}
      />,
    );
    const form = screen.getByTestId('agent-profile-enquiry-inline');
    fill(form);
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation).not.toHaveBeenCalled();
    expect(within(form).getByRole('alert').textContent).toContain('agree to be contacted');
    fireEvent.click(within(form).getByLabelText(/I agree to be contacted/));
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 42,
        source: 'agent_profile',
        sourceSurface: 'agent_profile_enquiry',
        consent: expect.objectContaining({
          accepted: true,
          source: 'agent_profile_enquiry_inline',
        }),
      }),
    );
  });
  it('retains entered details and the same capture request after a failed attempt', () => {
    render(
      <AgentProfileEnquiryDialog
        agentId={42}
        agentName="Jane"
        presentation="inline"
        open
        onOpenChange={() => {}}
      />,
    );
    const form = screen.getByTestId('agent-profile-enquiry-inline');
    fill(form);
    fireEvent.click(within(form).getByLabelText(/I agree to be contacted/));
    fireEvent.submit(form.querySelector('form')!);
    const first = mutation.mock.calls[0][0];
    act(() => options.current!.onError({ data: { code: 'INTERNAL_SERVER_ERROR' } }));
    expect(within(form).getByLabelText(/Your name/)).toHaveValue('Local Preview Visitor');
    expect(within(form).getByRole('alert').textContent).toContain('could not save');
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation.mock.calls[1][0].captureRequestId).toBe(first.captureRequestId);
  });
  it('blocks duplicate form submissions while sending', () => {
    state.pending = true;
    render(
      <AgentProfileEnquiryDialog
        agentId={42}
        agentName="Jane"
        presentation="inline"
        open
        onOpenChange={() => {}}
      />,
    );
    const form = screen.getByTestId('agent-profile-enquiry-inline');
    fill(form);
    fireEvent.click(within(form).getByLabelText(/I agree to be contacted/));
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation).not.toHaveBeenCalled();
    expect(within(form).getByRole('button', { name: /Sending/ })).toBeDisabled();
  });
  it('acknowledges the saved enquiry and creates a fresh request only for a new message', () => {
    render(
      <AgentProfileEnquiryDialog
        agentId={42}
        agentName="Jane"
        presentation="inline"
        open
        onOpenChange={() => {}}
      />,
    );
    const form = screen.getByTestId('agent-profile-enquiry-inline');
    fill(form);
    fireEvent.click(within(form).getByLabelText(/I agree to be contacted/));
    fireEvent.submit(form.querySelector('form')!);
    const firstId = mutation.mock.calls[0][0].captureRequestId;
    act(() =>
      options.current!.onSuccess({
        deliveryStatus: 'delivered',
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agent',
        recipientId: 42,
      }),
    );
    expect(within(form).getByText('Enquiry received')).toBeDefined();
    expect(mutation).toHaveBeenCalledTimes(1);
    fireEvent.click(within(form).getByRole('button', { name: 'Send another enquiry' }));
    expect(within(form).getByLabelText(/Your name/)).toHaveValue('');
    fill(form);
    fireEvent.click(within(form).getByLabelText(/I agree to be contacted/));
    fireEvent.submit(form.querySelector('form')!);
    expect(mutation.mock.calls[1][0].captureRequestId).not.toBe(firstId);
  });
  it('gives inline and dialog fields distinct IDs and accessible labels', () => {
    render(
      <>
        <AgentProfileEnquiryDialog
          agentId={42}
          agentName="Jane"
          presentation="inline"
          open
          onOpenChange={() => {}}
        />
        <AgentProfileEnquiryDialog agentId={42} agentName="Jane" open onOpenChange={() => {}} />
      </>,
    );
    const inline = within(screen.getByTestId('agent-profile-enquiry-inline')).getByLabelText(
      /Your name/,
    );
    const dialog = within(screen.getByTestId('agent-profile-enquiry-dialog')).getByLabelText(
      /Your name/,
    );
    expect(inline.id).not.toBe(dialog.id);
  });
});
