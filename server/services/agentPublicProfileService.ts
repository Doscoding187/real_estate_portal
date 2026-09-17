import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { agencyAgentMemberships, agencies, agents, billableAccounts, cities, listings, provinces, properties, suburbs, subscriptions } from '../../drizzle/schema';
import { slugify } from '../_core/utils/slug';
import { isPaidSubscriptionRowEntitled } from './planAccessService';
import { resolvePublicPropertyEligibilities } from './publicPropertyEligibilityService';
import { toPublicPropertyDetailDto } from './publicPropertyDto';
import {
  isCurrentActiveAgencyMembership,
  listCurrentActiveAgencyMembershipsByAgentId,
} from './agencyMembershipService';
import {
  parseAgentCoverageAreas,
  parseCanonicalAgentCoverageLocationId,
  type AgentCoverageArea,
} from '../../shared/agentCoverageArea';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';

/**
 * Anonymous public projections for Agent discovery and the Agent web presence.
 *
 * Persistence rows are private by default. Every public read selects an
 * explicit allowlist so internal and governance columns (userId, approval
 * actors, lifecycle state, completion metrics, administrative timestamps)
 * can never cross the anonymous boundary even as the agents table evolves.
 */

export const APPROVED_AGENT = eq(agents.status, 'approved');

