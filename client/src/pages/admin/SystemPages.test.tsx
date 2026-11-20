import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformSettings, { countByState } from './PlatformSettings';
import AuditLogs from './AuditLogs';

const h = vi.hoisted(() => ({
  audit: {} as any,
  auditInput: vi.fn(),
  activation: {} as any,
  email: {} as any,
}));

vi.mock('wouter', () => ({ useLocation: () => ['/admin/settings', vi.fn()] }));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'super_admin' }, isAuthenticated: true }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getAuditLogs: {
        useQuery: (input: unknown) => {
          h.auditInput(input);
          return h.audit;
        },
      },
      getCommercialActivationStatus: { useQuery: () => h.activation },
      getTransactionalEmailBacklog: { useQuery: () => h.email },
    },
  },
}));

const log = (id: number) => ({
  id,
  userId: 1,
  actorName: 'Edward',
  action: 'approve_property',
  targetType: 'listing',
  targetId: id,
  metadata: { reason: 'ok' },
  createdAt: '2026-11-19T10:00:00.000Z',
});

describe('System and security (audit trail)', () => {
  beforeEach(() => {
    h.auditInput = vi.fn();
    h.audit = {
      data: { logs: [log(9), log(8)], hasMore: true },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it('renders real entries with the admin name', () => {
    render(<AuditLogs />);
    expect(screen.getAllByText('Edward')).toHaveLength(2);
    expect(screen.getByText('Showing 2 (older entries available)')).toBeTruthy();
  });

  it('pages older with the id cursor and back to newer', () => {
    render(<AuditLogs />);
    fireEvent.click(screen.getByRole('button', { name: 'Older' }));
    expect(h.auditInput).toHaveBeenLastCalledWith(expect.objectContaining({ beforeId: 8 }));
    fireEvent.click(screen.getByRole('button', { name: 'Newer' }));
    expect(h.auditInput).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ beforeId: expect.anything() }),
    );
  });

  it('has no dead Advanced Filters button, an empty state and Retry', () => {
    const refetch = vi.fn();
    h.audit = { data: undefined, isLoading: false, isError: true, refetch };
    const { container, unmount } = render(<AuditLogs />);
    expect(container.textContent).not.toContain('Advanced Filters');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    unmount();
    h.audit = { data: { logs: [], hasMore: false }, isLoading: false, isError: false, refetch };
    render(<AuditLogs />);
    expect(screen.getByText('No audit entries match.')).toBeTruthy();
  });
});

describe('Settings and integrations', () => {
  beforeEach(() => {
    h.activation = {
      data: {
        status: 'preparation_only',
        enabled: false,
        enabledProductKeys: [],
        releaseId: '',
        salesPaused: false,
        buildSha: 'abc123',
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    h.email = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
  });

  it('shows real paid-access status and an honest all-clear for email', () => {
    const { container } = render(<PlatformSettings />);
    expect(container.textContent).toContain('Preparation only (paid access off)');
    expect(container.textContent).toContain('abc123');
    expect(container.textContent).toContain('No emails are waiting or failing. All clear.');
    expect(container.textContent).not.toContain('Enable Featured Listings');
  });

  it('counts email by state and flags stale items', () => {
    h.email = {
      data: [
        { state: 'unknown', stale: false },
        { state: 'pending', stale: true },
        { state: 'pending', stale: false },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    const { container } = render(<PlatformSettings />);
    expect(container.textContent).toContain('Waiting to send');
    expect(container.textContent).toContain('1 email has been waiting longer than expected.');
    expect(countByState(h.email.data)).toEqual({ unknown: 1, pending: 2 });
  });

  it('offers Retry when a status fails', () => {
    const refetch = vi.fn();
    h.activation = { data: undefined, isLoading: false, isError: true, refetch };
    render(<PlatformSettings />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
