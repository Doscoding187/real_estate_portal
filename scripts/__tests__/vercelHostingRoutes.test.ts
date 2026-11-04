import { describe, expect, it, vi } from 'vitest';

type Route = { src: string; dest: string; headers?: Record<string, string> };

async function loadVercelConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const module = await import('../../vercel');
  return module.config as unknown as {
    git: { deploymentEnabled: Record<string, boolean> };
    routes: Route[];
  };
}

describe('hosting route contract', () => {
  it('serves the national entry document and routes canonical Place paths through the app', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    expect(config.routes.find(route => route.src === '/south-africa/?')).toMatchObject({
      dest: '/south-africa/index.html',
    });
    expect(config.routes.at(-1)).toMatchObject({ src: '/(.*)', dest: '/index.html' });
    for (const path of ['/gauteng', '/gauteng/johannesburg', '/gauteng/johannesburg/sandton']) {
      expect(config.routes.some(route => route.src === `${path}/?`)).toBe(false);
    }
  });

  it('does not keep static province, city or suburb guide documents', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    const explicitGuideDocuments = config.routes.filter(route =>
      /^\/[^/]+\/index\.html$/.test(route.dest),
    );
    expect(explicitGuideDocuments).toEqual([
      expect.objectContaining({ src: '/south-africa/?', dest: '/south-africa/index.html' }),
    ]);
    expect(config.routes.at(-1)).toMatchObject({ src: '/(.*)', dest: '/index.html' });
  });

  it('proxies the public sitemap index and the guide sitemap to the production API', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    const index = config.routes.find(route => route.src === '/sitemap.xml');
    expect(index?.dest).toBe('https://api.propertylistifysa.co.za/sitemap.xml');
    const guides = config.routes.find(route => route.src === '/sitemap-(.*)\\.xml');
    expect(guides?.dest).toBe('https://api.propertylistifysa.co.za/sitemap-$1.xml');
  });

  it('keeps non-production deployments out of the index', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'preview',
      VITE_DEPLOY_ENV: 'preview',
    });

    const headerRoute = config.routes.find(route => route.headers?.['X-Robots-Tag']);
    expect(headerRoute?.headers?.['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(config.routes.some(route => route.dest?.includes('api.propertylistifysa.co.za'))).toBe(
      false,
    );
  });

  it('keeps the production Git trigger enabled for the recorded release step', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    expect(config.git.deploymentEnabled.main).toBe(true);
  });
});
