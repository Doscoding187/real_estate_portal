/* global console, process, fetch */
// Self-test for scripts/preview/mock-api.mjs. LOCAL PREVIEW ONLY.
// Start the mock on a spare port first (PORT=5055 node scripts/preview/mock-api.mjs), then: MOCK_PORT=5055 node scripts/preview/selftest.mjs
// Exits non-zero on the first failed check.
const PORT = Number(process.env.MOCK_PORT || process.env.PORT || 5055);
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
check(
  'gauteng sale has 8 cards',
  saleData?.json?.cards?.length === 8,
  JSON.stringify(saleData?.json?.total),
);
check(
  'listedDate is marked as a Date in meta',
  saleData?.meta?.values?.['cards.0.listedDate']?.[0] === 'Date',
);
check('auth.me is signed out (null)', saleBody?.[1]?.result?.data?.json === null);
check(
  'cors origin echoed with credentials',
  sale.headers.get('access-control-allow-origin') === 'http://localhost:3010' &&
    sale.headers.get('access-control-allow-credentials') === 'true',
);

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
  empty?.[0]?.result?.data?.json?.cards?.length === 0 &&
    empty?.[0]?.result?.data?.json?.total === 0,
);

const publishers = await (
  await fetch(trpcUrl(['cataloguePublisher.listPublishers'], { 0: { json: { limit: 12 } } }))
).json();
const publisherList = publishers?.[0]?.result?.data?.json;
check(
  'listPublishers returns 5 developers with card fields',
  Array.isArray(publisherList) &&
    publisherList.length === 5 &&
    publisherList.every(
      item => item.id && item.slug && item.brandName && 'developmentCount' in item,
    ),
);

// New homepage inputs. Start the mock with the same MOCK_LEGACY_API value you give the self-test:
// without it the mock behaves like the new API; with MOCK_LEGACY_API=1 like the deployed one.
const LEGACY = process.env.MOCK_LEGACY_API === '1';
const WESTERN_CAPE = 'pl-place-01-203f5f71cb3565521db4718f';
const KWAZULU_NATAL = 'pl-place-01-153d9daaed02608619c762aa';
const enhancedInput = (listingType, canonicalPlaceId) => ({
  0: {
    json: {
      listingType,
      canonicalPlaceId,
      sortOption: 'trending',
      requirePhoto: true,
      developmentResultShape: 'unit_type',
      page: 0,
      pageSize: 10,
    },
  },
});
const call = async (proc, inputs) => (await fetch(trpcUrl([proc], inputs))).json();
const isUnit = card => card.kind === 'development' && card.unitType;

