import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import { agencyAgentMemberships, agents, listings, properties } from '../../../../drizzle/schema';
import { getDb } from '../../../db';

export type OptionAEligibleProfessionalProfile = {
  professionalProfileId: number;
  displayName: string;
  publicProfileSlug: string | null;
};

export type OptionAListingEligibilityBasis = 'assigned_professional' | 'agency_listing_assignment';

export type OptionAListingCandidate = {
  listingId: number;
  publicPropertyId: number;
  title: string;
  eligibilityBasis: OptionAListingEligibilityBasis;
};

const PUBLIC_LISTING_STATUSES = ['approved', 'published'] as const;
const PUBLIC_PROPERTY_STATUSES = ['available', 'published'] as const;

function displayNameForProfile(profile: typeof agents.$inferSelect): string {
  return (
    profile.displayName?.trim() ||
    [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() ||
    `Professional ${profile.id}`
  );
}

function isEligibleProfessionalProfile(profile: typeof agents.$inferSelect): boolean {
  return Number(profile.isVerified) === 1 && profile.status === 'approved';
}

function isCurrentActiveMembership(
  membership: typeof agencyAgentMemberships.$inferSelect,
  evaluatedAt: Date,
): boolean {
  if (membership.status !== 'active') return false;

  const now = evaluatedAt.getTime();
  const effectiveFrom = membership.effectiveFrom
    ? new Date(membership.effectiveFrom).getTime()
    : null;
  const effectiveTo = membership.effectiveTo ? new Date(membership.effectiveTo).getTime() : null;

  return (
    (effectiveFrom === null || (Number.isFinite(effectiveFrom) && effectiveFrom <= now)) &&
    (effectiveTo === null || (Number.isFinite(effectiveTo) && effectiveTo > now))
  );
}

class ExploreOptionAEligibilityService {
  async resolveEligibleProfessionalProfiles(
    operatorUserId: number,
  ): Promise<OptionAEligibleProfessionalProfile[]> {
    const db = await getDb();

    const profiles = await db.select().from(agents).where(eq(agents.userId, operatorUserId));

    return profiles
      .filter(
        (profile: typeof agents.$inferSelect) =>
          Number(profile.userId) === operatorUserId && isEligibleProfessionalProfile(profile),
      )
      .map((profile: typeof agents.$inferSelect) => ({
        professionalProfileId: profile.id,
        displayName: displayNameForProfile(profile),
        publicProfileSlug: profile.slug || null,
      }));
  }

  async resolveListingCandidates(
    operatorUserId: number,
    professionalProfileId: number,
  ): Promise<OptionAListingCandidate[]> {
    const db = await getDb();
    const evaluatedAt = new Date();
    const profiles = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, professionalProfileId), eq(agents.userId, operatorUserId)));

    if (
      profiles.length !== 1 ||
      Number(profiles[0].userId) !== operatorUserId ||
      !isEligibleProfessionalProfile(profiles[0])
    ) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Eligible professional profile not found',
      });
    }

    const [assignedListings, memberships] = await Promise.all([
      db
        .select()
        .from(listings)
        .where(
          and(
            eq(listings.agentId, professionalProfileId),
            inArray(listings.status, PUBLIC_LISTING_STATUSES),
          ),
        ),
      db
        .select()
        .from(agencyAgentMemberships)
        .where(
          and(
            eq(agencyAgentMemberships.agentId, professionalProfileId),
            eq(agencyAgentMemberships.status, 'active'),
          ),
        ),
    ]);

    const activeAgencyIds = new Set(
      memberships
        .filter((membership: typeof agencyAgentMemberships.$inferSelect) =>
          isCurrentActiveMembership(membership, evaluatedAt),
        )
        .map((membership: typeof agencyAgentMemberships.$inferSelect) => membership.agencyId),
    );
    const validListings = assignedListings.filter((listing: typeof listings.$inferSelect) => {
      const listingId = Number(listing.id);
      const listingAgencyId = listing.agencyId === null ? null : Number(listing.agencyId);

      return (
        PUBLIC_LISTING_STATUSES.includes(
          listing.status as (typeof PUBLIC_LISTING_STATUSES)[number],
        ) &&
        Number(listing.agentId) === professionalProfileId &&
        Number.isSafeInteger(listingId) &&
        listingId > 0 &&
        (listingAgencyId === null || (Number.isSafeInteger(listingAgencyId) && listingAgencyId > 0))
      );
    });

    if (validListings.length === 0) {
      return [];
    }

    const listingIds = validListings.map(listing => Number(listing.id));
    const publicProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          inArray(properties.sourceListingId, listingIds),
          inArray(properties.status, PUBLIC_PROPERTY_STATUSES),
        ),
      );
    const propertiesByListingId = new Map<number, Array<typeof properties.$inferSelect>>();

    for (const property of publicProperties) {
      const listingId = Number(property.sourceListingId);
      const publicPropertyId = Number(property.id);

      if (
        !listingIds.includes(listingId) ||
        !PUBLIC_PROPERTY_STATUSES.includes(
          property.status as (typeof PUBLIC_PROPERTY_STATUSES)[number],
        ) ||
        !Number.isSafeInteger(publicPropertyId) ||
        publicPropertyId <= 0
      ) {
        continue;
      }

      const matches = propertiesByListingId.get(listingId) ?? [];
      matches.push(property);
      propertiesByListingId.set(listingId, matches);
    }

    const candidates: OptionAListingCandidate[] = [];

    for (const listing of validListings) {
      const listingId = Number(listing.id);
      const matchingProperties = propertiesByListingId.get(listingId) ?? [];

      if (matchingProperties.length !== 1) {
        continue;
      }

      const listingAgencyId = listing.agencyId === null ? null : Number(listing.agencyId);
      if (listingAgencyId !== null && !activeAgencyIds.has(listingAgencyId)) {
        continue;
      }

      candidates.push({
        listingId,
        publicPropertyId: Number(matchingProperties[0].id),
        title: listing.title,
        eligibilityBasis:
          listingAgencyId === null ? 'assigned_professional' : 'agency_listing_assignment',
      });
    }

    return candidates.sort((left, right) => left.listingId - right.listingId);
  }
}

export const exploreOptionAEligibilityService = new ExploreOptionAEligibilityService();
