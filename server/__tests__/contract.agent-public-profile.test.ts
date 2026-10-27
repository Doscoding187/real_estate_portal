import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from 'drizzle-orm/mysql-core';

const { mockGetDb, mockLoadCanonicalPlaceSearchProjection } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockLoadCanonicalPlaceSearchProjection: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: mockLoadCanonicalPlaceSearchProjection,
}));

import { agentRouter } from '../agentRouter';
import { APPROVED_AGENT } from '../services/agentPublicProfileService';
import { agents } from '../../drizzle/schema';

const SANDTON_PLACE_ID = 'pl-place-01-dee61758ef3bda7cd1a258ad';
const JOHANNESBURG_PLACE_ID = 'pl-place-01-21f154cd5d0954c29ec7525f';
const GAUTENG_PLACE_ID = 'pl-place-01-131e3e75ad70424e0f9c869a';
const UNAVAILABLE_PLACE_ID = 'pl-place-01-000000000000000000000099';

const PLACE_PROJECTIONS = new Map([
  [SANDTON_PLACE_ID, { scope: 'locality', label: 'Sandton', type: 'suburb', city: 'Johannesburg' }],
  [
    JOHANNESBURG_PLACE_ID,
    { scope: 'metro_city', label: 'Johannesburg', type: 'city', city: 'Johannesburg' },
  ],
  [GAUTENG_PLACE_ID, { scope: 'province', label: 'Gauteng', type: 'province', city: '' }],
]);

function projectedPlaces(placeIds: readonly string[]) {
  const executions = new Map<string, unknown>();
  const labels = new Map<string, unknown>();
  for (const placeId of placeIds) {
    const projection = PLACE_PROJECTIONS.get(placeId);
    if (!projection) continue;
    executions.set(placeId, { placeId, scope: projection.scope });
    labels.set(placeId, {
      canonicalPlaceId: placeId,
      label: projection.label,
      placeType: projection.type,
      scope: projection.scope,
      city: projection.city,
      province: 'Gauteng',
    });
  }
  return { executions, labels };
}

function createCaller() {
  return agentRouter.createCaller({
    user: null,
    req: {} as never,
    res: {} as never,
    requestId: 'agent-public-profile-contract',
  } as never);
}

/**
 * Plain-object database stub for one resolved getDb() connection.
 *
 * Every awaited query terminal consumes the next configured batch, because a
 * single procedure reuses its connection across sequential reads (profile row,
 * suburb resolution, city resolution, inventory candidates).
 */
