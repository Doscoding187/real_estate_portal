import type { NextFunction, Request, Response } from 'express';
import { resolveAppRuntimeEnv, type AppRuntimeEnv } from './runtimeBootstrap';

const PUBLIC_APP_ORIGIN_KEYS = [
  'APP_URL',
  'FRONTEND_URL',
  'BASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'VITE_APP_URL',
] as const;

const API_ORIGIN_KEYS = ['VITE_API_URL', 'VITE_API_BASE_URL', 'API_URL'] as const;

const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3009',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3009',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
] as const;

export type BrowserSecurityPolicy = {
  runtimeEnv: AppRuntimeEnv;
  allowedCorsOrigins: ReadonlySet<string>;
  allowedStateChangingOrigins: ReadonlySet<string>;
  configurationErrors: readonly string[];
};

function readValues(env: NodeJS.ProcessEnv, keys: readonly string[]) {
  return keys.flatMap(key => {
    const value = String(env[key] || '').trim();
    return value ? [{ key, value }] : [];
  });
}

function parseConfiguredOrigin(
  value: string,
  label: string,
  runtimeEnv: AppRuntimeEnv,
): { origin: string | null; error: string | null } {
  try {
    const parsed = new URL(value);
    const mustUseHttps = runtimeEnv === 'production' || runtimeEnv === 'staging';

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { origin: null, error: `${label} must use http or https.` };
    }
    if (parsed.hostname.includes('*')) {
      return {
        origin: null,
        error: `${label} must name one exact host; wildcards are not allowed.`,
      };
    }
    if (mustUseHttps && parsed.protocol !== 'https:') {
      return { origin: null, error: `${label} must use https outside local development.` };
    }
    if (parsed.username || parsed.password) {
      return { origin: null, error: `${label} must not contain credentials.` };
    }
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return { origin: null, error: `${label} must be an origin without a path, query, or hash.` };
    }
    return { origin: parsed.origin, error: null };
  } catch {
    return { origin: null, error: `${label} must be a valid absolute origin.` };
  }
}

function parseRequestOrigin(value: string | undefined): string | null {
  if (!value || value === 'null') return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export function resolveBrowserSecurityPolicy(
  input: {
    env?: NodeJS.ProcessEnv;
    runtimeEnv?: AppRuntimeEnv;
  } = {},
): BrowserSecurityPolicy {
  const env = input.env ?? process.env;
  const runtimeEnv = input.runtimeEnv ?? resolveAppRuntimeEnv(env);
  const allowedCorsOrigins = new Set<string>();
  const allowedStateChangingOrigins = new Set<string>();
  const configurationErrors: string[] = [];

  const configuredOrigins = [
    ...readValues(env, PUBLIC_APP_ORIGIN_KEYS),
    ...String(env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value, index) => ({ key: `CORS_ALLOWED_ORIGINS[${index}]`, value: value.trim() }))
      .filter(({ value }) => value.length > 0),
  ];

  for (const { key, value } of configuredOrigins) {
    const parsed = parseConfiguredOrigin(value, key, runtimeEnv);
    if (parsed.error) {
      configurationErrors.push(parsed.error);
      continue;
    }
    allowedCorsOrigins.add(parsed.origin!);
    allowedStateChangingOrigins.add(parsed.origin!);
  }

  for (const { key, value } of readValues(env, API_ORIGIN_KEYS)) {
    const parsed = parseConfiguredOrigin(value, key, runtimeEnv);
    if (parsed.error) {
      configurationErrors.push(parsed.error);
      continue;
    }
    allowedStateChangingOrigins.add(parsed.origin!);
  }

  if (runtimeEnv === 'development' || runtimeEnv === 'test') {
    for (const origin of LOCAL_DEVELOPMENT_ORIGINS) {
      allowedCorsOrigins.add(origin);
      allowedStateChangingOrigins.add(origin);
    }
  }

  if ((runtimeEnv === 'production' || runtimeEnv === 'staging') && allowedCorsOrigins.size === 0) {
    configurationErrors.push(
      'At least one exact public application origin must be configured for browser requests.',
    );
  }

  return {
    runtimeEnv,
    allowedCorsOrigins,
    allowedStateChangingOrigins,
    configurationErrors,
  };
}

export function assertBrowserSecurityPolicy(policy: BrowserSecurityPolicy): void {
  if (
    (policy.runtimeEnv === 'production' || policy.runtimeEnv === 'staging') &&
    policy.configurationErrors.length > 0
  ) {
    throw new Error(
      `Browser security configuration is invalid: ${policy.configurationErrors.join(' ')}`,
    );
  }
}

export function isAllowedCorsOrigin(
  policy: BrowserSecurityPolicy,
  origin: string | undefined,
): boolean {
  const normalizedOrigin = parseRequestOrigin(origin);
  return normalizedOrigin !== null && policy.allowedCorsOrigins.has(normalizedOrigin);
}

export function isAllowedStateChangingOrigin(
  policy: BrowserSecurityPolicy,
  origin: string | undefined,
): boolean {
  const normalizedOrigin = parseRequestOrigin(origin);
  return normalizedOrigin !== null && policy.allowedStateChangingOrigins.has(normalizedOrigin);
}

export function createStateChangingOriginGuard(policy: BrowserSecurityPolicy) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (policy.runtimeEnv !== 'production' && policy.runtimeEnv !== 'staging') {
      next();
      return;
    }

    if (!req.path.startsWith('/api') || !isUnsafeMethod(req.method)) {
      next();
      return;
    }

    const origin = req.get('origin');
    if (isAllowedStateChangingOrigin(policy, origin)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Request origin is not allowed.',
      requestId: (req as any).requestId || 'unknown',
    });
  };
}

export function applyApiSecurityHeaders(
  policy: BrowserSecurityPolicy,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.path.startsWith('/api')) {
    next();
    return;
  }

  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  if (policy.runtimeEnv === 'production' || policy.runtimeEnv === 'staging') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  if (req.path.startsWith('/api/auth/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
}
