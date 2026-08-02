import { TRPCError } from '@trpc/server';
import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  agents,
  agencies,
  developerBrandProfiles,
  developers,
  developments,
  leads,
  listings,
  properties,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { developerBrandProfileService } from './developerBrandProfileService';
import { recordAgentOsEventForAgentId } from './agentOsEventService';
import { recordProspectLeadAction } from './prospectJourneyService';
import {
  recordInitialLeadDeliveryAttempt,
  toMySqlDateTime,
  type LeadDeliveryRecipientType,
  type LeadDeliveryStatus,
} from './leadDeliveryService';
import {
  resolvePublicBrandOnlyCustody,
  resolvePublicDevelopmentCustody,
  resolvePublicPropertyCustody,
  type PublicBrandOwnershipCandidate,
  type PublicDevelopmentOwnershipCandidates,
  type PublicLeadCustody,
  type PublicLeadRecipientType,
  type PublicSupplyOrigin,
} from './publicLeadCustodyService';

type LeadType = 'inquiry' | 'viewing_request' | 'offer' | 'callback';
type LeadInsert = typeof leads.$inferInsert;

interface AffordabilityData {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlyDebts?: number;
  availableDeposit?: number;
  maxAffordable?: number;
  calculatedAt?: string;
}

export interface PublicLeadCaptureInput {
  /** Set only by an authenticated server boundary; never a public client field. */
  authenticatedUserId?: number;
  propertyId?: number;
  developmentId?: number;
  developerBrandProfileId?: number;
  agencyId?: number;
  agentId?: number;
  unitId?: string;
  unitName?: string;
  unitPriceFrom?: number;
  unitBedrooms?: number;
  unitBathrooms?: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  leadType?: LeadType;
  source?: string;
  sourceSurface?: string;
  leadSource?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  affordabilityData?: AffordabilityData;
  captureRequestId?: string;
  consent?: {
    accepted: true;
    version: string;
    source?: string;
  };
}

interface ResolvedLeadOwnership {
  propertyId?: number;
  developmentId?: number;
  developerBrandProfileId?: number;
  agencyId?: number;
  agentId?: number;
  developerId?: number;
  supplyOrigin: PublicSupplyOrigin;
  leadCustody: PublicLeadCustody;
  recipientType: LeadDeliveryRecipientType;
  recipientId: number | null;
  leadDeliveryMethod: 'crm_export' | 'manual';
  brandLeadStatus?: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber';
  reason?: string | null;
}

export interface PublicLeadCaptureResult {
  success: true;
  leadId: number;
  route: 'brand' | 'direct';
  delivered: boolean;
  deliveryStatus: LeadDeliveryStatus;
  deliveryMethod: 'crm_export' | 'manual';
  deliveryAttemptId?: string;
  duplicate?: boolean;
  supplyOrigin: PublicSupplyOrigin;
  leadCustody: PublicLeadCustody;
  recipientType: PublicLeadRecipientType | 'brand';
  recipientId: number | null;
  brandLeadStatus?: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber';
  message?: string;
}

function positiveId(value: unknown): number | undefined {
  const normalized = Number(value || 0);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : undefined;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: unknown): string {
  return String(value || '').replace(/[^0-9+]/g, '');
}

