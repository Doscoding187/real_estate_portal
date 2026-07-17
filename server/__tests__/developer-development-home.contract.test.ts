import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockGetDb, mockGetBrandProfileById, mockRequireDeveloperProfileByUserId } =
  vi.hoisted(() => ({
    mockDb: { select: vi.fn() },
    mockGetDb: vi.fn(),
    mockGetBrandProfileById: vi.fn(),
    mockRequireDeveloperProfileByUserId: vi.fn(),
  }));

vi.mock('../db', () => ({
  db: mockDb,
  getDb: mockGetDb,
}));

vi.mock('../services/developerService', () => ({
  getDeveloperByUserId: vi.fn(),
  requireDeveloperProfileByUserId: mockRequireDeveloperProfileByUserId,
}));

vi.mock('../services/developerBrandProfileService', () => ({
  getBrandProfileById: mockGetBrandProfileById,
  developerBrandProfileService: {
    getBrandProfileById: mockGetBrandProfileById,
  },
}));

import {
  DevelopmentHomeInputSchema,
  deriveDevelopmentHomeLifecycleState,
  isDevelopmentHomePublicEligible,
  developerRouter,
} from '../developerRouter';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

function developmentHomeQuerySource() {
  const source = readRepoFile('server/developerRouter.ts');
  const start = source.indexOf('getDevelopmentHome: protectedProcedure');
  const end = source.indexOf('\n  getDevelopments: protectedProcedure', start);
  return source.slice(start, end);
}

type DevelopmentHomeStateInput = Parameters<typeof deriveDevelopmentHomeLifecycleState>[0];

function developmentHomeState(
  approvalStatus: DevelopmentHomeStateInput['approvalStatus'],
  isPublished: DevelopmentHomeStateInput['isPublished'],
  overrides: Omit<Partial<DevelopmentHomeStateInput>, 'approvalStatus' | 'isPublished'> = {},
): DevelopmentHomeStateInput {
  return { approvalStatus, isPublished, ...overrides };
}

const ownedDevelopment = {
  id: 42,
  name: 'Harbour Heights',
  slug: 'harbour-heights',
  address: '1 Harbour Road',
  suburb: 'Sea Point',
  city: 'Cape Town',
  province: 'Western Cape',
  transactionType: 'for_sale',
  approvalStatus: 'approved',
  isPublished: 1,
  publishedAt: new Date('2026-01-01'),
  description:
    'A valid persisted description that contains more than fifty characters for testing.',
  images: JSON.stringify([{ url: 'https://example.com/harbour.jpg' }]),
  highlights: JSON.stringify(['One', 'Two', 'Three']),
  ownershipType: 'sectional-title',
  developmentType: 'residential',
  rejectionNote: null,
};

function configureDevelopmentQuery(
  developmentResult: unknown[] | Error,
  unitTypeResult: unknown[] = [],
  reviewResult: unknown[] = [],
  ...summaryResults: unknown[][]
) {
  const results = [
    developmentResult,
    unitTypeResult,
    reviewResult,
    ...(summaryResults.length ? summaryResults : [[], [], [], []]),
  ];
  let selectCall = 0;
  const select = vi.fn(() => {
    const result = results[selectCall++] ?? [];
    const value = result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    const chain = Object.assign(value, {
      limit: vi.fn(() => value),
      orderBy: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
    });
    return { from: vi.fn(() => ({ where: vi.fn(() => chain) })) };
  });
  mockGetDb.mockResolvedValue({ select });
  mockDb.select = select;
  return { select };
}

function callerFor(user: { id: number; role: 'property_developer' | 'super_admin' }, headers = {}) {
  return developerRouter.createCaller({
    req: { headers },
    res: {},
    requestId: 'development-home-test',
    user,
  } as unknown as Parameters<typeof developerRouter.createCaller>[0]);
}

