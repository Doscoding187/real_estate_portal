import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Exercise the real local HTTP boundary. Tokens stay in memory and are read
// only from the application's existing private development email sink.
const base = 'http://127.0.0.1:5000';
const readiness = await (await fetch(`${base}/api/readiness`)).json();
assert.equal(readiness.db.targetClass, 'disposable-worktree');
assert.equal(
  readiness.db.targetFingerprintHash,
  'a560e9f2971e7676be194015ed933f1964e0948c5fd44d5844a74dcbf494e321',
);
const email = `mvp-${randomUUID()}@invalid.example`;
const password = `Mvp!${randomUUID()}`;
const newPassword = `Reset!${randomUUID()}`;
const results: string[] = [];
async function post(path: string, body: unknown, cookie = '') {
  return fetch(`${base}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function localToken(kind: 'Verification' | 'Reset') {
  const log = readFileSync('/tmp/listify-mvp-577-runtime.log', 'utf8');
  const matches = [...log.matchAll(new RegExp(`${kind} URL: .*?token=([a-f0-9]+)`, 'g'))];
  assert.ok(matches.length, 'Development email sink must contain a token');
  return matches.at(-1)![1];
}
function check(name: string, actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected, name);
  results.push(name);
}
check(
  'weak password rejected',
  (await post('/api/auth/register', { email, password: 'weak' })).status,
  400,
);
check(
  'registration succeeds',
  (await post('/api/auth/register', { email, password, role: 'super_admin' })).status,
  201,
);
check('unverified login denied', (await post('/api/auth/login', { email, password })).status, 401);
const token = localToken('Verification');
check(
  'verification completes',
  (await fetch(`${base}/api/auth/verify-email?token=${token}`, { redirect: 'manual' })).status,
  302,
);
check(
  'verification token replay denied',
  (await fetch(`${base}/api/auth/verify-email?token=${token}`, { redirect: 'manual' })).status,
  400,
);
const login = await post('/api/auth/login', { email, password });
check('verified login succeeds', login.status, 200);
const cookie = login.headers.get('set-cookie')!.split(';')[0];
assert.ok(cookie);
const me = await fetch(`${base}/api/trpc/auth.me`, { headers: { cookie } });
const identity = await me.json();
check('self-assigned super-admin denied', identity.result.data.json.role, 'visitor');
check('logout succeeds', (await post('/api/auth/logout', {}, cookie)).status, 200);
check(
  'anonymous session has no user',
  (await (await fetch(`${base}/api/trpc/auth.me`)).json()).result.data.json,
  null,
);
const known = await (await post('/api/auth/forgot-password', { email })).json();
const reset = localToken('Reset');
const unknown = await (
  await post('/api/auth/forgot-password', { email: `absent-${randomUUID()}@invalid.example` })
).json();
check('recovery response resists enumeration', known, unknown);
check(
  'reset completes',
  (await post('/api/auth/reset-password', { token: reset, newPassword })).status,
  200,
);
check(
  'reset token replay denied',
  (await post('/api/auth/reset-password', { token: reset, newPassword })).status,
  400,
);
check('old password denied', (await post('/api/auth/login', { email, password })).status, 401);
check(
  'new password succeeds',
  (await post('/api/auth/login', { email, password: newPassword })).status,
  200,
);
check(
  'pre-reset session revoked',
  (await (await fetch(`${base}/api/trpc/auth.me`, { headers: { cookie } })).json()).result.data
    .json,
  null,
);
console.log(
  JSON.stringify(
    {
      boundary: 'Local HTTP and development email sink; no external email delivery proof',
      checks: results,
    },
    null,
    2,
  ),
);
