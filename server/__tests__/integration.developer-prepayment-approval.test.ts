import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { developerRouter } from '../developerRouter';
import type { TrpcContext } from '../_core/context';
import { getDeveloperPublicationAccess } from '../services/developerPublicationAccess';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

type FixtureIds = {
  developerUserId: number;
  adminUserId: number;
  organisationId: number;
  membershipId: number;
  publisherId: number;
};

let fixture: FixtureIds | null = null;

function callerFor(user: { id: number; role: 'property_developer' | 'super_admin' } | null) {
  return developerRouter.createCaller({
    req: { headers: {} },
    res: {},
    user,
    requestId: 'developer-prepayment-approval-test',
  } as unknown as TrpcContext);
}

afterEach(async () => {
  if (!fixture) return;

  const database = await getDb();
  if (database) {
    await database
      .delete(cataloguePublishers)
      .where(eq(cataloguePublishers.id, fixture.publisherId));
    await database
      .delete(developerOrganisationMemberships)
      .where(eq(developerOrganisationMemberships.id, fixture.membershipId));
    await database
      .delete(developerOrganisations)
      .where(eq(developerOrganisations.id, fixture.organisationId));
    await database.delete(users).where(eq(users.id, fixture.developerUserId));
    await database.delete(users).where(eq(users.id, fixture.adminUserId));
  }

  fixture = null;
});

describeWithDb('Developer pre-payment identity approval', () => {
  it('allows an authorised reviewer to approve professional presence without granting Launch Access or public projects', async () => {
    const database = await getDb();
    expect(database).toBeTruthy();
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    const [developerInsert] = await database!.insert(users).values({
      email: `developer-prepayment-${suffix}@example.test`,
      name: `Pre-payment Developer ${suffix}`,
      role: 'property_developer',
      emailVerified: 1,
      sessionVersion: 1,
    });
    const developerUserId = Number(developerInsert.insertId);

    const [adminInsert] = await database!.insert(users).values({
      email: `developer-reviewer-${suffix}@example.test`,
      name: `Developer Reviewer ${suffix}`,
      role: 'super_admin',
      emailVerified: 1,
      sessionVersion: 1,
    });
    const adminUserId = Number(adminInsert.insertId);

    const developerCaller = callerFor({ id: developerUserId, role: 'property_developer' });
    const identity = await developerCaller.createProfile({
      name: `Pre-payment Developments ${suffix}`,
      description: 'A verified professional identity prepared before commercial activation.',
      category: 'residential',
      email: `developer-prepayment-${suffix}@example.test`,
      phone: '+27115550123',
      city: 'Johannesburg',
      province: 'Gauteng',
      specializations: ['Residential developments'],
    });

    fixture = {
      developerUserId,
      adminUserId,
      organisationId: identity.organisationId,
      membershipId: identity.membership.id,
      publisherId: identity.publisherId,
    };

    const publicCaller = callerFor(null);
    await expect(
      publicCaller.getPublicDeveloperBySlug({ slug: identity.publisher.slug }),
    ).resolves.toBeNull();
    await expect(
      publicCaller.searchDevelopers({ query: identity.name, limit: 10 }),
    ).resolves.not.toContainEqual(expect.objectContaining({ id: identity.publisherId }));

    await expect(
      developerCaller.adminApproveDeveloper({ id: identity.organisationId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const reviewerCaller = callerFor({ id: adminUserId, role: 'super_admin' });
    await expect(
      reviewerCaller.adminApproveDeveloper({ id: identity.organisationId }),
    ).resolves.toEqual({ ok: true });

    const [organisation] = await database!
      .select({
        status: developerOrganisations.status,
        isVerified: developerOrganisations.isVerified,
        approvedBy: developerOrganisations.approvedBy,
      })
      .from(developerOrganisations)
      .where(eq(developerOrganisations.id, identity.organisationId))
      .limit(1);
    const [publisher] = await database!
      .select({
        isVisible: cataloguePublishers.isVisible,
        isContactVerified: cataloguePublishers.isContactVerified,
      })
      .from(cataloguePublishers)
      .where(eq(cataloguePublishers.id, identity.publisherId))
      .limit(1);

    expect(organisation).toMatchObject({
      status: 'approved',
      isVerified: 1,
      approvedBy: adminUserId,
    });
    expect(publisher).toMatchObject({ isVisible: 1, isContactVerified: 1 });

    await expect(
      getDeveloperPublicationAccess(identity.organisationId, { db: database! }),
    ).resolves.toMatchObject({ eligible: false, reason: 'missing_launch_access' });

    await expect(
      publicCaller.getPublicDeveloperBySlug({ slug: identity.publisher.slug }),
    ).resolves.toMatchObject({
      cataloguePublisherId: identity.publisherId,
      name: identity.name,
      stats: { isVerified: true },
    });
    await expect(
      publicCaller.searchDevelopers({ query: identity.name, limit: 10 }),
    ).resolves.toContainEqual(
      expect.objectContaining({ id: identity.publisherId, name: identity.name }),
    );
    await expect(
      publicCaller.getPublicDevelopmentsForPublisher({
        cataloguePublisherId: identity.publisherId,
      }),
    ).resolves.toEqual([]);
  });
});
