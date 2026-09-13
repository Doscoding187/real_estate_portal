import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
const base = 'http://127.0.0.1:5000';
const ready = await (await fetch(`${base}/api/readiness`)).json();
assert.equal(
  ready.db.targetFingerprintHash,
  'a560e9f2971e7676be194015ed933f1964e0948c5fd44d5844a74dcbf494e321',
);
async function post(path: string, body: unknown, cookie = '') {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}
async function account(role: string) {
  const email = `prepare-${randomUUID()}@invalid.example`;
  const password = `Prepare!${randomUUID()}`;
  const response = await post('/api/auth/register', {
    email,
    password,
    role,
    agentProfile:
      role === 'agent' ? { displayName: 'Preparation Agent', phone: '+27820000000' } : undefined,
  });
  assert.equal(response.status, 201);
  const token = [
    ...readFileSync('/tmp/listify-mvp-577-runtime.log', 'utf8').matchAll(
      /Verification URL: .*?token=([a-f0-9]+)/g,
    ),
  ].at(-1)![1];
  assert.equal(
    (await fetch(`${base}/api/auth/verify-email?token=${token}`, { redirect: 'manual' })).status,
    302,
  );
  const login = await post('/api/auth/login', { email, password });
  assert.equal(login.status, 200);
  return { email, cookie: login.headers.get('set-cookie')!.split(';')[0] };
}
async function rpc(path: string, input: unknown, cookie: string, mutation = false) {
  const response = mutation
    ? await post(`/api/trpc/${path}`, { json: input }, cookie)
    : await fetch(
        `${base}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
        { headers: { cookie } },
      );
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.result.data.json;
}
const agent = await account('agent');
await rpc(
  'agent.updateMyProfileOnboarding',
  {
    displayName: 'Preparation Agent',
    phone: '+27820000000',
    bio: 'Preparing a professional presence before commercial activation.',
  },
  agent.cookie,
  true,
);
const preflight = await rpc('listing.getSubmissionPreflight', undefined, agent.cookie);
assert.equal(preflight.canPrepareDraft, true);
assert.equal(preflight.canStartListing, false);
const agency = await account('agency_admin');
const agencyInput = {
  basicInfo: {
    name: `Preparation ${randomUUID()}`,
    description: 'A prospective agency preparing its professional presence.',
    email: agency.email,
    phone: '+27820000001',
    address: '10 Example Street',
    city: 'Johannesburg',
    province: 'Gauteng',
  },
  branding: {
    primaryColor: '#123456',
    secondaryColor: '#654321',
    companyName: 'Preparation Agency',
  },
  teamEmails: [],
  planId: 2,
};
const created = await rpc('agency.createOnboarding', agencyInput, agency.cookie, true);
const resumed = await rpc('agency.createOnboarding', agencyInput, agency.cookie, true);
assert.equal(resumed.agencyId, created.agencyId);
assert.equal(resumed.alreadyCreated, true);
const status = await rpc('agency.getOnboardingStatus', undefined, agency.cookie);
assert.equal(status.fullFeaturesUnlocked, false);
const developer = await account('property_developer');
await rpc(
  'developer.createProfile',
  {
    name: 'Preparation Developer',
    email: developer.email,
    city: 'Johannesburg',
    province: 'Gauteng',
  },
  developer.cookie,
  true,
);
const draft = await rpc(
  'developer.saveDraft',
  { draftData: { developmentData: { name: 'Preparation development' }, currentPhase: 1 } },
  developer.cookie,
  true,
);
assert.ok(draft.id > 0);
const reopened = await rpc('developer.getDraft', { id: draft.id }, developer.cookie);
assert.equal(reopened.draftData.developmentData.name, 'Preparation development');
await rpc(
  'developer.saveDraft',
  {
    id: draft.id,
    draftData: { developmentData: { name: 'Resumed preparation' }, currentPhase: 2 },
  },
  developer.cookie,
  true,
);
assert.equal(
  (await rpc('developer.getDraft', { id: draft.id }, developer.cookie)).draftData.developmentData
    .name,
  'Resumed preparation',
);
console.log(
  JSON.stringify(
    {
      agentProfileAndDraftReadiness: 'PASS',
      agencyProfileAndIdempotentResume: 'PASS',
      agencyCommercialFeatures: status.fullFeaturesUnlocked,
      developerDraftSaveReopenEdit: 'PASS',
      agencyId: created.agencyId,
      developerDraftId: draft.id,
      boundary: 'Task-local HTTP; no invoice, payment or publishing called',
    },
    null,
    2,
  ),
);
