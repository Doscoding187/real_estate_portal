import { act, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiAvailabilityBoundary } from './ApiAvailabilityBoundary';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ApiAvailabilityBoundary', () => {
  it('keeps the site visible when the API is healthy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    render(
      <HelmetProvider>
        <ApiAvailabilityBoundary enabled apiBaseUrl="https://api.example.test">
          <div>Property search</div>
        </ApiAvailabilityBoundary>
      </HelmetProvider>,
    );
    await act(async () => {});

    expect(screen.getByText('Property search')).toBeInTheDocument();
    expect(screen.queryByText('We’re upgrading Property Listify')).not.toBeInTheDocument();
  });

  it('shows maintenance only after the readiness retry fails', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    render(
      <HelmetProvider>
        <ApiAvailabilityBoundary enabled apiBaseUrl="https://api.example.test">
          <div>Property search</div>
        </ApiAvailabilityBoundary>
      </HelmetProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(screen.getByRole('status')).toHaveTextContent('We’re upgrading Property Listify');
    expect(screen.queryByText('Property search')).not.toBeInTheDocument();
  });

  it('does not show maintenance for a slow first probe that succeeds on retry', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Timed out', 'AbortError')),
          );
        });
      }
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal('fetch', fetcher);

    render(
      <HelmetProvider>
        <ApiAvailabilityBoundary enabled apiBaseUrl="https://api.example.test">
          <div>Property search</div>
        </ApiAvailabilityBoundary>
      </HelmetProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1750);
    });

    expect(screen.getByText('Property search')).toBeInTheDocument();
    expect(screen.queryByText('We’re upgrading Property Listify')).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('restores the open site automatically when the API recovers', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    render(
      <HelmetProvider>
        <ApiAvailabilityBoundary enabled apiBaseUrl="https://api.example.test">
          <div>Property search</div>
        </ApiAvailabilityBoundary>
      </HelmetProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByRole('status')).toHaveTextContent('We’re upgrading Property Listify');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('Property search')).toBeInTheDocument();
    expect(screen.queryByText('We’re upgrading Property Listify')).not.toBeInTheDocument();
  });
});
