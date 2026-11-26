import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertiesPage from './PropertiesPage';

const h = vi.hoisted(() => ({
  query: {} as any,
  navigate: vi.fn(),
  del: vi.fn(),
  delOpts: {} as any,
  invalidate: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/admin/properties', h.navigate] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'super_admin' }, isAuthenticated: true }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        getAdminActionItems: { invalidate: h.invalidate },
        getLaunchDashboardStats: { invalidate: h.invalidate },
        getDailyInbox: { invalidate: h.invalidate },
      },
    }),
    admin: { listProperties: { useQuery: () => h.query } },
    listing: {
      delete: {
        useMutation: (opts: any) => {
          h.delOpts = opts;
          return { mutate: h.del, isPending: false };
        },
      },
    },
  },
}));

const row = {
  id: 11,
  title: 'Sandton house',
  price: 2450000,
  status: 'published',
  city: 'Sandton',
  createdAt: '2026-11-01',
  propertyType: 'house',
  userId: 3,
};

describe('Listings page', () => {
  beforeEach(() => {
    h.query = {
      data: { properties: [row], pagination: { page: 1, limit: 20, total: 41, totalPages: 3 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    h.navigate = vi.fn();
    h.del = vi.fn();
    h.invalidate = vi.fn();
  });

  it('shows the real total and no dead Advanced Filters button', () => {
    render(<PropertiesPage />);
    expect(screen.getByText(/Showing 1 of 41/)).toBeTruthy();
    expect(screen.queryByText('Advanced Filters')).toBeNull();
  });

  it('opens the review route for the listing', () => {
    render(<PropertiesPage />);
    fireEvent.click(screen.getByRole('button', { name: /Review/ }));
    expect(h.navigate).toHaveBeenCalledWith('/admin/review/11');
  });

  it('deletes only after confirmation, then refreshes without a page reload', () => {
    render(<PropertiesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete listing Sandton house' }));
    expect(h.del).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.del).toHaveBeenCalledWith({ id: 11 });
    h.delOpts.onSuccess();
    expect(h.query.refetch).toHaveBeenCalled();
    expect(h.invalidate).toHaveBeenCalledTimes(3);
  });

  it('shows empty and error states', () => {
    h.query = { data: { properties: [] }, isLoading: false, isError: false, refetch: vi.fn() };
    const { unmount } = render(<PropertiesPage />);
    expect(screen.getByText('No listings match these filters.')).toBeTruthy();
    unmount();
    const refetch = vi.fn();
    h.query = { data: undefined, isLoading: false, isError: true, refetch };
    render(<PropertiesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
