/** Offline operator regression. Every request is intercepted; no native fetch. */
import superjson from 'superjson';

const mode = process.env.OPERATOR_FIXTURE_CASE;
const source = '57ea5f5e98ff031a4d0f0814998e60fe27a82b2b';
const fingerprint = 'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced';
let inventoryCalls = 0;
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'x-railway-request-id': `mock-${inventoryCalls}` },
});

globalThis.fetch = async (url) => {
  const u = new URL(url);
  if (u.origin !== 'https://api.propertylistifysa.co.za') throw new Error('Unrecognised mocked origin');
  if (u.pathname === '/api/version') return response({ gitSha: source, env: 'production' });
  if (u.pathname === '/api/readiness') return response({ ok: true, env: 'production', build: { sha: source }, db: { applicationReady: true, targetFingerprintHash: fingerprint } });
  if (u.pathname === '/api/trpc/placeAuthority.execute') return response({ result: { data: superjson.serialize({ ok: false, reason: 'held' }) } });
  if (u.pathname !== '/api/trpc/properties.searchPublicInventory') throw new Error('Unrecognised mocked procedure');
  const input = superjson.deserialize(JSON.parse(u.searchParams.get('input')));
  if (input.province) return response({ error: superjson.serialize({ message: 'Competing authority', code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } }) }, 400);
  inventoryCalls++;
  if (mode === 'http-failure') return response({ error: superjson.serialize({ message: 'Offline fixture failure', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 503 } }) }, 503);
  return response({ result: { data: superjson.serialize({ cards: [], total: 0, canonicalPlaceContext: { canonicalPlaceId: mode === 'semantic-failure' ? 'wrong-scope' : input.canonicalPlaceId } }) } });
};
