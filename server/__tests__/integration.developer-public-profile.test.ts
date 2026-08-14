import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { developerRouter } from '../developerRouter';
import { getDb } from '../db-connection';
import { developerOrganisations, developments, unitTypes, users } from '../../drizzle/schema';
import {
  activateDeveloperTestLaunchAccess,
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

describeWithDb('developer public profile integration', () => {
  let userId: number | null = null;
  let developerContext: DeveloperTestContext | null = null;
  const developmentIds: number[] = [];
  const unitTypeIds: string[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    for (const id of developmentIds.splice(0)) {
      await db.delete(unitTypes).where(eq(unitTypes.developmentId, id));
      await db.delete(developments).where(eq(developments.id, id));
    }
    unitTypeIds.length = 0;
    if (developerContext) {
      await deleteDeveloperTestContext(developerContext);
      developerContext = null;
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      userId = null;
    }
  });

  it('exposes only approved published developments for an approved public publisher', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = Date.now();

    const [userInsert] = await db!.insert(users).values({
      email: `public-brand-${suffix}@example.com`,
      name: `Public Brand ${suffix}`,
      role: 'property_developer',
      emailVerified: 1,
    });
    userId = Number(userInsert.insertId);

    developerContext = await createDeveloperTestContext({
      userId,
      name: `Public Brand Developer ${suffix}`,
      email: `public-brand-${suffix}@example.com`,
      isTrusted: true,
      publicContactEmail: `sales-${suffix}@example.com`,
    });
    await activateDeveloperTestLaunchAccess(developerContext);
    const slug = developerContext.publisher.slug;

    const [publishedInsert] = await db!.insert(developments).values({
      cataloguePublisherId: developerContext.cataloguePublisherId,
      name: `Published Development ${suffix}`,
      slug: `published-development-${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'selling',
      isPublished: 1,
      approvalStatus: 'approved',
    });
    developmentIds.push(Number(publishedInsert.insertId));
    const unitTypeId = `public-unit-${suffix}`;
    await db!.insert(unitTypes).values({
      id: unitTypeId,
      developmentId: Number(publishedInsert.insertId),
      name: 'Two Bedroom Apartment',
      bedrooms: 2,
      bathrooms: '2.0',
      basePriceFrom: '1200000.00',
      totalUnits: 10,
      availableUnits: 8,
      isActive: 1,
    });
    unitTypeIds.push(unitTypeId);

    const [draftInsert] = await db!.insert(developments).values({
      cataloguePublisherId: developerContext.cataloguePublisherId,
      name: `Private Draft ${suffix}`,
      slug: `private-draft-${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'launching-soon',
      isPublished: 0,
      approvalStatus: 'draft',
    });
    developmentIds.push(Number(draftInsert.insertId));

    const caller = developerRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);
    await expect(caller.getPublicDeveloperBySlug({ slug })).resolves.toMatchObject({
      id: developerContext.cataloguePublisherId,
      cataloguePublisherId: developerContext.cataloguePublisherId,
      authorityKind: 'developer_first_party',
      name: `Public Brand Developer ${suffix}`,
      isClaimable: false,
      stats: { isVerified: true, isTrusted: true },
    });

    await expect(
      caller.getPublicDevelopmentsForPublisher({
        cataloguePublisherId: developerContext.cataloguePublisherId,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: developmentIds[0], slug: `published-development-${suffix}` }),
    ]);

    await db!
      .update(developerOrganisations)
      .set({ status: 'rejected', rejectionReason: 'Rejected by integration test' })
      .where(eq(developerOrganisations.id, developerContext.organisationId));

    await expect(caller.getPublicDeveloperBySlug({ slug })).resolves.toBeNull();
  });
});
