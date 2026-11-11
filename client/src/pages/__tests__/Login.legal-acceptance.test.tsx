import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const controls = vi.hoisted(() => ({
  fetch: vi.fn(),
  stale: false,
  unavailable: false,
  emailSent: true,
}));
vi.mock('wouter', () => ({
  useLocation: () => ['/login', vi.fn()],
  useSearch: () => '?mode=register&role=visitor',
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
    controls.emailSent = true;
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
      if (path === '/auth/register')
        return { message: 'Synthetic success', verificationEmailSent: controls.emailSent };
      return { message: 'Synthetic success' };
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  async function fillForm() {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Test Person');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'person@example.invalid');
    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'Pass123!');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'Pass123!');
    return user;
  }
  it('requires an unchecked choice and links to the precise bundle in a new tab', async () => {
    render(<Login />);
    const choice = await screen.findByRole('checkbox', { name: /you agree to our Terms/ });
    expect(choice).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Create free account/ })).toBeDisabled();
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
    const choice = await screen.findByRole('checkbox', { name: /you agree to our Terms/ });
    const user = await fillForm();
    await user.click(choice);
    controls.stale = true;
    await user.click(screen.getByRole('button', { name: /Create free account/ }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
        'href',
        '/legal/terms?bundle=test-new',
      ),
    );
    expect(screen.getByRole('checkbox', { name: /you agree to our Terms/ })).not.toBeChecked();
    expect(screen.getByPlaceholderText('Jane Smith')).toHaveValue('Test Person');
    const [, init] = controls.fetch.mock.calls.find(([path]) => path === '/auth/register')!;
    expect(JSON.parse(init.body).legalAcceptance).toEqual({
      bundleId: 'test-current',
      termsAccepted: true,
    });
    expect(screen.getByRole('button', { name: /Create free account/ })).toBeDisabled();
  });
  it('keeps new registration disabled when approved documents cannot be loaded', async () => {
    controls.unavailable = true;
    render(<Login />);
    expect(
      await screen.findByText(
        'New account registration is temporarily unavailable. Please try again later.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create free account/ })).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: /I agree/ })).not.toBeInTheDocument();
  });
  it('shows a Check your email state after register, never Welcome back, and resends via the existing endpoint', async () => {
    render(<Login />);
    const choice = await screen.findByRole('checkbox', { name: /you agree to our Terms/ });
    const user = await fillForm();
    await user.click(choice);
    await user.click(screen.getByRole('button', { name: /Create free account/ }));
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText('person@example.invalid')).toBeInTheDocument();
    expect(screen.getByText(/We sent a verification email/)).toBeInTheDocument();
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() =>
      expect(controls.fetch).toHaveBeenCalledWith(
        '/auth/resend-verification',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'person@example.invalid' }),
        }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Back to log in' })).toBeInTheDocument();
  });
  it('says the email could not be sent when verificationEmailSent is false', async () => {
    controls.emailSent = false;
    render(<Login />);
    const choice = await screen.findByRole('checkbox', { name: /you agree to our Terms/ });
    const user = await fillForm();
    await user.click(choice);
    await user.click(screen.getByRole('button', { name: /Create free account/ }));
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText(/could not send the verification email/)).toBeInTheDocument();
    expect(screen.queryByText(/We sent a verification email/)).not.toBeInTheDocument();
  });
});