function normalizeName(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeLeadSource(value?: string | null): string {
  const normalized = (value || '').trim().toLowerCase();

  if (!normalized) return 'web';

  if (normalized === 'website' || normalized === 'site' || normalized === 'direct') {
    return 'web';
  }

  if (normalized === 'property_listify' || normalized === 'property' || normalized === 'property-page') {
    return 'property_detail';
  }

  if (
    normalized === 'agent' ||
    normalized === 'agent-page' ||
    normalized === 'agent_detail' ||
    normalized === 'agent-detail'
  ) {
    return 'agent_profile';
  }

  if (normalized === 'development' || normalized === 'development-page') {
    return 'development_detail';
  }

  if (normalized === 'referrer') {
    return 'referral';
  }

  return normalized;
}

function coerceLeadType(input?: string): LeadType {
  if (input === 'viewing_request') return 'viewing_request';
  if (input === 'offer') return 'offer';
  if (input === 'callback') return 'callback';
  return 'inquiry';
}

function isPublicPropertyStatus(status: unknown): boolean {
  return status === 'available' || status === 'published';
}

function isPublicListingStatus(status: unknown, approvalStatus?: unknown): boolean {
  return (status === 'approved' || status === 'published') && approvalStatus === 'approved';
}

function isPublicDevelopment(development: {
  isPublished?: unknown;
  approvalStatus?: unknown;
} | null | undefined): boolean {
  return Boolean(
    development &&
      Number(development.isPublished || 0) === 1 &&
      development.approvalStatus === 'approved',
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code || '');
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return code === 'ER_DUP_ENTRY' || code === '1062' || message.includes('duplicate entry');
}

function getPublicTargetCount(input: PublicLeadCaptureInput): number {
  return [input.propertyId, input.developmentId, input.developerBrandProfileId].filter(
    value => positiveId(value) !== undefined,
  ).length;
}

function assertPublicCaptureInput(input: PublicLeadCaptureInput) {
  if (!input.captureRequestId?.trim()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A stable enquiry request ID is required.',
    });
  }

  if (!input.consent?.accepted || !input.consent.version?.trim()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Consent is required before submitting an enquiry.',
    });
  }

  if (!input.name?.trim() || input.name.trim().length > 200) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A valid prospect name is required.' });
  }

  if (
    !input.email?.trim() ||
    input.email.trim().length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A valid prospect email is required.' });
  }

  if (input.phone && input.phone.trim().length > 50) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The prospect phone number is too long.' });
  }

  if (getPublicTargetCount(input) === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A public property, development or brand target is required.',
    });
  }

  if (input.unitId && !positiveId(input.developmentId)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Unit context must belong to a development enquiry.',
    });
  }
}

async function selectBrand(database: any, brandId: number) {
  const [brand] = await database
    .select({
      id: developerBrandProfiles.id,
      ownerType: developerBrandProfiles.ownerType,
      linkedDeveloperAccountId: developerBrandProfiles.linkedDeveloperAccountId,
      isVisible: developerBrandProfiles.isVisible,
      isSubscriber: developerBrandProfiles.isSubscriber,
    })
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.id, brandId))
    .limit(1);
  return brand || null;
}

async function loadAgentCandidates(database: any, ids: number[]) {
  const normalizedIds = Array.from(new Set(ids.filter(id => id > 0)));
  if (normalizedIds.length === 0) return new Map<number, any>();

  const agentRows = await database
    .select({
      id: agents.id,
      userId: agents.userId,
      agencyId: agents.agencyId,
      status: agents.status,
    })
    .from(agents)
    .where(inArray(agents.id, normalizedIds));

  const userIds = agentRows
    .map((agent: any) => positiveId(agent.userId))
    .filter((id: number | undefined): id is number => id !== undefined);
  const userRows =
    userIds.length > 0
      ? await database
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const roleByUserId = new Map<number, string | null>(
    userRows.map((user: any) => [Number(user.id), user.role || null]),
  );

  return new Map<number, any>(
    agentRows.map((agent: any) => [
      Number(agent.id),
      {
        id: Number(agent.id),
        userId: positiveId(agent.userId) || null,
        agencyId: positiveId(agent.agencyId) || null,
        status: agent.status || null,
        userRole: roleByUserId.get(Number(agent.userId)) || null,
      },
    ]),
  );
}

async function loadAgencyCandidates(database: any, ids: number[]) {
  const normalizedIds = Array.from(new Set(ids.filter(id => id > 0)));
  if (normalizedIds.length === 0) return new Map<number, any>();

  const rows = await database
    .select({ id: agencies.id, isVerified: agencies.isVerified })
    .from(agencies)
    .where(inArray(agencies.id, normalizedIds));
  return new Map<number, any>(
    rows.map((agency: any) => [
      Number(agency.id),
      { id: Number(agency.id), isVerified: Number(agency.isVerified || 0) },
    ]),
  );
}

