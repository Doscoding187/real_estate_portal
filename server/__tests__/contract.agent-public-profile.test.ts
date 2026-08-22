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
  areasServed: 'Bryanston, Sandton',
  languages: 'English, isiZulu',
  isVerified: 1,
  agencyName: 'Northline Realty',
};

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
});

describe('public agent web presence projection', () => {
  it('returns the deliberate public surface with derived slug and agency relationship', async () => {
    mockGetDb.mockResolvedValue(recordingDb([[baseAgentRow], [], [], []]).db);

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
      recordingDb([[{ ...baseAgentRow, id: 84, slug: null }], [], [], []]).db,
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

  it('resolves unstructured served areas onto canonical geography only by exact name', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb([
        [makePresenceRow('Bryanston, Sandton')],
        [
          {
            id: 11,
            name: 'Bryanston',
            slug: 'bryanston',
            citySlug: 'sandton',
            provinceSlug: 'gauteng',
          },
        ],
        [],
        [],
      ]).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      { name: 'Bryanston', type: 'suburb', url: '/gauteng/sandton/bryanston' },
      { name: 'Sandton', type: null, url: null },
    ]);
  });
  it('links a uniquely matched city without a suburb of the same name', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb([
        [makePresenceRow('Stellenbosch')],
        [],
        [{ id: 31, name: 'Stellenbosch', slug: 'stellenbosch', provinceSlug: 'western-cape' }],
        [],
      ]).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      { name: 'Stellenbosch', type: 'city', url: '/western-cape/stellenbosch' },
    ]);
  });

  it('links a uniquely matched province', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb([
        [makePresenceRow('Western Cape')],
        [],
        [],
        [{ id: 5, name: 'Western Cape', slug: 'western-cape' }],
      ]).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      { name: 'Western Cape', type: 'province', url: '/western-cape' },
    ]);
  });

  it('refuses to link when two distinct suburbs share the entry name', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb([
        [makePresenceRow('Parklands')],
        [
          {
            id: 61,
            name: 'Parklands',
            slug: 'parklands',
            citySlug: 'cape-town',
            provinceSlug: 'western-cape',
          },
          {
            id: 62,
            name: 'Parklands',
            slug: 'parklands',
            citySlug: 'durban',
            provinceSlug: 'kwazulu-natal',
          },
        ],
        [],
        [],
      ]).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([{ name: 'Parklands', type: null, url: null }]);
  });

  it('refuses to link when an entry matches both a suburb and a city', async () => {
    mockGetDb.mockResolvedValue(
      recordingDb([
        [makePresenceRow('Sandton')],
        [
          {
            id: 71,
            name: 'Sandton',
            slug: 'sandton-suburb',
            citySlug: 'johannesburg',
            provinceSlug: 'gauteng',
          },
        ],
        [{ id: 72, name: 'Sandton', slug: 'sandton', provinceSlug: 'gauteng' }],
        [],
      ]).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([{ name: 'Sandton', type: null, url: null }]);
  });

  it('collapses repeated evidence for one location into a single match', async () => {
    const bryanston = {
      id: 11,
      name: 'Bryanston',
      slug: 'bryanston',
      citySlug: 'sandton',
      provinceSlug: 'gauteng',
    };
    mockGetDb.mockResolvedValue(
      recordingDb([[makePresenceRow('Bryanston')], [bryanston, { ...bryanston }], [], []]).db,
    );

    const profile = await createCaller().getPublicProfileBySlug({ slug: 'jane-agent' });

    expect(profile?.canonicalAreas).toEqual([
      { name: 'Bryanston', type: 'suburb', url: '/gauteng/sandton/bryanston' },
    ]);
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
