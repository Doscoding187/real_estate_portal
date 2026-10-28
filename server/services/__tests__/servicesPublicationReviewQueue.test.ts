import { describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockLoadCanonicalPlaceSearchProjection, PLACE_SANDTON } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockLoadCanonicalPlaceSearchProjection: vi.fn(),
  PLACE_SANDTON: 'pl-place-01-000000000000000000000001',
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: mockLoadCanonicalPlaceSearchProjection,
}));

import {
  computeProviderPublicationReadiness,
  servicesEngineService,
  SERVICE_PROVIDER_PUBLICATION_QUEUE_VIEWS,
  SERVICES_PUBLICATION_QUEUE_SCAN_LIMIT,
} from '../servicesEngineService';

/**
 * A drizzle-shaped query double that chains every builder method and resolves
 * the supplied rows when awaited.
 */
function makeQuery(rows: unknown[] = []) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    for: vi.fn(),
  };
  for (const key of Object.keys(query)) {
    query[key]!.mockReturnValue(query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return query;
}

function makeBaseRow(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 20,
    companyName: 'Sandton Repairs',
    verificationStatus: 'pending',
    isActive: 1,
    createdAt: '2026-01-10 00:00:00',
    profileId: 5,
    headline: 'Trusted repairer',
    bio: 'Fixes roofs and geysers.',
    websiteUrl: 'https://example.co.za',
    contactEmail: 'hello@example.co.za',
    contactPhone: null,
    directoryActive: 0,
    subscriptionStatus: 'trial',
    ...overrides,
  };
}

function mockQueueDb(
  baseRows: unknown[],
  serviceRows: unknown[] = [],
  locationRows: unknown[] = [],
) {
  mockLoadCanonicalPlaceSearchProjection.mockImplementation(
    async (_database: unknown, options: { placeIds: readonly string[] }) => ({
      executions: new Map(
        options.placeIds.map(placeId => [placeId, { placeId, scope: 'locality' }]),
      ),
      labels: new Map(
        options.placeIds.map(placeId => [
          placeId,
          { canonicalPlaceId: placeId, label: 'Sandton', placeType: 'suburb', scope: 'locality' },
        ]),
      ),
    }),
  );
  const base = makeQuery(baseRows);
  const services = makeQuery(serviceRows);
  const locations = makeQuery(locationRows);
  // Each queue read issues three selects in order: base, services, locations.
  // The cycle repeats so repeated calls in one test see the same fixture.
  const select = vi.fn(() => {
    const index = (select.mock.calls.length - 1) % 3;
    return [base, services, locations][index];
  });
  mockGetDb.mockResolvedValue({ select });
  return select;
}

describe('Services publication readiness authority', () => {
  const complete = {
    providerId: 20,
    companyName: 'Sandton Repairs',
    verificationStatus: 'verified' as const,
    isActive: true,
    profileExists: true,
    headline: 'Trusted repairer',
    bio: 'Fixes roofs and geysers.',
    contactEmail: 'hello@example.co.za',
    contactPhone: null,
    directoryActive: true,
    subscriptionStatus: 'trial' as const,
    activeServiceCount: 1,
    validCoverageCount: 1,
  };

  it('reports a fully eligible provider as ready and published', () => {
    const readiness = computeProviderPublicationReadiness(complete);

    expect(readiness.readyForPublication).toBe(true);
    expect(readiness.isPublished).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.publicationDriftDetected).toBe(false);
  });

  it('names every blocking reason instead of a single generic blocker', () => {
    const readiness = computeProviderPublicationReadiness({
      ...complete,
      isActive: false,
      profileExists: false,
      headline: null,
      bio: null,
      contactEmail: null,
      activeServiceCount: 0,
      validCoverageCount: 0,
      subscriptionStatus: 'past_due',
    });

    expect(readiness.readyForPublication).toBe(false);
    expect(readiness.isPublished).toBe(false);
    expect(readiness.blockers).toEqual([
      'partner_inactive',
      'profile_missing',
      'no_active_service',
      'no_valid_coverage',
      'subscription_ineligible',
    ]);
  });

  it('requires a complete public profile before a provider may be published', () => {
    const readiness = computeProviderPublicationReadiness({
      ...complete,
      headline: '   ',
      bio: null,
      contactEmail: null,
      contactPhone: null,
    });

    expect(readiness.profileComplete).toBe(false);
    expect(readiness.blockers).toContain('profile_incomplete');
  });

  it('detects publication drift when directory state outlives partner verification', () => {
    const readiness = computeProviderPublicationReadiness({
      ...complete,
      verificationStatus: 'pending',
    });

    expect(readiness.publicationDriftDetected).toBe(true);
    expect(readiness.isPublished).toBe(false);
  });

  it('never treats an ineligible subscription as publishable', () => {
    const readiness = computeProviderPublicationReadiness({
      ...complete,
      subscriptionStatus: 'cancelled',
    });

    expect(readiness.isPublished).toBe(false);
    expect(readiness.blockers).toContain('subscription_ineligible');
  });
});