async function loadUserCandidates(database: any, ids: number[]) {
  const normalizedIds = Array.from(new Set(ids.filter(id => id > 0)));
  if (normalizedIds.length === 0) return new Map<number, any>();

  const rows = await database
    .select({ id: users.id, agencyId: users.agencyId, role: users.role })
    .from(users)
    .where(inArray(users.id, normalizedIds));
  return new Map<number, any>(
    rows.map((user: any) => [
      Number(user.id),
      {
        id: Number(user.id),
        agencyId: positiveId(user.agencyId) || null,
        role: user.role || null,
      },
    ]),
  );
}

async function loadDeveloperCandidates(database: any, ids: number[]) {
  const normalizedIds = Array.from(new Set(ids.filter(id => id > 0)));
  if (normalizedIds.length === 0) return new Map<number, any>();

  const developerRows = await database
    .select({ id: developers.id, userId: developers.userId, status: developers.status })
    .from(developers)
    .where(inArray(developers.id, normalizedIds));
  const userIds = developerRows
    .map((developer: any) => positiveId(developer.userId))
    .filter((id: number | undefined): id is number => id !== undefined);
  const userRows =
    userIds.length > 0
      ? await database
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const roleByUserId = new Map<number, string | null>(
    userRows.map((user: any) => [Number(user.id), user.role || null]),
  );

  return new Map<number, any>(
    developerRows.map((developer: any) => [
      Number(developer.id),
      {
        id: Number(developer.id),
        userId: positiveId(developer.userId) || null,
        status: developer.status || null,
        userRole: roleByUserId.get(Number(developer.userId)) || null,
      },
    ]),
  );
}

function mapCustodyResolution(
  input: {
    propertyId?: number;
    developmentId?: number;
    developerBrandProfileId?: number;
  },
  custody: ReturnType<typeof resolvePublicPropertyCustody>,
): ResolvedLeadOwnership {
  return {
    propertyId: input.propertyId,
    developmentId: input.developmentId,
    developerBrandProfileId: input.developerBrandProfileId,
    agencyId: custody.agencyId || undefined,
    agentId: custody.agentId || undefined,
    developerId: custody.developerId || undefined,
    supplyOrigin: custody.supplyOrigin,
    leadCustody: custody.leadCustody,
    recipientType: custody.recipientType,
    recipientId: custody.recipientId,
    leadDeliveryMethod: custody.leadDeliveryMethod,
    brandLeadStatus: custody.brandLeadStatus || undefined,
    reason: custody.reason,
  };
}

