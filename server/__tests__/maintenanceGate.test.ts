import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAINTENANCE_READINESS_CACHE_TTL_MS,
  maintenanceResponseForRequest,
} from '../maintenanceGate';

function documentRequest() {
  return new Request('https://propertylistifysa.co.za/property-for-sale', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  });
}

const production = {
  environment: 'production',
  apiBaseUrl: 'https://api.propertylistifysa.co.za',
  probeOptions: { retryDelayMs: 0 },
};

afterEach(() => vi.useRealTimers());

describe('production API maintenance gate', () => {
  it('passes document requests through when readiness is healthy', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    const response = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      fetcher,
    });

    expect(response).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.propertylistifysa.co.za/api/readiness',
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    );
  });

  it('returns a noindex 503 maintenance page after readiness fails twice', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    const response = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      fetcher,
    });

    expect(response?.status).toBe(503);
    expect(response?.headers.get('retry-after')).toBe('120');
    expect(response?.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
    expect(response?.headers.get('cache-control')).toContain('no-store');
    expect(await response?.text()).toContain('We’re upgrading Property Listify');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries a slow first response before deciding to show maintenance', async () => {
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

    const responsePromise = maintenanceResponseForRequest(documentRequest(), {
      ...production,
      fetcher,
    });
    await vi.advanceTimersByTimeAsync(1500 + 250);

    expect(await responsePromise).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns to the normal site on the next request after API recovery', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const unavailable = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      fetcher,
    });
    const stillUnavailable = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      fetcher,
    });
    await vi.advanceTimersByTimeAsync(MAINTENANCE_READINESS_CACHE_TTL_MS);
    const recovered = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      fetcher,
    });

    expect(unavailable?.status).toBe(503);
    expect(stillUnavailable?.status).toBe(503);
    expect(recovered).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('caches readiness for three seconds and then probes again', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const options = {
      ...production,
      apiBaseUrl: 'https://maintenance-cache.example',
      fetcher,
      probeOptions: { attempts: 1, timeoutMs: 100, retryDelayMs: 0 },
    };

    await maintenanceResponseForRequest(documentRequest(), options);
    await maintenanceResponseForRequest(documentRequest(), options);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(MAINTENANCE_READINESS_CACHE_TTL_MS);
    await maintenanceResponseForRequest(documentRequest(), options);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('allows a Preview-scoped opt-in while leaving previews off by default', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    const response = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      environment: 'preview',
      previewGateEnabled: true,
      apiBaseUrl: 'https://maintenance-preview.example',
      fetcher,
    });

    expect(response?.status).toBe(503);
    expect(response?.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not gate previews, assets, or non-document requests', async () => {
    const fetcher = vi.fn();
    const preview = await maintenanceResponseForRequest(documentRequest(), {
      ...production,
      environment: 'preview',
      fetcher,
    });
    const asset = await maintenanceResponseForRequest(
      new Request('https://propertylistifysa.co.za/assets/app.js', {
        headers: { accept: '*/*' },
      }),
      { ...production, fetcher },
    );

    expect(preview).toBeNull();
    expect(asset).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
