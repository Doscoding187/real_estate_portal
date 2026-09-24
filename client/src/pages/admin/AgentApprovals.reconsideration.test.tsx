import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { approveMock, getAgentsMock, rejectMock } = vi.hoisted(() => ({
  approveMock: vi.fn(),
  getAgentsMock: vi.fn(),
  rejectMock: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getPendingAgents: {
        useQuery: (...args: unknown[]) => getAgentsMock(...args),
      },
      approveAgent: {
        useMutation: (...args: unknown[]) => approveMock(...args),
      },
      rejectAgent: {
        useMutation: (...args: unknown[]) => rejectMock(...args),
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

import AgentApprovals from './AgentApprovals';

function renderApprovals(status: 'rejected' | 'suspended') {
  getAgentsMock.mockReturnValue({
    data: [
      {
        id: 27,
        displayName: 'Corrected Agent',
        email: 'agent@example.test',
        status,
        phone: '+27820000000',
        bio: 'Corrected professional profile',
        licenseNumber: 'SELF-SUPPLIED-FFC',
        rejectionReason: status === 'rejected' ? 'Please update your profile details.' : null,
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
  });
  const mutate = vi.fn();
  approveMock.mockReturnValue({ mutate, isLoading: false });
  rejectMock.mockReturnValue({ mutate: vi.fn(), isLoading: false });

  render(<AgentApprovals />);
  fireEvent.click(screen.getByRole('tab', { name: status === 'rejected' ? 'Rejected' : 'Suspended' }));
  return mutate;
}

describe('Agent approvals reconsideration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a reviewer approve a corrected rejected profile through the existing privileged mutation', () => {
    const mutate = renderApprovals('rejected');

    expect(screen.getByText('Corrected professional profile')).toBeInTheDocument();
    expect(
      screen.getByText(/Approval records a manual platform decision and does not create an external/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Corrected Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve Corrected Profile' }));

    expect(mutate).toHaveBeenCalledWith({ agentId: 27 });
  });

  it('does not present profile approval as a suspended-account restoration path', () => {
    renderApprovals('suspended');

    expect(screen.queryByRole('button', { name: /Approve/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/manual platform decision/i)).not.toBeInTheDocument();
  });
});
