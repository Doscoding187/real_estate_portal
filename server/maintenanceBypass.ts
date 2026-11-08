// TEMPORARY: private maintenance bypass cookie for the IP-restricted launch phase.
// Remove after launch (revert PR + delete MAINTENANCE_BYPASS_SECRET). Edge-safe: crypto.subtle only.
// The secret is read only in middleware.ts and passed in; it is never logged or echoed.

export const MAINTENANCE_BYPASS_COOKIE = 'pl_maint_bypass';
export const MAINTENANCE_BYPASS_PATH = '/__pl-access';
export const MAINTENANCE_BYPASS_MAX_AGE_SECONDS = 8 * 60 * 60;
const MIN_SECRET_LENGTH = 32;
const SKEW_SECONDS = 60;
const MAX_BODY_BYTES = 1024;
const COOKIE_PREFIX = 'pl-maint-bypass.v1.';
const encoder = new TextEncoder();

export function usableBypassSecret(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.trim() === '' || raw.length < MIN_SECRET_LENGTH) return null;
  return raw;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(key: string, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

function constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

export async function secretsMatch(submitted: string, secret: string): Promise<boolean> {
  const fixedKey = 'pl-maint-bypass.compare';
  return constantTimeEqual(await hmac(fixedKey, submitted), await hmac(fixedKey, secret));
}

export async function createBypassCookieValue(
  secret: string,
  nowMs: number = Date.now(),
): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + MAINTENANCE_BYPASS_MAX_AGE_SECONDS;
  const mac = toBase64Url(await hmac(secret, COOKIE_PREFIX + exp));
  return `v1.${exp}.${mac}`;
}

export async function isValidBypassCookieValue(
  value: string,
  secret: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const [, expText, mac] = parts as [string, string, string];
  if (!/^[0-9]{1,12}$/.test(expText)) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(mac)) return false;
  const exp = Number(expText);
  const now = Math.floor(nowMs / 1000);
  if (!Number.isInteger(exp) || now >= exp) return false;
  if (exp > now + MAINTENANCE_BYPASS_MAX_AGE_SECONDS + SKEW_SECONDS) return false;
  const expected = toBase64Url(await hmac(secret, COOKIE_PREFIX + exp));
  return constantTimeEqual(encoder.encode(expected).buffer, encoder.encode(mac).buffer);
}

export async function requestHasValidBypassCookie(
  request: Request,
  secret: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const header = request.headers.get('cookie');
  if (!header) return false;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() !== MAINTENANCE_BYPASS_COOKIE) continue;
    if (await isValidBypassCookieValue(part.slice(idx + 1).trim(), secret, nowMs)) return true;
  }
  return false;
}

const UNLOCK_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="robots" content="noindex, nofollow" /><title>Access</title>
<style>body{font-family:system-ui,sans-serif;padding:48px;max-width:360px;margin:auto}input,button{display:block;width:100%;margin-top:12px;padding:10px;font-size:1rem}</style></head>
<body><form method="POST" action="${MAINTENANCE_BYPASS_PATH}" autocomplete="off"><input type="password" name="secret" autocomplete="off" required /><button type="submit">Continue</button></form></body></html>`;

function denied(): Response {
  return new Response('Not allowed', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleBypassUnlockRequest(
  request: Request,
  secret: string | null,
  nowMs: number = Date.now(),
): Promise<Response> {
  if (secret === null) return new Response('Not found', { status: 404 });

  if (request.method === 'GET') {
    return new Response(UNLOCK_PAGE, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    });
  }
  if (request.method !== 'POST') return denied();

  try {
    const url = new URL(request.url);
    if (request.headers.get('origin') !== url.origin) return denied();
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('application/x-www-form-urlencoded')) return denied();
    const body = await request.text();
    if (encoder.encode(body).length > MAX_BODY_BYTES) return denied();
    const submitted = new URLSearchParams(body).get('secret');
    if (submitted === null || !(await secretsMatch(submitted, secret))) return denied();

    const value = await createBypassCookieValue(secret, nowMs);
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/',
        'Cache-Control': 'no-store',
        'Set-Cookie': `${MAINTENANCE_BYPASS_COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAINTENANCE_BYPASS_MAX_AGE_SECONDS}`,
      },
    });
  } catch {
    return denied();
  }
}
