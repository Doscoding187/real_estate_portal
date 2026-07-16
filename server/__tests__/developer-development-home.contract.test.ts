import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockGetBrandProfileById, mockRequireDeveloperProfileByUserId } = vi.hoisted(
  () => ({
    mockGetDb: vi.fn(),
    mockGetBrandProfileById: vi.fn(),
    mockRequireDeveloperProfileByUserId: vi.fn(),
  }),
);

vi.mock('../db', () => ({
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
): DevelopmentHomeStateInput {
  return { approvalStatus, isPublished };
}

const ownedDevelopment = {
  id: 42,
  name: 'Harbour Heights',
  slug: 'harbour-heights',
  address: null,
  suburb: 'Sea Point',
  city: 'Cape Town',
  province: 'Western Cape',
  transactionType: 'for_sale',
  approvalStatus: 'approved',
  isPublished: 1,
  publishedAt: new Date('2026-01-01'),
};

function configureDevelopmentQuery(result: unknown[] | Error) {
  const limit =
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mockGetDb.mockResolvedValue({ select: vi.fn(() => ({ from })) });
  return { where };
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

  it('uses the Slice 1 lifecycle precedence without historical review inference', () => {
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
    expect(deriveDevelopmentHomeLifecycleState(developmentHomeState('draft', 0))).toBe('draft');
  });

  it('uses owner-scoped queries and one private NOT_FOUND result for regular developers', () => {
    const query = developmentHomeQuerySource();

    expect(query).toContain('const profile = await requireDeveloperProfileByUserId(user.id);');
    expect(query).toContain('eq(developments.id, input.developmentId)');
    expect(query).toContain('eq(developments.developerId, profile.id)');
    expect(query.match(/code: 'NOT_FOUND'/g)).toHaveLength(1);
    expect(query).not.toContain('getPublicDevelopment');
    expect(query).not.toContain('.catch(');
  });

  it('loads an owned development through the regular developer profile predicate', async () => {
    configureDevelopmentQuery([ownedDevelopment]);

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
    });

    expect(mockRequireDeveloperProfileByUserId).toHaveBeenCalledWith(5);
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
