import { and, eq } from 'drizzle-orm';

import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  plans,
  subscriptions,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { cataloguePublisherService } from '../services/cataloguePublisherService';
import { developerIdentityService } from '../services/developerIdentityService';
import { activatePaidLaunchAccessForOwner } from '../services/planAccessService';

type OrganisationStatus = 'pending' | 'approved' | 'rejected';

export type DeveloperTestContext = {
  userId: number;
  organisationId: number;
  membershipId: number;
  cataloguePublisherId: number;
  organisation: typeof developerOrganisations.$inferSelect;
  membership: typeof developerOrganisationMemberships.$inferSelect;
  publisher: typeof cataloguePublishers.$inferSelect;
};

export type PlatformPublisherTestContext = {
  cataloguePublisherId: number;
  publisher: typeof cataloguePublishers.$inferSelect;
};

export async function createDeveloperTestContext(input: {
  userId: number;
  name: string;
  email?: string | null;
  city?: string | null;
  province?: string | null;
  organisationStatus?: OrganisationStatus;
  isVerified?: boolean;
  isTrusted?: boolean;
  publisherVisible?: boolean;
  publisherContactVerified?: boolean;
  publicContactEmail?: string | null;
}): Promise<DeveloperTestContext> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const identity = await developerIdentityService.createDeveloperOrganisation({
    name: input.name,
    email: input.email ?? input.publicContactEmail ?? null,
    city: input.city ?? null,
    province: input.province ?? null,
    createdByUserId: input.userId,
  });

  const organisationStatus = input.organisationStatus ?? 'approved';
  await database
    .update(developerOrganisations)
    .set({
      status: organisationStatus,
      rejectionReason: organisationStatus === 'rejected' ? 'Rejected test organisation' : null,
      isVerified: input.isVerified === false ? 0 : 1,
      isTrusted: input.isTrusted ? 1 : 0,
    })
    .where(eq(developerOrganisations.id, identity.organisationId));

  await cataloguePublisherService.updatePublisher(identity.publisherId, {
    isVisible: input.publisherVisible === false ? false : true,
    isContactVerified: input.publisherContactVerified === false ? false : true,
    publicContactEmail: input.publicContactEmail ?? input.email ?? null,
  });

  const [organisation] = await database
    .select()
    .from(developerOrganisations)
    .where(eq(developerOrganisations.id, identity.organisationId))
    .limit(1);
  const [membership] = await database
    .select()
    .from(developerOrganisationMemberships)
    .where(eq(developerOrganisationMemberships.id, identity.membership.id))
    .limit(1);
  const [publisher] = await database
    .select()
    .from(cataloguePublishers)
    .where(eq(cataloguePublishers.id, identity.publisherId))
    .limit(1);

  if (!organisation || !membership || !publisher) {
    throw new Error('Canonical developer test context was not persisted coherently.');
  }

  return {
    userId: input.userId,
    organisationId: organisation.id,
    membershipId: membership.id,
    cataloguePublisherId: publisher.id,
    organisation,
    membership,
    publisher,
  };
}

export async function createPlatformPublisherTestContext(input: {
  name: string;
  createdByUserId: number;
  sourceAttribution?: string;
  publicContactEmail?: string | null;
  publisherVisible?: boolean;
}): Promise<PlatformPublisherTestContext> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const created = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: input.name,
    sourceAttribution: input.sourceAttribution ?? 'Canonical integration test fixture',
    publicContactEmail: input.publicContactEmail ?? null,
    isVisible: input.publisherVisible === false ? false : true,
    isContactVerified: true,
    createdBy: input.createdByUserId,
  });
  const [publisher] = await database
    .select()
    .from(cataloguePublishers)
    .where(eq(cataloguePublishers.id, created.id))
    .limit(1);
  if (!publisher) throw new Error('Platform-reference test publisher was not persisted.');

  return { cataloguePublisherId: publisher.id, publisher };
}

export async function activateDeveloperTestLaunchAccess(
  context: DeveloperTestContext,
  options: { activatedAt?: Date } = {},
) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const [plan] = await database
    .select()
    .from(plans)
    .where(eq(plans.name, 'developer_launch_access'))
    .limit(1);
  if (!plan) throw new Error('Developer Launch Access reference plan is missing.');

  const paymentKey = Math.floor(Date.now() * 10 + context.organisationId);
  return activatePaidLaunchAccessForOwner({
    ownerType: 'developer',
    ownerId: context.organisationId,
    planId: plan.id,
    activatedAt: options.activatedAt,
    verifiedPayment: {
      invoiceId: paymentKey,
      paymentId: paymentKey + 1,
      amountMinor: 149900,
      state: 'verified',
    },
    db: database,
  });
}

/**
 * Delete canonical identity rows after each test has removed dependent domain
 * data. Catalogue Publisher is deleted before its owning organisation because
 * the production foreign key deliberately restricts ownership deletion.
 */
export async function deleteDeveloperTestContext(context: DeveloperTestContext): Promise<void> {
  const database = await getDb();
  if (!database) return;

  await database
    .delete(subscriptions)
    .where(and(eq(subscriptions.ownerType, 'developer'), eq(subscriptions.ownerId, context.organisationId)));
  await database
    .delete(cataloguePublishers)
    .where(eq(cataloguePublishers.id, context.cataloguePublisherId));
  await database
    .delete(developerOrganisationMemberships)
    .where(eq(developerOrganisationMemberships.id, context.membershipId));
  await database
    .delete(developerOrganisations)
    .where(eq(developerOrganisations.id, context.organisationId));
}

export async function deletePlatformPublisherTestContext(
  context: PlatformPublisherTestContext,
): Promise<void> {
  const database = await getDb();
  if (!database) return;
  await database
    .delete(cataloguePublishers)
    .where(eq(cataloguePublishers.id, context.cataloguePublisherId));
}
