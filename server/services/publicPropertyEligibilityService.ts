import { and, eq, inArray } from 'drizzle-orm';

import {
  agencies,
  agents,
  cataloguePublishers,
  listings,
  subscriptions,
  users,
} from '../../drizzle/schema';
import type { PublicPropertySupplyIdentity } from '../../shared/types';
import { getDb } from '../db';
import {
  PUBLIC_PROPERTY_QUERY_BATCH_SIZE,
  resolveApprovedPublicProperties,
  type ApprovedPublicPropertyResolution,
} from './approvedPublicPropertyService';
import { isPaidSubscriptionEntitled } from './planAccessService';
import {
  resolvePublicPropertyCustody,
  type PublicAgentOwnershipCandidate,
  type PublicAgencyOwnershipCandidate,
  type PublicBrandOwnershipCandidate,
  type PublicLeadCustodyResolution,
} from './publicLeadCustodyService';

type PublicSupplyUser = {
  id: number;
  role: string | null;
  agencyId: number | null;
};

type PublicSupplyAgent = PublicAgentOwnershipCandidate & {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImage: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  slug: string | null;
};

type PublicSupplyAgency = PublicAgencyOwnershipCandidate & {
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  slug: string;
};

type PublicSupplyBrand = PublicBrandOwnershipCandidate & {
  name: string;
  slug: string;
  logoUrl: string | null;
  publicContactEmail: string | null;
};

export interface PublicPropertySupplyEvidence {
  approvedSourceListingId: number;
  property: {
    id: number;
    ownerId: number | null;
    agentId: number | null;
    developmentId: number | null;
    cataloguePublisherId: number | null;
  };
  sourceListing: {
    id: number;
    ownerId: number | null;
    agentId: number | null;
    agencyId: number | null;
  } | null;
  propertyOwner: PublicSupplyUser | null;
  sourceOwner: PublicSupplyUser | null;
  directAgent: PublicSupplyAgent | null;
  sourceAgent: PublicSupplyAgent | null;
  directAgentAgency: PublicSupplyAgency | null;
  sourceAgentAgency: PublicSupplyAgency | null;
  sourceAgency: PublicSupplyAgency | null;
  ownerAgency: PublicSupplyAgency | null;
  brand: PublicSupplyBrand | null;
  brandReferenceInvalid: boolean;
}

export type PublicPropertyEligibilityReason =
  | 'missing_supply_evidence'
  | 'source_listing_mismatch'
  | 'stale_owner_projection'
  | 'stale_agent_projection'
  | 'development_inventory_requires_development_authority'
  | 'invalid_catalogue_publisher'
  | 'developer_inventory_requires_development_authority'
  | 'invalid_platform_provenance'
  | 'unactionable_custody'
  | 'invalid_owner_relationship'
  | 'missing_public_identity';

export type PublicPropertySupplyEvaluation =
  | {
      eligible: true;
      publicIdentity: PublicPropertySupplyIdentity;
      custody: PublicLeadCustodyResolution;
    }
  | {
      eligible: false;
      reason: PublicPropertyEligibilityReason;
      detail: string;
      custody?: PublicLeadCustodyResolution;
    };

export interface PublicPropertyEligibilityResolution
  extends ApprovedPublicPropertyResolution {
  publicAuthority: 'public_property_eligibility';
  publicIdentity: PublicPropertySupplyIdentity;
  custody: PublicLeadCustodyResolution;
}

export interface PublicPropertyEligibilityDependencies {
  resolveApprovedProperties?: (
    propertyIds: readonly number[],
  ) => Promise<Map<number, ApprovedPublicPropertyResolution>>;
  loadSupplyEvidence?: (
    approvals: readonly ApprovedPublicPropertyResolution[],
  ) => Promise<Map<number, PublicPropertySupplyEvidence>>;
}

