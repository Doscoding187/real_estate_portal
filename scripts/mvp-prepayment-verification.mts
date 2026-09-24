import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

const base = 'http://127.0.0.1:5000';
const emailCapturePath = process.env.PROPERTY_LISTIFY_GOVERNED_B04_EMAIL_CAPTURE_PATH ||
  '/tmp/property-listify-b04-prepayment-browser-email-capture.jsonl';
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
function latestVerificationToken(): string | null {
  if (!/^\/tmp\/property-listify-b04-[a-z0-9._-]+\.jsonl$/i.test(emailCapturePath)) return null;
  try {
    if ((statSync(emailCapturePath).mode & 0o777) !== 0o600) return null;
    const messages = readFileSync(emailCapturePath, 'utf8').split('\n').filter(Boolean)
      .flatMap(line => {
        try {
          const value = JSON.parse(line) as { kind?: string; verificationUrl?: string };
          return value.kind === 'agent_verification' && value.verificationUrl ? [value] : [];
        } catch { return []; }
      });
    return new URL(messages.at(-1)?.verificationUrl || 'http://localhost').searchParams.get('token');
  } catch {
    return null;
  }
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
  const token = latestVerificationToken();
  assert.ok(token, 'No verification message was found in the private governed capture.');
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
async function rpcPrecondition(path: string, input: unknown, cookie: string) {
  const response = await post(`/api/trpc/${path}`, { json: input }, cookie);
  const body = await response.json();
  assert.equal(response.status, 412, JSON.stringify(body));
  const error = body.error?.json ?? body.error;
  assert.equal(error?.data?.code, 'PRECONDITION_FAILED', JSON.stringify(body));
  assert.match(String(error?.message || ''), /preparation-only onboarding/i);
}
async function httpPrecondition(path: string, body: unknown, cookie: string) {
  const response = await post(path, body, cookie);
  const payload = await response.json();
  assert.equal(response.status, 409, JSON.stringify(payload));
  assert.match(String(payload?.error || ''), /preparation-only onboarding/i);
}
const commercialActivation = await rpc('billing.commercialActivation', undefined, '');
assert.equal(commercialActivation.mode, 'preparation_only');
assert.equal(commercialActivation.enabled, false);
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
await rpcPrecondition('billing.requestLaunchAccessInvoice', {}, agent.cookie);
await httpPrecondition('/api/agent/request-launch-access-invoice', {}, agent.cookie);
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
await rpcPrecondition(
  'billing.startManualEftCheckout',
  { planId: 2, billingCycle: 'monthly' },
  agency.cookie,
);
await rpcPrecondition(
  'billing.createCheckoutSession',
  { planId: 2, billingCycle: 'monthly' },
  agency.cookie,
);
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
await rpcPrecondition('billing.requestDeveloperLaunchAccessInvoice', undefined, developer.cookie);
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
      paymentAndActivationContainment: 'PASS',
      agencyId: created.agencyId,
      developerDraftId: draft.id,
      boundary:
        'Task-local HTTP; invoice/checkout requests were deliberately rejected before any invoice, payment, entitlement mutation or publishing call.',
    },
    null,
    2,
  ),
);
