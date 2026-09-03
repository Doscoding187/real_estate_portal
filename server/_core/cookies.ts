import type { CookieOptions, Request } from 'express';
import { resolveAppRuntimeEnv } from './runtimeBootstrap';

export function getSessionCookieOptions(
  _req: Request,
): Pick<CookieOptions, 'httpOnly' | 'path' | 'sameSite' | 'secure'> {
  const runtimeEnv = resolveAppRuntimeEnv();

  return {
    httpOnly: true,
    path: '/',
    // Host-only cookies cannot be overwritten by another subdomain. Lax keeps
    // browser sessions out of cross-site POSTs while preserving same-site API use.
    sameSite: 'lax',
    secure: runtimeEnv === 'production' || runtimeEnv === 'staging',
  };
}
