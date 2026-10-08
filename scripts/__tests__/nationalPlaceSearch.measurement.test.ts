/** Opt-in diagnostic, bound to an exact clean committed runtime candidate. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { cpus, totalmem, freemem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createServer } from 'node:http';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import superjson from 'superjson';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { getDb, shutdownDb } from '../../server/db-connection';
import {
  createListing,
  getListingById,
  submitListingForReview,
  approveListing,
  archiveListing,
} from '../../server/db';
import { appRouter, type AppRouter } from '../../server/routers';
import { createContext } from '../../server/_core/context';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import { SEARCH_TO_LEAD_SCENARIO_IDS as fixture } from '../../server/_core/databaseAuthority/dataAdapters/searchToLeadScenario';
import {
  place,
  placeName,
  placeRelationship,
  placeEvidence,
  placeExternalMapping,
} from '../../drizzle/schema/placeAuthority';
import { agencies, agencyBranding, listings, properties, users } from '../../drizzle/schema';
import * as projectionModule from '../../server/services/canonicalPlaceSearchService';
import { propertySearchService } from '../../server/services/propertySearchService';
import { isOperationalPlaceCoverageSignal } from '../../shared/placeCoverageSignal';
import type { PublicSearchInventoryInput } from '../../server/services/publicSearchService';

const SOURCE =
  process.env.NATIONAL_PLACE_BENCHMARK_SOURCE ?? '04821fe7ae6401e781925adce099a93ead08490a';
const OUTPUT =
  process.env.NATIONAL_PLACE_BENCHMARK_OUTPUT ??
  'docs/architecture/launch-readiness-and-product-convergence/evidence/national-place-search-measurement-2026-10-08';
const NORTH = 'pl-place-01-6a145c6d642ba208a2c12de7';
const BRYANSTON = 'pl-place-01-f175328139bb845a4645b9d4';
const CITY = 'pl-place-01-21f154cd5d0954c29ec7525f'; // admitted Johannesburg; Soweto is held OSM-only
type Query = { category: string; durationMs: number; rowsReturned: number; hash: string };
type Observation = {
  id: string;
  scenario: string;
  phase: string;
  concurrency: number;
  latencyMs: number;
  graphMs: number;
  inventoryMs: number;
  serializationMs: number;
  bytes: number;
  queries: Query[];
  leasesMs: number[];
  rssBytes: number;
  error: string | null;
  cards: number;
};
const storage = new AsyncLocalStorage<Observation>();
const measurements: Observation[] = [];
const requests = new Map<string, Observation>();
const round = (n: number) => Math.round(n * 100) / 100;
const distribution = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
  return {
    count: sorted.length,
    p50: round(at(0.5)),
    p95: round(at(0.95)),
    p99: round(at(0.99)),
    max: round(sorted.at(-1) ?? 0),
  };
};
function category(statement: string) {
  if (/from `place_name`/.test(statement)) return 'preferred-or-discovery-name';
  if (/from `place_relationship`/.test(statement)) return 'containment-graph';
  if (/from `place`/.test(statement)) return 'place-graph-or-discovery';
  if (/from `properties`/.test(statement)) return 'inventory';
  if (/from `listings`/.test(statement)) return 'publication-coherence';
  if (/from `property_images`/.test(statement)) return 'public-media';
  return 'other';
}

const enabled = process.env.NATIONAL_PLACE_BENCHMARK === '1';
(enabled ? describe : describe.skip)('national governed Place search diagnostic', () => {
  it('measures the accepted runtime with published canonical synthetic inventory', async () => {
    execFileSync('git', ['merge-base', '--is-ancestor', SOURCE, 'HEAD']);
    expect(
      execFileSync(
        'git',
        ['diff', SOURCE, '--', 'server', 'shared', 'client', 'drizzle', 'server/migrations'],
        { encoding: 'utf8' },
      ),
    ).toBe('');
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    expect(authority.context.targetClass).toBe('disposable-worktree');
    authorizeDatabaseOperation(authority);
    const database = await getDb();
    // Fixture preparation was performed once by the governed adapters before this command.
    const cardinalities: Record<string, number> = {};
    for (const [name, table] of Object.entries({
      place,
      placeName,
      placeRelationship,
      placeEvidence,
      placeExternalMapping,
    })) {
      const [row] = await database.select({ count: sql<number>`count(*)` }).from(table);
      cardinalities[name] = Number(row.count);
    }
    const operationalRows = await database
      .select()
      .from(placeEvidence)
      .where(
        and(isNull(placeEvidence.placeId), eq(placeEvidence.provider, 'property_listify_search')),
      );
    for (const row of operationalRows)
      expect(
        isOperationalPlaceCoverageSignal({
          evidence_kind: row.evidenceKind,
          place_id: row.placeId,
          evidence_state: row.evidenceState,
          subject: row.subject,
          provider: row.provider,
          provider_record_id: row.providerRecordId,
          research_priority: row.researchPriority,
          note: row.note,
        }),
      ).toBe(true);
    cardinalities.placeEvidence -= operationalRows.length;
    expect(cardinalities).toEqual({
      place: 16944,
      placeName: 25618,
      placeRelationship: 16935,
      placeEvidence: 79189,
      placeExternalMapping: 19042,
    });
    const previewText = readFileSync(`${OUTPUT}/release-preview-verify.txt`, 'utf8');
    const preview = JSON.parse(previewText.slice(previewText.indexOf('{')));
    expect(preview.heldPlaceIds).toHaveLength(720);
    const selectedIds = new Set(
      (await database.select({ id: place.placeId }).from(place)).map(row => row.id),
    );
    expect(preview.heldPlaceIds.some((id: string) => selectedIds.has(id))).toBe(false);
    const projected = await projectionModule.loadCanonicalPlaceSearchProjection(database);
    const provinces = [...projected.labels.values()]
      .filter(label => label.scope === 'province')
      .sort((a, b) => a.label.localeCompare(b.label));
    expect(provinces).toHaveLength(9);
    // Requested reads must agree with the complete authority across all released provinces.
    for (const province of provinces) {
      const requested = await projectionModule.loadCanonicalPlaceSearchProjection(database, {
        placeIds: [province.canonicalPlaceId],
        includeProvinceMembers: true,
      });
      const execution = projected.executions.get(province.canonicalPlaceId)!;
      const expected = projectionModule.canonicalPlaceSearchMembers(execution, projected);
      expect(projectionModule.canonicalPlaceSearchMembers(execution, requested)).toEqual(expected);
      for (const id of expected) expect(requested.labels.get(id)).toEqual(projected.labels.get(id));
    }
    const localityPerProvince = provinces.map(province => {
      const candidate = [...projected.executions.values()].find(
        entry =>
          entry.scope === 'locality' &&
          entry.provincePlaceId === province.canonicalPlaceId &&
          projected.labels.has(entry.placeId),
      );
      if (!candidate) throw new Error(`No admitted searchable locality in ${province.label}`);
      return { province, locality: projected.labels.get(candidate.placeId)! };
    });
    const targets = [
      NORTH,
      BRYANSTON,
      CITY,
      ...localityPerProvince.map(item => item.locality.canonicalPlaceId),
    ];
    const rentalTemplate = await getListingById(fixture.rentalListing);
    expect(rentalTemplate).toBeTruthy();
    const inventory: Array<{
      listingId: number;
      propertyId: number;
      placeId: string;
      listingType: 'sale' | 'rent';
      provinceId: string;
      label: string;
    }> = [];
    const [fixtureAgency] = await database
      .select()
      .from(agencies)
      .where(eq(agencies.id, fixture.agency));
    const [reviewer] = await database
      .select()
      .from(users)
      .where(eq(users.id, fixture.platformOperationsUser));
    const reviewerCaller = appRouter.createCaller({
      user: reviewer,
      req: { headers: {}, ip: '127.0.0.1' } as any,
      res: {} as any,
      requestId: 'national-diagnostic-fixture',
    });
    if (!fixtureAgency.city || !fixtureAgency.province)
      await reviewerCaller.agency.update({
        id: fixture.agency,
        city: 'Johannesburg',
        province: 'Gauteng',
      });
    const [branding] = await database
      .select()
      .from(agencyBranding)
      .where(eq(agencyBranding.agencyId, fixture.agency));
    if (!branding)
      await database.insert(agencyBranding).values({
        agencyId: fixture.agency,
        companyName: 'Northpoint Realty',
        isEnabled: 1,
        primaryColor: '#334155',
        secondaryColor: '#0f766e',
      } satisfies typeof agencyBranding.$inferInsert);
    const inventoryStart = performance.now();
    // 120 domain-approved listings, skewed 42 to North Riding, 18 Bryanston,
    // 12 exact Johannesburg, then 48 distributed across all nine provinces.
    for (let index = 0; index < 120; index++) {
      const target =
        index < 42
          ? NORTH
          : index < 60
            ? BRYANSTON
            : index < 72
              ? CITY
              : targets[3 + ((index - 72) % 9)];
      const label = projected.labels.get(target)!;
      const listingType =
        index < 72 ? (index % 3 === 0 ? 'rent' : 'sale') : index % 2 === 0 ? 'rent' : 'sale';
      const coordinates = target === CITY ? { latitude: -26.2041, longitude: 28.0473 } : null;
      const priorFixtures = await database
        .select({ id: listings.id, status: listings.status, action: listings.action })
        .from(listings)
        .where(
          and(
            eq(listings.ownerId, fixture.agentUser),
            eq(listings.title, `National diagnostic ${index} ${label.label}`),
          ),
        );
      const liveFixtures = priorFixtures.filter(
        row => row.status === 'draft' || row.status === 'published',
      );
      const pendingFixture = liveFixtures
        .filter(row => row.action === (listingType === 'sale' ? 'sell' : 'rent'))
        .at(-1);
      for (const duplicate of liveFixtures.filter(row => row.id !== pendingFixture?.id))
        await archiveListing(Number(duplicate.id));
      if (pendingFixture) expect(['draft', 'published']).toContain(pendingFixture.status);
      const id = pendingFixture
        ? Number(pendingFixture.id)
        : await createListing({
            userId: fixture.agentUser,
            action: listingType === 'sale' ? 'sell' : 'rent',
            propertyType: 'house',
            title: `National diagnostic ${index} ${label.label}`,
            description:
              'Synthetic controlled unpaid search diagnostic inventory. Not a real offer and never written outside the task-owned disposable database.',
            slug: `national-search-measurement-${index}`,
            pricing:
              listingType === 'sale'
                ? { askingPrice: 1500000 + index * 10000, negotiability: 'not_negotiable' }
                : {
                    monthlyRent: 12000 + index * 100,
                    depositFact: { status: 'known', amount: 12000, provenance: 'advertiser' },
                  },
            propertyDetails: {
              corePropertyInformation: {
                version: 1,
                bedrooms: { status: 'known', value: 3 },
                bathrooms: { status: 'known', value: 2 },
                internalArea: { status: 'known', valueM2: 180, unit: 'm2' },
                erfArea: { status: 'known', valueM2: 620, unit: 'm2' },
              },
              ...(listingType === 'rent'
                ? { rentalTerms: rentalTemplate!.propertyDetails.rentalTerms }
                : {}),
            },
            location: {
              version: 2,
              canonicalPlaceId: target,
              privateAddress: {
                streetNumber: String(index + 1),
                streetName: 'Controlled Diagnostic Road',
              },
              coordinates,
              coordinateSource: coordinates ? 'map' : 'manual_confirmed',
              locationConfirmationState: 'confirmed',
              publicLocationPrecision: 'approximate',
              providerObservation: null,
            },
            // Domain fixture media, not the customer upload acceptance proof.
            media: Array.from({ length: 5 }, (_, order) => ({
              url: `https://cdn.invalid.example/controlled-national-${index}-${order}.jpg`,
              type: 'image',
              displayOrder: order,
              isPrimary: order === 0,
              processingStatus: 'completed',
            })),
          });
      if (pendingFixture?.status !== 'published') {
        await submitListingForReview(id);
        await approveListing(
          id,
          fixture.platformOperationsUser,
          'Controlled unpaid national measurement fixture.',
        );
      }
      const [property] = await database
        .select({ id: properties.id, placeId: properties.canonicalPlaceId })
        .from(properties)
        .where(eq(properties.sourceListingId, id));
      expect(property?.placeId).toBe(target);
      inventory.push({
        listingId: id,
        propertyId: Number(property.id),
        placeId: target,
        listingType,
        provinceId: projected.executions.get(target)!.provincePlaceId,
        label: label.label,
      });
    }
    const fixtureSetupMs = round(performance.now() - inventoryStart);
    const inventoryCardinalities = {
      synthetic: inventory.length,
      sale: inventory.filter(item => item.listingType === 'sale').length,
      rent: inventory.filter(item => item.listingType === 'rent').length,
      perPlace: Object.fromEntries(
        [...new Set(inventory.map(item => item.placeId))].map(id => [
          id,
          inventory.filter(item => item.placeId === id).length,
        ]),
      ),
    };
    // Observe the already-authorized runtime pool. No connections or SQL authority are replaced.
    const pool = (database as any).session.client;
    const restore: Array<() => void> = [];
    let pendingLeases = 0;
    let maxPendingLeases = 0;
    for (const method of ['query', 'execute'] as const) {
      const original = pool[method];
      pool[method] = async function (...args: unknown[]) {
        const observation = storage.getStore();
        const statement = typeof args[0] === 'string' ? args[0] : (args[0] as { sql: string }).sql;
        const started = performance.now();
        try {
          const result = await Reflect.apply(original, this, args);
          if (observation)
            observation.queries.push({
              category: category(statement),
              durationMs: round(performance.now() - started),
              rowsReturned: Array.isArray(result[0]) ? result[0].length : 0,
              hash: createHash('sha256').update(statement).digest('hex'),
            });
          return result;
        } catch (error) {
          if (observation)
            observation.error = error instanceof Error ? error.message : 'query error';
          throw error;
        }
      };
      restore.push(() => {
        pool[method] = original;
      });
    }
    const lease = pool.pool.getConnection;
    pool.pool.getConnection = function (callback: (...args: any[]) => void) {
      const observation = storage.getStore();
      if (!observation) return lease.call(this, callback);
      const started = performance.now();
      pendingLeases++;
      maxPendingLeases = Math.max(maxPendingLeases, pendingLeases);
      return lease.call(this, (error: unknown, connection: unknown) => {
        pendingLeases--;
        observation.leasesMs.push(round(performance.now() - started));
        callback(error, connection);
      });
    };
    restore.push(() => {
      pool.pool.getConnection = lease;
    });
    const originalProjection = projectionModule.loadCanonicalPlaceSearchProjection;
    const graphSpy = vi
      .spyOn(projectionModule, 'loadCanonicalPlaceSearchProjection')
      .mockImplementation(async (...args) => {
        const started = performance.now();
        const result = await originalProjection(...args);
        const observation = storage.getStore();
        if (observation) observation.graphMs += performance.now() - started;
        return result;
      });
    const originalInventory = propertySearchService.searchProperties.bind(propertySearchService);
    const inventorySpy = vi
      .spyOn(propertySearchService, 'searchProperties')
      .mockImplementation(async (...args) => {
        const started = performance.now();
        const result = await originalInventory(...args);
        const observation = storage.getStore();
        if (observation) observation.inventoryMs += performance.now() - started;
        return result;
      });
    const app = express();
    app.use((req, _res, next) => {
      const observation = requests.get(String(req.headers['x-measurement-id']));
      if (observation) storage.run(observation, next);
      else next();
    });
    app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }));
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No measurement server');
    const baseUrl = `http://127.0.0.1:${address.port}/api/trpc`;
    type Scenario = {
      name: string;
      input?: PublicSearchInventoryInput;
      query?: string;
      expectedError?: boolean;
      expectedUnavailable?: boolean;
    };
    const scenarios: Scenario[] = [
      { name: 'discovery-north-riding', query: 'North Riding' },
      { name: 'discovery-prefix', query: 'North' },
      { name: 'discovery-empty', query: 'zzz-controlled-no-locality' },
      { name: 'north-riding-buy', input: { canonicalPlaceId: NORTH, listingType: 'sale' } },
      { name: 'north-riding-rent', input: { canonicalPlaceId: NORTH, listingType: 'rent' } },
      {
        name: 'north-riding-pagination',
        input: { canonicalPlaceId: NORTH, listingType: 'sale', page: 1, pageSize: 5 },
      },
      { name: 'bryanston-buy', input: { canonicalPlaceId: BRYANSTON, listingType: 'sale' } },
      { name: 'johannesburg-exact-city', input: { canonicalPlaceId: CITY, listingType: 'sale' } },
      {
        name: 'north-riding-empty',
        input: { canonicalPlaceId: NORTH, listingType: 'sale', minPrice: 999999999 },
      },
      ...provinces.map(province => ({
        name: `province-${province.label}`,
        input: { canonicalPlaceId: province.canonicalPlaceId, listingType: 'sale' as const },
      })),
      {
        name: 'mixed-authority-rejection',
        input: { canonicalPlaceId: NORTH, listingType: 'sale', province: 'Gauteng' },
        expectedError: true,
      },
      {
        name: 'development-place-unavailable',
        input: { canonicalPlaceId: NORTH, listingType: 'sale', listingSource: 'development' },
        expectedUnavailable: true,
      },
    ];
    const run = async (scenario: Scenario, phase: string, concurrency: number) => {
      const observation: Observation = {
        id: randomUUID(),
        scenario: scenario.name,
        phase,
        concurrency,
        latencyMs: 0,
        graphMs: 0,
        inventoryMs: 0,
        serializationMs: 0,
        bytes: 0,
        queries: [],
        leasesMs: [],
        rssBytes: 0,
        error: null,
        cards: 0,
      };
      requests.set(observation.id, observation);
      const client = createTRPCProxyClient<AppRouter>({
        links: [
          httpLink({
            url: baseUrl,
            transformer: superjson,
            headers: { 'x-measurement-id': observation.id },
          }),
        ],
      });
      const started = performance.now();
      try {
        const result: any = scenario.query
          ? await client.placeAuthority.discover.query({ query: scenario.query })
          : await client.properties.searchPublicInventory.query({
              propertyType: 'house',
              listingSource: 'manual',
              pageSize: 20,
              ...scenario.input,
            });
        if (scenario.expectedError) throw new Error('Competing authority was accepted');
        observation.latencyMs = performance.now() - started;
        const serialization = performance.now();
        observation.bytes = Buffer.byteLength(superjson.stringify(result));
        observation.serializationMs = performance.now() - serialization;
        if (scenario.query === 'North Riding')
          expect(result.results.some((entry: any) => entry.placeId === NORTH)).toBe(true);
        if (!scenario.query) {
          observation.cards = result.cards.length;
          if (scenario.expectedUnavailable) expect(result.locationState).toBe('unavailable');
          else {
            expect(result.canonicalPlaceContext.canonicalPlaceId).toBe(
              scenario.input!.canonicalPlaceId,
            );
            for (const card of result.cards) {
              const item = inventory.find(entry => entry.propertyId === card.propertyId);
              expect(item, `Unexpected card ${card.propertyId}`).toBeTruthy();
              if (result.canonicalPlaceContext.scope === 'province')
                expect(item!.provinceId).toBe(scenario.input!.canonicalPlaceId);
              else expect(item!.placeId).toBe(scenario.input!.canonicalPlaceId);
              expect(item!.listingType).toBe(scenario.input!.listingType);
              expect(card.canonicalPlaceId).toBe(item!.placeId);
              expect(card.suburb || card.city).toBe(item!.label);
              expect(card.href).toBe(`/property/${item!.propertyId}`);
            }
            if (scenario.name.includes('empty')) expect(result.cards).toHaveLength(0);
            else expect(result.cards.length).toBeGreaterThan(0);
          }
        }
      } catch (error: any) {
        observation.latencyMs = performance.now() - started;
        if (scenario.expectedError && error.data?.code === 'BAD_REQUEST') {
          expect(observation.queries).toHaveLength(0);
        } else
          observation.error = error instanceof Error ? error.message : 'unknown request failure';
      } finally {
        observation.rssBytes = process.memoryUsage().rss;
        observation.graphMs = round(observation.graphMs);
        observation.inventoryMs = round(observation.inventoryMs);
        observation.latencyMs = round(observation.latencyMs);
        observation.serializationMs = round(observation.serializationMs);
        measurements.push(observation);
        requests.delete(observation.id);
      }
    };
    const startedAt = new Date().toISOString();
    try {
      // First HTTP observations follow fixture setup. This is not a reset InnoDB/cache cold boot.
      for (const scenario of scenarios) await run(scenario, 'first-observation', 1);
      for (const scenario of scenarios) await run(scenario, 'warmup', 1);
      const windows: Array<{
        concurrency: number;
        requests: number;
        durationMs: number;
        requestsPerSecond: number;
      }> = [];
      for (const concurrency of [1, 5, 20]) {
        const started = performance.now();
        const count = 60;
        let cursor = 0;
        await Promise.all(
          Array.from({ length: concurrency }, async () => {
            while (cursor < count) {
              const index = cursor++;
              await run(scenarios[index % scenarios.length], 'warm-measured', concurrency);
            }
          }),
        );
        const durationMs = performance.now() - started;
        windows.push({
          concurrency,
          requests: count,
          durationMs: round(durationMs),
          requestsPerSecond: round((count * 1000) / durationMs),
        });
        console.log('MEASUREMENT_WINDOW_COMPLETE', JSON.stringify(windows.at(-1)));
      }
      // Detail eligibility is outcome evidence and excluded from the search latency sample.
      const detailClient = createTRPCProxyClient<AppRouter>({
        links: [httpLink({ url: baseUrl, transformer: superjson })],
      });
      const north = inventory.find(item => item.placeId === NORTH && item.listingType === 'sale')!;
      const detail = await detailClient.properties.getById.query({ id: north.propertyId });
      expect(detail.property.detailPresentation.location.label).toContain('North Riding');
      const grouped = Object.fromEntries(
        [
          ...new Set(measurements.map(row => `${row.phase}:c${row.concurrency}:${row.scenario}`)),
        ].map(key => {
          const rows = measurements.filter(
            row => `${row.phase}:c${row.concurrency}:${row.scenario}` === key,
          );
          return [
            key,
            {
              latencyMs: distribution(rows.map(row => row.latencyMs)),
              graphMs: distribution(rows.map(row => row.graphMs)),
              inventoryMs: distribution(rows.map(row => row.inventoryMs)),
              queryCount: distribution(rows.map(row => row.queries.length)),
              queryRowsReturned: distribution(
                rows.map(row => row.queries.reduce((sum, query) => sum + query.rowsReturned, 0)),
              ),
              errors: rows.filter(row => row.error).length,
            },
          ];
        }),
      );
      const summaries = [1, 5, 20].map(concurrency => {
        const rows = measurements.filter(
          row => row.phase === 'warm-measured' && row.concurrency === concurrency,
        );
        const reads = rows.filter(
          row =>
            !['mixed-authority-rejection', 'development-place-unavailable'].includes(row.scenario),
        );
        const leases = rows.flatMap(row => row.leasesMs);
        return {
          concurrency,
          count: rows.length,
          readCount: reads.length,
          latencyMs: distribution(reads.map(row => row.latencyMs)),
          graphMs: distribution(reads.filter(row => row.graphMs).map(row => row.graphMs)),
          inventoryMs: distribution(
            reads.filter(row => row.inventoryMs).map(row => row.inventoryMs),
          ),
          acquisitionMs: distribution(leases),
          rssBytes: distribution(rows.map(row => row.rssBytes)),
          errors: rows.filter(row => row.error).length,
          budgetComparison: {
            readP95Within750ms: distribution(reads.map(row => row.latencyMs)).p95 <= 750,
            readP99Within2000ms: distribution(reads.map(row => row.latencyMs)).p99 <= 2000,
            acquisitionP95Within250ms: distribution(leases).p95 <= 250,
          },
        };
      });
      const sourceFiles = [
        'server/services/canonicalPlaceSearchService.ts',
        'server/services/publicSearchService.ts',
        'server/services/propertySearchService.ts',
        'server/services/placeDiscoveryService.ts',
        'server/services/approvedPublicPropertyService.ts',
        'server/routers.ts',
        'shared/publicSearchValidation.ts',
      ];
      expect(execFileSync('git', ['diff', '--', ...sourceFiles], { encoding: 'utf8' })).toBe('');
      const versionResult = await database.execute(sql`select version() as version`);
      const sqlVersion = String((versionResult[0] as Array<{ version: string }>)[0].version);
      const report = {
        source: SOURCE,
        sourceTree: execFileSync('git', ['rev-parse', `${SOURCE}^{tree}`], {
          encoding: 'utf8',
        }).trim(),
        manifestDigest: '600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c',
        sourceHashes: Object.fromEntries(
          sourceFiles.map(file => [
            file,
            createHash('sha256').update(readFileSync(file)).digest('hex'),
          ]),
        ),
        target: {
          class: authority.context.targetClass,
          fingerprint: authority.context.targetFingerprintHash,
        },
        startedAt,
        releaseSubset: {
          adapterDigest: preview.adapterDigest,
          registrySha256: preview.registrySha256,
          packagePins: preview.packagePins,
          heldDigest: preview.heldDigest,
          heldRows: preview.heldRows,
          excludedPlaceCount: preview.heldPlaceIds.length,
        },
        completedAt: new Date().toISOString(),
        cardinalities,
        operationalCoverageSignalsBefore: operationalRows.length,
        inventoryCardinalities,
        fixtureSetupMs,
        host: {
          node: process.version,
          os: process.platform,
          cpu: cpus()[0].model,
          cpuCount: cpus().length,
          totalMemoryBytes: totalmem(),
          freeMemoryBytesAtEnd: freemem(),
          memoryAtEnd: process.memoryUsage(),
          sqlVersion,
          poolLimit: 10,
          maxQueuedAcquisitions: maxPendingLeases,
        },
        windows,
        summaries,
        grouped,
        detailProof: {
          propertyId: north.propertyId,
          label: detail.property.detailPresentation.location.label,
        },
        limits: {
          readP95Ms: 750,
          readP99Ms: 2000,
          acquisitionP95Ms: 250,
          unexpectedErrorsPercentLessThan: 0.1,
          reference:
            'docs/architecture/launch-readiness-and-product-convergence/24-paid-mvp-launch-closure-execution-plan.md B17 baseline',
          discovery200msProposalIsNotAgreedGate: true,
        },
        limitations: [
          'Local diagnostic on 120 synthetic listings; not B17 10,000-listing/24-hour capacity acceptance.',
          'First observations occur after fixture preparation; InnoDB and OS caches are not reset.',
          'Query durations include driver acquisition/execution/transfer; queryRowsReturned is measured, physical rows examined is not.',
          'Serialization is an additional superjson stringify estimate; HTTP latency includes actual transport serialization and parsing.',
          'RSS observations are process samples; no production memory/CPU-credit/storage capacity acceptance.',
          'Homepage EnhancedHero still hands off legacy location IDs; this benchmark does not certify customer homepage discovery.',
          'Development inventory cannot use canonical Place assignment.',
          'Scope policy is approved exact locality/exact city/evidenced province; no new city descendant membership.',
        ],
      };
      writeFileSync(`${OUTPUT}/report.json`, JSON.stringify(report, null, 2) + '\n');
      writeFileSync(
        `${OUTPUT}/observations.jsonl`,
        measurements.map(row => JSON.stringify(row)).join('\n') + '\n',
      );
      writeFileSync(
        `${OUTPUT}/synthetic-inventory.json`,
        JSON.stringify(inventory, null, 2) + '\n',
      );
      console.log('NATIONAL_SEARCH_MEASUREMENT', JSON.stringify(summaries));
      expect(measurements.filter(row => row.error)).toEqual([]);
    } finally {
      graphSpy.mockRestore();
      inventorySpy.mockRestore();
      restore.reverse().forEach(fn => fn());
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve())),
      );
      await shutdownDb();
    }
  }, 600_000);
});