describe('Services publication review queue', () => {
  it('lists the service provider cohort with canonical readiness state', async () => {
    mockQueueDb(
      [makeBaseRow()],
      [
        {
          providerId: 20,
          serviceCategory: 'home_improvement',
          serviceCode: 'roofing',
          displayName: 'Roofing',
          description: null,
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: 1,
        },
      ],
      [{ providerId: 20, canonicalPlaceId: PLACE_SANDTON }],
    );

    const queue = await servicesEngineService.listProviderPublicationQueue();

    expect(queue.entries).toHaveLength(1);
    const entry = queue.entries[0]!;
    expect(entry.providerId).toBe(20);
    expect(entry.companyName).toBe('Sandton Repairs');
    expect(entry.readyForPublication).toBe(true);
    expect(entry.serviceCategories).toEqual(['home_improvement']);
    expect(entry.services).toEqual([
      {
        serviceCode: 'roofing',
        displayName: 'Roofing',
        category: 'home_improvement',
        minPrice: null,
        maxPrice: null,
        currency: 'ZAR',
      },
    ]);
    expect(entry.coverageAreas).toEqual([
      { canonicalPlaceId: PLACE_SANDTON, label: 'Sandton' },
    ]);
    expect(queue.pagination.total).toBe(1);
  });

  it('excludes a coverage row without a canonical Place assignment', async () => {
    mockQueueDb(
      [makeBaseRow()],
      [
        {
          providerId: 20,
          serviceCategory: 'moving',
          serviceCode: 'moving',
          displayName: 'Moving',
          description: null,
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: 1,
        },
      ],
      [{ providerId: 20, canonicalPlaceId: null }],
    );

    const queue = await servicesEngineService.listProviderPublicationQueue();

    const entry = queue.entries[0]!;
    expect(entry.validCoverageCount).toBe(0);
    expect(entry.coverageAreas).toEqual([]);
    expect(entry.readyForPublication).toBe(false);
    expect(entry.blockers).toContain('no_valid_coverage');
  });

  it('counts only active services toward publication readiness', async () => {
    mockQueueDb(
      [makeBaseRow()],
      [
        {
          providerId: 20,
          serviceCategory: 'moving',
          serviceCode: 'moving',
          displayName: 'Moving',
          description: null,
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: 0,
        },
      ],
      [{ providerId: 20, canonicalPlaceId: PLACE_SANDTON }],
    );

    const queue = await servicesEngineService.listProviderPublicationQueue();

    const entry = queue.entries[0]!;
    expect(entry.activeServiceCount).toBe(0);
    expect(entry.serviceCategories).toEqual([]);
    expect(entry.blockers).toContain('no_active_service');
  });

  it('separates the review worklist views', async () => {
    mockQueueDb(
      [
        // Ready, not yet published.
        makeBaseRow({ providerId: 20 }),
        // Published and eligible.
        makeBaseRow({
          providerId: 21,
          companyName: 'Published Provider',
          verificationStatus: 'verified',
          directoryActive: 1,
          subscriptionStatus: 'active',
        }),
        // Blocked, and directory publication outlives partner verification.
        makeBaseRow({
          providerId: 22,
          companyName: 'Blocked Provider',
          verificationStatus: 'pending',
          directoryActive: 1,
          subscriptionStatus: 'past_due',
        }),
      ],
      [
        {
          providerId: 20,
          serviceCategory: 'insurance',
          serviceCode: 'insurance',
          displayName: 'Insurance',
          description: null,
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: 1,
        },
        {
          providerId: 21,
          serviceCategory: 'insurance',
          serviceCode: 'insurance',
          displayName: 'Insurance',
          description: null,
          minPrice: null,
          maxPrice: null,
          currency: 'ZAR',
          isActive: 1,
        },
      ],
      [
        { providerId: 20, canonicalPlaceId: PLACE_SANDTON },
        { providerId: 21, canonicalPlaceId: PLACE_SANDTON },
      ],
    );

    const all = await servicesEngineService.listProviderPublicationQueue({ view: 'all' });
    expect(all.entries).toHaveLength(3);
    expect(all.counts.ready).toBe(2);
    expect(all.counts.awaitingReview).toBe(1);
    expect(all.counts.published).toBe(1);
    expect(all.counts.blocked).toBe(1);
    expect(all.counts.drifted).toBe(1);

    const awaiting = await servicesEngineService.listProviderPublicationQueue({
      view: 'awaiting_review',
    });
    expect(awaiting.entries).toHaveLength(1);
    expect(awaiting.entries[0]!.providerId).toBe(20);

    const blocked = await servicesEngineService.listProviderPublicationQueue({ view: 'blocked' });
    expect(blocked.entries).toHaveLength(1);
    expect(blocked.entries[0]!.providerId).toBe(22);

    const published = await servicesEngineService.listProviderPublicationQueue({
      view: 'published',
    });
    expect(published.entries).toHaveLength(1);
    expect(published.entries[0]!.providerId).toBe(21);
  });

  it('paginates the worklist deterministically', async () => {
    mockQueueDb([
      makeBaseRow({ providerId: 20 }),
      makeBaseRow({ providerId: 21 }),
      makeBaseRow({ providerId: 22 }),
    ]);

    const queue = await servicesEngineService.listProviderPublicationQueue({ page: 2, limit: 2 });

    expect(queue.entries).toHaveLength(1);
    expect(queue.entries[0]!.providerId).toBe(22);
    expect(queue.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('bounds the scanned cohort and publishes the bound as authority', () => {
    expect(SERVICES_PUBLICATION_QUEUE_SCAN_LIMIT).toBe(1000);
    expect(SERVICE_PROVIDER_PUBLICATION_QUEUE_VIEWS).toContain('awaiting_review');
  });
});
