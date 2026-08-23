import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

import { getDb } from '../db-connection';
import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  users,
} from '../../drizzle/schema';
import { developerIdentityService } from '../services/developerIdentityService';
import {
  acquireDevelopmentIntegrationMutex,
  DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS,
  releaseDevelopmentIntegrationMutex,
} from '../test-utils/developmentIntegrationMutex';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)` as string, fn)) as typeof describe);

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${createdUserIds.length}`;
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return db;
}

const createdUserIds: number[] = [];
const createdOrganisationIds: number[] = [];

async function insertDeveloperUser() {
  const db = await database();
  const suffix = uniqueSuffix();
  const [result] = await db.insert(users).values({
    email: `identity-resubmit-${suffix}@example.com`,
    role: 'property_developer',
    firstName: 'Identity',
    lastName: 'Resubmit',
    name: `Identity Resubmit ${suffix}`,
    emailVerified: 1,
  });
  const userId = Number(result.insertId);
  createdUserIds.push(userId);
  return userId;
}

async function rejectOrganisation(organisationId: number, reason: string) {
  const db = await database();
  await db
    .update(developerOrganisations)
    .set({ status: 'rejected', rejectionReason: reason })
    .where(eq(developerOrganisations.id, organisationId));
}

async function createPendingOrganisation(userId: number, label: string) {
  const suffix = uniqueSuffix();
  const identity = await developerIdentityService.createDeveloperOrganisation({
    name: `${label} ${suffix}`,
    email: `${label.toLowerCase().replace(/[^a-z]+/g, '-')}-${suffix}@example.com`,
    city: 'Johannesburg',
    province: 'Gauteng',
    createdByUserId: userId,
  });
  createdOrganisationIds.push(identity.organisationId);
  return identity;
}

describeWithDb('developer identity resubmission authority', () => {
  beforeAll(acquireDevelopmentIntegrationMutex, DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    const db = await database();
    const organisationIds = Array.from(new Set(createdOrganisationIds));
    if (organisationIds.length) {
      await db
        .delete(cataloguePublishers)
        .where(inArray(cataloguePublishers.developerOrganisationId, organisationIds));
      await db
        .delete(developerOrganisationMemberships)
        .where(inArray(developerOrganisationMemberships.organisationId, organisationIds));
      await db
        .delete(developerOrganisations)
        .where(inArray(developerOrganisations.id, organisationIds));
    }
    if (createdUserIds.length) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    releaseDevelopmentIntegrationMutex();
  });

  it('returns a rejected organisation to identity review with corrected details and synced publisher', async () => {
    const userId = await insertDeveloperUser();
    const suffix = uniqueSuffix();
    const identity = await createPendingOrganisation(userId, 'Resubmit Developer');
    expect(identity.status).toBe('pending');

    await rejectOrganisation(identity.organisationId, 'Registration documents were unreadable.');

    const resubmitted = await developerIdentityService.resubmitRejectedDeveloperOrganisation({
      organisationId: identity.organisationId,
      name: `Corrected Developer ${suffix}`,
      email: 'corrected@example.com',
      city: 'Cape Town',
      province: 'Western Cape',
      establishedYear: 2015,
      specializations: ['residential', 'commercial'],
      description: 'Corrected organisation description.',
    });

    expect(resubmitted.status).toBe('pending');
    expect(resubmitted.rejectionReason).toBeNull();
    expect(resubmitted.name).toBe(`Corrected Developer ${suffix}`);
    expect(resubmitted.city).toBe('Cape Town');

    const db = await database();
    const [publisher] = await db
      .select()
      .from(cataloguePublishers)
      .where(eq(cataloguePublishers.developerOrganisationId, identity.organisationId));
    expect(publisher.name).toBe(`Corrected Developer ${suffix}`);
    expect(publisher.about).toBe('Corrected organisation description.');
    expect(publisher.headOfficeLocation).toBe('Cape Town, Western Cape');
    expect(publisher.foundedYear).toBe(2015);
    expect(publisher.publicContactEmail).toBe('corrected@example.com');
    // Identity re-review keeps the first-party publisher out of public discovery.
    expect(publisher.isVisible).toBe(0);
  });

  it('refuses to mutate pending organisations through the resubmission path', async () => {
    const userId = await insertDeveloperUser();
    const identity = await createPendingOrganisation(userId, 'Pending Lock Developer');

    await expect(
      developerIdentityService.resubmitRejectedDeveloperOrganisation({
        organisationId: identity.organisationId,
        name: 'Should Not Apply',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const db = await database();
    const [organisation] = await db
      .select()
      .from(developerOrganisations)
      .where(eq(developerOrganisations.id, identity.organisationId));
    expect(organisation.status).toBe('pending');
  });

  it('refuses to mutate approved organisations through the resubmission path', async () => {
    const userId = await insertDeveloperUser();
    const identity = await createPendingOrganisation(userId, 'Approved Lock Developer');

    const db = await database();
    await db
      .update(developerOrganisations)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(developerOrganisations.id, identity.organisationId));

    await expect(
      developerIdentityService.resubmitRejectedDeveloperOrganisation({
        organisationId: identity.organisationId,
        name: 'Should Not Apply Either',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const [organisation] = await db
      .select()
      .from(developerOrganisations)
      .where(eq(developerOrganisations.id, identity.organisationId));
    expect(organisation.status).toBe('approved');
  });
});
