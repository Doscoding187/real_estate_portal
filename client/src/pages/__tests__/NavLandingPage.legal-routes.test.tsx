import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiFetch: controls.fetch }));
vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));
import NavLandingPage from '../NavLandingPage';

const release = {
  bundleId: 'archived-test-bundle',
  effectiveAt: '2026-01-01T00:00:00.000Z',
  terms: { version: 'test-terms', content: 'Exact archived cancellation and dispute terms.' },
  privacy: {
    version: 'test-privacy',
    content: 'Exact archived cookie and browser-storage notice.',
  },
};

describe('released legal document routes', () => {
  beforeEach(() => {
    controls.fetch.mockResolvedValue(release);
  });
  afterEach(() => cleanup());

  it.each([
    ['/terms', 'terms'],
    ['/legal/terms', 'terms'],
    ['/legal/consumer-rights', 'terms'],
    ['/legal/dispute-resolution', 'terms'],
    ['/privacy', 'privacy'],
    ['/legal/privacy', 'privacy'],
    ['/cookies', 'privacy'],
    ['/legal/cookies', 'privacy'],
    ['/compliance', 'privacy'],
    ['/legal/compliance', 'privacy'],
  ] as const)('%s renders the exact archived %s document', async (path, kind) => {
    window.history.replaceState({}, '', `${path}?bundle=${release.bundleId}`);
    render(<NavLandingPage />);
    expect(await screen.findByText(release[kind].content)).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: kind === 'terms' ? 'Terms of Service' : 'Privacy Notice',
      }),
    ).toBeTruthy();
    expect(controls.fetch).toHaveBeenCalledWith(
      `/legal/releases/${release.bundleId}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });

  it('keeps the cookie route unavailable when released copy cannot be fetched', async () => {
    controls.fetch.mockRejectedValue(new Error('No released copy'));
    window.history.replaceState({}, '', '/legal/cookies');
    render(<NavLandingPage />);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('temporarily unavailable'),
    );
    expect(screen.queryByText(release.privacy.content)).toBeNull();
  });

  it('does not turn unknown legal routes into an asserted compliance policy', () => {
    window.history.replaceState({}, '', '/legal/unknown');
    render(<NavLandingPage />);
    expect(screen.getByRole('status').textContent).toContain('temporarily unavailable');
    expect(controls.fetch).not.toHaveBeenCalled();
  });
});