export async function resolveLeadOwnership(input: PublicLeadCaptureInput): Promise<ResolvedLeadOwnership> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const propertyId = positiveId(input.propertyId);
  const requestedDevelopmentId = positiveId(input.developmentId);
  const requestedBrandId = positiveId(input.developerBrandProfileId);
  const targetKind: 'property' | 'development' | 'brand' = propertyId
    ? 'property'
    : requestedDevelopmentId
      ? 'development'
      : 'brand';

  let property: any = null;
  if (propertyId) {
    [property] = await database
      .select({
        id: properties.id,
        status: properties.status,
        developmentId: properties.developmentId,
        developerBrandProfileId: properties.developerBrandProfileId,
        agentId: properties.agentId,
        sourceListingId: properties.sourceListingId,
        ownerId: properties.ownerId,
      })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property || !isPublicPropertyStatus(property.status)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Property not available for public enquiries.',
      });
    }

    if (
      requestedDevelopmentId &&
      Number(property.developmentId || 0) !== requestedDevelopmentId
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'The property and development enquiry targets do not match.',
      });
    }
  }

  const developmentId = property?.developmentId
    ? Number(property.developmentId)
    : requestedDevelopmentId;
  let development: any = null;
  if (developmentId) {
    [development] = await database
      .select({
        id: developments.id,
        developerId: developments.developerId,
        developerBrandProfileId: developments.developerBrandProfileId,
        devOwnerType: developments.devOwnerType,
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
      })
      .from(developments)
      .where(eq(developments.id, developmentId))
      .limit(1);
  }

  if (targetKind === 'development' && !isPublicDevelopment(development)) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Development not available for public enquiries.',
    });
  }

  if (targetKind === 'development' && input.unitId) {
    const [unit] = await database
      .select({ id: unitTypes.id, developmentId: unitTypes.developmentId, isActive: unitTypes.isActive })
      .from(unitTypes)
      .where(eq(unitTypes.id, input.unitId))
      .limit(1);

    if (!unit || Number(unit.developmentId) !== developmentId || Number(unit.isActive || 0) !== 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unit does not belong to this public development.',
      });
    }
  }

  const persistedBrandId =
    positiveId(property?.developerBrandProfileId) ??
    positiveId(development?.developerBrandProfileId);
  if (targetKind !== 'brand' && requestedBrandId && requestedBrandId !== persistedBrandId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The brand attribution does not match the public target.',
    });
  }

  const canonicalBrandId = persistedBrandId || (targetKind === 'brand' ? requestedBrandId : undefined);
  const brand = canonicalBrandId ? await selectBrand(database, canonicalBrandId) : null;
  const brandReferenceInvalid = Boolean(canonicalBrandId && !brand);

  if (targetKind === 'brand' && (!brand || Number(brand.isVisible || 0) !== 1)) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Developer brand not available for public enquiries.',
    });
  }

  if (targetKind === 'development') {
    const developerIds = [
      positiveId(development?.developerId),
      positiveId(brand?.linkedDeveloperAccountId),
    ].filter((id): id is number => id !== undefined);
    const developerMap = await loadDeveloperCandidates(database, developerIds);
    const developerId = positiveId(development?.developerId) || positiveId(brand?.linkedDeveloperAccountId);
    const custody = resolvePublicDevelopmentCustody({
      developerId: development?.developerId,
      developerBrandProfileId: development?.developerBrandProfileId,
      devOwnerType: development?.devOwnerType,
      developer: developerId ? developerMap.get(developerId) : null,
      brand,
      brandReferenceInvalid,
    });

    return mapCustodyResolution(
      {
        developmentId: developmentId || undefined,
        developerBrandProfileId: brand?.id,
      },
      custody,
    );
  }

  if (targetKind === 'brand') {
    const developerId = positiveId(brand?.linkedDeveloperAccountId);
    const developerMap = await loadDeveloperCandidates(database, developerId ? [developerId] : []);
    const custody = resolvePublicBrandOnlyCustody({
      developerBrandProfileId: canonicalBrandId!,
      brand: brand as PublicBrandOwnershipCandidate,
      developer: developerId ? developerMap.get(developerId) : null,
    });

    return mapCustodyResolution(
      { developerBrandProfileId: brand?.id },
      custody,
    );
  }

  const sourceListingId = positiveId(property?.sourceListingId);
  let sourceListing: any = null;
  if (sourceListingId) {
    [sourceListing] = await database
      .select({
        id: listings.id,
        agentId: listings.agentId,
        agencyId: listings.agencyId,
        ownerId: listings.ownerId,
        status: listings.status,
        approvalStatus: listings.approvalStatus,
      })
      .from(listings)
      .where(eq(listings.id, sourceListingId))
      .limit(1);
    if (!sourceListing || !isPublicListingStatus(sourceListing.status, sourceListing.approvalStatus)) {
      sourceListing = null;
    }
  }

  const agentIds = [positiveId(property.agentId), positiveId(sourceListing?.agentId)].filter(
    (id): id is number => id !== undefined,
  );
  const agentMap = await loadAgentCandidates(database, agentIds);
  const ownerIds = [positiveId(property.ownerId), positiveId(sourceListing?.ownerId)].filter(
    (id): id is number => id !== undefined,
  );
  const userMap = await loadUserCandidates(database, ownerIds);

  const agencyIds = [
    positiveId(sourceListing?.agencyId),
    ...Array.from(userMap.values()).map(user => positiveId(user.agencyId)),
    ...agentIds.map(agentId => positiveId(agentMap.get(agentId)?.agencyId)),
  ].filter((id): id is number => id !== undefined);
  const agencyMap = await loadAgencyCandidates(database, agencyIds);

  const custody = resolvePublicPropertyCustody({
    propertyAgentId: property.agentId,
    sourceListingAgentId: sourceListing?.agentId,
    sourceListingAgencyId: sourceListing?.agencyId,
    ownerAgencyId: userMap.get(Number(property.ownerId))?.agencyId,
    developerBrandProfileId: brand?.id,
    directAgent: property.agentId ? agentMap.get(Number(property.agentId)) : null,
    sourceAgent: sourceListing?.agentId ? agentMap.get(Number(sourceListing.agentId)) : null,
    directAgentAgency: property.agentId
      ? agencyMap.get(Number(agentMap.get(Number(property.agentId))?.agencyId))
      : null,
    sourceAgentAgency: sourceListing?.agentId
      ? agencyMap.get(Number(agentMap.get(Number(sourceListing.agentId))?.agencyId))
      : null,
    sourceAgency: sourceListing?.agencyId ? agencyMap.get(Number(sourceListing.agencyId)) : null,
    ownerAgency: userMap.get(Number(property.ownerId))?.agencyId
      ? agencyMap.get(Number(userMap.get(Number(property.ownerId))?.agencyId))
      : null,
    brand: brand as PublicBrandOwnershipCandidate | null,
    brandReferenceInvalid,
  });

  return mapCustodyResolution(
    {
      propertyId: property.id,
      developmentId: developmentId || undefined,
      developerBrandProfileId: brand?.id,
    },
    custody,
  );
}

