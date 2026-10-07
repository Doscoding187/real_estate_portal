import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('wouter', () => ({
  useLocation: () => ['/login', vi.fn()],
  useSearch: () => '?mode=signin&next=https://attacker.example.test',
}));
vi.mock('@/lib/api', () => ({
  apiFetch,
  ApiError: class ApiError extends Error {},
  getApiUrl: (path: string) => 'https://api.example.test/api' + path,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import Login from '../Login';

describe('normal founder Google sign-in entry', () => {
  beforeAll(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    ),
  );
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => {
    apiFetch.mockResolvedValue({ founderLoginAvailable: false });
  });
  afterEach(cleanup);
  it('uses the API entry only after server admission is enabled, without a caller redirect', async () => {
    apiFetch.mockResolvedValue({ founderLoginAvailable: true });
    render(<Login />);
    const link = await screen.findByRole('link', { name: 'Founder sign-in with Google' });
    expect(link).toHaveAttribute('href', 'https://api.example.test/api/auth/google/start');
    expect(apiFetch).toHaveBeenCalledWith(
      '/auth/google/status',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it.each([false, undefined, 'true'])(
    'keeps the entry absent for an unaccepted availability value %s',
    async value => {
      apiFetch.mockResolvedValue({ founderLoginAvailable: value });
      render(<Login />);
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      expect(
        screen.queryByRole('link', { name: 'Founder sign-in with Google' }),
      ).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    },
  );
  it('keeps ordinary email sign-in available when the status request fails', async () => {
    apiFetch.mockImplementation(async () => {
      throw new Error('local status failure');
    });
    render(<Login />);
    await waitFor(() => {
      expect(apiFetch.mock.calls.length).toBe(1);
    });
    expect(
      screen.queryByRole('link', { name: 'Founder sign-in with Google' }),
    ).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });
});
