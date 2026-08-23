import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { agencyAgentMemberships, agencies, agents, cities, listings, provinces, properties, suburbs, subscriptions } from '../../drizzle/schema';
import { slugify } from '../_core/utils/slug';
import { resolvePublicPropertyEligibilities } from './publicPropertyEligibilityService';
import { toPublicPropertyDetailDto } from './publicPropertyDto';
import { isCurrentActiveAgencyMembership } from './agencyMembershipService';

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

function splitTextList(value?: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
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
  areasServed: string | null;
  languages: string | null;
  isVerified: number;
};

type DiscoveryRecord = Omit<AgentDiscoveryCardDto, 'slug' | 'isVerified'> & {
  slug: string | null;
  isVerified: number;
};

export function toAgentDiscoveryCard(record: DiscoveryRecord): AgentDiscoveryCardDto {
  return {
    ...record,
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

export type AgentWebPresenceDto = Omit<WebPresenceRecord, 'slug' | 'isVerified'> & {
  slug: string;
  isVerified: number;
  agency: AgentWebPresenceAgency | null;
};

export function toAgentWebPresence(record: WebPresenceRecord): AgentWebPresenceDto {
  return {
    ...record,
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
  name: string;
  type: 'suburb' | 'city' | 'province' | null;
  url: string | null;
}

interface SuburbResolution {
  id: number;
  name: string;
  slug: string;
  citySlug: string;
  provinceSlug: string;
}

interface CityResolution {
  id: number;
  name: string;
  slug: string;
  provinceSlug: string;
}

interface ProvinceResolution {
  id: number;
  name: string;
  slug: string;
}

/**
 * Resolves unstructured areasServed entries against the canonical geography
 * authority using exact case-insensitive name equality.
 *
 * The resolution fails closed. An entry links only when it identifies exactly
 * one distinct canonical location across suburbs, cities and provinces; zero
 * matches and ambiguous matches both remain plain display text. No mapping is
 * invented here.
 */
export async function resolveCanonicalAgentAreas(
  db: any,
  areasServed?: string | null,
): Promise<CanonicalAgentArea[]> {
  const entries = splitTextList(areasServed);
  if (entries.length === 0) return [];

  const loweredEntries = Array.from(new Set(entries.map(entry => entry.toLowerCase())));

  const suburbRows: SuburbResolution[] = await db
    .select({
      id: suburbs.id,
      name: suburbs.name,
      slug: suburbs.slug,
      citySlug: cities.slug,
      provinceSlug: provinces.slug,
    })
    .from(suburbs)
    .innerJoin(cities, eq(suburbs.cityId, cities.id))
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .where(
      and(
        inArray(sql`LOWER(${suburbs.name})`, loweredEntries),
        ne(suburbs.status, 'retired'),
        ne(cities.status, 'retired'),
        ne(provinces.status, 'retired'),
      ),
    );

  const cityRows: CityResolution[] = await db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
      provinceSlug: provinces.slug,
    })
    .from(cities)
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .where(
      and(
        inArray(sql`LOWER(${cities.name})`, loweredEntries),
        ne(cities.status, 'retired'),
        ne(provinces.status, 'retired'),
      ),
    );

  const provinceRows: ProvinceResolution[] = await db
    .select({
      id: provinces.id,
      name: provinces.name,
      slug: provinces.slug,
    })
    .from(provinces)
    .where(
      and(inArray(sql`LOWER(${provinces.name})`, loweredEntries), ne(provinces.status, 'retired')),
    );

  function collectDistinctByLowerName<T extends { id: number; name: string }>(
    rows: T[],
    isComplete: (row: T) => boolean,
  ) {
    const byLowerName = new Map<string, Map<number, T>>();
    for (const row of rows) {
      if (!isComplete(row)) continue;
      const key = String(row.name).toLowerCase();
      const bucket = byLowerName.get(key) || new Map<number, T>();
      // Repeated evidence for the same canonical location collapses to one match.
      bucket.set(Number(row.id), row);
      byLowerName.set(key, bucket);
    }
    return byLowerName;
  }

  const suburbsByLowerName = collectDistinctByLowerName(suburbRows, row =>
    Boolean(row.slug && row.citySlug && row.provinceSlug),
  );
  const citiesByLowerName = collectDistinctByLowerName(cityRows, row =>
    Boolean(row.slug && row.provinceSlug),
  );
  const provincesByLowerName = collectDistinctByLowerName(provinceRows, row => Boolean(row.slug));

  return entries.map(entry => {
    const lower = entry.toLowerCase();
    const suburbMatches = Array.from(suburbsByLowerName.get(lower)?.values() || []);
    const cityMatches = Array.from(citiesByLowerName.get(lower)?.values() || []);
    const provinceMatches = Array.from(provincesByLowerName.get(lower)?.values() || []);

    const candidateKeys = new Set<string>([
      ...suburbMatches.map(match => `suburb:${match.id}`),
      ...cityMatches.map(match => `city:${match.id}`),
      ...provinceMatches.map(match => `province:${match.id}`),
    ]);

    if (candidateKeys.size !== 1) {
      return { name: entry, type: null, url: null };
    }

    if (suburbMatches.length === 1) {
      return {
        name: entry,
        type: 'suburb' as const,
        url: `/${suburbMatches[0].provinceSlug}/${suburbMatches[0].citySlug}/${suburbMatches[0].slug}`,
      };
    }
    if (cityMatches.length === 1) {
      return {
        name: entry,
        type: 'city' as const,
        url: `/${cityMatches[0].provinceSlug}/${cityMatches[0].slug}`,
      };
    }
    return {
      name: entry,
      type: 'province' as const,
      url: `/${provinceMatches[0].slug}`,
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
  agencyName: string | null;
  agencyLogo: string | null;
  agencyVerified: number | null;
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
        and(inArray(subscriptions.ownerId, userIds), eq(subscriptions.ownerType, 'agent')),
      );
  const now = Date.now();
  const entitled = new Set<number>();
  for (const row of rows) {
    if (row.status !== 'active' && row.status !== 'grace_period') continue;
    const periodEnd = row.currentPeriodEnd ? new Date(row.currentPeriodEnd).getTime() : null;
    if (periodEnd !== null && (!Number.isFinite(periodEnd) || periodEnd <= now)) continue;
    entitled.add(Number(row.ownerId));
  }
  return entitled;
}

/**
 * Approved agents whose declared service area exactly matches a canonical
 * location name and who remain commercially receivable: an active personal
 * agent entitlement, or affiliation with a verified agency.
 *
 * Mirrors the lead-custody eligibility truth. Matching reproduces the
 * fail-closed canonical-area rule by exact case-insensitive entry equality;
 * no partial or invented matches are returned.
 */
export async function findAgentsServingLocation(
  db: any,
  locationType: 'province' | 'city' | 'suburb',
  locationId: number,
): Promise<AgentAreaRecommendationDto[]> {
  const id = Number(locationId);
  if (!Number.isSafeInteger(id) || id <= 0) return [];

  let locationName: string | null = null;
  if (locationType === 'suburb') {
    const [row] = await db
      .select({ name: suburbs.name })
      .from(suburbs)
      .where(and(eq(suburbs.id, id), ne(suburbs.status, 'retired')))
      .limit(1);
    locationName = row?.name ?? null;
  } else if (locationType === 'city') {
    const [row] = await db
      .select({ name: cities.name })
      .from(cities)
      .where(and(eq(cities.id, id), ne(cities.status, 'retired')))
      .limit(1);
    locationName = row?.name ?? null;
  } else {
    const [row] = await db
      .select({ name: provinces.name })
      .from(provinces)
      .where(and(eq(provinces.id, id), ne(provinces.status, 'retired')))
      .limit(1);
    locationName = row?.name ?? null;
  }

  const loweredName = String(locationName || '').trim().toLowerCase();
  if (!loweredName) return [];

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
      agencyName: agencies.name,
      agencyLogo: agencies.logo,
      agencyVerified: agencies.isVerified,
    })
    .from(agents)
    .leftJoin(agencies, eq(agents.agencyId, agencies.id))
    .where(
      and(
        APPROVED_AGENT,
        sql`LOWER(${agents.areasServed}) LIKE ${`%${loweredName}%`}`,
      ),
    )
    .orderBy(desc(agents.isFeatured), desc(agents.updatedAt))
    .limit(200);

  const exactClaimAgents = candidates.filter(agent =>
    splitTextList(agent.areasServed).some(entry => entry.toLowerCase() === loweredName),
  );

  const personallyEntitled = await loadPersonallyEntitledAgentUserIds(
    db,
    exactClaimAgents.map(agent => Number(agent.userId)).filter(userId => userId > 0),
  );

  return exactClaimAgents
    .filter(
      agent =>
        personallyEntitled.has(Number(agent.userId)) ||
        Number(agent.agencyVerified || 0) === 1,
    )
    .slice(0, 8)
    .map(agent => ({
      id: Number(agent.id),
      slug: buildAgentPublicSlug({ id: Number(agent.id), slug: agent.slug }),
      firstName: agent.firstName || '',
      lastName: agent.lastName || '',
      profileImage: agent.profileImage ?? null,
      agencyName: Number(agent.agencyVerified || 0) === 1 ? agent.agencyName ?? null : null,
      agencyLogoUrl: Number(agent.agencyVerified || 0) === 1 ? agent.agencyLogo ?? null : null,
      isVerified: Number(agent.isVerified || 0) === 1,
    }));
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
