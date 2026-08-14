import { and, eq } from 'drizzle-orm';

import {
  agencies,
  agents,
  developerOrganisationMemberships,
  developerOrganisations,
  developments,
} from '../../drizzle/schema';
import {
  canUploadToExploreRole,
  hasExplorePublisherIdentityRole,
} from '../../shared/explorePublishing';
import type { AuthUser } from '../_core/requireUser';
import { resolveListingCommercialOwner } from './listingPublicationEntitlementService';

type DbLike = any;

export type ExplorePublishingEligibility =
  | {
      allowed: true;
      publisherType: 'editorial' | 'agency' | 'agent' | 'developer';
      publisherId: number;
      creatorType: 'user' | 'agency' | 'agent' | 'developer';
      creatorId: number;
      agencyId: number | null;
      agentId: number | null;
      developerId: number | null;
    }
  | {
      allowed: false;
      reason:
        | 'unsupported_role'
        | 'agency_identity_required'
        | 'agency_not_approved'
        | 'agent_identity_required'
        | 'agent_not_approved'
        | 'developer_identity_required'
        | 'developer_not_approved'
        | 'publisher_submissions_not_open';
    };

export class ExplorePublishingAuthorizationError extends Error {}

export function getExplorePublishingAccessMessage(
  eligibility: Extract<ExplorePublishingEligibility, { allowed: false }>,
): string {
  return eligibility.reason === 'publisher_submissions_not_open'
    ? 'Publisher submissions are not yet open.'
    : 'Your account is not approved to publish to Explore.';
}

/**
 * Canonical Explore publishing decision. Authentication proves who made the
 * request; this resolver proves the publisher identity the request represents.
 */
export async function getExplorePublishingEligibility(
  db: DbLike,
  user: AuthUser,
): Promise<ExplorePublishingEligibility> {
  const role = String(user.role || '').trim().toLowerCase();

  if (!hasExplorePublisherIdentityRole(role)) {
    return { allowed: false, reason: 'unsupported_role' };
  }

  if (canUploadToExploreRole(role)) {
    return {
      allowed: true,
      publisherType: 'editorial',
      publisherId: user.id,
      creatorType: 'user',
      creatorId: user.id,
      agencyId: null,
      agentId: null,
      developerId: null,
    };
  }

  if (role === 'agency_admin') {
    if (!user.agencyId) return { allowed: false, reason: 'agency_identity_required' };

    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(and(eq(agencies.id, user.agencyId), eq(agencies.isVerified, 1)))
      .limit(1);

    if (!agency) return { allowed: false, reason: 'agency_not_approved' };
    return { allowed: false, reason: 'publisher_submissions_not_open' };
  }

  if (role === 'agent') {
    const [agent] = await db
      .select({ agentId: agents.id, agencyId: agencies.id })
      .from(agents)
      .innerJoin(agencies, eq(agents.agencyId, agencies.id))
      .where(
        and(
          eq(agents.userId, user.id),
          eq(agents.status, 'approved'),
          eq(agencies.isVerified, 1),
        ),
      )
      .limit(1);

    if (!agent) return { allowed: false, reason: 'agent_not_approved' };
    return { allowed: false, reason: 'publisher_submissions_not_open' };
  }

  const [developer] = await db
    .select({ id: developerOrganisations.id })
    .from(developerOrganisationMemberships)
    .innerJoin(
      developerOrganisations,
      eq(developerOrganisationMemberships.organisationId, developerOrganisations.id),
    )
    .where(
      and(
        eq(developerOrganisationMemberships.userId, user.id),
        eq(developerOrganisationMemberships.status, 'active'),
        eq(developerOrganisations.status, 'approved'),
      ),
    )
    .limit(1);

  if (!developer) return { allowed: false, reason: 'developer_not_approved' };
  return { allowed: false, reason: 'publisher_submissions_not_open' };
}

/**
 * A publisher can only attach inventory belonging to the organization identity
 * already derived by the eligibility resolver. Editorial administrators are
 * the sole exception because they operate the platform publication authority.
 */
export async function assertExploreReferenceOwnership(
  db: DbLike,
  publisher: Extract<ExplorePublishingEligibility, { allowed: true }>,
  input: { listingId?: number; developmentId?: number; propertyId?: number },
) {
  if (publisher.publisherType === 'editorial') return;

  if (input.propertyId) {
    throw new ExplorePublishingAuthorizationError(
      'Property references must use the canonical listing publishing workflow.',
    );
  }

  if (input.listingId) {
    if (!publisher.agencyId) {
      throw new ExplorePublishingAuthorizationError(
        'Only the listing owner may attach it to Explore content.',
      );
    }

    const owner = await resolveListingCommercialOwner(db, input.listingId);
    if (owner.kind !== 'agency' || owner.agencyId !== publisher.agencyId) {
      throw new ExplorePublishingAuthorizationError(
        'Only the listing owner may attach it to Explore content.',
      );
    }
  }

  if (input.developmentId) {
    if (publisher.publisherType !== 'developer' || !publisher.developerId) {
      throw new ExplorePublishingAuthorizationError(
        'Only the development owner may attach it to Explore content.',
      );
    }

    const [development] = await db
      .select({ publisherId: developments.cataloguePublisherId })
      .from(developments)
      .where(eq(developments.id, input.developmentId))
      .limit(1);

    if (!development || development.publisherId !== publisher.publisherId) {
      throw new ExplorePublishingAuthorizationError(
        'Only the development owner may attach it to Explore content.',
      );
    }
  }
}