if (LEGACY) {
  const rejectedSearch = await fetch(
    trpcUrl(['properties.searchPublicInventory'], enhancedInput('sale', GAUTENG)),
  );
  const rejectedBody = await rejectedSearch.json();
  const err = rejectedBody?.[0]?.error?.json;
  check(
    'legacy: new search inputs are rejected with a BAD_REQUEST envelope',
    rejectedSearch.status === 400 &&
      err?.data?.code === 'BAD_REQUEST' &&
      err?.code === -32600 &&
      Array.isArray(JSON.parse(err?.message || 'null')),
    JSON.stringify(err),
  );
  const rejectedPublishers = await call('cataloguePublisher.listPublishers', {
    0: { json: { provincePlaceId: GAUTENG, limit: 12 } },
  });
  check(
    'legacy: provincePlaceId is rejected with BAD_REQUEST',
    rejectedPublishers?.[0]?.error?.json?.data?.code === 'BAD_REQUEST',
  );
  const previousInput = await call('properties.searchPublicInventory', {
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
  });
  check(
    'legacy: the previous input still works',
    previousInput?.[0]?.result?.data?.json?.cards?.length === 8,
  );
} else {
  const gautengSale = (
    await call('properties.searchPublicInventory', enhancedInput('sale', GAUTENG))
  )?.[0]?.result?.data?.json;
  const saleCards = gautengSale?.cards || [];
  check(
    'unit types: gauteng sale returns pageSize 10 cards',
    saleCards.length === 10,
    String(saleCards.length),
  );
  check(
    'unit types: mixed at positions 3, 5 and 8',
    [2, 4, 7].every(index => isUnit(saleCards[index])) && saleCards.filter(isUnit).length === 3,
    saleCards.map(card => card.kind).join(','),
  );
  check(
    'unit types: card has the server DevelopmentUnitTypeCard shape and a unit href',
    (() => {
      const card = saleCards[2];
      return (
        card.unitType.priceFrom === card.price &&
        typeof card.unitType.developmentName === 'string' &&
        card.href === `/development/${card.development.slug}/unit/${card.unitType.id}` &&
        'bedrooms' in card.unitType &&
        'unitSizeM2' in card.unitType &&
        'availableUnits' in card.unitType
      );
    })(),
  );
  check(
    'requirePhoto: every card has an image (photo-less unit type dropped)',
    saleCards.every(card => Boolean(card.image)),
  );
  const withoutPhotoFilter = (
    await call('properties.searchPublicInventory', {
      0: {
        json: {
          listingType: 'sale',
          canonicalPlaceId: GAUTENG,
          developmentResultShape: 'unit_type',
          page: 0,
          pageSize: 50,
        },
      },
    })
  )?.[0]?.result?.data?.json?.cards;
  check(
    'requirePhoto off: the photo-less unit type is returned',
    withoutPhotoFilter?.some(card => isUnit(card) && !card.image),
  );
  const manualOnly = (
    await call('properties.searchPublicInventory', {
      0: { json: { ...enhancedInput('sale', GAUTENG)[0].json, listingSource: 'manual' } },
    })
  )?.[0]?.result?.data?.json?.cards;
  check(
    'listingSource manual returns no unit types',
    manualOnly?.length > 0 && !manualOnly.some(isUnit),
  );
  const wcRent = (
    await call('properties.searchPublicInventory', enhancedInput('rent', WESTERN_CAPE))
  )?.[0]?.result?.data?.json?.cards;
  check('unit types: western cape rent has 2 mixed in', wcRent?.filter(isUnit).length === 2);
  const kznRent = (
    await call('properties.searchPublicInventory', enhancedInput('rent', KWAZULU_NATAL))
  )?.[0]?.result?.data?.json?.cards;
  check(
    'unit types: kwazulu-natal rent is only unit types',
    kznRent?.length === 3 && kznRent.every(isUnit),
  );

  const provinceCounts = {};
  for (const [name, placeId] of [
    ['gauteng', GAUTENG],
    ['western cape', WESTERN_CAPE],
    ['kwazulu-natal', KWAZULU_NATAL],
    ['limpopo', LIMPOPO],
  ]) {
    const list = (
      await call('cataloguePublisher.listPublishers', {
        0: { json: { provincePlaceId: placeId, limit: 12 } },
      })
    )?.[0]?.result?.data?.json;
    provinceCounts[name] = list;
  }
  check(
    'province publishers: gauteng 4, western cape 3, kwazulu-natal 1, limpopo empty',
    provinceCounts.gauteng?.length === 4 &&
      provinceCounts['western cape']?.length === 3 &&
      provinceCounts['kwazulu-natal']?.length === 1 &&
      provinceCounts.limpopo?.length === 0,
  );
  check(
    'province publishers have a head office in their own province',
    [
      ['gauteng', 'Gauteng'],
      ['western cape', 'Western Cape'],
      ['kwazulu-natal', 'KwaZulu-Natal'],
    ].every(([name, label]) =>
      provinceCounts[name].every(item => String(item.headOfficeLocation).endsWith(label)),
    ),
  );
  check(
    'province publishers carry activeDevelopments, sellingNow and launchingSoon',
    provinceCounts.gauteng.every(
      item =>
        Number.isInteger(item.activeDevelopments) &&
        Number.isInteger(item.sellingNow) &&
        Number.isInteger(item.launchingSoon),
    ),
  );
}

// Market insights. Start the mock with the same MOCK_LEGACY_API / MOCK_EMPTY_INSIGHTS values you give
// the self-test.
{
  const response = await fetch(
    trpcUrl(['homeMarketInsights.getHomepageCityInsights'], { 0: { json: { limit: 8 } } }),
  );
  const body = await response.json();
  const cities = body?.[0]?.result?.data?.json;
  if (LEGACY) {
    check(
      'insights: NOT_FOUND on the older API',
      response.status === 404 && body?.[0]?.error?.json?.data?.code === 'NOT_FOUND',
    );
  } else if (process.env.MOCK_EMPTY_INSIGHTS === '1') {
    check('insights: empty list', Array.isArray(cities) && cities.length === 0);
  } else {
    check(
      'insights: 4 cities with 5 bands that add up to activeSaleListings',
      Array.isArray(cities) &&
        cities.map(city => city.name).join() === 'Johannesburg,Cape Town,Pretoria,Durban' &&
        cities.every(
          city =>
            city.askingPriceBands.length === 5 &&
            city.askingPriceBands.reduce((sum, band) => sum + band.count, 0) ===
              city.activeSaleListings &&
            typeof city.medianAskingPrice === 'number' &&
            typeof city.computedAt === 'string',
        ),
    );
    check(
      'insights: one city without per-m2, one locality without href, one city without href',
      cities?.filter(city => city.typicalPricePerM2 === null).length === 1 &&
        cities?.filter(city => city.leadingLocality && city.leadingLocality.href === null)
          .length === 1 &&
        cities?.filter(city => city.href === null).length === 1,
    );
    const limited = await (
      await fetch(
        trpcUrl(['homeMarketInsights.getHomepageCityInsights'], { 0: { json: { limit: 2 } } }),
      )
    ).json();
    check('insights: limit is respected', limited?.[0]?.result?.data?.json?.length === 2);
  }
}

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
