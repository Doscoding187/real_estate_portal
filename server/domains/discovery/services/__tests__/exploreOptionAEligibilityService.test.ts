import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock('../../../../db', () => ({
  getDb: getDbMock,
}));

import { exploreOptionAEligibilityService } from '../exploreOptionAEligibilityService';

const operatorUserId = 11;
const eligibleProfile = {
  id: 101,
  userId: operatorUserId,
  displayName: 'Verified Agent',
  firstName: 'Verified',
  lastName: 'Agent',
  slug: 'verified-agent',
  isVerified: 1,
  status: 'approved',
};

function listing(overrides: Record<string, unknown> = {}) {
  return {
    id: 301,
    ownerId: operatorUserId,
    agentId: eligibleProfile.id,
    agencyId: null,
    title: 'Canonical listing',
    status: 'published',
    ...overrides,
  };
}

function property(overrides: Record<string, unknown> = {}) {
  return {
    id: 701,
    sourceListingId: 301,
    status: 'published',
    ...overrides,
  };
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    agencyId: 500,
    agentId: eligibleProfile.id,
    status: 'active',
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  };
}

function queryResult(result: unknown) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(async () => result),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

function installDbResults(...results: unknown[]) {
  const db = {
    select: vi.fn(() => queryResult(results.shift() ?? [])),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  getDbMock.mockResolvedValue(db);
  return db;
}

async function resolveCandidates(
  assignedListings: unknown[] = [listing()],
  memberships: unknown[] = [],
  publicProperties: unknown[] = [property()],
) {
  installDbResults([eligibleProfile], assignedListings, memberships, publicProperties);
  return exploreOptionAEligibilityService.resolveListingCandidates(
    operatorUserId,
    eligibleProfile.id,
  );
}

describe('exploreOptionAEligibilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns every separately eligible linked profile and excludes role-only, unverified, pending, rejected, and suspended profiles', async () => {
    installDbResults([
      eligibleProfile,
      { ...eligibleProfile, id: 102, displayName: 'Second Agent' },
      { ...eligibleProfile, id: 103, isVerified: 0 },
      { ...eligibleProfile, id: 104, status: 'pending' },
      { ...eligibleProfile, id: 105, status: 'rejected' },
      { ...eligibleProfile, id: 106, status: 'suspended' },
      { ...eligibleProfile, id: 107, userId: 99 },
    ]);

    await expect(
      exploreOptionAEligibilityService.resolveEligibleProfessionalProfiles(operatorUserId),
    ).resolves.toEqual([
      {
        professionalProfileId: 101,
        displayName: 'Verified Agent',
        publicProfileSlug: 'verified-agent',
      },
      {
        professionalProfileId: 102,
        displayName: 'Second Agent',
        publicProfileSlug: 'verified-agent',
      },
    ]);
  });

  it('rejects foreign, unverified, pending, rejected, and suspended explicit profile selections', async () => {
    for (const profile of [
      { ...eligibleProfile, userId: 99 },
      { ...eligibleProfile, isVerified: 0 },
      { ...eligibleProfile, status: 'pending' },
      { ...eligibleProfile, status: 'rejected' },
      { ...eligibleProfile, status: 'suspended' },
    ]) {
      installDbResults([profile]);
      await expect(
        exploreOptionAEligibilityService.resolveListingCandidates(
          operatorUserId,
          eligibleProfile.id,
        ),
      ).rejects.toMatchObject<Partial<TRPCError>>({ code: 'NOT_FOUND' });
    }
  });

  it('accepts an independent listing only through exact professional assignment and preserves distinct identifiers', async () => {
    const candidates = await resolveCandidates();

    expect(candidates).toEqual([
      {
        listingId: 301,
        publicPropertyId: 701,
        title: 'Canonical listing',
        eligibilityBasis: 'assigned_professional',
      },
    ]);
    expect(candidates[0]).not.toHaveProperty('agencyId');
    expect(candidates[0]).not.toHaveProperty('ownerId');
    expect(candidates[0]).not.toHaveProperty('userId');
    expect(candidates[0]).not.toHaveProperty('authority');
    expect(candidates[0]).not.toHaveProperty('expiresAt');
    expect(candidates[0]).not.toHaveProperty('mandate');
  });

  it('excludes an operator-owned listing that is not explicitly assigned to the selected professional', async () => {
    await expect(resolveCandidates([listing({ agentId: null })])).resolves.toEqual([]);
  });

  it('uses the agency-listing-assignment basis only for exact assignment plus active current membership', async () => {
    await expect(resolveCandidates([listing({ agencyId: 500 })], [membership()])).resolves.toEqual([
      {
        listingId: 301,
        publicPropertyId: 701,
        title: 'Canonical listing',
        eligibilityBasis: 'agency_listing_assignment',
      },
    ]);
  });

  it('excludes agency listings with no membership or membership without exact listing assignment', async () => {
    await expect(resolveCandidates([listing({ agencyId: 500 })])).resolves.toEqual([]);
    await expect(
      resolveCandidates([listing({ agencyId: 500, agentId: 202 })], [membership()]),
    ).resolves.toEqual([]);
  });

  it('excludes suspended, ended, and future agency memberships', async () => {
    await expect(
      resolveCandidates(
        [listing({ agencyId: 500 })],
        [
          membership({ status: 'suspended' }),
          membership({ agencyId: 501, effectiveTo: '2000-01-01T00:00:00.000Z' }),
          membership({ agencyId: 502, effectiveFrom: '2999-01-01T00:00:00.000Z' }),
        ],
      ),
    ).resolves.toEqual([]);
  });

  it('uses inclusive starts, exclusive ends, and open membership bounds at one evaluation time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T10:00:00.000Z'));

    await expect(
      resolveCandidates(
        [
          listing({ id: 301, agencyId: 500 }),
          listing({ id: 302, agencyId: 501 }),
          listing({ id: 303, agencyId: 502 }),
        ],
        [
          membership({ agencyId: 500, effectiveFrom: '2026-07-17T10:00:00.000Z' }),
          membership({ agencyId: 501, effectiveTo: '2026-07-17T10:00:00.000Z' }),
          membership({ agencyId: 502 }),
        ],
        [
          property({ id: 701, sourceListingId: 301 }),
          property({ id: 702, sourceListingId: 302 }),
          property({ id: 703, sourceListingId: 303 }),
        ],
      ),
    ).resolves.toEqual([
      {
        listingId: 301,
        publicPropertyId: 701,
        title: 'Canonical listing',
        eligibilityBasis: 'agency_listing_assignment',
      },
      {
        listingId: 303,
        publicPropertyId: 703,
        title: 'Canonical listing',
        eligibilityBasis: 'agency_listing_assignment',
      },
    ]);
  });

  it('excludes rows without a valid public mirror, including legacy mirrors without a source listing', async () => {
    await expect(resolveCandidates([listing()], [], [])).resolves.toEqual([]);
    await expect(
      resolveCandidates([listing()], [], [property({ sourceListingId: null })]),
    ).resolves.toEqual([]);
  });

  it('excludes ambiguous canonical listings with multiple valid public mirrors', async () => {
    await expect(
      resolveCandidates([listing()], [], [property({ id: 701 }), property({ id: 702 })]),
    ).resolves.toEqual([]);
  });

  it('excludes archived, withdrawn-equivalent, rejected, and unavailable rows', async () => {
    await expect(
      resolveCandidates(
        [
          listing({ status: 'archived' }),
          listing({ status: 'sold' }),
          listing({ status: 'rejected' }),
          listing({ id: 302 }),
        ],
        [],
        [
          property({ sourceListingId: 301 }),
          property({ id: 702, sourceListingId: 301, status: 'archived' }),
          property({ id: 703, sourceListingId: 302, status: 'archived' }),
        ],
      ),
    ).resolves.toEqual([]);
  });

  it('uses a fixed number of bounded reads for ten assigned listings and performs no writes', async () => {
    const candidateListings = Array.from({ length: 10 }, (_, index) =>
      listing({ id: 301 + index }),
    );
    const publicProperties = candidateListings.map((candidate, index) =>
      property({ id: 701 + index, sourceListingId: candidate.id }),
    );
    const db = installDbResults([eligibleProfile], candidateListings, [], publicProperties);

    await expect(
      exploreOptionAEligibilityService.resolveListingCandidates(operatorUserId, eligibleProfile.id),
    ).resolves.toHaveLength(10);
    expect(db.select).toHaveBeenCalledTimes(4);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });
});