function positiveId(value: unknown): number | null {
  const normalized = Number(value || 0);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function distinctPositiveIds(values: readonly unknown[]): number[] {
  return Array.from(
    new Set(values.map(positiveId).filter((value): value is number => value !== null)),
  );
}

async function loadRowsInBoundedBatches(
  ids: readonly number[],
  loader: (batchIds: readonly number[]) => Promise<any[]>,
): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; offset < ids.length; offset += PUBLIC_PROPERTY_QUERY_BATCH_SIZE) {
    const batchIds = ids.slice(offset, offset + PUBLIC_PROPERTY_QUERY_BATCH_SIZE);
    rows.push(...(await loader(batchIds)));
  }
  return rows;
}

function sameNullableId(left: unknown, right: unknown): boolean {
  return positiveId(left) === positiveId(right);
}

function agentName(agent: PublicSupplyAgent): string {
  return (
    String(agent.displayName || '').trim() ||
    [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim()
  );
}

function ineligible(
  reason: PublicPropertyEligibilityReason,
  detail: string,
  custody?: PublicLeadCustodyResolution,
): PublicPropertySupplyEvaluation {
  return { eligible: false, reason, detail, custody };
}

/**
 * Final public-property supply decision.
 *
 * Approval/projection coherence is resolved by approvedPublicPropertyService.
 * This second half proves positive provenance, truthful public identity and an
 * actionable authorized lead destination. Absence never becomes a seller type.
 */
export function evaluatePublicPropertySupplyEvidence(
  evidence: PublicPropertySupplyEvidence,
): PublicPropertySupplyEvaluation {
  const { property, sourceListing } = evidence;
  if (!sourceListing) {
    return ineligible('missing_supply_evidence', 'The approved source listing is unavailable.');
  }

  if (
    positiveId(sourceListing.id) === null ||
    positiveId(sourceListing.id) !== positiveId(evidence.approvedSourceListingId)
  ) {
    return ineligible(
      'source_listing_mismatch',
      'The supply evidence does not belong to the approved source listing.',
    );
  }

  if (!sameNullableId(property.ownerId, sourceListing.ownerId)) {
    return ineligible(
      'stale_owner_projection',
      'The public projection and approved source disagree about their owner.',
    );
  }

  if (!sameNullableId(property.agentId, sourceListing.agentId)) {
    return ineligible(
      'stale_agent_projection',
      'The public projection and approved source disagree about their assigned agent.',
    );
  }

  if (positiveId(property.developmentId)) {
    return ineligible(
      'development_inventory_requires_development_authority',
      'Development inventory must remain on the canonical development and unit authority.',
    );
  }

  const brandId = positiveId(property.cataloguePublisherId);
  if (brandId && (evidence.brandReferenceInvalid || evidence.brand?.id !== brandId)) {
    return ineligible(
      'invalid_catalogue_publisher',
      'The public property references a Catalogue Publisher that cannot be verified.',
    );
  }

  if (evidence.brand?.authorityKind === 'developer_first_party') {
    return ineligible(
      'developer_inventory_requires_development_authority',
      'First-party developer inventory must retain its development and unit provenance.',
    );
  }

  const custody = resolvePublicPropertyCustody({
    propertyAgentId: property.agentId,
    sourceListingAgentId: sourceListing.agentId,
    sourceListingAgencyId: sourceListing.agencyId,
    ownerAgencyId: evidence.sourceOwner?.agencyId,
    cataloguePublisherId: brandId,
    directAgent: evidence.directAgent,
    sourceAgent: evidence.sourceAgent,
    directAgentAgency: evidence.directAgentAgency,
    sourceAgentAgency: evidence.sourceAgentAgency,
    sourceAgency: evidence.sourceAgency,
    ownerAgency: evidence.ownerAgency,
    brand: evidence.brand,
    brandReferenceInvalid: evidence.brandReferenceInvalid,
  });

  if (evidence.brand?.authorityKind === 'platform_reference') {
    const explicitPlatformOwner =
      evidence.sourceOwner &&
      evidence.propertyOwner &&
      evidence.sourceOwner.id === evidence.propertyOwner.id &&
      evidence.sourceOwner.role === 'super_admin';
    const hasCustomerClaim = Boolean(
      positiveId(sourceListing.agentId) ||
        positiveId(sourceListing.agencyId) ||
        positiveId(evidence.sourceOwner?.agencyId),
    );

    if (
      !explicitPlatformOwner ||
      hasCustomerClaim ||
      custody.leadCustody !== 'platform_managed'
    ) {
      return ineligible(
        'invalid_platform_provenance',
        'Property Listify custody requires an explicit platform publisher and platform owner without customer claims.',
        custody,
      );
    }

    return {
      eligible: true,
      custody,
      publicIdentity: {
        role: 'platform',
        provenance: 'platform_curated',
        name: 'Property Listify',
        organizationName: evidence.brand.name,
        organizationLogoUrl: evidence.brand.logoUrl,
        cataloguePublisherId: brandId || undefined,
      },
    };
  }

  if (custody.leadCustody !== 'verified_customer_recipient') {
    return ineligible(
      'unactionable_custody',
      custody.reason || 'The public property has no actionable authorized recipient.',
      custody,
    );
  }

  const sourceOwner = evidence.sourceOwner;
  if (!sourceOwner || sourceOwner.id !== positiveId(sourceListing.ownerId)) {
    return ineligible(
      'invalid_owner_relationship',
      'The approved source owner cannot be resolved.',
      custody,
    );
  }

  if (custody.recipientType === 'agent' && custody.agentId) {
    const agent =
      evidence.directAgent?.id === custody.agentId
        ? evidence.directAgent
        : evidence.sourceAgent?.id === custody.agentId
          ? evidence.sourceAgent
          : null;
    if (!agent) {
      return ineligible(
        'missing_public_identity',
        'The authorized agent has no public identity.',
        custody,
      );
    }

    const agency = custody.agencyId
      ? evidence.directAgentAgency?.id === custody.agencyId
        ? evidence.directAgentAgency
        : evidence.sourceAgentAgency?.id === custody.agencyId
          ? evidence.sourceAgentAgency
          : evidence.ownerAgency
      : null;
    const ownerRelationshipValid = custody.agencyId
      ? sourceOwner.agencyId === custody.agencyId &&
        (sourceOwner.role === 'agent' || sourceOwner.role === 'agency_admin')
      : sourceOwner.id === positiveId(agent.userId) && sourceOwner.role === 'agent';
    if (!ownerRelationshipValid) {
      return ineligible(
        'invalid_owner_relationship',
        'The listing owner is not authorized for the resolved agent or agency custody.',
        custody,
      );
    }

    const name = agentName(agent);
    if (!name) {
      return ineligible(
        'missing_public_identity',
        'The authorized agent has no publishable name.',
        custody,
      );
    }

    return {
      eligible: true,
      custody,
      publicIdentity: {
        role: 'agent',
        provenance: 'agent',
        name,
        organizationName: agency?.name || null,
        organizationLogoUrl: agency?.logo || null,
        avatarUrl: agent.profileImage,
        phone: agent.phone,
        whatsapp: agent.whatsapp || agent.phone,
        email: agent.email,
        agentId: agent.id,
        agencyId: custody.agencyId || undefined,
      },
    };
  }

  if (custody.recipientType === 'agency' && custody.agencyId) {
    const agency =
      evidence.sourceAgency?.id === custody.agencyId
        ? evidence.sourceAgency
        : evidence.ownerAgency?.id === custody.agencyId
          ? evidence.ownerAgency
          : null;
    if (
      !agency ||
      sourceOwner.agencyId !== custody.agencyId ||
      sourceOwner.role !== 'agency_admin'
    ) {
      return ineligible(
        'invalid_owner_relationship',
        'Agency-only inventory must be owned by an agency administrator who can act on unassigned leads.',
        custody,
      );
    }

    const name = String(agency.name || '').trim();
    if (!name) {
      return ineligible(
        'missing_public_identity',
        'The authorized agency has no publishable name.',
        custody,
      );
    }

    return {
      eligible: true,
      custody,
      publicIdentity: {
        role: 'agency',
        provenance: 'agency',
        name,
        organizationName: name,
        organizationLogoUrl: agency.logo,
        avatarUrl: agency.logo,
        phone: agency.phone,
        whatsapp: agency.phone,
        email: agency.email,
        agencyId: agency.id,
      },
    };
  }

  return ineligible(
    'unactionable_custody',
    'The resolved custody type is not supported for public property inventory.',
    custody,
  );
}

async function loadAgentPaidEntitledUserIds(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userIds: number[],
): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();
  const rows = await loadRowsInBoundedBatches(userIds, async batchIds =>
    database
      .select({
        ownerId: subscriptions.ownerId,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(
        and(inArray(subscriptions.ownerId, [...batchIds]), eq(subscriptions.ownerType, 'agent')),
      ),
  );
  const now = Date.now();
  const entitled = new Set<number>();
  for (const row of rows) {
    if (!isPaidSubscriptionEntitled(row.status as never)) continue;
    const periodEnd = row.currentPeriodEnd ? new Date(row.currentPeriodEnd).getTime() : null;
    if (periodEnd !== null && (!Number.isFinite(periodEnd) || periodEnd <= now)) continue;
    entitled.add(Number(row.ownerId));
  }
  return entitled;
}

async function loadDefaultSupplyEvidence(
  approvals: readonly ApprovedPublicPropertyResolution[],
): Promise<Map<number, PublicPropertySupplyEvidence>> {
  const database = await getDb();
  if (!database || approvals.length === 0) return new Map();

  const listingIds = distinctPositiveIds(approvals.map(value => value.sourceListingId));
  const sourceListings = await loadRowsInBoundedBatches(listingIds, async batchIds =>
    database
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        agentId: listings.agentId,
        agencyId: listings.agencyId,
      })
      .from(listings)
      .where(inArray(listings.id, [...batchIds])),
  );
  const sourceById = new Map<
    number,
    { id: number; ownerId: number | null; agentId: number | null; agencyId: number | null }
  >(sourceListings.map(row => [Number(row.id), row]));

  const agentIds = distinctPositiveIds([
    ...approvals.map(value => value.property.agentId),
    ...sourceListings.map(row => row.agentId),
  ]);
  const agentRows = await loadRowsInBoundedBatches(agentIds, async batchIds =>
    database
      .select({
        id: agents.id,
        userId: agents.userId,
        agencyId: agents.agencyId,
        status: agents.status,
        isVerified: agents.isVerified,
        firstName: agents.firstName,
        lastName: agents.lastName,
        displayName: agents.displayName,
        profileImage: agents.profileImage,
        phone: agents.phone,
        whatsapp: agents.whatsapp,
        email: agents.email,
        slug: agents.slug,
      })
      .from(agents)
      .where(inArray(agents.id, [...batchIds])),
  );

  const agentPaidEntitledUserIds = await loadAgentPaidEntitledUserIds(
    database,
    distinctPositiveIds(agentRows.map(row => row.userId)),
  );

  const userIds = distinctPositiveIds([
    ...approvals.map(value => value.property.ownerId),
    ...sourceListings.map(row => row.ownerId),
    ...agentRows.map(row => row.userId),
  ]);
  const userRows = await loadRowsInBoundedBatches(userIds, async batchIds =>
    database
      .select({ id: users.id, role: users.role, agencyId: users.agencyId })
      .from(users)
      .where(inArray(users.id, [...batchIds])),
  );
  const userById = new Map<number, PublicSupplyUser>(
    userRows.map(row => [
      Number(row.id),
      {
        id: Number(row.id),
        role: row.role || null,
        agencyId: positiveId(row.agencyId),
      } satisfies PublicSupplyUser,
    ]),
  );

  const agentById = new Map<number, PublicSupplyAgent>(
    agentRows.map(row => [
      Number(row.id),
      {
        ...row,
        id: Number(row.id),
        userId: positiveId(row.userId),
        agencyId: positiveId(row.agencyId),
        status: row.status || null,
        isVerified: Number(row.isVerified || 0),
        hasActivePaidEntitlement: agentPaidEntitledUserIds.has(Number(row.userId)),
        userRole: userById.get(Number(row.userId))?.role || null,
      },
    ]),
  );

  const agencyIds = distinctPositiveIds([
    ...sourceListings.map(row => row.agencyId),
    ...userRows.map(row => row.agencyId),
    ...agentRows.map(row => row.agencyId),
  ]);
  const agencyRows = await loadRowsInBoundedBatches(agencyIds, async batchIds =>
    database
      .select({
        id: agencies.id,
        name: agencies.name,
        slug: agencies.slug,
        logo: agencies.logo,
        phone: agencies.phone,
        email: agencies.email,
        isVerified: agencies.isVerified,
      })
      .from(agencies)
      .where(inArray(agencies.id, [...batchIds])),
  );
  const agencyById = new Map<number, PublicSupplyAgency>(
    agencyRows.map(row => [
      Number(row.id),
      {
        id: Number(row.id),
        name: row.name,
        slug: row.slug,
        logo: row.logo,
        phone: row.phone,
        email: row.email,
        isVerified: Number(row.isVerified || 0),
      },
    ]),
  );

  const publisherIds = distinctPositiveIds(
    approvals.map(value => value.property.cataloguePublisherId),
  );
  const publisherRows = await loadRowsInBoundedBatches(publisherIds, async batchIds =>
    database
      .select({
        id: cataloguePublishers.id,
        authorityKind: cataloguePublishers.authorityKind,
        developerOrganisationId: cataloguePublishers.developerOrganisationId,
        name: cataloguePublishers.name,
        slug: cataloguePublishers.slug,
        logoUrl: cataloguePublishers.logoUrl,
        publicContactEmail: cataloguePublishers.publicContactEmail,
        sourceAttribution: cataloguePublishers.sourceAttribution,
        isVisible: cataloguePublishers.isVisible,
      })
      .from(cataloguePublishers)
      .where(inArray(cataloguePublishers.id, [...batchIds])),
  );
  const publisherById = new Map<number, PublicSupplyBrand>(
    publisherRows.map(row => [
      Number(row.id),
      {
        ...row,
        id: Number(row.id),
        developerOrganisationId: positiveId(row.developerOrganisationId),
        isVisible: Number(row.isVisible || 0),
        isSubscriber: row.authorityKind === 'developer_first_party' ? 1 : 0,
      },
    ]),
  );

  const evidenceByPropertyId = new Map<number, PublicPropertySupplyEvidence>();
  approvals.forEach(approval => {
    const propertyId = Number(approval.property.id);
    const sourceListingId = positiveId(approval.sourceListingId);
    const sourceListing = sourceListingId ? sourceById.get(sourceListingId) || null : null;
    const propertyAgentId = positiveId(approval.property.agentId);
    const sourceAgentId = positiveId(sourceListing?.agentId);
    const propertyOwnerId = positiveId(approval.property.ownerId);
    const sourceOwnerId = positiveId(sourceListing?.ownerId);
    const directAgent = propertyAgentId ? agentById.get(propertyAgentId) || null : null;
    const sourceAgent = sourceAgentId ? agentById.get(sourceAgentId) || null : null;
    const propertyOwner = propertyOwnerId ? userById.get(propertyOwnerId) || null : null;
    const sourceOwner = sourceOwnerId ? userById.get(sourceOwnerId) || null : null;
    const sourceAgencyId = positiveId(sourceListing?.agencyId);
    const ownerAgencyId = positiveId(sourceOwner?.agencyId);
    const publisherId = positiveId(approval.property.cataloguePublisherId);

    evidenceByPropertyId.set(propertyId, {
      approvedSourceListingId: sourceListingId || 0,
      property: {
        id: propertyId,
        ownerId: propertyOwnerId,
        agentId: propertyAgentId,
        developmentId: positiveId(approval.property.developmentId),
        cataloguePublisherId: publisherId,
      },
      sourceListing: sourceListing
        ? {
            id: Number(sourceListing.id),
            ownerId: sourceOwnerId,
            agentId: sourceAgentId,
            agencyId: sourceAgencyId,
          }
        : null,
      propertyOwner,
      sourceOwner,
      directAgent,
      sourceAgent,
      directAgentAgency: directAgent?.agencyId
        ? agencyById.get(directAgent.agencyId) || null
        : null,
      sourceAgentAgency: sourceAgent?.agencyId
        ? agencyById.get(sourceAgent.agencyId) || null
        : null,
      sourceAgency: sourceAgencyId ? agencyById.get(sourceAgencyId) || null : null,
      ownerAgency: ownerAgencyId ? agencyById.get(ownerAgencyId) || null : null,
      brand: publisherId ? publisherById.get(publisherId) || null : null,
      brandReferenceInvalid: Boolean(publisherId && !publisherById.has(publisherId)),
    });
  });

  return evidenceByPropertyId;
}

