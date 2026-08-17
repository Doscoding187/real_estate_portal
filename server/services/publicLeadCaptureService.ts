import { TRPCError } from '@trpc/server';
import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  agents,
  agencies,
  cataloguePublishers,
  developerOrganisations,
  developmentSupersessions,
  developments,
  leads,
  properties,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { cataloguePublisherService } from './cataloguePublisherService';
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
import { evaluatePublicDevelopmentEligibility } from './publicDevelopmentEligibility';
import { getDeveloperPublicationAccess } from './developerPublicationAccess';

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
  cataloguePublisherId?: number;
  transactionType?: 'for_sale' | 'for_rent';
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
  cataloguePublisherId?: number;
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
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeMaterialText(value: unknown): string {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return normalizeJsonValue(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeJsonValue(entry)]),
    );
  }
  return value;
}

function jsonValuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeJsonValue(left)) === JSON.stringify(normalizeJsonValue(right));
}

function normalizeLeadSource(value?: string | null): string {
  const normalized = (value || '').trim().toLowerCase();

  if (!normalized) return 'web';

  if (normalized === 'website' || normalized === 'site' || normalized === 'direct') {
    return 'web';
  }

  if (
    normalized === 'property_listify' ||
    normalized === 'property' ||
    normalized === 'property-page'
  ) {
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

function isDuplicateKeyError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code || '');
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return code === 'ER_DUP_ENTRY' || code === '1062' || message.includes('duplicate entry');
}

function getPublicTargetCount(input: PublicLeadCaptureInput): number {
  return [input.propertyId, input.developmentId, input.cataloguePublisherId].filter(
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
      id: cataloguePublishers.id,
      authorityKind: cataloguePublishers.authorityKind,
      developerOrganisationId: cataloguePublishers.developerOrganisationId,
      isVisible: cataloguePublishers.isVisible,
      sourceAttribution: cataloguePublishers.sourceAttribution,
    })
    .from(cataloguePublishers)
    .where(eq(cataloguePublishers.id, brandId))
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

  const organisationRows = await database
    .select({ id: developerOrganisations.id, status: developerOrganisations.status })
    .from(developerOrganisations)
    .where(inArray(developerOrganisations.id, normalizedIds));

  return new Map<number, any>(
    organisationRows.map((organisation: any) => [
      Number(organisation.id),
      {
        id: Number(organisation.id),
        organisationId: Number(organisation.id),
        userId: null,
        status: organisation.status || null,
      },
    ]),
  );
}