describe('developer.getDevelopmentHome Slice 1 contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireDeveloperProfileByUserId.mockResolvedValue({ id: 11 });
    mockGetBrandProfileById.mockResolvedValue({
      id: 77,
      identityType: 'developer',
      brandName: 'Harbour Developments',
    });
  });

  it('accepts only the development ID and selected range', () => {
    expect(DevelopmentHomeInputSchema.safeParse({ developmentId: 42, range: '30d' }).success).toBe(
      true,
    );

    for (const ownerContext of [
      'developerId',
      'brandId',
      'ownerId',
      'contextId',
      'emulationOwnerId',
    ]) {
      expect(
        DevelopmentHomeInputSchema.safeParse({
          developmentId: 42,
          range: '30d',
          [ownerContext]: 1,
        }).success,
      ).toBe(false);
    }
  });

  it('derives public eligibility only from approved and published state', () => {
    expect(isDevelopmentHomePublicEligible(developmentHomeState('approved', 1))).toBe(true);
    expect(isDevelopmentHomePublicEligible(developmentHomeState('approved', 0))).toBe(false);
    expect(isDevelopmentHomePublicEligible(developmentHomeState('pending', 1))).toBe(false);
  });

  it('uses the deterministic Market Readiness lifecycle precedence', () => {
    expect(deriveDevelopmentHomeLifecycleState(developmentHomeState('approved', 1))).toBe('live');
    expect(deriveDevelopmentHomeLifecycleState(developmentHomeState('approved', 0))).toBe(
      'approved_private',
    );
    expect(deriveDevelopmentHomeLifecycleState(developmentHomeState('pending', 0))).toBe(
      'in_review',
    );
    expect(deriveDevelopmentHomeLifecycleState(developmentHomeState('rejected', 0))).toBe(
      'rejected',
    );
    expect(
      deriveDevelopmentHomeLifecycleState(
        developmentHomeState('draft', 0, { currentChangesRequestedFeedback: 'Update pricing.' }),
      ),
    ).toBe('changes_required');
    expect(deriveDevelopmentHomeLifecycleState(developmentHomeState('draft', 0))).toBe(
      'draft_ready_to_submit',
    );
    expect(
      deriveDevelopmentHomeLifecycleState(
        developmentHomeState('draft', 0, {
          blockers: [
            {
              field: 'description',
              message: 'Description must contain at least 50 characters.',
              severity: 'critical',
            },
          ],
        }),
      ),
    ).toBe('draft_action_required');
  });

  it('uses owner-scoped queries and one private NOT_FOUND result for regular developers', () => {
    const query = developmentHomeQuerySource();

    expect(query).toContain('const profile = await requireDeveloperProfileByUserId(user.id);');
    expect(query).toContain('eq(developments.id, input.developmentId)');
    expect(query).toContain('eq(developments.developerId, profile.id)');
    expect(query.match(/code: 'NOT_FOUND'/g)).toHaveLength(1);
    expect(query).not.toContain('getPublicDevelopment');
    expect(query).toContain('eq(unitTypes.developmentId, row.id)');
    expect(query.indexOf('if (!row)')).toBeLessThan(query.indexOf('unitTypes.developmentId'));
    expect(query).toContain('buildDevelopmentHomeInventory(row, persistedUnitTypes, blockers)');
    expect(query).not.toContain('.catch(');
    expect(query).toContain(
      '.orderBy(desc(developmentApprovalQueue.submittedAt), desc(developmentApprovalQueue.id))',
    );
    expect(query).toContain('.limit(3);');
    expect(query).not.toContain('reviewedBy: developmentApprovalQueue');
    expect(query).not.toContain('complianceChecks: developmentApprovalQueue');
  });

  it('uses exact aggregate counts, a bounded recent preview, and cursor-batched SLA evaluation', () => {
    const service = readRepoFile('server/services/developerFunnelService.ts');

    expect(service).toContain('gte(leads.createdAt, boundary.from)');
    expect(service).toContain('lte(leads.createdAt, boundary.to)');
    expect(service).toContain('DEVELOPMENT_HOME_RECENT_LEAD_LIMIT = 5');
    expect(service).toContain('.limit(DEVELOPMENT_HOME_RECENT_LEAD_LIMIT)');
    expect(service).toContain('DEVELOPMENT_HOME_SLA_BATCH_SIZE = 250');
    expect(service).toContain('gt(leads.id, lastLeadId)');
    expect(service).not.toContain('buildDevelopmentHomeLeadSummary');
    expect(service).toContain(
      "LOWER(COALESCE(${leads.lostReason}, '')) NOT IN ('spam', 'duplicate', 'archived')",
    );
  });

  it('loads an owned development through the regular developer profile predicate', async () => {
    configureDevelopmentQuery(
      [ownedDevelopment],
      [
        {
          name: 'Two bedroom apartment',
          isActive: 1,
          totalUnits: 10,
          availableUnits: 10,
          reservedUnits: 0,
          priceFrom: 1000000,
          basePriceFrom: 1000000,
        },
      ],
    );

    await expect(
      callerFor({ id: 5, role: 'property_developer' }).getDevelopmentHome({
        developmentId: 42,
        range: '30d',
      }),
    ).resolves.toMatchObject({
      range: '30d',
      development: {
        id: 42,
        name: 'Harbour Heights',
        publicEligible: true,
        lifecycleState: 'live',
      },
      readiness: {
        state: 'live',
        blockers: [],
        recentReviewHistory: [],
      },
    });

    expect(mockRequireDeveloperProfileByUserId).toHaveBeenCalledWith(5);
  });

  it('adds active-unit-type aggregate inventory without legacy development fallbacks', async () => {
    configureDevelopmentQuery(
      [ownedDevelopment],
      [
        {
          name: 'Two bedroom apartment',
          isActive: 1,
          totalUnits: 10,
          availableUnits: 4,
          reservedUnits: 2,
          priceFrom: 1000000,
          basePriceFrom: 1000000,
        },
      ],
    );
    const home = await callerFor({ id: 5, role: 'property_developer' }).getDevelopmentHome({
      developmentId: 42,
      range: '30d',
    });
    expect(home.inventory).toMatchObject({
      activeUnitTypeCount: 1,
      totalUnits: 10,
      availableUnits: 4,
      reservedUnits: 2,
      derivedSoldUnits: 4,
      pricing: { kind: 'sale', from: 1000000, to: 1000000 },
    });
    const query = developmentHomeQuerySource();
    expect(query).not.toContain('developments.totalUnits');
    expect(query).not.toContain('developments.availableUnits');
    expect(query).not.toContain('developments.priceFrom');
  });

  it('keeps the active persistence boundary canonical by normalising legacy sale input into base pricing', () => {
    const service = readRepoFile('server/services/developmentService.ts');
    const wizard = readRepoFile(
      'client/src/components/development-wizard/phases/UnitTypesPhase.tsx',
    );
    const hydration = readRepoFile('client/src/hooks/useDevelopmentWizard.ts');
    expect(service).toContain('const v = asDecimalOrNull(unit.basePriceFrom);');
    expect(service).toContain('const fallback = asDecimalOrNull(unit.priceFrom);');
    expect(service).toContain('basePriceFrom,');
    expect(service).toContain('const value = asDecimalOrNull(unit.basePriceTo);');
    expect(service).toContain('priceFrom: basePriceFrom,');
    expect(service).toContain('priceTo: basePriceTo,');
    expect(hydration).toContain('priceFrom: Number(u.basePriceFrom ?? u.priceFrom ?? 0)');
    expect(hydration).toContain('priceTo: Number(u.basePriceTo ?? u.priceTo ?? 0)');
    expect(wizard).toContain('basePriceFrom: isSale ? basePrice : undefined');
    expect(wizard).toContain('basePriceTo: isSale ? calculatedPriceTo : null');
  });

  it('adds selected-period captured demand and canonical funnel counts to the owned Home response', async () => {
    configureDevelopmentQuery(
      [ownedDevelopment],
      [],
      [],
      [
        {
          capturedLeadCount: 3,
          new: 1,
          contacted: 0,
          qualified: 0,
          viewing: 0,
          offer: 0,
          dealInProgress: 1,
          closedWon: 0,
          closedLost: 0,
        },
      ],
      [
        {
          channel: 'development_detail',
          count: 1,
        },
        {
          channel: 'referral',
          count: 1,
        },
        { channel: 'Unknown source', count: 1 },
      ],
      [
        {
          id: 501,
          name: 'Ayesha Patel',
          source: 'legacy_web',
          leadSource: 'development_detail',
          createdAt: '2026-07-16T10:00:00.000Z',
          status: 'new',
          funnelStage: 'interest',
          lostReason: null,
        },
      ],
      [
        {
          id: 501,
          createdAt: '2026-07-16T10:00:00.000Z',
          lastContactedAt: null,
          nextFollowUp: null,
          notes: null,
        },
        {
          id: 502,
          createdAt: '2026-07-15T10:00:00.000Z',
          lastContactedAt: null,
          nextFollowUp: null,
          notes: null,
        },
        {
          id: 503,
          createdAt: '2026-07-14T10:00:00.000Z',
          lastContactedAt: null,
          nextFollowUp: null,
          notes: null,
        },
      ],
    );

    const home = await callerFor({ id: 5, role: 'property_developer' }).getDevelopmentHome({
      developmentId: 42,
      range: '30d',
    });

    expect(home.demand).toMatchObject({
      range: '30d',
      capturedLeadCount: 3,
      newLeadCount: 1,
      sources: [
        { channel: 'development_detail', count: 1 },
        { channel: 'referral', count: 1 },
        { channel: 'Unknown source', count: 1 },
      ],
    });
    expect(home.demand.recentLeads[0]).toMatchObject({
      id: 501,
      name: 'Ayesha Patel',
      source: 'development_detail',
      stage: 'new',
    });
    expect(home.funnel).toMatchObject({
      stages: { new: 1, dealInProgress: 1, closedLost: 0 },
      openLeadCount: 2,
    });
  });

  it('makes foreign and nonexistent regular-developer IDs externally indistinguishable', async () => {
    configureDevelopmentQuery([]);
    const foreign = callerFor({ id: 5, role: 'property_developer' }).getDevelopmentHome({
      developmentId: 99,
      range: '30d',
    });
    const nonexistent = callerFor({ id: 5, role: 'property_developer' }).getDevelopmentHome({
      developmentId: 100,
      range: '30d',
    });

    await expect(foreign).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Development not found',
    });
    await expect(nonexistent).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Development not found',
    });
  });

  it('preserves operational database errors instead of converting them to not found', async () => {
    configureDevelopmentQuery(new Error('database offline'));

    await expect(
      callerFor({ id: 5, role: 'property_developer' }).getDevelopmentHome({
        developmentId: 42,
        range: '30d',
      }),
    ).rejects.toThrow('database offline');
  });

  it('requires server-derived super-admin context and retains its ownership predicate', () => {
    const query = developmentHomeQuerySource();

    expect(query).toContain('const operatingAs = ctx.operatingAs;');
    expect(query).toContain("code: 'PRECONDITION_FAILED', message: 'BRAND_CONTEXT_REQUIRED'");
    expect(query).toContain(
      "operatingAs.brandType !== 'developer' && operatingAs.brandType !== 'hybrid'",
    );
    expect(query).toContain('eq(developments.developerBrandProfileId, operatingAs.brandProfileId)');
    expect(query).not.toContain('input.developerId');
    expect(query).not.toContain('input.brandId');
    expect(query).not.toContain('input.ownerId');
  });

  it('requires authenticated super-admin context and only loads the active contextual owner', async () => {
    configureDevelopmentQuery([ownedDevelopment]);

    await expect(
      callerFor({ id: 1, role: 'super_admin' }).getDevelopmentHome({
        developmentId: 42,
        range: '30d',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED', message: 'BRAND_CONTEXT_REQUIRED' });

    await expect(
      callerFor(
        { id: 1, role: 'super_admin' },
        { 'x-operating-as-brand': '77' },
      ).getDevelopmentHome({
        developmentId: 42,
        range: '30d',
      }),
    ).resolves.toMatchObject({ development: { id: 42 } });
  });

  it('makes super-admin context mismatch and nonexistent IDs externally indistinguishable', async () => {
    configureDevelopmentQuery([]);
    const headers = { 'x-operating-as-brand': '77' };
    const mismatch = callerFor({ id: 1, role: 'super_admin' }, headers).getDevelopmentHome({
      developmentId: 99,
      range: '30d',
    });
    const nonexistent = callerFor({ id: 1, role: 'super_admin' }, headers).getDevelopmentHome({
      developmentId: 100,
      range: '30d',
    });

    await expect(mismatch).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Development not found',
    });
    await expect(nonexistent).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Development not found',
    });
  });
});
