import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
const { apiFetch, search } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  search: { value: '' },
}));
vi.mock('wouter', () => ({
  useLocation: () => ['/login', vi.fn()],
  useSearch: () => search.value,
}));
vi.mock('@/lib/api', () => ({
  apiFetch,
  ApiError: class ApiError extends Error {},
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import Login from '../Login';

describe('sign-in sheet return-path description', () => {
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
  afterEach(cleanup);

  it('does not promise a return to the homepage', async () => {
    apiFetch.mockResolvedValue({});
    search.value = '?mode=signin&next=%2F';
    render(<Login />);
    expect(await screen.findByText(/Sign in to your account to continue/)).toBeInTheDocument();
    expect(screen.queryByText(/You will be returned to/)).not.toBeInTheDocument();
  });

  it('keeps the return path for other pages', async () => {
    apiFetch.mockResolvedValue({});
    search.value = '?mode=signin&next=%2Fproperty%2Fx';
    render(<Login />);
    expect(await screen.findByText(/You will be returned to \/property\/x\./)).toBeInTheDocument();
  });
});