async function findLeadByCaptureRequestId(database: any, captureRequestId?: string) {
  if (!captureRequestId) return null;
  const [existing] = await database
    .select()
    .from(leads)
    .where(eq(leads.captureRequestId, captureRequestId))
    .limit(1);
  return existing || null;
}

function isEquivalentReplay(
  existing: typeof leads.$inferSelect,
  input: PublicLeadCaptureInput,
  source: string,
  leadSource: string,
): boolean {
  const existingPropertyId = positiveId(existing.propertyId);
  const existingDevelopmentId = positiveId(existing.developmentId);
  const inputPropertyId = positiveId(input.propertyId);
  const inputDevelopmentId = positiveId(input.developmentId);
  const existingBrandId = positiveId(existing.developerBrandProfileId);
  const inputBrandId = positiveId(input.developerBrandProfileId);

  const targetMatches = existingPropertyId
    ? existingPropertyId === inputPropertyId && existingDevelopmentId === inputDevelopmentId
    : existingDevelopmentId
      ? !inputPropertyId && existingDevelopmentId === inputDevelopmentId
      : !inputPropertyId && !inputDevelopmentId && existingBrandId === inputBrandId;

  const contextMatches =
    existingBrandId === inputBrandId &&
    normalizeName(existing.name) === normalizeName(input.name) &&
    normalizePhone(existing.phone) === normalizePhone(input.phone);

  return (
    targetMatches &&
    contextMatches &&
    normalizeEmail(existing.email) === normalizeEmail(input.email) &&
    String(existing.unitId || '') === String(input.unitId || '') &&
    String(existing.source || '') === source &&
    String(existing.leadSource || '') === leadSource
  );
}

