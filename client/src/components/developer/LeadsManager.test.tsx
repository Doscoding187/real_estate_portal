import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getLeadsUseQueryMock,
  getFunnelAttentionUseQueryMock,
  getOperatingHomeUseQueryMock,
  useMutationMock,
  useUtilsMock,
  locationMock,
} = vi.hoisted(() => ({
  getLeadsUseQueryMock: vi.fn(),
  getFunnelAttentionUseQueryMock: vi.fn(),
  getOperatingHomeUseQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useUtilsMock: vi.fn(),
  locationMock: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 7 } }),
}));

vi.mock('wouter', () => ({
  useLocation: locationMock,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: useUtilsMock,
    developer: {
      getLeads: { useQuery: getLeadsUseQueryMock },
      getFunnelAttention: { useQuery: getFunnelAttentionUseQueryMock },
      getOperatingHome: { useQuery: getOperatingHomeUseQueryMock },
      assignLead: { useMutation: useMutationMock },
      transitionLead: { useMutation: useMutationMock },
      logLeadActivity: { useMutation: useMutationMock },
      setLeadNextAction: { useMutation: useMutationMock },
    },
  },
}));

import LeadsManager from './LeadsManager';

describe('LeadsManager query contracts', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/developer/leads?developmentId=42&range=30d');
    locationMock.mockReturnValue(['/developer/leads?developmentId=42&range=30d', vi.fn()]);
    getLeadsUseQueryMock.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
    });
    getFunnelAttentionUseQueryMock.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
    });
    getOperatingHomeUseQueryMock.mockReturnValue({
      data: { developments: [{ identity: { id: 42, name: 'Target Development' } }] },
      isLoading: false,
    });
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useUtilsMock.mockReturnValue({
      developer: {
        getLeads: { invalidate: vi.fn() },
        getFunnelAttention: { invalidate: vi.fn() },
        getFunnelKPIs: { invalidate: vi.fn() },
        getDevelopmentHome: { invalidate: vi.fn() },
        getOperatingHome: { invalidate: vi.fn() },
      },
    });
  });

  it('uses the server-supported maximum for leads and attention queries', async () => {
    render(<LeadsManager />);

    await waitFor(() => {
      expect(getLeadsUseQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({ developmentId: 42, limit: 200 }),
        expect.anything(),
      );
      expect(getFunnelAttentionUseQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({ developmentId: 42, limit: 200 }),
        expect.anything(),
      );
    });

    expect(getLeadsUseQueryMock.mock.calls.every(([input]) => input.limit <= 200)).toBe(true);
    expect(
      getFunnelAttentionUseQueryMock.mock.calls.every(([input]) => input.limit <= 200),
    ).toBe(true);
    expect(screen.getByRole('heading', { name: 'Leads Control Center' })).toBeInTheDocument();
  });
});