export function buildAgentPublicSlug(agent: {
  id: number;
  slug?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  if (agent.slug) return agent.slug;
  const label = agent.displayName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
  const base = slugify(label) || 'agent';
  return `${base}-${agent.id}`;
}

export function extractTrailingId(slug: string) {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function normalizeFlag(value: unknown) {
  return Number(value || 0) === 1 ? 1 : 0;
}

/** Explicit allowlist for the /agents discovery card. */
const AGENT_DISCOVERY_CARD_COLUMNS = {
  id: agents.id,
  firstName: agents.firstName,
  lastName: agents.lastName,
  displayName: agents.displayName,
  slug: agents.slug,
  bio: agents.bio,
  profileImage: agents.profileImage,
  phone: agents.phone,
  email: agents.email,
  role: agents.role,
  focus: agents.focus,
  specialization: agents.specialization,
  propertyTypes: agents.propertyTypes,
  yearsExperience: agents.yearsExperience,
  areasServed: agents.areasServed,
  languages: agents.languages,
  isVerified: agents.isVerified,
};

export type AgentDiscoveryCardDto = {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string | null;
  slug: string;
  bio: string | null;
  profileImage: string | null;
  phone: string | null;
  email: string | null;
  role: 'agent' | 'principal_agent' | 'broker' | null;
  focus: 'sales' | 'rentals' | 'both' | null;
  specialization: string | null;
  propertyTypes: string | null;
  yearsExperience: number | null;
  areasServed: AgentCoverageArea[];
  languages: string | null;
  isVerified: number;
};

type DiscoveryRecord = Omit<AgentDiscoveryCardDto, 'slug' | 'isVerified' | 'areasServed'> & {
  slug: string | null;
  isVerified: number;
  areasServed: string | null;
};

export function toAgentDiscoveryCard(record: DiscoveryRecord): AgentDiscoveryCardDto {
  const { areasServed, ...card } = record;
  return {
    ...card,
    areasServed: parseAgentCoverageAreas(areasServed),
    isVerified: normalizeFlag(record.isVerified),
    slug: buildAgentPublicSlug(record),
  };
}

export async function listApprovedAgentsForDiscovery(db: any): Promise<AgentDiscoveryCardDto[]> {
  const records: DiscoveryRecord[] = await db
    .select(AGENT_DISCOVERY_CARD_COLUMNS)
    .from(agents)
    .where(APPROVED_AGENT)
    .orderBy(desc(agents.isFeatured), desc(agents.updatedAt));

  return records.map(toAgentDiscoveryCard);
}

/** Explicit allowlist for the /agents/:slug web presence. */
const AGENT_WEB_PRESENCE_COLUMNS = {
  ...AGENT_DISCOVERY_CARD_COLUMNS,
  whatsapp: agents.whatsapp,
  socialLinks: agents.socialLinks,
  licenseNumber: agents.licenseNumber,
};

type WebPresenceRecord = {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string | null;
  slug: string | null;
  bio: string | null;
  profileImage: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  role: 'agent' | 'principal_agent' | 'broker' | null;
  focus: 'sales' | 'rentals' | 'both' | null;
  specialization: string | null;
  propertyTypes: string | null;
  socialLinks: string | null;
  licenseNumber: string | null;
  yearsExperience: number | null;
  areasServed: string | null;
  languages: string | null;
  isVerified: number;
};

/** Public agency affiliation identity; no public agency route exists yet. */
export type AgentWebPresenceAgency = { name: string };

export type AgentWebPresenceDto = Omit<WebPresenceRecord, 'slug' | 'isVerified' | 'areasServed'> & {
  slug: string;
  isVerified: number;
  areasServed: AgentCoverageArea[];
  agency: AgentWebPresenceAgency | null;
};

export function toAgentWebPresence(record: WebPresenceRecord): AgentWebPresenceDto {
  const { areasServed, ...profile } = record;
  return {
    ...profile,
    areasServed: parseAgentCoverageAreas(areasServed),
    isVerified: normalizeFlag(record.isVerified),
    slug: buildAgentPublicSlug(record),
    agency: null,
  };
}

async function findApprovedAgentWebPresenceRow(db: any, slug: string) {
  const [exactMatch] = await db
    .select(AGENT_WEB_PRESENCE_COLUMNS)
    .from(agents)
    .where(and(eq(agents.slug, slug), APPROVED_AGENT))
    .limit(1);

  if (exactMatch) return exactMatch as WebPresenceRecord;

  const fallbackId = extractTrailingId(slug);
  if (!fallbackId) return null;

  const [fallbackRecord] = await db
    .select(AGENT_WEB_PRESENCE_COLUMNS)
    .from(agents)
    .where(and(eq(agents.id, fallbackId), APPROVED_AGENT))
    .limit(1);

  if (!fallbackRecord) return null;

  const candidate = toAgentWebPresence(fallbackRecord as WebPresenceRecord);
  if (candidate.slug !== slug) return null;

  return fallbackRecord as WebPresenceRecord;
}

export async function findApprovedAgentWebPresenceBySlug(
  db: any,
  slug: string,
): Promise<AgentWebPresenceDto | null> {
  const row = await findApprovedAgentWebPresenceRow(db, slug);
  if (!row) return null;

  const profile = toAgentWebPresence(row);
  profile.agency = await resolveCurrentAgencyAffiliation(db, Number(row.id));
  return profile;
}

export async function findApprovedAgentIdBySlug(db: any, slug: string): Promise<number | null> {
  const row = await findApprovedAgentWebPresenceRow(db, slug);
  return row ? Number(row.id) : null;
}

interface AgencyMembershipRow {
  id: number;
  status: 'invited' | 'active' | 'suspended' | 'left';
  effectiveFrom: string | Date | null;
  effectiveTo: string | Date | null;
  agencyName: string;
}

/**
 * Public agency affiliation for a web presence. Fails closed: zero current
 * memberships and multiple simultaneous current memberships both yield no
 * affiliation; agents.agencyId never establishes a public affiliation.
 */
export async function resolveCurrentAgencyAffiliation(
  db: any,
  agentId: number,
): Promise<AgentWebPresenceAgency | null> {
  const memberships: AgencyMembershipRow[] = await db
    .select({
      id: agencyAgentMemberships.id,
      status: agencyAgentMemberships.status,
      effectiveFrom: agencyAgentMemberships.effectiveFrom,
      effectiveTo: agencyAgentMemberships.effectiveTo,
      agencyName: agencies.name,
    })
    .from(agencyAgentMemberships)
    .innerJoin(agencies, eq(agencyAgentMemberships.agencyId, agencies.id))
    .where(eq(agencyAgentMemberships.agentId, agentId));

  const evaluatedAt = new Date();
  const currentNames = memberships
    .filter(membership => isCurrentActiveAgencyMembership(membership, evaluatedAt))
    .map(membership => String(membership.agencyName || '').trim())
    .filter(Boolean);

  const distinctNames = new Set(currentNames);
  if (distinctNames.size !== 1) return null;

  return { name: distinctNames.values().next().value as string };
}

export interface CanonicalAgentArea {
  canonicalLocationId: string;
  name: string;
  type: 'suburb' | 'city' | 'province' | null;
  url: string | null;
}

interface SuburbResolution {
  id: number;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  provinceName: string;
  provinceSlug: string;
}

interface CityResolution {
  id: number;
  name: string;
  slug: string;
  provinceName: string;
  provinceSlug: string;
}

interface ProvinceResolution {
  id: number;
  name: string;
  slug: string;
}

function labelParts(...parts: Array<string | null | undefined>): string {
  return parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function unresolvedCanonicalAgentArea(area: AgentCoverageArea): CanonicalAgentArea {
  return {
    canonicalLocationId: area.canonicalLocationId,
    // This label was generated by the server when the exact location was
    // written. Retaining it is safe, but an unavailable canonical record must
    // never produce a guessed public-search route.
    name: area.label,
    type: null,
    url: null,
  };
}

/**
 * Resolves typed agent coverage claims by their stored canonical identity.
 * There is no text lookup: an old comma-separated value, a forged label, a
 * retired row, or an incomplete hierarchy fails closed and cannot turn into a
 * different public geography.
 */
export async function resolveCanonicalAgentAreas(
  db: any,
  areasServed?: string | null | readonly AgentCoverageArea[],
): Promise<CanonicalAgentArea[]> {
  const entries = Array.isArray(areasServed)
    ? areasServed
    : parseAgentCoverageAreas(areasServed);
  if (entries.length === 0) return [];

  const selections = entries
    .map(area => ({ area, parsed: parseCanonicalAgentCoverageLocationId(area.canonicalLocationId) }))
    .filter(
      (selection): selection is {
        area: AgentCoverageArea;
        parsed: NonNullable<ReturnType<typeof parseCanonicalAgentCoverageLocationId>>;
      } => Boolean(selection.parsed),
    );
  if (selections.length === 0) return [];

  const suburbIds = selections
    .filter(selection => selection.parsed.level === 'suburb')
    .map(selection => selection.parsed.id);
  const cityIds = selections
    .filter(selection => selection.parsed.level === 'city')
    .map(selection => selection.parsed.id);
  const provinceIds = selections
    .filter(selection => selection.parsed.level === 'province')
    .map(selection => selection.parsed.id);

  const suburbRows: SuburbResolution[] = suburbIds.length
    ? await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityName: cities.name,
          citySlug: cities.slug,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
        })
        .from(suburbs)
        .innerJoin(cities, eq(suburbs.cityId, cities.id))
        .innerJoin(provinces, eq(cities.provinceId, provinces.id))
        .where(
          and(
            inArray(suburbs.id, suburbIds),
            ne(suburbs.status, 'retired'),
            ne(cities.status, 'retired'),
            ne(provinces.status, 'retired'),
          ),
        )
    : [];
  const cityRows: CityResolution[] = cityIds.length
    ? await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
        })
        .from(cities)
        .innerJoin(provinces, eq(cities.provinceId, provinces.id))
        .where(
          and(inArray(cities.id, cityIds), ne(cities.status, 'retired'), ne(provinces.status, 'retired')),
        )
    : [];
  const provinceRows: ProvinceResolution[] = provinceIds.length
    ? await db
        .select({
          id: provinces.id,
          name: provinces.name,
          slug: provinces.slug,
        })
        .from(provinces)
        .where(and(inArray(provinces.id, provinceIds), ne(provinces.status, 'retired')))
    : [];

  const suburbsById = new Map(suburbRows.map(row => [Number(row.id), row]));
  const citiesById = new Map(cityRows.map(row => [Number(row.id), row]));
  const provincesById = new Map(provinceRows.map(row => [Number(row.id), row]));

  return selections.map(({ area, parsed }) => {
    if (parsed.level === 'suburb') {
      const row = suburbsById.get(parsed.id);
      if (!row || !row.slug || !row.citySlug || !row.provinceSlug) {
        return unresolvedCanonicalAgentArea(area);
      }
      return {
        canonicalLocationId: parsed.canonicalLocationId,
        name: labelParts(row.name, row.cityName, row.provinceName),
        type: 'suburb' as const,
        url: `/${row.provinceSlug}/${row.citySlug}/${row.slug}`,
      };
    }

    if (parsed.level === 'city') {
      const row = citiesById.get(parsed.id);
      if (!row || !row.slug || !row.provinceSlug) return unresolvedCanonicalAgentArea(area);
      return {
        canonicalLocationId: parsed.canonicalLocationId,
        name: labelParts(row.name, row.provinceName),
        type: 'city' as const,
        url: `/${row.provinceSlug}/${row.slug}`,
      };
    }

    const row = provincesById.get(parsed.id);
    if (!row || !row.slug) return unresolvedCanonicalAgentArea(area);
    return {
      canonicalLocationId: parsed.canonicalLocationId,
      name: labelParts(row.name),
      type: 'province' as const,
      url: `/${row.slug}`,
    };
  });
}