function resultForExistingLead(existing: typeof leads.$inferSelect): PublicLeadCaptureResult {
  const deliveryStatus = existing.deliveryStatus || 'pending';
  const attempts = Array.isArray(existing.deliveryAttempts)
    ? existing.deliveryAttempts
    : [];
  const latestAttempt = attempts.length > 0 ? (attempts[attempts.length - 1] as any) : null;
  const supplyOrigin: PublicSupplyOrigin =
    latestAttempt?.supplyOrigin ||
    (existing.leadDeliveryMethod === 'manual' && !existing.agentId && !existing.agencyId
      ? 'platform_curated'
      : 'customer_managed');
  const leadCustody: PublicLeadCustody =
    latestAttempt?.leadCustody ||
    (deliveryStatus === 'attention_required'
      ? supplyOrigin === 'platform_curated'
        ? 'platform_managed'
        : 'attention_required'
      : 'verified_customer_recipient');
  const recipientType: PublicLeadCaptureResult['recipientType'] =
    latestAttempt?.recipientType ||
    (existing.developerBrandProfileId ? 'brand' : existing.agentId ? 'agent' : existing.agencyId ? 'agency' : 'manual');
  const brandLeadStatus =
    existing.brandLeadStatus === 'captured' ||
    existing.brandLeadStatus === 'delivered_unsubscribed' ||
    existing.brandLeadStatus === 'delivered_subscriber'
      ? existing.brandLeadStatus
      : undefined;

  return {
    success: true,
    leadId: existing.id,
    route: recipientType === 'brand' || recipientType === 'developer' ? 'brand' : 'direct',
    delivered: deliveryStatus === 'delivered',
    deliveryStatus,
    deliveryMethod: existing.leadDeliveryMethod === 'crm_export' ? 'crm_export' : 'manual',
    deliveryAttemptId: latestAttempt?.id,
    duplicate: true,
    supplyOrigin,
    leadCustody,
    recipientType,
    recipientId: latestAttempt?.recipientId ?? existing.agentId ?? existing.agencyId ?? null,
    brandLeadStatus,
    message:
      deliveryStatus === 'delivered'
        ? 'This enquiry has already been received.'
        : 'This enquiry has already been received and is being processed.',
  };
}

function deliveryKeyForOwnership(
  resolved: ResolvedLeadOwnership,
): string {
  if (resolved.recipientType === 'agent' && resolved.agentId) return `direct:agent:${resolved.agentId}`;
  if (resolved.recipientType === 'agency' && resolved.agencyId) return `direct:agency:${resolved.agencyId}`;
  if (resolved.recipientType === 'developer' && resolved.developerId) {
    return `direct:developer:${resolved.developerId}`;
  }
  if (resolved.developerBrandProfileId) return `platform:brand:${resolved.developerBrandProfileId}`;
  if (resolved.propertyId) return `platform:property:${resolved.propertyId}`;
  if (resolved.developmentId) return `platform:development:${resolved.developmentId}`;
  return 'platform:manual';
}

function messageForResolution(resolved: ResolvedLeadOwnership): string {
  if (resolved.leadCustody === 'verified_customer_recipient') {
    return 'Your enquiry has been recorded and sent to the responsible team.';
  }
  if (resolved.leadCustody === 'platform_managed') {
    return 'Your enquiry has been recorded. Property Listify will review the request.';
  }
  return 'Your enquiry has been recorded and requires recipient review.';
}

