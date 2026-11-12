// LOCAL PREVIEW ONLY. Never deployed, never imported by client/ or server/.
// A tiny mock of the Property Listify tRPC API so the homepage data sections render with
// sample data in the local Vite preview and in screenshots. See scripts/preview/README.md.
//
// Wire format (read from client/src/main.tsx):
//   httpBatchLink + superjson, URL <API>/api/trpc/<proc>[,<proc>...]?batch=1&input={"0":{"json":...}}
//   queries use GET, mutations use POST with the same input shape in the body.
//   Response to a batch is a JSON array: [{ result: { data: { json, meta? } } }]
//   or [{ error: { json: { message, code, data } } }]. Content-Type must be application/json.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') {
  console.error('[mock-api] Refusing to start: NODE_ENV is production. Local preview only.');
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5000);
const HOST = '127.0.0.1';
const ALLOWED_ORIGINS = new Set(['http://localhost:3010', 'http://localhost:3011']);

function loadFixture(name) {
  // Read on every request so fixture edits show up without restarting the mock.
  return JSON.parse(readFileSync(join(HERE, 'fixtures', `${name}.json`), 'utf8'));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function expandCard(entry, listingType, placeId, province, fixture) {
  const imageName = fixture.images[entry.image % fixture.images.length];
  const image = `${fixture.imageBase}${imageName}`;
  const location = `${entry.suburb}, ${entry.city}`;
  return {
    kind: 'property',
    canonicalPlaceId: placeId,
    id: entry.id,
    href: `/property/${entry.id}`,
    title: entry.title,
    location: `${location}, ${province}`,
    locationLabels: [location],
    city: entry.city,
    suburb: entry.suburb,
    province,
    price: entry.price,
    image,
    images: [{ url: image }],
    description: `Sample listing for local preview. ${entry.title} in ${location}.`,
    bedrooms: entry.bedrooms,
    bathrooms: entry.bathrooms,
    area: entry.area,
    yardSize: entry.yardSize,
    parking: {
      key: 'parking',
      label: 'Parking',
      value: String(entry.parking),
      compactValue: String(entry.parking),
    },
    propertyType: entry.propertyType,
    listingType,
    listingSource: 'manual',
    listerType: 'agent',
    contactRole: 'agent',
    identity: { role: 'agent', provenance: 'agent', name: 'Sample Agent' },
    highlights: [],
    badges: [],
    imageCount: 1,
    propertyId: Number(entry.id),
    sample: true,
    // The real API returns a Date here; superjson marks it in `meta` (added in the handler).
    listedDate: new Date(Date.now() - entry.daysAgo * DAY_MS).toISOString(),
  };
}

function searchPublicInventory(input) {
  const fixture = loadFixture('searchPublicInventory');
  const listingType = input?.listingType === 'rent' ? 'rent' : 'sale';
  const pageSize = Math.min(Math.max(Number(input?.pageSize) || 12, 1), 50);
  const requestedPage = Math.max(Number(input?.page) || 0, 0);
  const sortOption = input?.sortOption || 'relevance';

  let cards = [];
  for (const [placeId, province] of Object.entries(fixture.provinces)) {
    if (input?.canonicalPlaceId && input.canonicalPlaceId !== placeId) continue;
    for (const entry of province[listingType] || []) {
      cards.push(expandCard(entry, listingType, placeId, province.province, fixture));
    }
  }
  if (sortOption === 'price_asc') cards.sort((a, b) => a.price - b.price);
  if (sortOption === 'price_desc') cards.sort((a, b) => b.price - a.price);
  if (sortOption === 'date_asc') cards.sort((a, b) => a.listedDate.localeCompare(b.listedDate));
  if (sortOption === 'date_desc' || sortOption === 'relevance') {
    cards.sort((a, b) => b.listedDate.localeCompare(a.listedDate));
  }

  const total = cards.length;
  const lastPage = Math.max(Math.ceil(total / pageSize) - 1, 0);
  const page = Math.min(requestedPage, lastPage);
  cards = cards.slice(page * pageSize, page * pageSize + pageSize);

  const meta = { values: {} };
  cards.forEach((_, index) => {
    meta.values[`cards.${index}.listedDate`] = ['Date'];
  });

  return {
    json: {
      cards,
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
      locationState: input?.canonicalPlaceId ? 'resolved' : 'not_requested',
      sourceCounts: { manual: total, development: 0 },
    },
    meta: cards.length ? meta : undefined,
  };
}

function listPublishers(input) {
  const fixture = loadFixture('listPublishers');
  const limit = Number(input?.limit) || fixture.publishers.length;
  const publishers = fixture.publishers.slice(0, limit).map(publisher => ({
    ...publisher,
    name: publisher.brandName,
    cataloguePublisherId: publisher.id,
    sample: true,
  }));
  return { json: publishers };
}

// Procedure name -> handler(input) returning a superjson payload { json, meta? }.
const PROCEDURES = {
  'properties.searchPublicInventory': searchPublicInventory,
  'cataloguePublisher.listPublishers': listPublishers,
  // Signed-out visitor: the real auth.me returns null without a session.
  'auth.me': () => ({ json: null }),
};

function notFoundError(path) {
  return {
    error: {
      json: {
        message: `No mock fixture for procedure "${path}" (scripts/preview/mock-api.mjs)`,
        code: -32004,
        data: { code: 'NOT_FOUND', httpStatus: 404, path },
      },
    },
  };
}

function runProcedure(path, input) {
  const handler = PROCEDURES[path];
  if (!handler) {
    console.log(`[mock-api] NOT_FOUND procedure: ${path}`);
    return { status: 404, body: notFoundError(path) };
  }
  const payload = handler(input);
  const data = payload.meta ? { json: payload.json, meta: payload.meta } : { json: payload.json };
  return { status: 200, body: { result: { data } } };
}

function unwrapInput(raw) {
  if (raw === undefined || raw === null) return undefined;
  return typeof raw === 'object' && 'json' in raw ? raw.json : raw;
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const headers = { Vary: 'Origin' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] =
      req.headers['access-control-request-headers'] || 'content-type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function send(req, res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...corsHeaders(req),
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }

    if (url.pathname === '/api/readiness') {
      send(req, res, 200, { kind: 'readiness', ok: true, sample: true });
      return;
    }

    const prefix = '/api/trpc/';
    if (!url.pathname.startsWith(prefix)) {
      console.log(`[mock-api] NOT_FOUND path: ${req.method} ${url.pathname}`);
      send(req, res, 404, { error: 'not_found', path: url.pathname, sample: true });
      return;
    }

    const paths = decodeURIComponent(url.pathname.slice(prefix.length)).split(',');
    const isBatch = url.searchParams.get('batch') === '1';
    let inputs = {};
    const rawInput =
      req.method === 'GET' ? url.searchParams.get('input') : await readBody(req);
    if (rawInput) {
      try {
        inputs = JSON.parse(rawInput);
      } catch {
        send(req, res, 400, { error: 'invalid input JSON' });
        return;
      }
    }

    const results = paths.map((path, index) =>
      runProcedure(path, unwrapInput(isBatch ? inputs?.[index] : inputs)),
    );
    const statuses = new Set(results.map(result => result.status));
    const status = statuses.size === 1 ? results[0].status : 207;
    send(req, res, status, isBatch ? results.map(result => result.body) : results[0].body);
  } catch (error) {
    console.error('[mock-api] handler error', error);
    send(req, res, 500, { error: 'mock_api_failure' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('==============================================================');
  console.log(' SAMPLE DATA MOCK API: local preview only, never deployed.');
  console.log(` Listening on http://${HOST}:${PORT}`);
  console.log(` Allowed origins: ${[...ALLOWED_ORIGINS].join(', ')}`);
  console.log(` Procedures: ${Object.keys(PROCEDURES).join(', ')}`);
  console.log('==============================================================');
});
