import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  DEFAULT_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS,
  FAMILY_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS,
} from '../../shared/services-taxonomy';
import {
  SERVICE_INTRODUCTION_SOURCE_VALUES,
  SERVICE_INTRODUCTION_STATUS_VALUES,
  SERVICE_REQUEST_EVENT_TYPE_VALUES,
  SERVICE_REQUEST_STATUS_VALUES,
  cities as citiesTable,
  provinces as provincesTable,
  providerServiceAreas,
  providerVerifications,
  serviceIntroductions,
  serviceOfferings,
  serviceProviders,
  serviceRequestEvents,
  serviceRequests,
  serviceTaxonomyNodes,
  suburbs as suburbsTable,
  type ServiceIntroduction,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { isDescendantOf, serviceCatalogService } from './serviceCatalogService';
import { serviceProvidersService } from './serviceProvidersService';

export type RequestStatus = (typeof SERVICE_REQUEST_STATUS_VALUES)[number];
export type IntroductionStatus = (typeof SERVICE_INTRODUCTION_STATUS_VALUES)[number];
export type IntroductionSource = (typeof SERVICE_INTRODUCTION_SOURCE_VALUES)[number];

export type CreateServiceRequestInput = {
  requesterUserId: number | null;
  taxonomyNodeSlug: string;
  title?: string | null;
  description?: string | null;
  timelineBand?: 'asap' | 'within_weeks' | 'within_month' | 'this_quarter' | 'flexible' | null;
  budgetBand?:
    | 'under_5k'
    | 'band_5k_15k'
    | 'band_15k_50k'
    | 'band_50k_plus'
    | 'not_sure'
    | null;
  provinceId?: number | null;
  cityId?: number | null;
  suburbId?: number | null;
  locationText?: string | null;
  propertyId?: number | null;
  listingId?: number | null;
  developmentId?: number | null;
  journeyStage?: string | null;
  sourceSurface: string;
  originType?: string | null;
  originId?: number | null;
  reasonCode?: string | null;
  contextJson?: Record<string, unknown> | null;
  requestedProviderCount?: number;
};

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generatePublicReference(): string {
  let reference = '';
  for (let index = 0; index < 8; index += 1) {
    reference += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `SR-${reference}`;
}


function toTimestampString(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

type ProviderCandidate = {
  providerId: number;
  capabilityRank: number;
  geoRank: number;
};

export class ServiceRequestsService {
  async createRequest(input: CreateServiceRequestInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const node = await serviceCatalogService.getNodeBySlug(input.taxonomyNodeSlug);
    if (!node) throw new Error('Unknown service capability.');

    for (const [label, id] of [
      ['province', input.provinceId],
      ['city', input.cityId],
      ['suburb', input.suburbId],
    ] as const) {
      if (!id) continue;
      const table = label === 'province' ? provincesTable : label === 'city' ? citiesTable : suburbsTable;
      const [row] = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
      if (!row) throw new Error(`Unknown ${label} reference.`);
    }

    const insertResult = await db
      .insert(serviceRequests)
      .values({
        publicReference: generatePublicReference(),
        requesterUserId: input.requesterUserId,
        taxonomyNodeId: node.id,
        title: normalizeText(input.title),
        description: normalizeText(input.description),
        timelineBand: input.timelineBand ?? null,
        budgetBand: input.budgetBand ?? null,
        provinceId: input.provinceId ?? null,
        cityId: input.cityId ?? null,
        suburbId: input.suburbId ?? null,
        locationText: normalizeText(input.locationText),
        propertyId: input.propertyId ?? null,
        listingId: input.listingId ?? null,
        developmentId: input.developmentId ?? null,
        journeyStage: (input.journeyStage as any) || null,
        sourceSurface: input.sourceSurface as any,
        originType: normalizeText(input.originType),
        originId: Number.isInteger(Number(input.originId)) ? Number(input.originId) : null,
        reasonCode: normalizeText(input.reasonCode),
        status: 'open',
        contextJson: input.contextJson ?? null,
      });

    const requestId = Number((insertResult as any)?.[0]?.insertId || 0);
    if (!requestId) throw new Error('Failed to create the service request.');

    await this.recordEvent({
      requestId,
      eventType: 'request_created',
      actorUserId: input.requesterUserId,
      actorType: 'consumer',
      payload: {
        sourceSurface: input.sourceSurface,
        originType: input.originType ?? null,
        reasonCode: input.reasonCode ?? null,
      },
    });

    const shortlistSize = Math.max(
      1,
      Math.min(6, Number(input.requestedProviderCount || 3)),
    );
    const suggestions = await this.computeAndStoreShortlist(requestId, shortlistSize);

    return {
      requestId,
      publicReference: (await this.getRequestById(requestId))?.publicReference ?? '',
      suggestedProviderIds: suggestions.map(item => item.providerId),
    };
  }

  async getRequestById(requestId: number) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [row] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId))
      .limit(1);
    return row ?? null;
  }

  async getRequestByReference(publicReference: string) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [row] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.publicReference, publicReference))
      .limit(1);
    return row ?? null;
  }

  /**
   * Deterministic eligibility + transparent organic ordering.
   *
   * Eligibility: live participation, active offering covering the requested
   * node (self, ancestor, or descendant), geography overlap, and the
   * family's verification requirements met.
   *
   * Ordering: capability exactness > geography tightness > verification
   * evidence count > responsiveness history. No commercial signal exists in
   * this path by design; enforced by contract test.
   */
  async computeEligibleProviders(
    requestId: string | number,
    limit = 3,
  ): Promise<Array<{ providerId: number; score: number; rankComponents: Record<string, number> }>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const numericId =
      typeof requestId === 'number'
        ? requestId
        : Number((await this.getRequestByReference(String(requestId)))?.id || 0);
    const request = await this.getRequestById(numericId);
    if (!request) throw new Error('Request not found');

    const allNodes = await serviceCatalogService.listActiveNodes();
    const targetLineage = await serviceCatalogService.lineageIncludingSelf(request.taxonomyNodeId);
    const targetLineageIds = new Set(targetLineage.map(node => node.id));
    const descendantsOfTarget = allNodes
      .filter(node => isDescendantOf(allNodes, node.id, request.taxonomyNodeId))
      .map(node => node.id);

    const coveredNodeIds = [...targetLineageIds, ...descendantsOfTarget];

    const familyNode = targetLineage[targetLineage.length - 1];
    const requiredDimensions = await this.requiredVerificationDimensions(familyNode?.slug);

    const candidateRows: Array<{ providerId: number; nodeId: number }> = await db
      .select({
        providerId: serviceProviders.id,
        nodeId: serviceOfferings.taxonomyNodeId,
      })
      .from(serviceOfferings)
      .innerJoin(serviceProviders, eq(serviceProviders.id, serviceOfferings.providerId))
      .where(
        and(
          eq(serviceProviders.participationStatus, 'live'),
          eq(serviceOfferings.isActive, 1),
          inArray(serviceOfferings.taxonomyNodeId, coveredNodeIds),
        ),
      );

    if (candidateRows.length === 0) return [];

    const providerIds: number[] = [...new Set(candidateRows.map(row => Number(row.providerId)))];

    const areaRows: Array<{
      providerId: number;
      coverageType: string;
      provinceId: number | null;
      cityId: number | null;
      suburbId: number | null;
    }> = await db
      .select({
        providerId: providerServiceAreas.providerId,
        coverageType: providerServiceAreas.coverageType,
        provinceId: providerServiceAreas.provinceId,
        cityId: providerServiceAreas.cityId,
        suburbId: providerServiceAreas.suburbId,
      })
      .from(providerServiceAreas)
      .where(inArray(providerServiceAreas.providerId, providerIds));

    const areasByProvider = new Map<number, typeof areaRows>();
    for (const row of areaRows) {
      const list = areasByProvider.get(row.providerId) || [];
      list.push(row);
      areasByProvider.set(row.providerId, list);
    }

    const verifiedRows: Array<{ providerId: number; dimension: string }> = await db
      .select({
        providerId: providerVerifications.providerId,
        dimension: providerVerifications.dimension,
      })
      .from(providerVerifications)
      .where(
        and(
          inArray(providerVerifications.providerId, providerIds),
          eq(providerVerifications.status, 'verified'),
        ),
      );

    const verifiedByProvider = new Map<number, Set<string>>();
    for (const row of verifiedRows) {
      const set = verifiedByProvider.get(row.providerId) ?? new Set<string>();
      set.add(String(row.dimension));
      verifiedByProvider.set(row.providerId, set);
    }

    const meetsRequirements = (providerId: number): boolean => {
      if (requiredDimensions.length === 0) return true;
      const set = verifiedByProvider.get(providerId);
      if (!set) return false;
      return requiredDimensions.every(dimension => set.has(dimension));
    };

    const responseStats = await db
      .select({
        providerId: serviceIntroductions.providerId,
        total: sql<number>`count(*)`,
        responded: sql<number>`sum(case when ${serviceIntroductions.respondedAt} is null then 0 else 1 end)`,
      })
      .from(serviceIntroductions)
      .where(inArray(serviceIntroductions.providerId, providerIds))
      .groupBy(serviceIntroductions.providerId);
    const responsiveness = new Map<number, number>();
    for (const row of responseStats) {
      const total = Number(row.total || 0);
      const responded = Number(row.responded || 0);
      responsiveness.set(row.providerId, total > 0 ? responded / total : 0);
    }

    const geoRankFor = (
      areas: Array<{ coverageType: string; provinceId: number | null; cityId: number | null; suburbId: number | null }>,
    ): number => {
      if (areas.some(a => a.coverageType === 'national')) return 1;
      if (areas.some(a => a.coverageType === 'remote')) return 0.75;
      if (
        request.suburbId &&
        areas.some(a => a.suburbId === request.suburbId)
      ) {
        return 4;
      }
      if (request.cityId && areas.some(a => a.cityId === request.cityId)) return 3;
      if (
        request.provinceId &&
        areas.some(
          a =>
            a.provinceId === request.provinceId ||
            (a.coverageType === 'province_wide' && a.provinceId === request.provinceId),
        )
      ) {
        return 2;
      }
      return 0;
    };

    const eligible: ProviderCandidate[] = [];
    for (const providerId of providerIds) {
      if (!meetsRequirements(providerId)) continue;

      const areas = areasByProvider.get(providerId) || [];
      const geoRank = geoRankFor(areas);
      if (geoRank <= 0) continue;

      const providerNodes = candidateRows
        .filter(row => row.providerId === providerId)
        .map(row => row.nodeId);
      const exact = providerNodes.includes(request.taxonomyNodeId);
      const coversViaAncestor = providerNodes.some(nodeId => targetLineageIds.has(nodeId));
      const capabilityRank = exact ? 3 : coversViaAncestor ? 2 : 1;

      eligible.push({ providerId, capabilityRank, geoRank });
    }

    const scored = eligible.map(candidate => {
      const verifiedEvidence = requiredDimensions.filter(dimension =>
        verifiedByProvider.get(candidate.providerId)?.has(dimension),
      ).length;
      const responsivenessScore = responsiveness.get(candidate.providerId) ?? 0;
      const score =
        candidate.capabilityRank * 10 +
        candidate.geoRank * 5 +
        verifiedEvidence * 1 +
        responsivenessScore * 2;
      return {
        providerId: candidate.providerId,
        score: Number(score.toFixed(2)),
        rankComponents: {
          capabilityRank: candidate.capabilityRank,
          geoRank: candidate.geoRank,
          verifiedEvidence,
          responsiveness: Number(responsivenessScore.toFixed(2)),
        },
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(6, limit)));
  }

  private async requiredVerificationDimensions(familySlug?: string): Promise<string[]> {
    return familySlug
      ? FAMILY_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS[familySlug] ?? [
          ...DEFAULT_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS,
        ]
      : [...DEFAULT_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS];
  }

  async computeAndStoreShortlist(
    requestId: number | string,
    limit = 3,
  ): Promise<Array<{ providerId: number; score: number }>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const numericId =
      typeof requestId === 'number'
        ? requestId
        : Number((await this.getRequestByReference(String(requestId)))?.id || 0);

    const existing = await db
      .select({ providerId: serviceIntroductions.providerId })
      .from(serviceIntroductions)
      .where(eq(serviceIntroductions.requestId, numericId));
    if (existing.length > 0) {
      return existing.map(row => ({ providerId: row.providerId, score: 0 }));
    }

    const eligible = await this.computeEligibleProviders(numericId, limit);

    if (eligible.length > 0) {
      await db.insert(serviceIntroductions).values(
        eligible.map(item => ({
          requestId: numericId,
          providerId: item.providerId,
          status: 'suggested' as const,
          source: 'auto_shortlist' as const,
          matchScoreSnapshot: String(item.score),
          commercialSnapshot: null,
        })),
      );

      await db
        .update(serviceRequests)
        .set({ status: 'routing' })
        .where(eq(serviceRequests.id, numericId));

      await this.recordEvent({
        requestId: numericId,
        eventType: 'shortlist_computed',
        actorType: 'system',
        payload: { suggested: eligible.map(item => item.providerId) },
      });
      await Promise.all(
        eligible.map(item =>
          this.recordEvent({
            requestId: numericId,
            eventType: 'introduction_created',
            actorType: 'system',
            payload: { providerId: item.providerId, source: 'auto_shortlist' },
          }),
        ),
      );
    }

    return eligible.map(item => ({ providerId: item.providerId, score: item.score }));
  }

  async recordEvent(input: {
    requestId: number;
    introductionId?: number | null;
    eventType: string;
    actorUserId?: number | null;
    actorType?: 'consumer' | 'provider' | 'admin' | 'system';
    payload?: Record<string, unknown> | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    if (!SERVICE_REQUEST_EVENT_TYPE_VALUES.includes(input.eventType as any)) {
      throw new Error(`Unknown service event type: ${input.eventType}`);
    }

    await db.insert(serviceRequestEvents).values({
      requestId: input.requestId,
      introductionId: input.introductionId ?? null,
      eventType: input.eventType as any,
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType ?? 'system',
      payload: input.payload ?? null,
    });
  }

  async connectIntroduction(input: {
    publicReference: string;
    providerId: number;
    actorUserId: number;
    note?: string | null;
  }) {
    const request = await this.getRequestByReference(input.publicReference);
    if (!request) throw new Error('Request not found');
    if (request.requesterUserId !== input.actorUserId) throw new Error('Forbidden');

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [introduction] = await db
      .select()
      .from(serviceIntroductions)
      .where(
        and(
          eq(serviceIntroductions.requestId, request.id),
          eq(serviceIntroductions.providerId, input.providerId),
        ),
      )
      .limit(1);

    let introductionId = introduction?.id;
    if (!introduction) {
      // Consumer-selected direct connection creates the introduction explicitly.
      const insertResult = await db.insert(serviceIntroductions).values({
        requestId: request.id,
        providerId: input.providerId,
        status: 'contacted',
        source: 'consumer_selected',
        connectedAt: toTimestampString(new Date()),
        note: normalizeText(input.note),
      });
      introductionId = Number((insertResult as any)?.[0]?.insertId || 0);
      await this.recordEvent({
        requestId: request.id,
        introductionId,
        eventType: 'introduction_created',
        actorUserId: input.actorUserId,
        actorType: 'consumer',
        payload: { providerId: input.providerId, source: 'consumer_selected' },
      });
    } else {
      await db
        .update(serviceIntroductions)
        .set({
          status: 'contacted',
          connectedAt: toTimestampString(new Date()),
          respondedAt: introduction.respondedAt ?? null,
          note: normalizeText(input.note) ?? introduction.note,
        })
        .where(eq(serviceIntroductions.id, introduction.id));
    }

    await this.recordEvent({
      requestId: request.id,
      introductionId,
      eventType: 'introduction_contacted',
      actorUserId: input.actorUserId,
      actorType: 'consumer',
      payload: { providerId: input.providerId },
    });

    await db
      .update(serviceRequests)
      .set({ status: 'connected' })
      .where(eq(serviceRequests.id, request.id));

    return { ok: true };
  }

  async respondToIntroduction(input: {
    introductionId: number;
    providerUserId: number;
    action: 'viewed' | 'accepted' | 'declined' | 'quote_requested_by_consumer' | 'quote_submitted';
    actorRole?: string | null;
    note?: string | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [row] = await db
      .select({
        introduction: serviceIntroductions,
        providerOwnerId: serviceProviders.ownerUserId,
      })
      .from(serviceIntroductions)
      .innerJoin(serviceProviders, eq(serviceProviders.id, serviceIntroductions.providerId))
      .where(eq(serviceIntroductions.id, input.introductionId))
      .limit(1);

    if (!row) throw new Error('Introduction not found');
    if (Number(row.providerOwnerId) !== Number(input.providerUserId)) {
      throw new Error('Forbidden');
    }

    const statusMap: Record<string, IntroductionStatus> = {
      viewed: 'viewed',
      accepted: 'accepted',
      declined: 'declined',
      quote_requested_by_consumer: 'quote_requested',
      quote_submitted: 'quote_submitted',
    };
    const nextStatus = statusMap[input.action];
    if (!nextStatus) throw new Error('Unsupported introduction action');

    const patch: Partial<typeof serviceIntroductions.$inferInsert> = {
      status: nextStatus,
      respondedAt: row.introduction.respondedAt ?? toTimestampString(new Date()),
    };
    if (normalizeText(input.note)) patch.note = normalizeText(input.note);

    await db
      .update(serviceIntroductions)
      .set(patch)
      .where(eq(serviceIntroductions.id, input.introductionId));

    const eventType =
      nextStatus === 'viewed'
        ? 'introduction_viewed'
        : nextStatus === 'accepted'
          ? 'introduction_accepted'
          : nextStatus === 'declined'
            ? 'introduction_declined'
            : nextStatus === 'quote_requested'
              ? 'quote_requested'
              : 'quote_submitted';

    await this.recordEvent({
      requestId: row.introduction.requestId,
      introductionId: row.introduction.id,
      eventType,
      actorUserId: input.providerUserId,
      actorType: 'provider',
      payload: { providerId: row.introduction.providerId },
    });

    return { ok: true };
  }

  async listIntroductionsForRequest(requestId: number) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select({
        id: serviceIntroductions.id,
        providerId: serviceIntroductions.providerId,
        providerName: serviceProviders.name,
        providerSlug: serviceProviders.slug,
        logoUrl: serviceProviders.logoUrl,
        about: serviceProviders.about,
        status: serviceIntroductions.status,
        source: serviceIntroductions.source,
        matchScoreSnapshot: serviceIntroductions.matchScoreSnapshot,
        createdAt: serviceIntroductions.createdAt,
      })
      .from(serviceIntroductions)
      .innerJoin(serviceProviders, eq(serviceProviders.id, serviceIntroductions.providerId))
      .where(eq(serviceIntroductions.requestId, requestId))
      .orderBy(desc(serviceIntroductions.matchScoreSnapshot));
  }

  async listMyRequests(userId: number, limit = 20) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select({
        id: serviceRequests.id,
        publicReference: serviceRequests.publicReference,
        nodeName: serviceTaxonomyNodes.name,
        nodeSlug: serviceTaxonomyNodes.slug,
        status: serviceRequests.status,
        locationText: serviceRequests.locationText,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .innerJoin(serviceTaxonomyNodes, eq(serviceTaxonomyNodes.id, serviceRequests.taxonomyNodeId))
      .where(eq(serviceRequests.requesterUserId, userId))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(Math.max(1, Math.min(50, limit)));
  }

  async cancelRequest(input: { publicReference: string; actorUserId: number }) {
    const request = await this.getRequestByReference(input.publicReference);
    if (!request) throw new Error('Request not found');
    if (request.requesterUserId !== input.actorUserId) throw new Error('Forbidden');

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .update(serviceRequests)
      .set({ status: 'cancelled', closedAt: toTimestampString(new Date()) })
      .where(eq(serviceRequests.id, request.id));
    await this.recordEvent({
      requestId: request.id,
      eventType: 'request_cancelled',
      actorUserId: input.actorUserId,
      actorType: 'consumer',
    });
    return { ok: true };
  }

  async listIntroductionsForProvider(providerUserId: number, limit = 50): Promise<
    Array<{
      introduction: ServiceIntroduction;
      requestReference: string;
      requestDescription: string | null;
      nodeName: string;
    }>
  > {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [provider] = await db
      .select({ id: serviceProviders.id })
      .from(serviceProviders)
      .where(eq(serviceProviders.ownerUserId, providerUserId))
      .limit(1);
    if (!provider) return [];

    const rows = await db
      .select({
        introduction: serviceIntroductions,
        requestReference: serviceRequests.publicReference,
        requestDescription: serviceRequests.description,
        nodeName: serviceTaxonomyNodes.name,
      })
      .from(serviceIntroductions)
      .innerJoin(serviceRequests, eq(serviceRequests.id, serviceIntroductions.requestId))
      .innerJoin(serviceTaxonomyNodes, eq(serviceTaxonomyNodes.id, serviceRequests.taxonomyNodeId))
      .where(eq(serviceIntroductions.providerId, provider.id))
      .orderBy(desc(serviceIntroductions.createdAt))
      .limit(Math.max(1, Math.min(100, limit)));

    return rows;
  }

  async getProviderDashboard(providerId: number, days = 30) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const safeDays = Math.max(1, Math.min(365, Number(days || 30)));
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        status: serviceIntroductions.status,
        createdAt: serviceIntroductions.createdAt,
      })
      .from(serviceIntroductions)
      .where(eq(serviceIntroductions.providerId, providerId));

    const filtered = rows.filter(row => new Date(String(row.createdAt)) >= since);
    const byStatus: Record<string, number> = {};
    for (const row of filtered) {
      const key = String(row.status);
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    const responded = filtered.filter(row =>
      ['viewed', 'accepted', 'declined'].includes(String(row.status)),
    ).length;
    const won = byStatus.hired || 0;
    const completed = byStatus.completed || 0;
    const closed = won + completed + (byStatus.lost || 0);

    return {
      windowDays: safeDays,
      totalIntroductions: filtered.length,
      respondedCount: responded,
      responseRate:
        filtered.length > 0 ? Number(((responded / filtered.length) * 100).toFixed(1)) : 0,
      wonOrCompleted: won + completed,
      conversionRate: closed > 0 ? Number((((won + completed) / closed) * 100).toFixed(1)) : 0,
      byStatus,
    };
  }
}

export const serviceRequestsService = new ServiceRequestsService();
