import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentApprovals from './AgentApprovals';

const h = vi.hoisted(() => ({
  query: {} as any,
  approve: vi.fn(),
  invalidate: vi.fn(),
  approveOpts: {} as any,
  pending: false,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        getAdminActionItems: { invalidate: h.invalidate },
        getLaunchDashboardStats: { invalidate: h.invalidate },
        getDailyInbox: { invalidate: h.invalidate },
      },
    }),
    admin: {
      getPendingAgents: { useQuery: () => h.query },
      approveAgent: {
        useMutation: (opts: any) => {
          h.approveOpts = opts;
          return { mutate: h.approve, isPending: h.pending };
        },
      },
      rejectAgent: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe('AgentApprovals', () => {
  beforeEach(() => {
    h.query = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    h.approve = vi.fn();
    h.invalidate = vi.fn();
    h.pending = false;
  });

  it('shows an honest empty state', () => {
    render(<AgentApprovals />);
    expect(screen.getByText('No pending agents found')).toBeTruthy();
  });

  it('offers Retry on error', () => {
    const refetch = vi.fn();
    h.query = { data: undefined, isLoading: false, isError: true, refetch };
    render(<AgentApprovals />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('approves the chosen agent and refreshes the queue counts', () => {
    h.query = {
      data: [{ id: 7, displayName: 'Sam', email: 's@x.co', status: 'pending', createdAt: '2026-11-01' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    render(<AgentApprovals />);
    fireEvent.click(screen.getByRole('button', { name: /^Approve$/ }));
    expect(h.approve).toHaveBeenCalledWith({ agentId: 7 });
    h.approveOpts.onSuccess();
    expect(h.invalidate).toHaveBeenCalledTimes(3);
  });

  it('disables approve while the mutation is pending', () => {
    h.pending = true;
    h.query = {
      data: [{ id: 7, displayName: 'Sam', email: 's@x.co', status: 'pending', createdAt: '2026-11-01' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    render(<AgentApprovals />);
    expect((screen.getByRole('button', { name: /^Approve$/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