function recordingDb(awaitBatches: unknown[][] = [[]]) {
  const selectProjections: Array<Record<string, unknown>> = [];
  let cursor = 0;

  const nextBatch = () => {
    const batch = awaitBatches[Math.min(cursor, awaitBatches.length - 1)];
    cursor += 1;
    return batch;
  };

  // Query-builder nodes are awaitable at any terminal; the connection root is
  // deliberately NOT thenable so awaiting getDb() yields this stub itself.
  const makeBuilder = (): any => {
    const node: any = function builder() {};
    for (const method of ['from', 'where', 'leftJoin', 'innerJoin', 'orderBy', 'limit']) {
      node[method] = () => makeBuilder();
    }
    node.then = (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(nextBatch()).then(onFulfilled, onRejected);
    return node;
  };

  const db = {
    select: (projection?: Record<string, unknown>) => {
      if (projection && typeof projection === 'object') {
        selectProjections.push(projection);
      }
      return makeBuilder();
    },
  };

  return { db, selectProjections };
}

const GOVERNANCE_FIELDS = [
  'userId',
  'agencyId',
  'profileCompletionScore',
  'profileCompletionFlags',
  'status',
  'rejectionReason',
  'approvedBy',
  'approvedAt',
  'createdAt',
  'updatedAt',
  'isFeatured',
  'rating',
  'reviewCount',
  'totalSales',
] as const;

const baseAgentRow = {
  id: 42,
  firstName: 'Jane',
  lastName: 'Agent',
  displayName: 'Jane Agent',
  slug: 'jane-agent',
  bio: 'Bryanston residential specialist.',
  profileImage: null,
  phone: '+27 82 000 0000',
  whatsapp: '+27 82 000 0000',
  email: 'jane@example.com',
  role: 'agent',
  focus: 'sales',
  specialization: 'Residential Sales, Sectional Title',
  propertyTypes: null,
  socialLinks: '{"linkedin":"https://linkedin.com/in/janeagent"}',
  licenseNumber: 'PG 123456',
  yearsExperience: 12,
  areasServed: JSON.stringify([
    { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Sandton, Johannesburg, Gauteng' },
  ]),
  languages: 'English, isiZulu',
  isVerified: 1,
};

const ACTIVE_MEMBERSHIP = {
  id: 901,
  status: 'active',
  effectiveFrom: null,
  effectiveTo: null,
  agencyName: 'Northline Realty',
};

function makeMembership(overrides: Record<string, unknown> = {}) {
  return { ...ACTIVE_MEMBERSHIP, ...overrides };
}

function presenceBatches(
  profileRow: Record<string, unknown>,
  memberships: Array<Record<string, unknown>> = [ACTIVE_MEMBERSHIP],
  canonicalRows: Array<Record<string, unknown>> = [],
) {
  return [[profileRow], memberships, canonicalRows];
}

function makePresenceRow(areasServed: string) {
  return { ...baseAgentRow, areasServed };
}

describe('public agent discovery projection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects only the explicit discovery card allowlist', async () => {
    const { db, selectProjections } = recordingDb([[]]);
    mockGetDb.mockResolvedValue(db);

    await createCaller().list();

    expect(selectProjections).toHaveLength(1);
    expect(Object.keys(selectProjections[0]).sort()).toEqual(
      [
        'areasServed',
        'bio',
        'displayName',
        'email',
        'firstName',
        'focus',
        'id',
        'isVerified',
        'languages',
        'lastName',
        'phone',
        'profileImage',
        'propertyTypes',
        'role',
        'slug',
        'specialization',
        'yearsExperience',
      ].sort(),
    );
  });

  it('never exposes governance or internal persistence fields in discovery', async () => {
    const { db, selectProjections } = recordingDb([[]]);
    mockGetDb.mockResolvedValue(db);

    await createCaller().list();

    const projectedKeys = Object.keys(selectProjections[0]);
    for (const field of GOVERNANCE_FIELDS) {
      expect(projectedKeys).not.toContain(field);
    }
  });


  it('projects structured coverage labels without exposing the persisted JSON text', async () => {
    mockGetDb.mockResolvedValue(recordingDb([[baseAgentRow]]).db);

    const agents = await createCaller().list();

    expect(agents).toHaveLength(1);
    expect(agents[0].areasServed).toEqual([
      { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Sandton, Johannesburg, Gauteng' },
    ]);
    expect(Array.isArray(agents[0].areasServed)).toBe(true);
  });
});

describe('public agent web presence projection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadCanonicalPlaceSearchProjection.mockImplementation(
      async (_database: unknown, options: { placeIds: readonly string[] }) => {
        return projectedPlaces(options.placeIds);
      },
    );
  });

  it('returns the deliberate public surface with derived slug and agency relationship', async () => {
    mockGetDb.mockResolvedValue(recordingDb(presenceBatches(baseAgentRow)).db);

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile).not.toBeNull();
    expect(profile!.slug).toBe('jane-agent');
    expect(profile!.agency).toEqual({ name: 'Northline Realty' });
    expect(profile!.licenseNumber).toBe('PG 123456');
    expect(profile!.whatsapp).toBe('+27 82 000 0000');
    for (const field of GOVERNANCE_FIELDS) {
      expect(Object.keys(profile!)).not.toContain(field);
    }
  });

  it('derives the canonical slug-compatible URL for agents without a stored slug', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(presenceBatches({ ...baseAgentRow, id: 84, slug: null })).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent-84' });

    expect(profile?.slug).toBe('jane-agent-84');
  });

  it('does not resolve a trailing-id slug that disagrees with the canonical identity', async () => {
    mockGetDb.mockResolvedValue(recordingDb([[], []]).db);

    await expect(
      createCaller().getPublicProfileBySlug({ slug: 'someone-else-9999' }),
    ).resolves.toBeNull();
  });

  it('resolves a locality Place claim by its exact canonical identity', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Client label is ignored' },
        ])), [ACTIVE_MEMBERSHIP], [
          {
            id: 11,
            name: 'Bryanston',
            slug: 'bryanston',
            cityName: 'Sandton',
            citySlug: 'sandton',
            provinceName: 'Gauteng',
            provinceSlug: 'gauteng',
          },
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.areasServed).toEqual([
      { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Client label is ignored' },
    ]);
    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalPlaceId: SANDTON_PLACE_ID,
        name: 'Sandton, Johannesburg, Gauteng',
        type: 'suburb',
        url: '/gauteng/city-of-johannesburg/sandton',
      },
    ]);
  });

  it('derives city scope from the Place Authority projection', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalPlaceId: JOHANNESBURG_PLACE_ID, label: 'Client city label' },
        ])), [ACTIVE_MEMBERSHIP], [
          {
            id: 31,
            name: 'Stellenbosch',
            slug: 'stellenbosch',
            provinceName: 'Western Cape',
            provinceSlug: 'western-cape',
          },
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalPlaceId: JOHANNESBURG_PLACE_ID,
        name: 'Johannesburg, Gauteng',
        type: 'city',
        url: '/gauteng/johannesburg',
      },
    ]);
  });

  it('derives province scope from the Place Authority projection', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalPlaceId: GAUTENG_PLACE_ID, label: 'Client province label' },
        ])), [ACTIVE_MEMBERSHIP], [
          { id: 5, name: 'Western Cape', slug: 'western-cape' },
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalPlaceId: GAUTENG_PLACE_ID,
        name: 'Gauteng',
        type: 'province',
        url: '/gauteng',
      },
    ]);
  });

  it('does not reinterpret a historic comma-separated coverage value', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(presenceBatches(makePresenceRow('Bryanston, Sandton'))).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.areasServed).toEqual([]);
    expect(profile?.canonicalAreas).toEqual([]);
  });

  it('fails closed when the typed canonical record is unavailable', async () => {
    mockLoadCanonicalPlaceSearchProjection.mockResolvedValueOnce({
      executions: new Map(),
      labels: new Map(),
    });
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Sandton, Johannesburg, Gauteng' },
        ]))),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalPlaceId: SANDTON_PLACE_ID,
        name: 'Sandton, Johannesburg, Gauteng',
        type: null,
        url: null,
      },
    ]);
  });

  it('does not replace an exact ID with another place that has a similar label', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalPlaceId: UNAVAILABLE_PLACE_ID, label: 'Parklands, Sandton, Gauteng' },
        ])), [ACTIVE_MEMBERSHIP], [
          {
            id: 61,
            name: 'Parklands',
            slug: 'parklands',
            cityName: 'Cape Town',
            citySlug: 'cape-town',
            provinceName: 'Western Cape',
            provinceSlug: 'western-cape',
          },
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalPlaceId: UNAVAILABLE_PLACE_ID,
        name: 'Parklands, Sandton, Gauteng',
        type: null,
        url: null,
      },
    ]);
  });

  it('collapses a duplicate typed canonical ID into one area', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Client label' },
          { canonicalPlaceId: SANDTON_PLACE_ID, label: 'Forged duplicate label' },
        ])), [ACTIVE_MEMBERSHIP], [
          {
            id: 11,
            name: 'Bryanston',
            slug: 'bryanston',
            cityName: 'Sandton',
            citySlug: 'sandton',
            provinceName: 'Gauteng',
            provinceSlug: 'gauteng',
          },
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toHaveLength(1);
    expect(profile?.canonicalAreas?.[0].canonicalPlaceId).toBe(SANDTON_PLACE_ID);
  });
});

