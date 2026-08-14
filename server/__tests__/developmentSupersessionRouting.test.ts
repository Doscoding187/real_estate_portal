import { describe, expect, it, vi } from 'vitest';
import {
  probeDevelopmentSupersession,
  resolveCanonicalDevelopmentRedirect,
} from '../../shared/developmentSupersessionRouting';

describe('public development supersession routing', () => {
  it('accepts only a different canonical development path on the public origin', () => {
    const request = new URL('https://www.propertylistifysa.co.za/development/old?source=search');

    expect(resolveCanonicalDevelopmentRedirect(request, '/development/new?source=search')).toBe(
      '/development/new?source=search',
    );
    expect(resolveCanonicalDevelopmentRedirect(request, '/development/old')).toBeNull();
    expect(
      resolveCanonicalDevelopmentRedirect(request, 'https://evil.example/development/new'),
    ).toBeNull();
    expect(
      resolveCanonicalDevelopmentRedirect(request, '//evil.example/development/new'),
    ).toBeNull();
    expect(resolveCanonicalDevelopmentRedirect(request, '/admin')).toBeNull();
  });

  it('relays a reversible backend redirect without following it', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, {
          status: 307,
          headers: { Location: '/development/canonical?source=search' },
        }),
    );

    await expect(
      probeDevelopmentSupersession({
        requestUrl: new URL(
          'https://www.propertylistifysa.co.za/development/historical?source=search',
        ),
        apiOrigin: 'https://api.propertylistifysa.co.za',
        fetchImpl,
      }),
    ).resolves.toBe('/development/canonical?source=search');

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://api.propertylistifysa.co.za/development/historical?source=search'),
      expect.objectContaining({ method: 'HEAD', redirect: 'manual' }),
    );
  });

  it.each([200, 404, 308, 500])('continues to the SPA for backend status %s', async status => {
    await expect(
      probeDevelopmentSupersession({
        requestUrl: new URL('https://www.propertylistifysa.co.za/development/ordinary'),
        apiOrigin: 'https://api.propertylistifysa.co.za',
        fetchImpl: vi.fn(async () => new Response(null, { status })),
      }),
    ).resolves.toBeNull();
  });

  it('fails safely without recursing or hiding the SPA', async () => {
    const fetchImpl = vi.fn();
    await expect(
      probeDevelopmentSupersession({
        requestUrl: new URL('https://www.propertylistifysa.co.za/development/ordinary'),
        apiOrigin: 'https://www.propertylistifysa.co.za',
        fetchImpl,
      }),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(
      probeDevelopmentSupersession({
        requestUrl: new URL('https://www.propertylistifysa.co.za/development/ordinary'),
        apiOrigin: 'https://api.propertylistifysa.co.za',
        fetchImpl: vi.fn(async () => {
          throw new Error('offline');
        }),
      }),
    ).resolves.toBeNull();
  });
});
