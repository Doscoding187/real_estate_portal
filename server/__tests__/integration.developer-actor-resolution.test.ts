import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { getDeveloperBillingWorkspace } from '../services/billingFoundationService';
import { resolveDeveloperActorForUser } from '../services/developerActorResolution';
import { getPlanAccessProjectionForUserId } from '../services/planAccessService';
import {
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

type TestUser = { id: number; email: string };
const contexts: DeveloperTestContext[] = [];
const usersToDelete: TestUser[] = [];
const extraOrganisationIds: number[] = [];
const extraPublisherIds: number[] = [];
const extraMembershipIds: number[] = [];

async function createDeveloperUser(label: string): Promise<TestUser> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed.');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `b06-${label}-${suffix}@example.com`;
  const [result] = await db.insert(users).values({
    email,
    name: `B06 ${label}`,
    firstName: 'B06',
    lastName: label,
    role: 'property_developer',
    emailVerified: 1,
  });
  const user = { id: Number(result.insertId), email };
  usersToDelete.push(user);
  return user;
}

async function addSecondActiveOrganisation(user: TestUser) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed.');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const [organisationResult] = await db.insert(developerOrganisations).values({
    name: `B06 Ambiguous Organisation ${suffix}`,
    slug: `b06-ambiguous-${suffix}`,
    status: 'approved',
    isVerified: 1,
  });
  const organisationId = Number(organisationResult.insertId);
  extraOrganisationIds.push(organisationId);

  const [publisherResult] = await db.insert(cataloguePublishers).values({
    authorityKind: 'developer_first_party',
    developerOrganisationId: organisationId,
    name: `B06 Ambiguous Publisher ${suffix}`,
    slug: `b06-ambiguous-publisher-${suffix}`,
    isVisible: 1,
    isContactVerified: 1,
    createdByUserId: user.id,
  });
  extraPublisherIds.push(Number(publisherResult.insertId));

  const [membershipResult] = await db.insert(developerOrganisationMemberships).values({
    organisationId,
    userId: user.id,
    role: 'sales_consultant',
    status: 'active',
  });
  extraMembershipIds.push(Number(membershipResult.insertId));
}

describeWithDb('B06 Developer commercial actor resolution', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    while (extraPublisherIds.length > 0) {
      await db.delete(cataloguePublishers).where(eq(cataloguePublishers.id, extraPublisherIds.pop()!));
    }
    while (extraMembershipIds.length > 0) {
      await db
        .delete(developerOrganisationMemberships)
        .where(eq(developerOrganisationMemberships.id, extraMembershipIds.pop()!));
    }
    while (extraOrganisationIds.length > 0) {
      await db
        .delete(developerOrganisations)
        .where(eq(developerOrganisations.id, extraOrganisationIds.pop()!));
    }
    while (contexts.length > 0) {
      await deleteDeveloperTestContext(contexts.pop()!);
    }
    while (usersToDelete.length > 0) {
      await db.delete(users).where(eq(users.id, usersToDelete.pop()!.id));
    }
  });

  it('returns no commercial owner for a principal with no active Developer organisation', async () => {
    const user = await createDeveloperUser('no-owner');
    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');

    await expect(resolveDeveloperActorForUser(db, user.id)).resolves.toBeNull();
    await expect(getPlanAccessProjectionForUserId(user.id)).resolves.toBeNull();
  });

  it('resolves one coherent organisation consistently, including within a transaction', async () => {
    const user = await createDeveloperUser('single-owner');
    const context = await createDeveloperTestContext({
      userId: user.id,
      name: 'B06 Single Organisation',
      email: user.email,
    });
    contexts.push(context);
    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');

    const actor = await resolveDeveloperActorForUser(db, user.id);
    expect(actor).toMatchObject({
      organisationId: context.organisationId,
      publisherId: context.cataloguePublisherId,
      userId: user.id,
    });

    const transactionalActor = await db.transaction((tx: any) =>
      resolveDeveloperActorForUser(tx, user.id),
    );
    expect(transactionalActor).toMatchObject({
      organisationId: context.organisationId,
      publisherId: context.cataloguePublisherId,
    });

    await expect(getDeveloperBillingWorkspace({ id: user.id, email: user.email, role: 'property_developer' } as any)).resolves.toMatchObject({
      developerId: context.organisationId,
    });
    await expect(getPlanAccessProjectionForUserId(user.id)).resolves.toMatchObject({
      ownerType: 'developer',
      ownerId: context.organisationId,
    });
  });

  it('fails closed rather than selecting a first organisation when memberships are ambiguous', async () => {
    const user = await createDeveloperUser('ambiguous-owner');
    const context = await createDeveloperTestContext({
      userId: user.id,
      name: 'B06 First Organisation',
      email: user.email,
    });
    contexts.push(context);
    await addSecondActiveOrganisation(user);
    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');

    await expect(resolveDeveloperActorForUser(db, user.id)).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('Multiple active developer organisations'),
    });
    await expect(
      getDeveloperBillingWorkspace({ id: user.id, email: user.email, role: 'property_developer' } as any),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(getPlanAccessProjectionForUserId(user.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('keeps an unapproved organisation out of paid billing and rejects a missing first-party publisher', async () => {
    const pendingUser = await createDeveloperUser('pending-owner');
    const pending = await createDeveloperTestContext({
      userId: pendingUser.id,
      name: 'B06 Pending Organisation',
      email: pendingUser.email,
      organisationStatus: 'pending',
    });
    contexts.push(pending);

    await expect(
      getDeveloperBillingWorkspace({
        id: pendingUser.id,
        email: pendingUser.email,
        role: 'property_developer',
      } as any),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    await expect(getPlanAccessProjectionForUserId(pendingUser.id)).resolves.toBeNull();

    const incoherentUser = await createDeveloperUser('incoherent-owner');
    const incoherent = await createDeveloperTestContext({
      userId: incoherentUser.id,
      name: 'B06 Incoherent Organisation',
      email: incoherentUser.email,
    });
    contexts.push(incoherent);
    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');
    await db
      .delete(cataloguePublishers)
      .where(eq(cataloguePublishers.id, incoherent.cataloguePublisherId));

    await expect(resolveDeveloperActorForUser(db, incoherentUser.id)).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('coherent first-party publisher'),
    });
  });
});