describe('public agency affiliation via canonical memberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadCanonicalPlaceSearchProjection.mockImplementation(
      async (_database: unknown, options: { placeIds: readonly string[] }) =>
        projectedPlaces(options.placeIds),
    );
  });

  it('exposes the agency for a single current active membership', async () => {
    mockGetDb.mockResolvedValue(recordingDb(presenceBatches(baseAgentRow)).db);

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toEqual({ name: 'Northline Realty' });
  });

  it('omits the agency for a suspended membership', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(presenceBatches(baseAgentRow, [makeMembership({ status: 'suspended' })])).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toBeNull();
  });

  it('omits the agency for a left membership', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(presenceBatches(baseAgentRow, [makeMembership({ status: 'left' })])).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toBeNull();
  });

  it('omits the agency while an effectiveFrom window has not opened', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(baseAgentRow, [makeMembership({ effectiveFrom: '2099-01-01T00:00:00Z' })]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toBeNull();
  });

  it('omits the agency once an effectiveTo window has closed', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(baseAgentRow, [makeMembership({ effectiveTo: '2000-01-01T00:00:00Z' })]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toBeNull();
  });

  it('omits the agency when no membership exists even though legacy attribution data exists', async () => {
    mockGetDb.mockResolvedValue(recordingDb(presenceBatches(baseAgentRow, [])).db);

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toBeNull();
  });

  it('fails closed when two simultaneous active memberships exist', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(baseAgentRow, [
          makeMembership({ id: 901, agencyName: 'Northline Realty' }),
          makeMembership({ id: 902, agencyName: 'Rival Realty' }),
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.agency).toBeNull();
  });
});

describe('canonical approved-agent gating', () => {
  it('compiles every public agent read behind status = approved', () => {
    const rendered = new QueryBuilder()
      .select({ id: agents.id })
      .from(agents)
      .where(APPROVED_AGENT)
      .toSQL();

    expect(rendered.sql.toLowerCase()).toContain('status');
    expect(rendered.params).toContain('approved');
  });
});
