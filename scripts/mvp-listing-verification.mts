import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:5000';
const readiness = await (await fetch(`${base}/api/readiness`)).json();
assert.equal(readiness.db.targetClass, 'disposable-worktree');
assert.equal(
  readiness.db.targetFingerprintHash,
  'a560e9f2971e7676be194015ed933f1964e0948c5fd44d5844a74dcbf494e321',
);
async function post(path: string, body: unknown, cookie = '') {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
}
async function login(email: string) {
  const password = `Mvp!${randomUUID()}`;
  await post('/api/auth/forgot-password', { email });
  const log = readFileSync('/tmp/listify-mvp-577-runtime.log', 'utf8');
  const token = [...log.matchAll(/Reset URL: .*?token=([a-f0-9]+)/g)].at(-1)![1];
  assert.equal(
    (await post('/api/auth/reset-password', { token, newPassword: password })).status,
    200,
  );
  const response = await post('/api/auth/login', { email, password });
  assert.equal(response.status, 200, `Fixture login: ${email}`);
  return response.headers.get('set-cookie')!.split(';')[0];
}
async function rpc(name: string, input: unknown, cookie: string, mutation = false) {
  const response = mutation
    ? await post(`/api/trpc/${name}`, { json: input }, cookie)
    : await fetch(
        `${base}/api/trpc/${name}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
        { headers: { cookie } },
      );
  const body = await response.json();
  return {
    status: response.status,
    data: body.result?.data?.json,
    error: body.error?.json?.message,
  };
}
const owner = await login('dba-agent@invalid.example');
const outsider = await login('dba-unrelated-agent@invalid.example');
const created = await rpc(
  'listing.create',
  {
    action: 'sell',
    propertyType: 'house',
    title: 'MVP persisted verification home',
    description:
      'A task-owned verification listing used to prove saved authoring data and private content boundaries.',
    pricing: { askingPrice: 1250000 },
    propertyDetails: { bedrooms: 3, bathrooms: 2 },
    location: {
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
      provinceId: 3,
      cityId: 1,
      suburbId: 1,
    },
    mediaIds: [],
    status: 'draft',
  },
  owner,
  true,
);
assert.equal(created.status, 200, JSON.stringify(created));
const id = created.data.id;
assert.equal(
  (await rpc('listing.getById', { id }, owner)).data.property.title,
  'MVP persisted verification home',
);
const updated = await rpc(
  'listing.update',
  { id, title: 'MVP edited verification home' },
  owner,
  true,
);
assert.equal(updated.status, 200, JSON.stringify(updated));
assert.equal(
  (await rpc('listing.getById', { id }, owner)).data.property.title,
  'MVP edited verification home',
);
const deniedRead = await rpc('listing.getById', { id }, outsider);
assert.equal(deniedRead.status, 403);
const deniedWrite = await rpc(
  'listing.update',
  { id, title: 'Unauthorized outsider overwrite' },
  outsider,
  true,
);
assert.equal(deniedWrite.status, 403);
assert.equal(
  (await rpc('listing.getById', { id }, owner)).data.property.title,
  'MVP edited verification home',
);
const preflight = await rpc('listing.getSubmissionPreflight', undefined, owner);
assert.equal(preflight.status, 200, JSON.stringify(preflight));
assert.equal(preflight.data.canPrepareDraft, true);
assert.equal(preflight.data.canStartListing, false);
assert.ok(
  preflight.data.blockers.some(
    (blocker: { code: string }) => blocker.code === 'subscription_required',
  ),
);
const submit = await rpc('listing.submitForReview', { listingId: id }, owner, true);
console.log(
  JSON.stringify(
    {
      listingId: id,
      authoring: 'PASS: created, reopened, edited, reopened',
      crossTenant: 'PASS: read and write denied; persisted title unchanged',
      preflight,
      submit,
    },
    null,
    2,
  ),
);
