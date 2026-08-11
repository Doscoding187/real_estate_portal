import { afterEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { getDb } from '../db-connection';
import {
  developerBrandProfiles,
  developers,
  developmentSupersessions,
  developments,
  leads,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { developmentService } from '../services/developmentService';
import {
  activateDevelopmentSupersession,
  resolveActiveDevelopmentSupersessionRedirect,
  reverseDevelopmentSupersession,
  verifyDevelopmentSupersession,
} from '../services/developmentSupersessionService';

const describeWithDb: typeof describe =
  process.env.S2_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : (((name: string, fn: Parameters<typeof describe>[1]) =>
        describe.skip(
          `${name} (requires S2_DB_TESTS=1 and DATABASE_URL)` as string,
          fn,
        )) as typeof describe);

type FixtureState = {
  userIds: number[];
  developerIds: number[];
  brandIds: number[];
  developmentIds: number[];
  unitIds: string[];
  relationshipIds: number[];
  leadIds: number[];
};

const fixture: FixtureState = {
  userIds: [],
  developerIds: [],
  brandIds: [],
  developmentIds: [],
  unitIds: [],
  relationshipIds: [],
  leadIds: [],
};

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database connection unavailable.');
  return db;
}

function suffix() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

async function insertUser(role: 'super_admin' | 'property_developer') {
  const db = await database();
  const value = suffix();
  const [result] = await db.insert(users).values({
    email: `s2-${role}-${value}@example.com`,
    role,
    name: `S2 ${role} ${value}`,
    firstName: 'S2',
    lastName: role,
    emailVerified: 1,
    onboardingComplete: 1,
  });
  const id = Number(result.insertId);
  fixture.userIds.push(id);
  return id;
}

async function insertDeveloper(userId: number) {
  const db = await database();
  const value = suffix();
  const [result] = await db.insert(developers).values({
    userId,
    name: `S2 Developer ${value}`,
    email: `s2-developer-${value}@example.com`,
    category: 'residential',
    isVerified: 1,
    status: 'approved',
  });
  const id = Number(result.insertId);
  fixture.developerIds.push(id);
  return id;
}

async function insertBrand(
  createdBy: number,
  options: {
    ownerType: 'platform' | 'developer';
    linkedDeveloperAccountId?: number | null;
  },
) {
  const db = await database();
  const value = suffix();
  const [result] = await db.insert(developerBrandProfiles).values({
    brandName: `S2 Brand ${value}`,
    slug: `s2-brand-${value}`,
    ownerType: options.ownerType,
    linkedDeveloperAccountId: options.linkedDeveloperAccountId ?? null,
    sourceAttribution:
      options.ownerType === 'platform' ? 'S2 verified public source attribution.' : null,
    profileType: options.ownerType === 'platform' ? 'industry_reference' : 'verified_partner',
    isVisible: 1,
    isClaimable: options.ownerType === 'platform' ? 1 : 0,
    createdBy,
  });
  const id = Number(result.insertId);
  fixture.brandIds.push(id);
  return id;
}

function publicationFields(slug: string, ownerType: 'platform' | 'developer') {
  return {
    name: `S2 Development ${slug}`,
    description:
      'A deliberately complete S2 integration fixture with sufficient persisted catalogue detail for publication readiness.',
    developmentType: 'residential' as const,
    address: '1 S2 Authority Road',
    city: 'Johannesburg',
    province: 'Gauteng',
    slug,
    images: JSON.stringify([{ url: 'https://example.com/s2-hero.jpg' }]),
    highlights: ['S2 verified custody', 'Canonical inventory', 'Public route continuity'],
    ownershipType: 'sectional-title',
    transactionType: 'for_sale' as const,
    approvalStatus: 'approved' as const,
    isPublished: ownerType === 'platform' ? 1 : 0,
    devOwnerType: ownerType,
    nature: 'new' as const,
    status: 'selling' as const,
    readinessScore: 100,
  };
}

async function insertDevelopment(input: {
  slug: string;
  ownerType: 'platform' | 'developer';
  developerId?: number | null;
  developerBrandProfileId: number;
}) {
  const db = await database();
  const [result] = await db.insert(developments).values({
    ...publicationFields(input.slug, input.ownerType),
    developerId: input.developerId ?? null,
    developerBrandProfileId: input.developerBrandProfileId,
  });
  const id = Number(result.insertId);
  fixture.developmentIds.push(id);

  const unitId = randomUUID();
  await db.insert(unitTypes).values({
    id: unitId,
    developmentId: id,
    name: 'S2 Two Bedroom',
    bedrooms: 2,
    bathrooms: '2.0',
    basePriceFrom: '1200000.00',
    totalUnits: 10,
    availableUnits: 10,
    isActive: 1,
  });
  fixture.unitIds.push(unitId);
  return id;
}

async function insertPair(label = suffix()) {
  const superAdminId = await insertUser('super_admin');
  const developerUserId = await insertUser('property_developer');
  const developerId = await insertDeveloper(developerUserId);
  const platformBrandId = await insertBrand(superAdminId, { ownerType: 'platform' });
  const developerBrandId = await insertBrand(developerUserId, {
    ownerType: 'developer',
    linkedDeveloperAccountId: developerId,
  });
  const sourceId = await insertDevelopment({
    slug: `s2-source-${label}`,
    ownerType: 'platform',
    developerBrandProfileId: platformBrandId,
  });
  const replacementId = await insertDevelopment({
    slug: `s2-replacement-${label}`,
    ownerType: 'developer',
    developerId,
    developerBrandProfileId: developerBrandId,
  });
  return {
    superAdminId,
    developerUserId,
    developerId,
    developerBrandId,
    platformBrandId,
    sourceId,
    replacementId,
  };
}

async function readDevelopment(id: number) {
  const db = await database();
  const [row] = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
  if (!row) throw new Error(`Development ${id} not found.`);
  return row;
}

async function readRelationship(id: number) {
  const db = await database();
  const [row] = await db
    .select()
    .from(developmentSupersessions)
    .where(eq(developmentSupersessions.id, id))
    .limit(1);
  if (!row) throw new Error(`Relationship ${id} not found.`);
  return row;
}

describeWithDb('Developer Engine S2 supersession lifecycle integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (fixture.leadIds.length) {
      await db.delete(leads).where(inArray(leads.id, fixture.leadIds));
    }
    if (fixture.relationshipIds.length) {
      await db
        .delete(developmentSupersessions)
        .where(inArray(developmentSupersessions.id, fixture.relationshipIds));
    }
    if (fixture.unitIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, fixture.unitIds));
    }
    if (fixture.developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, fixture.developmentIds));
    }
    if (fixture.brandIds.length) {
      await db
        .delete(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, fixture.brandIds));
    }
    if (fixture.developerIds.length) {
      await db.delete(developers).where(inArray(developers.id, fixture.developerIds));
    }
    if (fixture.userIds.length) {
      await db.delete(users).where(inArray(users.id, fixture.userIds));
    }

    fixture.userIds = [];
    fixture.developerIds = [];
    fixture.brandIds = [];
    fixture.developmentIds = [];
    fixture.unitIds = [];
    fixture.relationshipIds = [];
    fixture.leadIds = [];
  });

  it('verifies explicit custody, rejects self-links, and is idempotent', async () => {
    const pair = await insertPair('verification');

    await expect(
      verifyDevelopmentSupersession({
        sourceDevelopmentId: pair.sourceId,
        replacementDevelopmentId: pair.sourceId,
        actorUserId: pair.superAdminId,
        verificationNote: 'invalid self-link',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'Human-reviewed source and replacement equivalence.',
    });
    fixture.relationshipIds.push(Number(verified.id));
    expect(verified).toMatchObject({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      status: 'verified',
    });

    const retried = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'A different retry note must not rewrite the audit record.',
    });
    expect(retried).toMatchObject({
      id: verified.id,
      verificationNote: verified.verificationNote,
      verifiedAt: verified.verifiedAt,
      verifiedByActorId: verified.verifiedByActorId,
    });
  });

  it('reverses a verified match without changing either publication state', async () => {
    const pair = await insertPair('preactivation-reversal');
    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'Pre-activation reversal fixture.',
    });
    fixture.relationshipIds.push(Number(verified.id));

    const reversed = await reverseDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
      reversalReason: 'The verification was withdrawn before activation.',
    });
    expect(reversed).toMatchObject({
      status: 'reversed',
      sourcePublicRootPath: null,
      activatedAt: null,
    });
    expect(await readDevelopment(pair.sourceId)).toMatchObject({ isPublished: 1 });
    expect(await readDevelopment(pair.replacementId)).toMatchObject({ isPublished: 0 });
    expect(await resolveActiveDevelopmentSupersessionRedirect('/development/unused')).toBeNull();
  });

  it('rejects competing open relationships on either endpoint', async () => {
    const first = await insertPair('endpoint-conflict-first');
    const second = await insertPair('endpoint-conflict-second');
    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: first.sourceId,
      replacementDevelopmentId: first.replacementId,
      actorUserId: first.superAdminId,
      verificationNote: 'Endpoint conflict fixture.',
    });
    fixture.relationshipIds.push(Number(verified.id));

    await expect(
      verifyDevelopmentSupersession({
        sourceDevelopmentId: first.sourceId,
        replacementDevelopmentId: second.replacementId,
        actorUserId: first.superAdminId,
        verificationNote: 'A source cannot have another open replacement.',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    await expect(
      verifyDevelopmentSupersession({
        sourceDevelopmentId: second.sourceId,
        replacementDevelopmentId: first.replacementId,
        actorUserId: first.superAdminId,
        verificationNote: 'A replacement cannot have another open source.',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('serializes conflicting concurrent endpoint verification to one winner', async () => {
    const first = await insertPair('concurrent-first');
    const second = await insertPair('concurrent-second');
    const results = await Promise.allSettled([
      verifyDevelopmentSupersession({
        sourceDevelopmentId: first.sourceId,
        replacementDevelopmentId: first.replacementId,
        actorUserId: first.superAdminId,
        verificationNote: 'Concurrent endpoint fixture A.',
      }),
      verifyDevelopmentSupersession({
        sourceDevelopmentId: first.sourceId,
        replacementDevelopmentId: second.replacementId,
        actorUserId: first.superAdminId,
        verificationNote: 'Concurrent endpoint fixture B.',
      }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);

    const winner = results.find(result => result.status === 'fulfilled');
    if (!winner || winner.status !== 'fulfilled')
      throw new Error('No concurrent verification winner.');
    fixture.relationshipIds.push(Number(winner.value.id));
    const activated = await activateDevelopmentSupersession({
      supersessionId: Number(winner.value.id),
      actorUserId: first.superAdminId,
    });
    expect(activated.status).toBe('active');
    expect(await readDevelopment(first.sourceId)).toMatchObject({ isPublished: 0 });
  });

  it('blocks verified replacement publication and performs one atomic idempotent cutover', async () => {
    const pair = await insertPair('activation');
    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'Activation fixture equivalence.',
    });
    fixture.relationshipIds.push(Number(verified.id));

    await expect(
      developmentService.publishDevelopment(pair.replacementId, pair.developerUserId),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'SUPERSESSION_ACTIVATION_REQUIRED' });

    const activated = await activateDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
    });
    expect(activated).toMatchObject({ status: 'active', sourceDevelopmentId: pair.sourceId });

    const source = await readDevelopment(pair.sourceId);
    const replacement = await readDevelopment(pair.replacementId);
    expect(source).toMatchObject({ isPublished: 0, devOwnerType: 'platform', developerId: null });
    expect(replacement).toMatchObject({ isPublished: 1, devOwnerType: 'developer' });

    const publicDiscoveryIds = async () =>
      (await developmentService.listPublicDevelopments({ limit: 50 })).map(row => Number(row.id));
    const autocompleteResults = async () =>
      developmentService.searchPublicDevelopments({ query: 'S2 Development', limit: 50 });

    expect(await publicDiscoveryIds()).toEqual(expect.arrayContaining([pair.replacementId]));
    expect(await publicDiscoveryIds()).not.toEqual(expect.arrayContaining([pair.sourceId]));
    expect((await autocompleteResults()).map(row => Number(row.id))).toEqual(
      expect.arrayContaining([pair.replacementId]),
    );
    expect((await autocompleteResults()).map(row => Number(row.id))).not.toEqual(
      expect.arrayContaining([pair.sourceId]),
    );

    const db = await database();
    await db.update(developments).set({ isPublished: 1 }).where(eq(developments.id, pair.sourceId));
    expect(await developmentService.getPublicDevelopment(pair.sourceId)).toBeNull();
    expect(await publicDiscoveryIds()).not.toEqual(expect.arrayContaining([pair.sourceId]));
    expect((await autocompleteResults()).map(row => Number(row.id))).not.toEqual(
      expect.arrayContaining([pair.sourceId]),
    );
    await db.update(developments).set({ isPublished: 0 }).where(eq(developments.id, pair.sourceId));

    const retry = await activateDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
    });
    expect(retry).toMatchObject({
      id: activated.id,
      activatedAt: activated.activatedAt,
      activatedByActorId: activated.activatedByActorId,
      sourcePublicRootPath: activated.sourcePublicRootPath,
    });

    await expect(
      developmentService.publishPlatformCuratedDevelopment(pair.sourceId, pair.superAdminId, {
        brandProfileId: Number(source.developerBrandProfileId),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'SUPERSESSION_REVERSAL_REQUIRED' });

    const relationshipBeforeRepublish = await readRelationship(Number(verified.id));
    await developmentService.unpublishDevelopment(pair.replacementId, pair.developerUserId);
    expect(await readDevelopment(pair.sourceId)).toMatchObject({ isPublished: 0 });
    expect(await readDevelopment(pair.replacementId)).toMatchObject({ isPublished: 0 });
    expect(await developmentService.getPublicDevelopment(pair.sourceId)).toBeNull();
    expect(await developmentService.getPublicDevelopment(pair.replacementId)).toBeNull();
    expect(await publicDiscoveryIds()).not.toEqual(expect.arrayContaining([pair.sourceId]));
    expect(await publicDiscoveryIds()).not.toEqual(expect.arrayContaining([pair.replacementId]));
    expect((await autocompleteResults()).map(row => Number(row.id))).not.toEqual(
      expect.arrayContaining([pair.sourceId, pair.replacementId]),
    );

    const submitted = await developmentService.publishDevelopment(
      pair.replacementId,
      pair.developerUserId,
    );
    expect(submitted).toMatchObject({ approvalStatus: 'pending', isPublished: 0 });
    await developmentService.approveDevelopment(pair.replacementId, pair.superAdminId);

    expect(await readDevelopment(pair.replacementId)).toMatchObject({
      approvalStatus: 'approved',
      isPublished: 1,
    });
    expect(await developmentService.getPublicDevelopment(pair.sourceId)).toBeNull();
    expect(await developmentService.getPublicDevelopment(pair.replacementId)).toMatchObject({
      id: pair.replacementId,
      isPublished: 1,
    });
    expect(await publicDiscoveryIds()).not.toEqual(expect.arrayContaining([pair.sourceId]));
    expect(await publicDiscoveryIds()).toEqual(expect.arrayContaining([pair.replacementId]));
    expect((await autocompleteResults()).map(row => Number(row.id))).not.toEqual(
      expect.arrayContaining([pair.sourceId]),
    );
    expect(
      (await autocompleteResults()).find(row => Number(row.id) === pair.replacementId),
    ).toMatchObject({
      canonicalRoute: '/development/s2-replacement-activation',
    });
    expect(
      await resolveActiveDevelopmentSupersessionRedirect(activated.sourcePublicRootPath!),
    ).toMatchObject({
      replacementDevelopmentId: pair.replacementId,
      targetPath: `/development/s2-replacement-activation`,
    });

    expect(await readRelationship(Number(verified.id))).toMatchObject({
      id: relationshipBeforeRepublish.id,
      status: 'active',
      verificationNote: relationshipBeforeRepublish.verificationNote,
      verifiedByActorId: relationshipBeforeRepublish.verifiedByActorId,
      verifiedAt: relationshipBeforeRepublish.verifiedAt,
      activatedByActorId: relationshipBeforeRepublish.activatedByActorId,
      activatedAt: relationshipBeforeRepublish.activatedAt,
      sourcePublicRootPath: relationshipBeforeRepublish.sourcePublicRootPath,
    });
  });

  it('redirects by the reserved exact source path and follows replacement slug changes', async () => {
    const pair = await insertPair('redirect');
    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'Redirect fixture equivalence.',
    });
    fixture.relationshipIds.push(Number(verified.id));
    const activated = await activateDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
    });

    const originalSourcePath = activated.sourcePublicRootPath!;
    const firstRedirect = await resolveActiveDevelopmentSupersessionRedirect(originalSourcePath);
    expect(firstRedirect).toMatchObject({
      sourcePath: originalSourcePath,
      replacementDevelopmentId: pair.replacementId,
      targetPath: `/development/s2-replacement-redirect`,
    });

    const db = await database();
    await db
      .update(developments)
      .set({ slug: 's2-replacement-redirect-v2' })
      .where(eq(developments.id, pair.replacementId));
    const secondRedirect = await resolveActiveDevelopmentSupersessionRedirect(originalSourcePath);
    expect(secondRedirect).toMatchObject({
      sourcePath: originalSourcePath,
      targetPath: '/development/s2-replacement-redirect-v2',
    });
    expect(secondRedirect?.sourcePath).toBe(originalSourcePath);

    await insertDevelopment({
      slug: 's2-replacement-redirect-v2',
      ownerType: 'developer',
      developerId: pair.developerId,
      developerBrandProfileId: pair.developerBrandId,
    });
    const ambiguousSlugRedirect =
      await resolveActiveDevelopmentSupersessionRedirect(originalSourcePath);
    expect(ambiguousSlugRedirect).toMatchObject({
      targetPath: `/development/${pair.replacementId}`,
    });
  });

  const activationRejectionCases: Array<{
    name: string;
    mutate: (
      db: Awaited<ReturnType<typeof database>>,
      pair: Awaited<ReturnType<typeof insertPair>>,
    ) => Promise<void>;
    message: RegExp;
  }> = [
    {
      name: 'a replacement that was independently made public',
      mutate: async (db, pair) => {
        await db
          .update(developments)
          .set({ isPublished: 1 })
          .where(eq(developments.id, pair.replacementId));
      },
      message: /private at activation time/i,
    },
    {
      name: 'a source that was made non-public',
      mutate: async (db, pair) => {
        await db
          .update(developments)
          .set({ isPublished: 0 })
          .where(eq(developments.id, pair.sourceId));
      },
      message: /not currently canonical-public/i,
    },
    {
      name: 'a replacement whose persisted readiness changed',
      mutate: async (db, pair) => {
        await db
          .update(developments)
          .set({ description: 'too short' })
          .where(eq(developments.id, pair.replacementId));
      },
      message: /not ready for canonical publication/i,
    },
    {
      name: 'a replacement whose custody changed',
      mutate: async (db, pair) => {
        await db
          .update(developments)
          .set({ devOwnerType: 'platform', developerId: null })
          .where(eq(developments.id, pair.replacementId));
      },
      message: /must be developer-owned/i,
    },
    {
      name: 'a source whose root route became ambiguous',
      mutate: async (db, pair) => {
        await db
          .update(developments)
          .set({ slug: 's2-source-ambiguous' })
          .where(eq(developments.id, pair.sourceId));
        await insertDevelopment({
          slug: 's2-source-ambiguous',
          ownerType: 'platform',
          developerBrandProfileId: pair.platformBrandId,
        });
      },
      message: /canonical root route is ambiguous/i,
    },
  ];

  for (const rejectionCase of activationRejectionCases) {
    it(`rejects activation after ${rejectionCase.name}`, async () => {
      const pair = await insertPair(rejectionCase.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
      const verified = await verifyDevelopmentSupersession({
        sourceDevelopmentId: pair.sourceId,
        replacementDevelopmentId: pair.replacementId,
        actorUserId: pair.superAdminId,
        verificationNote: `Activation rejection: ${rejectionCase.name}.`,
      });
      fixture.relationshipIds.push(Number(verified.id));
      const db = await database();
      await rejectionCase.mutate(db, pair);
      const sourceBefore = await readDevelopment(pair.sourceId);
      const replacementBefore = await readDevelopment(pair.replacementId);

      await expect(
        activateDevelopmentSupersession({
          supersessionId: Number(verified.id),
          actorUserId: pair.superAdminId,
        }),
      ).rejects.toThrow(rejectionCase.message);
      expect(await readRelationship(Number(verified.id))).toMatchObject({ status: 'verified' });
      expect(await readDevelopment(pair.sourceId)).toMatchObject({
        isPublished: sourceBefore.isPublished,
        publishedAt: sourceBefore.publishedAt,
      });
      expect(await readDevelopment(pair.replacementId)).toMatchObject({
        isPublished: replacementBefore.isPublished,
        publishedAt: replacementBefore.publishedAt,
      });
    });
  }

  it('reverses without republishing A, changing B, or rewriting lead attribution', async () => {
    const pair = await insertPair('reversal');
    const db = await database();
    const source = await readDevelopment(pair.sourceId);
    const sourceBrandId = Number(source.developerBrandProfileId);
    const [leadResult] = await db.insert(leads).values({
      developmentId: pair.sourceId,
      developerBrandProfileId: sourceBrandId,
      name: 'Historical S2 Lead',
      email: `historical-${suffix()}@example.com`,
      unitId: fixture.unitIds[0],
      unitName: 'S2 Two Bedroom',
      source: 's2-test',
      referrerUrl: '/development/s2-source-reversal',
      utmSource: 'fixture',
      utmMedium: 'test',
      utmCampaign: 's2',
    });
    fixture.leadIds.push(Number(leadResult.insertId));

    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'Reversal fixture equivalence.',
    });
    fixture.relationshipIds.push(Number(verified.id));
    const activated = await activateDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
    });
    const replacementBefore = await readDevelopment(pair.replacementId);
    const leadBefore = (
      await db
        .select()
        .from(leads)
        .where(eq(leads.id, Number(leadResult.insertId)))
    )[0];

    const reversed = await reverseDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
      reversalReason: 'Human review found the equivalence was incorrect.',
    });
    expect(reversed).toMatchObject({
      status: 'reversed',
      sourcePublicRootPath: activated.sourcePublicRootPath,
    });
    expect(await readDevelopment(pair.sourceId)).toMatchObject({ isPublished: 0 });
    expect(await readDevelopment(pair.replacementId)).toMatchObject({
      isPublished: replacementBefore.isPublished,
      publishedAt: replacementBefore.publishedAt,
    });
    const reversedPublicIds = (await developmentService.listPublicDevelopments({ limit: 50 })).map(
      row => Number(row.id),
    );
    expect(reversedPublicIds).not.toEqual(expect.arrayContaining([pair.sourceId]));
    expect(reversedPublicIds).toEqual(expect.arrayContaining([pair.replacementId]));
    const reversedAutocomplete = await developmentService.searchPublicDevelopments({
      query: 'S2 Development',
      limit: 50,
    });
    expect(reversedAutocomplete.map(row => Number(row.id))).not.toEqual(
      expect.arrayContaining([pair.sourceId]),
    );
    expect(reversedAutocomplete.map(row => Number(row.id))).toEqual(
      expect.arrayContaining([pair.replacementId]),
    );
    expect(
      await resolveActiveDevelopmentSupersessionRedirect(activated.sourcePublicRootPath!),
    ).toBeNull();

    const leadAfter = (
      await db
        .select()
        .from(leads)
        .where(eq(leads.id, Number(leadResult.insertId)))
    )[0];
    expect(leadAfter).toEqual(leadBefore);

    const retry = await reverseDevelopmentSupersession({
      supersessionId: Number(verified.id),
      actorUserId: pair.superAdminId,
      reversalReason: 'A retry must not rewrite the original reason.',
    });
    expect(retry).toMatchObject({
      status: 'reversed',
      reversalReason: reversed.reversalReason,
      reversedAt: reversed.reversedAt,
      reversedByActorId: reversed.reversedByActorId,
    });
  });

  it('enforces restrictive endpoint deletion and database lifecycle constraints', async () => {
    const pair = await insertPair('constraints');
    const verified = await verifyDevelopmentSupersession({
      sourceDevelopmentId: pair.sourceId,
      replacementDevelopmentId: pair.replacementId,
      actorUserId: pair.superAdminId,
      verificationNote: 'Constraint fixture equivalence.',
    });
    fixture.relationshipIds.push(Number(verified.id));
    const db = await database();

    await expect(
      db.insert(developmentSupersessions).values({
        sourceDevelopmentId: pair.sourceId,
        replacementDevelopmentId: pair.sourceId,
        status: 'verified',
        verificationNote: 'invalid self-link',
        verifiedByActorId: pair.superAdminId,
        verifiedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(developmentSupersessions).values({
        sourceDevelopmentId: pair.sourceId,
        replacementDevelopmentId: pair.replacementId,
        status: 'verified',
        verificationNote: 'duplicate pair',
        verifiedByActorId: pair.superAdminId,
        verifiedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }),
    ).rejects.toThrow();

    await expect(
      db.delete(developments).where(eq(developments.id, pair.sourceId)),
    ).rejects.toThrow();

    const lifecyclePair = await insertPair('lifecycle-shape');
    await expect(
      db.insert(developmentSupersessions).values({
        sourceDevelopmentId: lifecyclePair.sourceId,
        replacementDevelopmentId: lifecyclePair.replacementId,
        status: 'active',
        verificationNote: 'invalid lifecycle',
        verifiedByActorId: lifecyclePair.superAdminId,
        verifiedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }),
    ).rejects.toThrow();
  });
});
