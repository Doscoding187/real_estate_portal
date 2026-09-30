import { and, asc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
} from '../../drizzle/schema';

/**
 * The one request-scoped Developer actor authority shared by workspace and
 * commercial consumers. It intentionally accepts a caller-supplied database
 * handle so a billing transaction keeps its lock/transaction context instead
 * of opening a second connection through a service dependency.
 */
export type DeveloperActorResolution = {
  organisation: typeof developerOrganisations.$inferSelect;
  membership: typeof developerOrganisationMemberships.$inferSelect;
  publisher: typeof cataloguePublishers.$inferSelect;
  organisationId: number;
  publisherId: number;
  userId: number;
};

export async function resolveDeveloperActorForUser(
  database: any,
  userId: number,
): Promise<DeveloperActorResolution | null> {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid Developer actor.' });
  }

  // Read two rows deliberately. This product has no organisation switcher, so
  // accepting a first row would allow workspace and billing paths to select
  // different commercial owners for the same principal.
  const memberships = await database
    .select({ id: developerOrganisationMemberships.id })
    .from(developerOrganisationMemberships)
    .where(
      and(
        eq(developerOrganisationMemberships.userId, userId),
        eq(developerOrganisationMemberships.status, 'active'),
      ),
    )
    .orderBy(asc(developerOrganisationMemberships.id))
    .limit(2);

  if (memberships.length > 1) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Multiple active developer organisations require an explicit organisation context.',
    });
  }

  const membership = memberships[0];
  if (!membership) return null;

  const [row] = await database
    .select({
      organisation: developerOrganisations,
      membership: developerOrganisationMemberships,
      publisher: cataloguePublishers,
    })
    .from(developerOrganisationMemberships)
    .innerJoin(
      developerOrganisations,
      eq(developerOrganisationMemberships.organisationId, developerOrganisations.id),
    )
    .innerJoin(
      cataloguePublishers,
      and(
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
        eq(cataloguePublishers.authorityKind, 'developer_first_party'),
      ),
    )
    .where(
      and(
        eq(developerOrganisationMemberships.id, membership.id),
        eq(developerOrganisationMemberships.status, 'active'),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Developer organisation does not have a coherent first-party publisher.',
    });
  }

  return {
    organisation: row.organisation,
    membership: row.membership,
    publisher: row.publisher,
    organisationId: Number(row.organisation.id),
    publisherId: Number(row.publisher.id),
    userId: Number(row.membership.userId),
  };
}
