import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 15_000;

export type AuthBoundarySmokeOptions = {
  apiBaseUrl: string;
  origin: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function normalizeOrigin(value: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute http(s) URL.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use http or https.`);
  }

  return parsed.origin;
}

function resolveTimeoutMs(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_TIMEOUT_MS || parsed > MAX_TIMEOUT_MS) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
}

function responseDetail(status: number, body: string): string {
  const normalizedBody = body.trim().replace(/\s+/g, ' ');
  return `${status}${normalizedBody ? `: ${normalizedBody.slice(0, 300)}` : ''}`;
}

export function resolveAuthBoundarySmokeOptions(
  env: NodeJS.ProcessEnv = process.env,
): AuthBoundarySmokeOptions {
  const apiBaseUrl = String(
    env.AUTH_BOUNDARY_SMOKE_API_URL || env.VITE_API_URL || env.VITE_API_BASE_URL || '',
  ).trim();
  const origin = String(
    env.AUTH_BOUNDARY_SMOKE_ORIGIN ||
      env.APP_URL ||
      env.FRONTEND_URL ||
      env.NEXT_PUBLIC_APP_URL ||
      env.VITE_APP_URL ||
      '',
  ).trim();

  if (!apiBaseUrl) {
    throw new Error(
      'Set AUTH_BOUNDARY_SMOKE_API_URL (or VITE_API_URL/VITE_API_BASE_URL) before running the auth-boundary smoke check.',
    );
  }
  if (!origin) {
    throw new Error(
      'Set AUTH_BOUNDARY_SMOKE_ORIGIN (or an exact configured application origin) before running the auth-boundary smoke check.',
    );
  }

  return {
    apiBaseUrl: normalizeOrigin(apiBaseUrl, 'Auth-boundary API URL'),
    origin: normalizeOrigin(origin, 'Auth-boundary browser origin'),
    timeoutMs: resolveTimeoutMs(env.AUTH_BOUNDARY_SMOKE_TIMEOUT_MS),
  };
}

export async function runAuthBoundarySmoke(options: AuthBoundarySmokeOptions): Promise<void> {
  const apiBaseUrl = normalizeOrigin(options.apiBaseUrl, 'Auth-boundary API URL');
  const origin = normalizeOrigin(options.origin, 'Auth-boundary browser origin');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const registerUrl = new URL('/api/auth/register', apiBaseUrl).toString();
  const requestId = 'auth-boundary-release-smoke';

  const preflight = await fetchImpl(registerUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-request-id',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  assert.equal(preflight.status, 204, 'Auth registration CORS preflight must return 204.');
  assert.equal(
    preflight.headers.get('access-control-allow-origin'),
    origin,
    'Auth registration CORS preflight must allow the configured browser origin.',
  );
  assert.match(
    preflight.headers.get('access-control-allow-methods') || '',
    /(?:^|,)\s*POST\s*(?:,|$)/i,
    'Auth registration CORS preflight must allow POST.',
  );

  const registration = await fetchImpl(registerUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: origin,
      'x-request-id': requestId,
    },
    body: '{}',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await registration.text();

  assert.equal(
    registration.status,
    400,
    `Auth registration must reach request validation, not hang or fail at its boundary (received ${responseDetail(registration.status, body)}).`,
  );
  assert.equal(
    registration.headers.get('access-control-allow-origin'),
    origin,
    'Auth registration response must retain the configured CORS origin.',
  );
  assert.equal(
    registration.headers.get('x-request-id'),
    requestId,
    'Auth registration response must preserve the smoke request ID.',
  );

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error('Auth registration validation response must be JSON.');
  }
  assert.deepEqual(payload, { error: 'Email and password are required' });
}

async function main() {
  const options = resolveAuthBoundarySmokeOptions();
  await runAuthBoundarySmoke(options);
  console.log(
    '[AuthBoundarySmoke] CORS preflight and fail-closed auth registration boundary passed.',
  );
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
