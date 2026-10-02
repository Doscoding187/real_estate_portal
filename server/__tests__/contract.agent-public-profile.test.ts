import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from 'drizzle-orm/mysql-core';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

import { agentRouter } from '../agentRouter';
import { APPROVED_AGENT } from '../services/agentPublicProfileService';
import { agents } from '../../drizzle/schema';

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
    { canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' },
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
      { canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' },
    ]);
    expect(Array.isArray(agents[0].areasServed)).toBe(true);
  });
});

describe('public agent web presence projection', () => {
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

  it('resolves a typed suburb claim by its exact canonical identity', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' },
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
      { canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' },
    ]);
    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalLocationId: 'suburb:11',
        name: 'Bryanston, Sandton, Gauteng',
        type: 'suburb',
        url: '/gauteng/sandton/bryanston',
      },
    ]);
  });

  it('links a typed city only through that city identity', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalLocationId: 'city:31', label: 'Stellenbosch, Western Cape' },
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
        canonicalLocationId: 'city:31',
        name: 'Stellenbosch, Western Cape',
        type: 'city',
        url: '/western-cape/stellenbosch',
      },
    ]);
  });

  it('links a typed province only through that province identity', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalLocationId: 'province:5', label: 'Western Cape' },
        ])), [ACTIVE_MEMBERSHIP], [
          { id: 5, name: 'Western Cape', slug: 'western-cape' },
        ]),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalLocationId: 'province:5',
        name: 'Western Cape',
        type: 'province',
        url: '/western-cape',
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
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' },
        ]))),
      ).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      {
        canonicalLocationId: 'suburb:11',
        name: 'Bryanston, Sandton, Gauteng',
        type: null,
        url: null,
      },
    ]);
  });

  it('does not replace an exact ID with another place that has a similar label', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb(
        presenceBatches(makePresenceRow(JSON.stringify([
          { canonicalLocationId: 'suburb:11', label: 'Parklands, Sandton, Gauteng' },
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
        canonicalLocationId: 'suburb:11',
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
          { canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' },
          { canonicalLocationId: 'suburb:11', label: 'Forged duplicate label' },
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
    expect(profile?.canonicalAreas?.[0].canonicalLocationId).toBe('suburb:11');
  });
});

describe('public agency affiliation via canonical memberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