export async function resolvePublicPropertyEligibilities(
  propertyIds: readonly number[],
  dependencies: PublicPropertyEligibilityDependencies = {},
): Promise<Map<number, PublicPropertyEligibilityResolution>> {
  const uniqueIds = distinctPositiveIds(propertyIds);
  if (uniqueIds.length === 0) return new Map();

  const approvedByPropertyId = await (
    dependencies.resolveApprovedProperties || resolveApprovedPublicProperties
  )(uniqueIds);
  const approvals = uniqueIds
    .map(propertyId => approvedByPropertyId.get(propertyId))
    .filter((approval): approval is ApprovedPublicPropertyResolution => Boolean(approval));

  const evidenceByPropertyId = await (
    dependencies.loadSupplyEvidence || loadDefaultSupplyEvidence
  )(approvals);
  const resolutions = new Map<number, PublicPropertyEligibilityResolution>();
  approvals.forEach(approval => {
    const propertyId = Number(approval.property.id);
    const evidence = evidenceByPropertyId.get(propertyId);
    if (!evidence) return;
    const evaluation = evaluatePublicPropertySupplyEvidence(evidence);
    if (!evaluation.eligible) return;

    resolutions.set(propertyId, {
      ...approval,
      publicAuthority: 'public_property_eligibility',
      publicIdentity: evaluation.publicIdentity,
      custody: evaluation.custody,
      property: {
        ...approval.property,
        publicIdentity: evaluation.publicIdentity,
        listerType: evaluation.publicIdentity.role,
      },
    });
  });

  return resolutions;
}

export async function resolvePublicPropertyEligibility(
  propertyId: number,
  dependencies: PublicPropertyEligibilityDependencies = {},
): Promise<PublicPropertyEligibilityResolution | null> {
  return (await resolvePublicPropertyEligibilities([propertyId], dependencies)).get(propertyId) || null;
}

export async function resolvePublicPropertyEligibilityIds(
  propertyIds: readonly number[],
  dependencies: PublicPropertyEligibilityDependencies = {},
): Promise<number[]> {
  const resolutions = await resolvePublicPropertyEligibilities(propertyIds, dependencies);
  return propertyIds.filter(propertyId => resolutions.has(Number(propertyId)));
}
