import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  approveMutation: { mutate: vi.fn(), isLoading: false },
  rejectMutation: { mutate: vi.fn(), isLoading: false },
  setTrustedMutation: { mutate: vi.fn(), isLoading: false },
  invalidatePending: vi.fn(),
  invalidateAll: vi.fn(),
}));

const pendingDeveloper = {
  id: 42,
  name: 'Boundary Developments',
  status: 'pending',
  category: 'residential',
  city: 'Johannesburg',
  province: 'Gauteng',
  createdAt: '2026-09-15T00:00:00.000Z',
  description: 'A pending developer organisation.',
  email: 'boundary@example.test',
  phone: '+27115550123',
  website: 'https://boundary.example.test',
  totalProjects: 0,
  isTrusted: 0,
};

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useContext: () => ({
      developer: {
        adminListPendingDevelopers: { invalidate: state.invalidatePending },
        adminListAllDevelopers: { invalidate: state.invalidateAll },
      },
    }),
    developer: {
      adminListPendingDevelopers: {
        useQuery: () => ({ data: { developers: [pendingDeveloper] }, isLoading: false }),
      },
      adminListAllDevelopers: {
        useQuery: () => ({ data: { developers: [pendingDeveloper] }, isLoading: false }),
      },
      adminApproveDeveloper: { useMutation: () => state.approveMutation },
      adminRejectDeveloper: { useMutation: () => state.rejectMutation },
      adminSetTrusted: { useMutation: () => state.setTrustedMutation },
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import DevelopersPage from '../DevelopersPage';

describe('DevelopersPage trust boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the trust badge operation separate from organisation approval and commercial publication', () => {
    render(<DevelopersPage />);

    expect(
      screen.getByText(
        'Shows the Trusted Partner badge only after the developer has a public profile. It does not approve the organisation, publish projects, or grant Launch Access.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Bypasses manual review and publishes immediately'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Trusted Developer' }));

    expect(state.setTrustedMutation.mutate).toHaveBeenCalledWith({
      developerId: pendingDeveloper.id,
      isTrusted: true,
    });
    expect(state.approveMutation.mutate).not.toHaveBeenCalled();
  });
});