export type AgentAreaRecommendationDto = {
  id: number;
  slug: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  agencyName: string | null;
  agencyLogoUrl: string | null;
  isVerified: boolean;
};

type AgentAreaRecommendationRow = {
  id: number;
  userId: number | null;
  slug: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  isVerified: number;
  areasServed: string | null;
};

type AgentAreaRecommendationAgency = {
  id: number;
  name: string;
  logo: string | null;
  isVerified: number;
};

async function loadPersonallyEntitledAgentUserIds(
  db: any,
  userIds: number[],
): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();
  const rows: Array<{ ownerId: number; status: string; currentPeriodEnd: string | Date | null }> =
    await db
      .select({
        ownerId: subscriptions.ownerId,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.ownerId, userIds),
          sql`EXISTS (
            SELECT 1
            FROM ${billableAccounts} account
            WHERE account.id = ${subscriptions.billableAccountId}
              AND account.account_kind = 'agent'
              AND account.user_id = ${subscriptions.ownerId}
          )`,
        ),
      );
  const now = new Date();
  const entitled = new Set<number>();
  for (const row of rows) {
    if (!isPaidSubscriptionRowEntitled(row, now)) continue;
    entitled.add(Number(row.ownerId));
  }
  return entitled;
}

/**
 * Approved agents whose declared canonical coverage identity exactly matches
 * the requested canonical location and who remain commercially receivable:
 * an active personal agent entitlement, or a current canonical membership in
 * a verified agency.
 *
 * Mirrors the lead-custody eligibility truth. Matching uses the typed stored
 * identity only; no label, partial-text, inferred-location, or historical
 * profile-affiliation fallback exists.
 */
