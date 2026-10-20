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
  it('serves an explicit document for every pilot guide route', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    for (const path of ['gauteng', 'gauteng/johannesburg', 'gauteng/johannesburg/sandton']) {
      const route = config.routes.find(candidate => candidate.src === `/${path}/?`);
      expect(route, `expected an explicit route for /${path}`).toBeDefined();
      expect(route!.dest).toBe(`/${path}/index.html`);
    }
  });

  it('keeps the generic application shell as the last resort', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    const shellIndex = config.routes.findIndex(route => route.dest === '/index.html');
    expect(shellIndex).toBeGreaterThan(-1);
    for (const path of ['gauteng', 'gauteng/johannesburg', 'gauteng/johannesburg/sandton']) {
      const guideIndex = config.routes.findIndex(route => route.src === `/${path}/?`);
      expect(guideIndex).toBeGreaterThan(-1);
      expect(guideIndex).toBeLessThan(shellIndex);
    }
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

  it('keeps the production Git trigger closed until the recorded release step', async () => {
    const config = await loadVercelConfig({
      VERCEL_ENV: 'production',
      VITE_DEPLOY_ENV: 'production',
    });

    expect(config.git.deploymentEnabled.main).toBe(false);
  });
});
