import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/functions', () => ({
  next: () => new Response('next-ok', { status: 200 }),
}));

import middleware from '../../middleware';
import { createBypassCookieValue } from '../maintenanceBypass';

const SECRET = 'a'.repeat(16) + 'B'.repeat(16) + 'c1';
const ORIGIN = 'https://www.propertylistifysa.co.za';

function docRequest(cookie?: string) {
  return new Request(`${ORIGIN}/property-for-sale`, {
    headers: { accept: 'text/html', ...(cookie ? { cookie } : {}) },
  });
}

function unlockPost(body: string, opts: { origin?: string | null; query?: string } = {}) {
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
  };
  const origin = opts.origin === undefined ? ORIGIN : opts.origin;
  if (origin !== null) headers.origin = origin;
  return new Request(`${ORIGIN}/__pl-access${opts.query ?? ''}`, {
    method: 'POST',
    headers,
    body,
  });
}

function setEnv(secret: string | undefined) {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.propertylistifysa.co.za');
  if (secret === undefined) vi.stubEnv('MAINTENANCE_BYPASS_SECRET', '');
  else vi.stubEnv('MAINTENANCE_BYPASS_SECRET', secret);
}

async function allText(res: Response) {
  const headers = [...res.headers.entries()].flat().join('\n');
  return `${headers}\n${await res.text()}`;
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('down', { status: 503 })),
  );
  setEnv(SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const nowS = () => Math.floor(Date.now() / 1000);

async function forge(exp: number, secret = SECRET) {
  const real = await createBypassCookieValue(secret, (exp - 8 * 3600) * 1000);
  return real; // valid MAC for exp
}

describe('maintenance bypass cookie', () => {
  it('1 no cookie => 503 maintenance', async () => {
    const res = await middleware(docRequest());
    expect(res.status).toBe(503);
  });

  it('2 wrong HMAC cookie => 503', async () => {
    const good = await createBypassCookieValue(SECRET);
    const bad = good.slice(0, -2) + (good.endsWith('AA') ? 'BB' : 'AA');
    expect((await middleware(docRequest(`pl_maint_bypass=${bad}`))).status).toBe(503);
    const other = await createBypassCookieValue('z'.repeat(40));
    expect((await middleware(docRequest(`pl_maint_bypass=${other}`))).status).toBe(503);
  });

  it.each([undefined, '', '   ', 'short-secret-31-chars-xxxxxxxxx'])(
    '3 unusable secret %j => cookie ignored and unlock route 404',
    async secret => {
      const cookie = await createBypassCookieValue(secret?.trim() ? secret : 'x'.repeat(40));
      setEnv(secret);
      expect((await middleware(docRequest(`pl_maint_bypass=${cookie}`))).status).toBe(503);
      expect(
        (await middleware(new Request(`${ORIGIN}/__pl-access`, { headers: { accept: 'text/html' } })))
          .status,
      ).toBe(404);
      expect((await middleware(unlockPost(`secret=${SECRET}`))).status).toBe(404);
    },
  );

  it('4 expired cookie => 503', async () => {
    const cookie = await createBypassCookieValue(SECRET, Date.now() - 9 * 3600 * 1000);
    expect((await middleware(docRequest(`pl_maint_bypass=${cookie}`))).status).toBe(503);
  });

  it('5 exp beyond now+8h => 503', async () => {
    const cookie = await createBypassCookieValue(SECRET, Date.now() + 3600 * 1000);
    expect((await middleware(docRequest(`pl_maint_bypass=${cookie}`))).status).toBe(503);
    expect(nowS()).toBeGreaterThan(0);
    expect(await forge(nowS() + 9 * 3600)).toBeTruthy();
  });

  it('6 valid cookie => no maintenance, state bypass', async () => {
    const cookie = await createBypassCookieValue(SECRET);
    const res = await middleware(docRequest(`other=1; pl_maint_bypass=${cookie}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-maintenance-gate')).toBe('bypass');
  });

  it('7 POST correct secret => 303 with hardened cookie', async () => {
    const res = await middleware(unlockPost(`secret=${encodeURIComponent(SECRET)}`));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/');
    const set = res.headers.get('set-cookie') ?? '';
    expect(set).toMatch(/^pl_maint_bypass=v1\.\d+\./);
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=28800']) {
      expect(set).toContain(attr);
    }
    expect(set).not.toMatch(/Domain/i);
    const value = set.split(';')[0]!.split('=')[1]!;
    const follow = await middleware(docRequest(`pl_maint_bypass=${value}`));
    expect(follow.headers.get('x-maintenance-gate')).toBe('bypass');
  });

  it('8 POST wrong secret => 403 no cookie', async () => {
    const res = await middleware(unlockPost('secret=nope'));
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('9 secret only in query string => 403', async () => {
    const res = await middleware(unlockPost('', { query: `?secret=${SECRET}` }));
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('10 bad or missing Origin => 403', async () => {
    for (const origin of [null, 'https://evil.example']) {
      const res = await middleware(unlockPost(`secret=${SECRET}`, { origin }));
      expect(res.status).toBe(403);
      expect(res.headers.get('set-cookie')).toBeNull();
    }
  });

  it('11 public visitor still gets maintenance after another client unlocked', async () => {
    const unlock = await middleware(unlockPost(`secret=${SECRET}`));
    expect(unlock.status).toBe(303);
    expect((await middleware(docRequest())).status).toBe(503);
  });

  it('12 malformed cookies => 503', async () => {
    const good = await createBypassCookieValue(SECRET);
    const [, exp, mac] = good.split('.');
    for (const v of [
      '',
      `${good}.extra`,
      `v1.abc.${mac}`,
      `v1.${exp}`,
      `v2.${exp}.${mac}`,
      `v1.${exp}.`,
      `v1.-5.${mac}`,
      `v1.1.5e9.${mac}`,
    ]) {
      expect((await middleware(docRequest(`pl_maint_bypass=${v}`))).status).toBe(503);
    }
  });

  it('13 secret never appears in responses', async () => {
    const responses = [
      await middleware(docRequest()),
      await middleware(unlockPost(`secret=${SECRET}`)),
      await middleware(unlockPost('secret=wrong')),
      await middleware(new Request(`${ORIGIN}/__pl-access`, { headers: { accept: 'text/html' } })),
    ];
    for (const res of responses) expect(await allText(res)).not.toContain(SECRET);
  });

  it('GET unlock page is locked down', async () => {
    const res = await middleware(new Request(`${ORIGIN}/__pl-access`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toContain("form-action 'self'");
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
