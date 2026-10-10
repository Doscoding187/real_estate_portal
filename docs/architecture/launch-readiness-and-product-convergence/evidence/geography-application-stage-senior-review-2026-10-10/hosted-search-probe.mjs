/** Prepared attended query-only probe. No automatic load escalation or retry. */
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import superjson from 'superjson';

const source = '57ea5f5e98ff031a4d0f0814998e60fe27a82b2b';
const fingerprint = 'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced';
const north = 'pl-place-01-6a145c6d642ba208a2c12de7';
const accepted = JSON.parse(readFileSync(new URL('./accepted-target.json', import.meta.url)));
const origin = process.env.HOSTED_SEARCH_API_ORIGIN;
const concurrency = Number(process.env.HOSTED_SEARCH_CONCURRENCY || '1');
const repeats = Number(process.env.HOSTED_SEARCH_REPEATS || '4');
if (origin !== 'https://api.propertylistifysa.co.za' ||
    ![1, 5, 20].includes(concurrency) || !Number.isInteger(repeats) || repeats < 1 || repeats > 10) {
  throw new Error('Require exact production API origin, concurrency 1/5/20 and repeats 1..10.');
}
const startedAt = new Date().toISOString();
async function endpoint(path) {
  const response = await fetch(new URL(path, origin), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (response.status !== 200) throw new Error(`Guard endpoint HTTP ${response.status}`);
  return response.json();
}
const version = await endpoint('/api/version');
const readiness = await endpoint('/api/readiness');
if (version.gitSha !== source || version.env !== 'production' || readiness.ok !== true ||
    readiness.env !== 'production' || readiness.build?.sha !== source ||
    readiness.db?.applicationReady !== true || readiness.db?.targetFingerprintHash !== fingerprint) {
  throw new Error('Pinned source/production/readiness/target guard failed.');
}
const requestEvents = [];
const safeIdentity = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,200}$/.test(value) ? value : null;
const client = createTRPCProxyClient({ links: [httpLink({ url: `${origin}/api/trpc`, transformer: superjson,
  fetch: async (url, options) => {
    const event = { startedAt: new Date().toISOString(), procedure: new URL(url).pathname.split('/').pop(), status: null, railwayRequestId: null, applicationRequestId: null, responseReceived: false };
    requestEvents.push(event);
    try {
      const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(8000) });
      event.status = response.status;
      event.responseReceived = true;
      event.railwayRequestId = safeIdentity(response.headers.get('x-railway-request-id'));
      event.applicationRequestId = safeIdentity(response.headers.get('x-request-id'));
      return response;
    } finally { event.completedAt = new Date().toISOString(); }
  },
})] });
const heldRefusals = [];
for (const placeId of accepted.representativeHeldIds) {
  const result = await client.placeAuthority.execute.query({ placeId });
  if (result.ok !== false || !result.reason) throw new Error('Held Place was not refused');
  heldRefusals.push({ placeId, reason: result.reason });
}
let mixedAuthorityRefused = false;
try {
  await client.properties.searchPublicInventory.query({ canonicalPlaceId: north, listingType: 'sale', province: 'Gauteng' });
} catch (error) {
  if (error.data?.code !== 'BAD_REQUEST') throw new Error('Mixed-authority case failed without a BAD_REQUEST refusal');
  mixedAuthorityRefused = true;
}
if (!mixedAuthorityRefused) throw new Error('Mixed-authority query was accepted');
const cases = [
  { name: 'north-sale', input: { canonicalPlaceId: north, listingType: 'sale' } },
  { name: 'north-rent', input: { canonicalPlaceId: north, listingType: 'rent' } },
  { name: 'north-house-page', input: { canonicalPlaceId: north, listingType: 'sale', propertyType: 'house', page: 1, pageSize: 5 } },
  { name: 'north-impossible-price', input: { canonicalPlaceId: north, listingType: 'sale', minPrice: Number.MAX_SAFE_INTEGER } },
  { name: 'bryanston-sale', input: { canonicalPlaceId: 'pl-place-01-f175328139bb845a4645b9d4', listingType: 'sale' } },
  { name: 'johannesburg-exact-city', input: { canonicalPlaceId: 'pl-place-01-21f154cd5d0954c29ec7525f', listingType: 'sale' } },
  ...accepted.provinceIds.map(id => ({ name: `province-${id}`, input: { canonicalPlaceId: id, listingType: 'sale' } })),
];
const jobs = Array.from({ length: repeats }, () => cases).flat();
let next = 0;
let halted = false;
const observations = [];
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (!halted && next < jobs.length) {
    const item = jobs[next++];
    const start = performance.now();
    let result;
    try { result = await client.properties.searchPublicInventory.query(item.input); }
    catch (error) { halted = true; observations.push({ case: item.name, latencyMs: performance.now() - start, error: 'request-failed', refusalCode: safeIdentity(error.data?.code) }); continue; }
    const cards = result.cards;
    const semanticIssues = [];
    if (!Array.isArray(cards) || !Number.isFinite(result.total)) semanticIssues.push('response-shape');
    if (result.canonicalPlaceContext?.canonicalPlaceId !== item.input.canonicalPlaceId) semanticIssues.push('scope-identity');
    if (item.name === 'north-impossible-price' && result.total !== 0) semanticIssues.push('impossible-price-not-empty');
    if (item.input.canonicalPlaceId === north && Array.isArray(cards) && cards.some(card => card.canonicalPlaceId !== north)) semanticIssues.push('locality-widened');
    if (Array.isArray(cards) && cards.some(card => !card.canonicalPlaceId || !card.href)) semanticIssues.push('card-identity');
    if (semanticIssues.length) halted = true;
    observations.push({ case: item.name, latencyMs: performance.now() - start, total: result.total,
      bytes: Buffer.byteLength(JSON.stringify(result)), semanticIssues,
      cardIdentities: (Array.isArray(cards) ? cards : []).map(card => ({ propertyId: card.propertyId, canonicalPlaceId: card.canonicalPlaceId, href: card.href })),
    });
  }
}));
function distribution(rows) {
  const sorted = rows.map(row => row.latencyMs).sort((a, b) => a - b);
  const q = p => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? null;
  return { count: sorted.length, p50Ms: q(.5), p95Ms: q(.95), p99Ms: q(.99), maxMs: q(1) };
}
const success = observations.filter(row => !row.error);
const latency = distribution(success);
const issues = [];
if (observations.some(row => row.error || row.semanticIssues?.length)) issues.push('request-or-semantic-failure');
if (latency.p95Ms === null || latency.p95Ms > 750 || latency.p99Ms > 2000) issues.push('http-read-latency-budget-failed');
console.log(JSON.stringify({ kind: 'hosted-canonical-inventory-measurement', startedAt, completedAt: new Date().toISOString(),
  source, fingerprint, apiOrigin: origin, concurrency, repeats, noWarmup: true, productionCacheState: 'not-reset-not-certified-cold',
  heldRefusals, mixedAuthorityRefused, halted, requestedJobs: jobs.length, dispatchedJobs: next, skippedJobs: jobs.length - next, inflightDrained: true, stopPolicy: 'stop-new-dispatch-on-first-request-or-semantic-failure', requestEvents, latency, perCase: cases.map(item => ({ case: item.name, ...distribution(success.filter(row => row.case === item.name)) })),
  unexpectedErrors: observations.filter(row => row.error).length, issues, ok: issues.length === 0,
  positiveInventoryObserved: success.some(row => row.total > 0), independentInclusionEvidenceRequired: true,
  acquisitionTiming: 'not-measured', hostResourceTiming: 'capture-separately', discoveryTiming: 'not-measured',
  fullCapacityAcceptance: false, queryOnly: true, observations,
}, null, 2));
if (issues.length) process.exitCode = 2;
