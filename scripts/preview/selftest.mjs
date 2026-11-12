// Self-test for scripts/preview/mock-api.mjs. LOCAL PREVIEW ONLY.
// Start the mock on a spare port first, then: MOCK_PORT=5055 node scripts/preview/selftest.mjs
// Exits non-zero on the first failed check.
const PORT = Number(process.env.MOCK_PORT || 5055);
const BASE = `http://127.0.0.1:${PORT}`;
const GAUTENG = 'pl-place-01-131e3e75ad70424e0f9c869a';
const LIMPOPO = 'pl-place-01-191d11b42d5b13319fa7fca2';

let failures = 0;
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} ${detail}`);
  }
}

function trpcUrl(paths, inputs) {
  const input = encodeURIComponent(JSON.stringify(inputs));
  return `${BASE}/api/trpc/${paths.join(',')}?batch=1&input=${input}`;
}

const readiness = await fetch(`${BASE}/api/readiness`);
const readinessBody = await readiness.json();
check(
  'readiness',
  readiness.ok &&
    readiness.headers.get('content-type')?.startsWith('application/json') &&
    readinessBody.kind === 'readiness' &&
    readinessBody.ok === true,
);

const sale = await fetch(
  trpcUrl(['properties.searchPublicInventory', 'auth.me'], {
    0: {
      json: {
        listingType: 'sale',
        listingSource: 'manual',
        canonicalPlaceId: GAUTENG,
        sortOption: 'date_desc',
        page: 0,
        pageSize: 10,
      },
    },
  }),
  { headers: { Origin: 'http://localhost:3010' } },
);
const saleBody = await sale.json();
const saleData = saleBody?.[0]?.result?.data;
check('batch is an array of 2', Array.isArray(saleBody) && saleBody.length === 2);
check('gauteng sale has 8 cards', saleData?.json?.cards?.length === 8, JSON.stringify(saleData?.json?.total));
check('listedDate is marked as a Date in meta', saleData?.meta?.values?.['cards.0.listedDate']?.[0] === 'Date');
check('auth.me is signed out (null)', saleBody?.[1]?.result?.data?.json === null);
check('cors origin echoed with credentials',
  sale.headers.get('access-control-allow-origin') === 'http://localhost:3010' &&
    sale.headers.get('access-control-allow-credentials') === 'true');

const rent = await (
  await fetch(
    trpcUrl(['properties.searchPublicInventory'], {
      0: { json: { listingType: 'rent', canonicalPlaceId: GAUTENG, page: 0, pageSize: 10 } },
    }),
  )
).json();
check('gauteng rent has 6 cards', rent?.[0]?.result?.data?.json?.cards?.length === 6);

const empty = await (
  await fetch(
    trpcUrl(['properties.searchPublicInventory'], {
      0: { json: { listingType: 'sale', canonicalPlaceId: LIMPOPO, page: 0, pageSize: 10 } },
    }),
  )
).json();
check(
  'empty province returns no cards',
  empty?.[0]?.result?.data?.json?.cards?.length === 0 && empty?.[0]?.result?.data?.json?.total === 0,
);

const publishers = await (
  await fetch(trpcUrl(['cataloguePublisher.listPublishers'], { 0: { json: { limit: 12 } } }))
).json();
const publisherList = publishers?.[0]?.result?.data?.json;
check(
  'listPublishers returns 5 developers with card fields',
  Array.isArray(publisherList) &&
    publisherList.length === 5 &&
    publisherList.every(item => item.id && item.slug && item.brandName && 'developmentCount' in item),
);

const unknown = await fetch(trpcUrl(['nope.missing'], { 0: { json: null } }));
const unknownBody = await unknown.json();
check(
  'unknown procedure gives NOT_FOUND envelope',
  unknown.status === 404 &&
    unknownBody?.[0]?.error?.json?.data?.code === 'NOT_FOUND' &&
    unknownBody?.[0]?.error?.json?.message.includes('nope.missing'),
);

const preflight = await fetch(`${BASE}/api/trpc/properties.searchPublicInventory`, {
  method: 'OPTIONS',
  headers: {
    Origin: 'http://localhost:3011',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'x-request-id,content-type',
  },
});
check(
  'OPTIONS preflight allows the preview origin and headers',
  preflight.status === 204 &&
    preflight.headers.get('access-control-allow-origin') === 'http://localhost:3011' &&
    preflight.headers.get('access-control-allow-credentials') === 'true' &&
    preflight.headers.get('access-control-allow-headers')?.includes('x-request-id'),
);

if (failures > 0) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
