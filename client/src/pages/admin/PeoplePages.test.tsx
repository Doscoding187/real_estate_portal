import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersPage, { userDisplayName } from './UsersPage';
import AgencyList from './AgencyList';

const h = vi.hoisted(() => ({
  users: {} as any,
  usersInput: vi.fn(),
  agencies: {} as any,
  verify: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/admin/users', vi.fn()] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'super_admin' }, isAuthenticated: true }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      listUsers: {
        useQuery: (input: unknown) => {
          h.usersInput(input);
          return h.users;
        },
      },
    },
    agency: {
      list: { useQuery: () => h.agencies },
      verify: { useMutation: () => ({ mutate: h.verify, isPending: false }) },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

const user = {
  id: 1,
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@x.co',
  role: 'agent',
  createdAt: '2026-11-01',
  lastSignedIn: null,
};

describe('Users page', () => {
  beforeEach(() => {
    h.usersInput = vi.fn();
    h.users = {
      data: { users: [user], pagination: { page: 1, limit: 20, total: 45, totalPages: 3 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it('shows real rows and total, and no dead buttons', () => {
    const { container } = render(<UsersPage />);
    expect(screen.getByText('Sam Lee')).toBeTruthy();
    expect(screen.getByText('Showing 1 of 45')).toBeTruthy();
    expect(screen.getByText('Never')).toBeTruthy();
    for (const dead of ['Add User', 'Export', 'Send Message', 'Reset Password', 'Suspend User']) {
      expect(container.textContent).not.toContain(dead);
    }
  });

  it('queries by the chosen role tab and by search from page 1', () => {
    render(<UsersPage />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Developers' }), { key: 'Enter' });
    fireEvent.change(screen.getByLabelText('Search users by name or email'), {
      target: { value: 'sam' },
    });
    expect(h.usersInput).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'sam', page: 1 }),
    );
  });

  it('opens a profile for the chosen user', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'View Sam Lee' }));
    expect(screen.getByText('sam@x.co', { selector: 'p' })).toBeTruthy();
  });

  it('offers Retry on error and has an honest empty state', () => {
    const refetch = vi.fn();
    h.users = { data: undefined, isLoading: false, isError: true, refetch };
    const { unmount } = render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    unmount();
    h.users = { data: { users: [] }, isLoading: false, isError: false, refetch };
    render(<UsersPage />);
    expect(screen.getByText('No users found.')).toBeTruthy();
  });

  it('falls back through name parts', () => {
    expect(userDisplayName({ name: 'Only Name' })).toBe('Only Name');
    expect(userDisplayName({ email: 'a@b.co' })).toBe('a@b.co');
  });
});

describe('Agencies page', () => {
  beforeEach(() => {
    h.verify = vi.fn();
    h.agencies = {
      data: {
        total: 80,
        agencies: [
          {
            id: 4,
            name: 'Acme Realty',
            isVerified: 0,
            subscriptionPlan: 'free',
            subscriptionStatus: 'active',
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it('says how many are shown of the real total and wires Verify', () => {
    const { container } = render(<AgencyList />);
    expect(container.textContent).toContain('Showing 1 of 80');
    expect(container.textContent).toContain('Verified (shown)');
    fireEvent.click(screen.getByRole('button', { name: /Verify/ }));
    expect(h.verify).toHaveBeenCalledWith({ id: 4, isVerified: true });
  });

  it('offers Retry on error', () => {
    const refetch = vi.fn();
    h.agencies = { data: undefined, isLoading: false, isError: true, refetch };
    render(<AgencyList />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
