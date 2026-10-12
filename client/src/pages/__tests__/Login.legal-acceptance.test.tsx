import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const controls = vi.hoisted(() => ({ fetch: vi.fn(), stale: false, unavailable: false }));
vi.mock('wouter', () => ({
  useLocation: () => ['/login', vi.fn()],
  useSearch: () => '?mode=register&role=agency_admin',
}));
vi.mock('@/lib/api', () => ({
  apiFetch: controls.fetch,
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public message: string,
      public body: unknown,
    ) {
      super(message);
    }
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { ApiError } from '@/lib/api';
import Login from '../Login';
const bundle = (id: string) => ({
  bundleId: id,
  effectiveAt: '2026-01-01T00:00:00.000Z',
  terms: {
    version: 'test-terms-1',
    path: '/legal/terms',
    sha256: 'test-only',
    content: 'Synthetic Terms',
  },
  privacy: {
    version: 'test-privacy-1',
    path: '/legal/privacy',
    sha256: 'test-only',
    content: 'Synthetic Privacy',
  },
});
describe('registration legal choice', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    controls.stale = false;
    controls.unavailable = false;
    controls.fetch.mockImplementation(async (path: string) => {
      if (path === '/auth/google/status') return { founderLoginAvailable: false };
      if (path === '/auth/registration-legal') {
        if (controls.unavailable) throw new Error('Unavailable');
        return bundle(controls.stale ? 'test-new' : 'test-current');
      }
      if (path === '/auth/register' && controls.stale)
        throw new ApiError(409, 'stale', {
          code: 'LEGAL_VERSION_STALE',
          error: 'Review changed documents.',
        });
      return { message: 'Synthetic success' };
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  async function fillForm() {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Agency owner'), 'Test Person');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'person@example.invalid');
    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'Pass123!');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'Pass123!');
    return user;
  }
  it('requires an unchecked choice and links to the precise bundle in a new tab', async () => {
    render(<Login />);
    const choice = await screen.findByRole('checkbox', { name: /I agree to the Terms/ });
    expect(choice).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Continue to agency setup/ })).toBeDisabled();
    const terms = screen.getByRole('link', { name: /Terms of Service/ });
    expect(terms).toHaveAttribute('href', '/legal/terms?bundle=test-current');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Privacy Notice/ })).toHaveAttribute(
      'href',
      '/legal/privacy?bundle=test-current',
    );
    expect(controls.fetch.mock.calls.filter(([path]) => path === '/auth/register')).toHaveLength(0);
  });
  it('sends an explicit choice and requires a new choice after stale-copy rejection', async () => {
    render(<Login />);
    const choice = await screen.findByRole('checkbox', { name: /I agree to the Terms/ });
    const user = await fillForm();
    await user.click(choice);
    controls.stale = true;
    await user.click(screen.getByRole('button', { name: /Continue to agency setup/ }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
        'href',
        '/legal/terms?bundle=test-new',
      ),
    );
    expect(screen.getByRole('checkbox', { name: /I agree to the Terms/ })).not.toBeChecked();
    expect(screen.getByPlaceholderText('Agency owner')).toHaveValue('Test Person');
    const [, init] = controls.fetch.mock.calls.find(([path]) => path === '/auth/register')!;
    expect(JSON.parse(init.body).legalAcceptance).toEqual({
      bundleId: 'test-current',
      termsAccepted: true,
    });
    expect(screen.getByRole('button', { name: /Continue to agency setup/ })).toBeDisabled();
  });
  it('keeps new registration disabled when approved documents cannot be loaded', async () => {
    controls.unavailable = true;
    render(<Login />);
    expect(
      await screen.findByText(
        'New account registration is temporarily unavailable. Please try again later.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to agency setup/ })).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: /I agree/ })).not.toBeInTheDocument();
  });
});
