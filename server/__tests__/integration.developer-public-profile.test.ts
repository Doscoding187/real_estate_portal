import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { developerRouter } from '../developerRouter';
import { getDb } from '../db-connection';
import { developerBrandProfiles, developers, developments, users } from '../../drizzle/schema';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe;

describeWithDb('developer public profile integration', () => {
  let userId: number | null = null;
  let developerId: number | null = null;
  let brandProfileId: number | null = null;
  const developmentIds: number[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    for (const id of developmentIds.splice(0)) {
      await db.delete(developments).where(eq(developments.id, id));
    }
    if (brandProfileId) {
      await db.delete(developerBrandProfiles).where(eq(developerBrandProfiles.id, brandProfileId));
      brandProfileId = null;
    }
    if (developerId) {
      await db.delete(developers).where(eq(developers.id, developerId));
      developerId = null;
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      userId = null;
    }
  });

  it('exposes only approved published developments for an approved public brand', async () => {
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

    const [developerInsert] = await db!.insert(developers).values({
      userId,
      name: `Public Brand Developer ${suffix}`,
      email: `public-brand-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
      isTrusted: 1,
    });
    developerId = Number(developerInsert.insertId);

    const slug = `public-brand-${suffix}`;
    const [brandInsert] = await db!.insert(developerBrandProfiles).values({
      brandName: `Public Brand ${suffix}`,
      slug,
      isVisible: 1,
      isClaimable: 0,
      isContactVerified: 1,
      ownerType: 'developer',
      linkedDeveloperAccountId: developerId,
      publicContactEmail: `sales-${suffix}@example.com`,
    });
    brandProfileId = Number(brandInsert.insertId);

    const [publishedInsert] = await db!.insert(developments).values({
      developerId,
      developerBrandProfileId: brandProfileId,
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

    const [draftInsert] = await db!.insert(developments).values({
      developerId,
      developerBrandProfileId: brandProfileId,
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

    const caller = developerRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
    await expect(caller.getPublicDeveloperBySlug({ slug })).resolves.toMatchObject({
      id: brandProfileId,
      name: `Public Brand ${suffix}`,
      isClaimable: false,
      stats: { isVerified: true, isTrusted: true },
    });

    await expect(
      caller.getPublicDevelopmentsForProfile({ profileType: 'brand', profileId: brandProfileId! }),
    ).resolves.toEqual([
      expect.objectContaining({ id: developmentIds[0], slug: `published-development-${suffix}` }),
    ]);

    await db!
      .update(developers)
      .set({ status: 'rejected' })
      .where(eq(developers.id, developerId));

    await expect(caller.getPublicDeveloperBySlug({ slug })).resolves.toBeNull();
  });
});
