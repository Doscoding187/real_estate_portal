import { describe, expect, it, vi } from 'vitest';
import {
  applyApiSecurityHeaders,
  createStateChangingOriginGuard,
  isAllowedCorsOrigin,
  resolveBrowserSecurityPolicy,
} from './browserSecurity';

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    APP_ENV: 'production',
    APP_URL: 'https://www.propertylistifysa.co.za',
    VITE_API_URL: 'https://api.propertylistifysa.co.za',
    ...overrides,
  };
}

describe('browser security boundary', () => {
  it('allows only explicitly configured CORS origins', () => {
    const policy = resolveBrowserSecurityPolicy({
      env: productionEnv({ CORS_ALLOWED_ORIGINS: 'https://preview.propertylistify.test' }),
      runtimeEnv: 'production',
    });

    expect(isAllowedCorsOrigin(policy, 'https://www.propertylistifysa.co.za')).toBe(true);
    expect(isAllowedCorsOrigin(policy, 'https://preview.propertylistify.test')).toBe(true);
    expect(isAllowedCorsOrigin(policy, 'https://attacker.vercel.app')).toBe(false);
    expect(isAllowedCorsOrigin(policy, 'https://api.propertylistifysa.co.za')).toBe(false);
  });

  it('refuses wildcard-like configured origins', () => {
    const policy = resolveBrowserSecurityPolicy({
      env: productionEnv({ CORS_ALLOWED_ORIGINS: 'https://*.vercel.app' }),
      runtimeEnv: 'production',
    });

    expect(policy.configurationErrors).toContain(
      'CORS_ALLOWED_ORIGINS[0] must name one exact host; wildcards are not allowed.',
    );
  });

  it('rejects originless and untrusted state-changing API requests in production', () => {
    const policy = resolveBrowserSecurityPolicy({ env: productionEnv(), runtimeEnv: 'production' });
    const guard = createStateChangingOriginGuard(policy);
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const response = { status, json } as any;
    const next = vi.fn();

    guard(
      {
        method: 'POST',
        path: '/api/auth/logout',
        get: () => undefined,
        requestId: 'request-1',
      } as any,
      response,
      next,
    );

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: 'Request origin is not allowed.',
      requestId: 'request-1',
    });
    expect(next).not.toHaveBeenCalled();

    guard(
      {
        method: 'POST',
        path: '/api/auth/logout',
        get: () => 'https://www.propertylistifysa.co.za',
      } as any,
      response,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('adds non-cacheable API auth response headers without imposing them on the frontend', () => {
    const policy = resolveBrowserSecurityPolicy({ env: productionEnv(), runtimeEnv: 'production' });
    const setHeader = vi.fn();
    const next = vi.fn();

    applyApiSecurityHeaders(policy, { path: '/api/auth/login' } as any, { setHeader } as any, next);

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000');
    expect(next).toHaveBeenCalledOnce();
  });
});