function mapCustodyResolution(
  input: {
    propertyId?: number;
    developmentId?: number;
    cataloguePublisherId?: number;
  },
  custody: ReturnType<typeof resolvePublicPropertyCustody>,
): ResolvedLeadOwnership {
  return {
    propertyId: input.propertyId,
    developmentId: input.developmentId,
    cataloguePublisherId: input.cataloguePublisherId,
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

export async function resolveLeadOwnership(
  input: PublicLeadCaptureInput,
): Promise<ResolvedLeadOwnership> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const propertyId = positiveId(input.propertyId);
  const requestedDevelopmentId = positiveId(input.developmentId);
  const requestedBrandId = positiveId(input.cataloguePublisherId);
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
        cataloguePublisherId: properties.cataloguePublisherId,
        agentId: properties.agentId,
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

    if (requestedDevelopmentId && Number(property.developmentId || 0) !== requestedDevelopmentId) {
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
        cataloguePublisherId: developments.cataloguePublisherId,
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
        transactionType: developments.transactionType,
        developmentType: developments.developmentType,
        activeUnitTypeCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${unitTypes}
          WHERE ${unitTypes.developmentId} = ${sql.raw('developments.id')}
            AND ${unitTypes.isActive} = 1
        )`,
        activeSupersessionSource: sql<number>`EXISTS (
          SELECT 1
          FROM ${developmentSupersessions}
          WHERE ${developmentSupersessions.sourceDevelopmentId} = ${sql.raw('developments.id')}
            AND ${developmentSupersessions.status} = 'active'
        )`,
      })
      .from(developments)
      .where(eq(developments.id, developmentId))
      .limit(1);
  }

  if (
    input.transactionType &&
    development?.transactionType &&
    input.transactionType !== development.transactionType
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The transaction context does not match the public development.',
    });
  }

  if (targetKind === 'development' && input.unitId) {
    const [unit] = await database
      .select({
        id: unitTypes.id,
        developmentId: unitTypes.developmentId,
        isActive: unitTypes.isActive,
      })
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
    positiveId(property?.cataloguePublisherId) ??
    positiveId(development?.cataloguePublisherId);
  if (targetKind !== 'brand' && requestedBrandId && requestedBrandId !== persistedBrandId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The brand attribution does not match the public target.',
    });
  }

  const canonicalBrandId =
    persistedBrandId || (targetKind === 'brand' ? requestedBrandId : undefined);
  const brand = canonicalBrandId ? await selectBrand(database, canonicalBrandId) : null;
  const brandReferenceInvalid = Boolean(canonicalBrandId && !brand);

  if (targetKind === 'brand' && (!brand || Number(brand.isVisible || 0) !== 1)) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Developer brand not available for public enquiries.',
    });
  }

  if (targetKind === 'development') {
    const developerIds = [positiveId(brand?.developerOrganisationId)].filter(
      (id): id is number => id !== undefined,
    );
    const developerMap = await loadDeveloperCandidates(database, developerIds);
    const developerId = positiveId(brand?.developerOrganisationId);
    const commercialAccess =
      brand?.authorityKind === 'developer_first_party' && developerId
        ? (await getDeveloperPublicationAccess(developerId, { db: database })).eligible
        : true;
    const eligibility = evaluatePublicDevelopmentEligibility({
      development: {
        id: Number(development?.id || 0),
        cataloguePublisherId: positiveId(development?.cataloguePublisherId) ?? null,
        developmentType: development?.developmentType || null,
        transactionType: development?.transactionType || null,
        isPublished: development?.isPublished,
        approvalStatus: development?.approvalStatus || null,
      },
      publisher: brand,
      organisation: developerId ? developerMap.get(developerId) : null,
      unitTypes: [],
      activeUnitTypeCount: Number(development?.activeUnitTypeCount || 0),
      activeSupersessionSource: Number(development?.activeSupersessionSource || 0) === 1,
      commercialAccess,
    } as any);
    if (!eligibility.eligible) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Development not available for public enquiries.',
      });
    }
    const custody = resolvePublicDevelopmentCustody({
      cataloguePublisherId: development?.cataloguePublisherId,
      developerOrganisationId: brand?.developerOrganisationId,
      developer: developerId ? developerMap.get(developerId) : null,
      brand,
      brandReferenceInvalid,
    });

    return mapCustodyResolution(
      {
        developmentId: developmentId || undefined,
        cataloguePublisherId: brand?.id,
      },
      custody,
    );
  }

  if (targetKind === 'brand') {
    const developerId = positiveId(brand?.developerOrganisationId);
    const developerMap = await loadDeveloperCandidates(database, developerId ? [developerId] : []);
    const custody = resolvePublicBrandOnlyCustody({
      cataloguePublisherId: canonicalBrandId!,
      brand: brand as PublicBrandOwnershipCandidate,
      developer: developerId ? developerMap.get(developerId) : null,
    });

    return mapCustodyResolution({ cataloguePublisherId: brand?.id }, custody);
  }

  // Public enquiry attribution is projection-owned. sourceListingId is an
  // internal publication bridge, never a fallback into mutable listing state.
  const agentIds = [positiveId(property.agentId)].filter((id): id is number => id !== undefined);
  const agentMap = await loadAgentCandidates(database, agentIds);
  const ownerIds = [positiveId(property.ownerId)].filter((id): id is number => id !== undefined);
  const userMap = await loadUserCandidates(database, ownerIds);

  const agencyIds = [
    ...Array.from(userMap.values()).map(user => positiveId(user.agencyId)),
    ...agentIds.map(agentId => positiveId(agentMap.get(agentId)?.agencyId)),
  ].filter((id): id is number => id !== undefined);
  const agencyMap = await loadAgencyCandidates(database, agencyIds);

  const custody = resolvePublicPropertyCustody({
    propertyAgentId: property.agentId,
    ownerAgencyId: userMap.get(Number(property.ownerId))?.agencyId,
    cataloguePublisherId: brand?.id,
    directAgent: property.agentId ? agentMap.get(Number(property.agentId)) : null,
    directAgentAgency: property.agentId
      ? agencyMap.get(Number(agentMap.get(Number(property.agentId))?.agencyId))
      : null,
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
      cataloguePublisherId: brand?.id,
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

async function existingLeadMatchesTransaction(
  database: any,
  existing: typeof leads.$inferSelect,
  transactionType?: 'for_sale' | 'for_rent',
): Promise<boolean> {
  if (!transactionType || !existing.developmentId) return true;

  const [development] = await database
    .select({ transactionType: developments.transactionType })
    .from(developments)
    .where(eq(developments.id, Number(existing.developmentId)))
    .limit(1);

  return !development?.transactionType || development.transactionType === transactionType;
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
  const existingBrandId = positiveId(existing.cataloguePublisherId);
  const inputBrandId = positiveId(input.cataloguePublisherId);

  // A property may canonically derive development and brand attribution, and
  // a development may derive brand attribution. Those server-owned fields are
  // not part of the submitted identity when the caller omitted them. When the
  // caller did submit an attribution, it must still match exactly.
  const targetMatches = inputPropertyId
    ? existingPropertyId === inputPropertyId &&
      (!inputDevelopmentId || existingDevelopmentId === inputDevelopmentId) &&
      (!inputBrandId || existingBrandId === inputBrandId)
    : inputDevelopmentId
      ? !existingPropertyId &&
        existingDevelopmentId === inputDevelopmentId &&
        (!inputBrandId || existingBrandId === inputBrandId)
      : inputBrandId
        ? !existingPropertyId && !existingDevelopmentId && existingBrandId === inputBrandId
        : false;

  const contextMatches =
    normalizeName(existing.name) === normalizeName(input.name) &&
    normalizePhone(existing.phone) === normalizePhone(input.phone) &&
    normalizeEmail(existing.email) === normalizeEmail(input.email) &&
    normalizeMaterialText(existing.message) === normalizeMaterialText(input.message) &&
    coerceLeadType(existing.leadType || undefined) === coerceLeadType(input.leadType) &&
    normalizeMaterialText(existing.unitId) === normalizeMaterialText(input.unitId) &&
    normalizeMaterialText(existing.unitName) === normalizeMaterialText(input.unitName) &&
    normalizeOptionalNumber(existing.unitPriceFrom) ===
      normalizeOptionalNumber(input.unitPriceFrom) &&
    normalizeOptionalNumber(existing.unitBedrooms) ===
      normalizeOptionalNumber(input.unitBedrooms) &&
    normalizeOptionalNumber(existing.unitBathrooms) ===
      normalizeOptionalNumber(input.unitBathrooms) &&
    normalizeMaterialText(existing.referrerUrl) === normalizeMaterialText(input.referrerUrl) &&
    normalizeMaterialText(existing.utmSource) === normalizeMaterialText(input.utmSource) &&
    normalizeMaterialText(existing.utmMedium) === normalizeMaterialText(input.utmMedium) &&
    normalizeMaterialText(existing.utmCampaign) === normalizeMaterialText(input.utmCampaign) &&
    normalizeMaterialText(existing.consentVersion) ===
      normalizeMaterialText(input.consent?.version) &&
    normalizeMaterialText(existing.consentSource) ===
      normalizeMaterialText(input.consent?.source) &&
    jsonValuesMatch(existing.affordabilityData, input.affordabilityData);

  return (
    targetMatches &&
    contextMatches &&
    String(existing.source || '') === source &&
    String(existing.leadSource || '') === leadSource
  );
}

function resultForExistingLead(existing: typeof leads.$inferSelect): PublicLeadCaptureResult {
  const deliveryStatus = existing.deliveryStatus || 'pending';
  const attempts = Array.isArray(existing.deliveryAttempts) ? existing.deliveryAttempts : [];
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
    (existing.cataloguePublisherId
      ? 'brand'
      : existing.agentId
        ? 'agent'
        : existing.agencyId
          ? 'agency'
          : 'manual');
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

function deliveryKeyForOwnership(resolved: ResolvedLeadOwnership): string {
  if (resolved.recipientType === 'agent' && resolved.agentId)
    return `direct:agent:${resolved.agentId}`;
  if (resolved.recipientType === 'agency' && resolved.agencyId)
    return `direct:agency:${resolved.agencyId}`;
  if (resolved.recipientType === 'developer' && resolved.developerId) {
    return `direct:developer:${resolved.developerId}`;
  }
  if (resolved.cataloguePublisherId)
    return `platform:publisher:${resolved.cataloguePublisherId}`;
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

export async function capturePublicLead(
  input: PublicLeadCaptureInput,
): Promise<PublicLeadCaptureResult> {
  assertPublicCaptureInput(input);

  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const source = normalizeLeadSource(input.sourceSurface || input.source || input.leadSource);
  const leadSource = normalizeLeadSource(input.leadSource || input.source || input.sourceSurface);
  const existing = await findLeadByCaptureRequestId(database, input.captureRequestId);
  if (existing) {
    if (!(await existingLeadMatchesTransaction(database, existing, input.transactionType))) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This request ID belongs to a different transaction context.',
      });
    }
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
    (resolved.recipientType === 'manual' &&
      resolved.cataloguePublisherId)
      ? 'brand'
      : 'direct';

  let insertResult: any;
  try {
    [insertResult] = await database.insert(leads).values({
      propertyId: resolved.propertyId || null,
      developmentId: resolved.developmentId || null,
      cataloguePublisherId: resolved.cataloguePublisherId || null,
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

  if (resolved.cataloguePublisherId) {
    void cataloguePublisherService
      .incrementLeadCountAsync(resolved.cataloguePublisherId)
      .catch(error =>
        console.error('[capturePublicLead] Failed to update brand lead metrics:', error),
      );
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