export async function capturePublicLead(input: PublicLeadCaptureInput): Promise<PublicLeadCaptureResult> {
  assertPublicCaptureInput(input);

  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const source = normalizeLeadSource(input.sourceSurface || input.source || input.leadSource);
  const leadSource = normalizeLeadSource(input.leadSource || input.source || input.sourceSurface);
  const existing = await findLeadByCaptureRequestId(database, input.captureRequestId);
  if (existing) {
    if (!isEquivalentReplay(existing, input, source, leadSource)) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This request ID belongs to a different enquiry context.',
      });
    }
    return resultForExistingLead(existing);
  }

  const resolved = await resolveLeadOwnership(input);
  const leadType = coerceLeadType(input.leadType);
  const deliveryStatus: LeadDeliveryStatus =
    resolved.leadCustody === 'verified_customer_recipient' ? 'delivered' : 'attention_required';
  const route: PublicLeadCaptureResult['route'] =
    resolved.recipientType === 'developer' ||
    (resolved.recipientType === 'manual' && resolved.developerBrandProfileId)
      ? 'brand'
      : 'direct';

  let insertResult: any;
  try {
    [insertResult] = await database.insert(leads).values({
      propertyId: resolved.propertyId || null,
      developmentId: resolved.developmentId || null,
      developerBrandProfileId: resolved.developerBrandProfileId || null,
      agencyId: resolved.agencyId || null,
      agentId: resolved.agentId || null,
      unitId: input.unitId || null,
      unitName: input.unitName || null,
      unitPriceFrom: input.unitPriceFrom == null ? null : String(input.unitPriceFrom),
      unitBedrooms: input.unitBedrooms ?? null,
      unitBathrooms: input.unitBathrooms == null ? null : String(input.unitBathrooms),
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      phone: input.phone?.trim() || null,
      message: input.message?.trim() || null,
      leadType,
      status: 'new',
      source,
      leadSource,
      referrerUrl: input.referrerUrl || null,
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
      utmCampaign: input.utmCampaign || null,
      affordabilityData: input.affordabilityData ? (input.affordabilityData as any) : null,
      funnelStage: input.affordabilityData ? 'affordability' : 'interest',
      qualificationStatus: 'pending',
      captureRequestId: input.captureRequestId,
      consentCapturedAt: toMySqlDateTime(),
      consentVersion: input.consent?.version,
      consentSource: input.consent?.source || null,
      brandLeadStatus: resolved.brandLeadStatus || null,
      leadDeliveryMethod: resolved.leadDeliveryMethod,
      deliveryStatus,
      deliveryAttempts: null,
    } satisfies LeadInsert);
  } catch (error) {
    if (input.captureRequestId && isDuplicateKeyError(error)) {
      const duplicate = await findLeadByCaptureRequestId(database, input.captureRequestId);
      if (duplicate) {
        if (!isEquivalentReplay(duplicate, input, source, leadSource)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This request ID belongs to a different enquiry context.',
          });
        }
        return resultForExistingLead(duplicate);
      }
    }
    throw error;
  }

  const leadId = Number(insertResult.insertId);
  const deliveryAttempt = await recordInitialLeadDeliveryAttempt({
    leadId,
    deliveryKey: deliveryKeyForOwnership({ ...resolved }),
    recipientType: resolved.recipientType,
    recipientId: resolved.recipientId,
    channel: resolved.leadDeliveryMethod,
    status: deliveryStatus,
    supplyOrigin: resolved.supplyOrigin,
    leadCustody: resolved.leadCustody,
    error: resolved.reason,
    database,
  });

  if (resolved.propertyId) {
    await database
      .update(properties)
      .set({ enquiries: sql`${properties.enquiries} + 1` })
      .where(eq(properties.id, resolved.propertyId));
  }

  await recordAgentOsEventForAgentId({
    agentId: resolved.agentId,
    eventType: 'agent_lead_received',
    eventData: {
      leadId,
      propertyId: resolved.propertyId ?? null,
      developmentId: resolved.developmentId ?? null,
      leadSource,
      leadType,
      route,
      supplyOrigin: resolved.supplyOrigin,
      leadCustody: resolved.leadCustody,
    },
  });

  await recordProspectLeadAction({
    db: database,
    leadId,
    authenticatedUserId: input.authenticatedUserId,
    source,
    propertyId: resolved.propertyId,
    developmentId: resolved.developmentId,
    referrerUrl: input.referrerUrl,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
  });

  if (resolved.developerBrandProfileId) {
    void developerBrandProfileService
      .incrementLeadCountAsync(resolved.developerBrandProfileId)
      .catch(error => console.error('[capturePublicLead] Failed to update brand lead metrics:', error));
  }

  return {
    success: true,
    leadId,
    route,
    delivered: deliveryStatus === 'delivered',
    deliveryStatus,
    deliveryMethod: resolved.leadDeliveryMethod,
    deliveryAttemptId: deliveryAttempt.id,
    supplyOrigin: resolved.supplyOrigin,
    leadCustody: resolved.leadCustody,
    recipientType: resolved.recipientType,
    recipientId: resolved.recipientId,
    brandLeadStatus: resolved.brandLeadStatus,
    message: messageForResolution(resolved),
  };
}