export async function findAgentsServingLocation(
  db: any,
  locationType: 'province' | 'city' | 'suburb',
  locationId: number,
): Promise<AgentAreaRecommendationDto[]> {
  const id = Number(locationId);
  if (!Number.isSafeInteger(id) || id <= 0) return [];

  const locationTable =
    locationType === 'suburb' ? suburbs : locationType === 'city' ? cities : provinces;
  const [location] = await db
    .select({ id: locationTable.id })
    .from(locationTable)
    .where(and(eq(locationTable.id, id), ne(locationTable.status, 'retired')))
    .limit(1);
  if (!location) return [];

  const canonicalLocationId = encodeCanonicalLocationId(locationType, id);
  const candidates: AgentAreaRecommendationRow[] = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      slug: agents.slug,
      firstName: agents.firstName,
      lastName: agents.lastName,
      profileImage: agents.profileImage,
      isVerified: agents.isVerified,
      areasServed: agents.areasServed,
    })
    .from(agents)
    .where(
      and(
        APPROVED_AGENT,
        // `areasServed` remains a text column, so protect JSON_CONTAINS from
        // historic non-JSON rows. There is no label or partial-text fallback.
        sql`CASE WHEN JSON_VALID(${agents.areasServed}) = 1
          THEN JSON_CONTAINS(${agents.areasServed}, JSON_OBJECT('canonicalLocationId', ${canonicalLocationId}))
          ELSE 0 END = 1`,
      ),
    )
    .orderBy(desc(agents.isFeatured), desc(agents.updatedAt))
    .limit(200);

  // Repeat the exact structured check in application code so the public
  // recipient boundary remains fail-closed even if the provider changes JSON
  // coercion behavior.
  const exactClaimAgents = candidates.filter(agent =>
    parseAgentCoverageAreas(agent.areasServed).some(
      area => area.canonicalLocationId === canonicalLocationId,
    ),
  );

  const personallyEntitled = await loadPersonallyEntitledAgentUserIds(
    db,
    exactClaimAgents.map(agent => Number(agent.userId)).filter(userId => userId > 0),
  );

  // An agent's profile affiliation is historical/audit projection only. Public
  // recommendation eligibility and branding must follow exactly one current
  // canonical membership, otherwise a suspended former member can remain
  // publicly represented as an agency practitioner.
  const currentMembershipsByAgentId = await listCurrentActiveAgencyMembershipsByAgentId(
    db,
    exactClaimAgents.map(agent => Number(agent.id)),
  );
  const currentAgencyIds = [
    ...new Set(
      [...currentMembershipsByAgentId.values()]
        .map(membership => Number(membership.agencyId))
        .filter(agencyId => Number.isSafeInteger(agencyId) && agencyId > 0),
    ),
  ];
  const currentAgencies: AgentAreaRecommendationAgency[] =
    currentAgencyIds.length === 0
      ? []
      : await db
          .select({
            id: agencies.id,
            name: agencies.name,
            logo: agencies.logo,
            isVerified: agencies.isVerified,
          })
          .from(agencies)
          .where(inArray(agencies.id, currentAgencyIds));
  const agencyById = new Map(currentAgencies.map(agency => [Number(agency.id), agency]));

  return exactClaimAgents
    .map(agent => {
      const membership = currentMembershipsByAgentId.get(Number(agent.id));
      const agency = membership ? agencyById.get(Number(membership.agencyId)) : null;
      const hasVerifiedCurrentAgency = Number(agency?.isVerified || 0) === 1;
      const hasPersonalEntitlement = personallyEntitled.has(Number(agent.userId));
      if (!hasPersonalEntitlement && !hasVerifiedCurrentAgency) return null;

      return {
        id: Number(agent.id),
        slug: buildAgentPublicSlug({ id: Number(agent.id), slug: agent.slug }),
        firstName: agent.firstName || '',
        lastName: agent.lastName || '',
        profileImage: agent.profileImage ?? null,
        agencyName: hasVerifiedCurrentAgency ? (agency?.name ?? null) : null,
        agencyLogoUrl: hasVerifiedCurrentAgency ? (agency?.logo ?? null) : null,
        isVerified: Number(agent.isVerified || 0) === 1,
      } satisfies AgentAreaRecommendationDto;
    })
    .filter((agent): agent is AgentAreaRecommendationDto => agent !== null)
    .slice(0, 8);
}

/**
 * Canonical public inventory attributed to an approved agent.
 *
 * Candidate properties come only from the existing property/listing agent
 * attribution columns; every candidate must then pass the canonical public
 * property eligibility authority before serialization through the sole
 * public property DTO boundary. Draft, rejected, archived or otherwise
 * non-public inventory can therefore never surface here.
 */
export async function listPublicInventoryForAgent(
  db: any,
  agentId: number,
  limit = 24,
): Promise<Array<ReturnType<typeof toPublicPropertyDetailDto>['property']>> {
  const directCandidates: Array<{ id: number }> = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.agentId, agentId))
    .orderBy(desc(properties.createdAt))
    .limit(60);

  const listingBackedCandidates: Array<{ id: number }> = await db
    .select({ id: properties.id })
    .from(properties)
    .innerJoin(listings, eq(properties.sourceListingId, listings.id))
    .where(eq(listings.agentId, agentId))
    .orderBy(desc(properties.createdAt))
    .limit(60);

  // Attribution can discover one property through both paths; insertion-ordered
  // deduplication keeps each public property exactly once with deterministic
  // ordering (newest-first within each attribution path, direct path first).
  const candidateIds = Array.from(
    new Set([...directCandidates, ...listingBackedCandidates].map(row => Number(row.id))),
  );
  if (candidateIds.length === 0) return [];

  const resolutions = await resolvePublicPropertyEligibilities(candidateIds);

  const cards: ReturnType<typeof toPublicPropertyDetailDto>['property'][] = [];
  for (const propertyId of candidateIds) {
    if (cards.length >= limit) break;
    const resolution = resolutions.get(propertyId);
    if (!resolution) continue;
    cards.push(toPublicPropertyDetailDto(resolution).property);
  }
  return cards;
}
