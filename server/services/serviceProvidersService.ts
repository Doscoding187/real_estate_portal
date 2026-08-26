import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import {
  FAMILY_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS,
  DEFAULT_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS,
} from '../../shared/services-taxonomy';
import {
  cities as citiesTable,
  provinces as provincesTable,
  suburbs as suburbsTable,
} from '../../drizzle/schema';
import {
  PROVIDER_VERIFICATION_DIMENSION_VALUES,
  SERVICE_PROVIDER_PARTICIPATION_STATUS_VALUES,
  providerServiceAreas,
  providerVerifications,
  serviceOfferings,
  serviceProviders,
  serviceTaxonomyNodes,
  type ProviderVerification,
  type ServiceProvider,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { buildLineage, isDescendantOf, serviceCatalogService } from './serviceCatalogService';

export type ParticipationStatus = (typeof SERVICE_PROVIDER_PARTICIPATION_STATUS_VALUES)[number];
export type VerificationDimension = (typeof PROVIDER_VERIFICATION_DIMENSION_VALUES)[number];

export type UpsertProviderInput = {
  ownerUserId: number;
  name: string;
  logoUrl?: string | null;
  about?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type UpdateProviderProfileInput = {
  name?: string | null;
  logoUrl?: string | null;
  about?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  primaryTaxonomyNodeSlug?: string | null;
};

export type OfferingInput = {
  taxonomyNodeSlug: string;
  displayNameOverride?: string | null;
  description?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  isActive?: boolean;
};

export type ServiceAreaInput = {
  coverageType: 'locality' | 'radius' | 'province_wide' | 'national' | 'remote';
  provinceId?: number | null;
  cityId?: number | null;
  suburbId?: number | null;
  radiusKm?: number | null;
  isPrimary?: boolean;
};

function slugifyName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 150);
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

async function generateUniqueSlug(name: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const stem = slugifyName(name) || 'provider';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 7);
    const candidate = `${stem}-${suffix}`;
    const [existing] = await db
      .select({ id: serviceProviders.id })
      .from(serviceProviders)
      .where(eq(serviceProviders.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error('Unable to allocate a unique provider slug');
}

export class ServiceProvidersService {
  async getProviderByUserId(userId: number): Promise<ServiceProvider | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [row] = await db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.ownerUserId, userId))
      .limit(1);
    return row ?? null;
  }

  async getProviderById(providerId: number): Promise<ServiceProvider | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [row] = await db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.id, providerId))
      .limit(1);
    return row ?? null;
  }

  /**
   * One canonical provider identity per platform user. Repeated calls are
   * idempotent so onboarding steps can safely re-invoke it.
   */
  async ensureProvider(input: UpsertProviderInput): Promise<ServiceProvider> {
    const existing = await this.getProviderByUserId(input.ownerUserId);
    if (existing) return existing;

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const slug = await generateUniqueSlug(input.name);
    const insertResult = await db
      .insert(serviceProviders)
      .values({
        ownerUserId: input.ownerUserId,
        slug,
        name: input.name.trim(),
        logoUrl: normalizeText(input.logoUrl),
        about: normalizeText(input.about),
        websiteUrl: normalizeText(input.websiteUrl),
        contactEmail: normalizeText(input.contactEmail),
        contactPhone: normalizeText(input.contactPhone),
        participationStatus: 'draft',
        metadata: null,
      });

    const providerId = Number((insertResult as any)?.[0]?.insertId || 0);
    if (!providerId) throw new Error('Failed to create the service provider identity.');

    // Seed verification tracking rows so evidence state is explicit per dimension.
    await db.insert(providerVerifications).values(
      PROVIDER_VERIFICATION_DIMENSION_VALUES.map(dimension => ({
        providerId,
        dimension,
        status: dimension === 'platform_history' ? 'unverified' : 'unverified',
      })),
    );

    const created = await this.getProviderById(providerId);
    if (!created) throw new Error('Provider identity disappeared after creation.');
    return created;
  }

  async updateProviderProfile(
    providerId: number,
    input: UpdateProviderProfileInput,
  ): Promise<ServiceProvider | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined && input.name !== null) {
      const name = input.name.trim();
      if (name.length > 0) patch.name = name;
    }
    if (input.logoUrl !== undefined) patch.logoUrl = normalizeText(input.logoUrl);
    if (input.about !== undefined) patch.about = normalizeText(input.about);
    if (input.websiteUrl !== undefined) patch.websiteUrl = normalizeText(input.websiteUrl);
    if (input.contactEmail !== undefined) patch.contactEmail = normalizeText(input.contactEmail);
    if (input.contactPhone !== undefined) patch.contactPhone = normalizeText(input.contactPhone);

    if (input.primaryTaxonomyNodeSlug !== undefined) {
      const slug = normalizeText(input.primaryTaxonomyNodeSlug);
      if (slug) {
        const node = await serviceCatalogService.getNodeBySlug(slug);
        if (!node) throw new Error('Unknown primary capability.');
        patch.primaryTaxonomyNodeId = node.id;
      } else {
        patch.primaryTaxonomyNodeId = null;
      }
    }

    if (Object.keys(patch).length > 0) {
      await db.update(serviceProviders).set(patch).where(eq(serviceProviders.id, providerId));
    }
    return this.getProviderById(providerId);
  }

  async replaceOfferings(providerId: number, offerings: OfferingInput[]) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const slugs = [...new Set(offerings.map(item => item.taxonomyNodeSlug))];
    if (slugs.length === 0) {
      await db.delete(serviceOfferings).where(eq(serviceOfferings.providerId, providerId));
      return [];
    }

    const nodeRows: Array<{ id: number; slug: string }> = await db
      .select({ id: serviceTaxonomyNodes.id, slug: serviceTaxonomyNodes.slug })
      .from(serviceTaxonomyNodes)
      .where(inArray(serviceTaxonomyNodes.slug, slugs));
    const nodeBySlug = new Map<string, { id: number; slug: string }>(
      nodeRows.map(node => [node.slug, node]),
    );

    const rows = offerings
      .map(item => {
        const node = nodeBySlug.get(item.taxonomyNodeSlug);
        if (!node) return null;
        const priceMin = Number.isFinite(Number(item.priceMin)) ? Number(item.priceMin) : null;
        const priceMax = Number.isFinite(Number(item.priceMax)) ? Number(item.priceMax) : null;
        return {
          providerId,
          taxonomyNodeId: node.id,
          displayNameOverride: normalizeText(item.displayNameOverride),
          description: normalizeText(item.description),
          priceMin: priceMin !== null && priceMin >= 0 ? priceMin : null,
          priceMax: priceMax !== null && priceMax >= 0 ? priceMax : null,
          currency: normalizeText(item.currency) || 'ZAR',
          isActive: item.isActive === false ? 0 : 1,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    await db.delete(serviceOfferings).where(eq(serviceOfferings.providerId, providerId));
    if (rows.length > 0) {
      await db.insert(serviceOfferings).values(rows);
    }

    return db
      .select({
        id: serviceOfferings.id,
        nodeSlug: serviceTaxonomyNodes.slug,
        nodeName: serviceTaxonomyNodes.name,
        level: serviceTaxonomyNodes.level,
        displayNameOverride: serviceOfferings.displayNameOverride,
        description: serviceOfferings.description,
        priceMin: serviceOfferings.priceMin,
        priceMax: serviceOfferings.priceMax,
        currency: serviceOfferings.currency,
        isActive: serviceOfferings.isActive,
      })
      .from(serviceOfferings)
      .innerJoin(
        serviceTaxonomyNodes,
        eq(serviceTaxonomyNodes.id, serviceOfferings.taxonomyNodeId),
      )
      .where(eq(serviceOfferings.providerId, providerId));
  }

  async replaceServiceAreas(providerId: number, areas: ServiceAreaInput[]) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const rows = areas.map((area, index) => {
      const requiresGeo =
        area.coverageType === 'locality' ||
        area.coverageType === 'radius' ||
        area.coverageType === 'province_wide';
      if (requiresGeo && !area.provinceId && !area.cityId && !area.suburbId) {
        throw new Error('Coverage areas of this type require a province, city, or suburb.');
      }
      if (area.coverageType === 'locality' && !area.suburbId && !area.cityId) {
        throw new Error('Locality coverage requires a suburb or city.');
      }
      if (area.coverageType === 'radius' && !area.radiusKm) {
        throw new Error('Radius coverage requires a radius in kilometres.');
      }
      return {
        providerId,
        countryCode: 'ZA',
        coverageType: area.coverageType,
        provinceId: area.provinceId ?? null,
        cityId: area.cityId ?? null,
        suburbId: area.suburbId ?? null,
        radiusKm:
          area.radiusKm !== undefined && Number.isFinite(Number(area.radiusKm))
            ? Number(area.radiusKm)
            : null,
        isPrimary: (area.isPrimary || index === 0) && index === 0 ? 1 : 0,
      };
    });

    await db.delete(providerServiceAreas).where(eq(providerServiceAreas.providerId, providerId));
    if (rows.length > 0) {
      await db.insert(providerServiceAreas).values(rows);
    }
    return db
      .select()
      .from(providerServiceAreas)
      .where(eq(providerServiceAreas.providerId, providerId));
  }

  async setParticipationStatus(providerId: number, status: ParticipationStatus) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await db
      .update(serviceProviders)
      .set({ participationStatus: status })
      .where(eq(serviceProviders.id, providerId));
  }

  /** Provider-initiated go-live request. Admin review governs activation. */
  async submitForReview(providerId: number) {
    const provider = await this.getProviderById(providerId);
    if (!provider) throw new Error('Provider not found');
    if (provider.participationStatus === 'live') return provider;

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const offeringCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(serviceOfferings)
      .where(and(eq(serviceOfferings.providerId, providerId), eq(serviceOfferings.isActive, 1)));
    if (Number(offeringCount[0]?.count || 0) === 0) {
      throw new Error('Add at least one active service before requesting go-live.');
    }

    const areaCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(providerServiceAreas)
      .where(eq(providerServiceAreas.providerId, providerId));
    if (Number(areaCount[0]?.count || 0) === 0) {
      throw new Error('Add at least one service area before requesting go-live.');
    }

    await this.setParticipationStatus(providerId, 'pending_review');
    return this.getProviderById(providerId);
  }

  async getVerifiedDimensions(providerId: number): Promise<ProviderVerification[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    return db
      .select()
      .from(providerVerifications)
      .where(
        and(
          eq(providerVerifications.providerId, providerId),
          eq(providerVerifications.status, 'verified'),
        ),
      );
  }

  async adminSetVerification(input: {
    providerId: number;
    dimension: VerificationDimension;
    status: 'unverified' | 'submitted' | 'verified' | 'failed' | 'expired';
    verifiedByUserId: number;
    notes?: string | null;
    expiresAt?: string | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const verified = input.status === 'verified';
    await db
      .update(providerVerifications)
      .set({
        status: input.status,
        verifiedByUserId: input.verifiedByUserId,
        verifiedAt: verified ? toTimestampString(new Date()) : null,
        expiresAt: input.expiresAt ? toTimestampString(input.expiresAt) : null,
        notes: normalizeText(input.notes),
      })
      .where(
        and(
          eq(providerVerifications.providerId, input.providerId),
          eq(providerVerifications.dimension, input.dimension),
        ),
      );
  }

  async listPendingReviewProviders(limit = 50) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    return db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.participationStatus, 'pending_review'))
      .orderBy(desc(serviceProviders.updatedAt))
      .limit(Math.max(1, Math.min(100, limit)));
  }

  async meetsFamilyVerificationRequirements(
    providerId: number,
    familySlug: string,
    verifiedDimensions: Set<string>,
  ): Promise<boolean> {
    const required =
      FAMILY_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS[familySlug] ??
      DEFAULT_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS;
    return required.every(dimension => verifiedDimensions.has(dimension));
  }

  async getPublicProfileByIdOrSlug(idOrSlug: string) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const numericId = Number.parseInt(idOrSlug, 10);
    const condition = Number.isInteger(numericId) && numericId > 0
      ? eq(serviceProviders.id, numericId)
      : eq(serviceProviders.slug, idOrSlug);

    const [provider] = await db.select().from(serviceProviders).where(condition).limit(1);
    if (!provider) return null;

    const parentNode = alias(serviceTaxonomyNodes, 'parent_node');
    const provinceAlias = alias(provincesTable, 'prov');
    const cityAlias = alias(citiesTable, 'city');
    const suburbAlias = alias(suburbsTable, 'sub');

    const [offerings, areas, verifications] = await Promise.all([
      db
        .select({
          id: serviceOfferings.id,
          nodeSlug: serviceTaxonomyNodes.slug,
          nodeName: serviceTaxonomyNodes.name,
          nodeLevel: serviceTaxonomyNodes.level,
          parentSlug: parentNode.slug,
          displayNameOverride: serviceOfferings.displayNameOverride,
          description: serviceOfferings.description,
          priceMin: serviceOfferings.priceMin,
          priceMax: serviceOfferings.priceMax,
          currency: serviceOfferings.currency,
        })
        .from(serviceOfferings)
        .innerJoin(serviceTaxonomyNodes, eq(serviceTaxonomyNodes.id, serviceOfferings.taxonomyNodeId))
        .leftJoin(parentNode, eq(parentNode.id, serviceTaxonomyNodes.parentId))
        .where(
          and(
            eq(serviceOfferings.providerId, provider.id),
            eq(serviceOfferings.isActive, 1),
          ),
        ),
      db
        .select({
          id: providerServiceAreas.id,
          coverageType: providerServiceAreas.coverageType,
          radiusKm: providerServiceAreas.radiusKm,
          isPrimary: providerServiceAreas.isPrimary,
          provinceName: provinceAlias.name,
          cityName: cityAlias.name,
          suburbName: suburbAlias.name,
        })
        .from(providerServiceAreas)
        .leftJoin(provinceAlias, eq(provinceAlias.id, providerServiceAreas.provinceId))
        .leftJoin(cityAlias, eq(cityAlias.id, providerServiceAreas.cityId))
        .leftJoin(suburbAlias, eq(suburbAlias.id, providerServiceAreas.suburbId))
        .where(eq(providerServiceAreas.providerId, provider.id)),
      this.getVerifiedDimensions(provider.id),
    ]);

    return {
      provider: {
        id: provider.id,
        slug: provider.slug,
        name: provider.name,
        logoUrl: provider.logoUrl,
        about: provider.about,
        websiteUrl: provider.websiteUrl,
        contactEmail: provider.participationStatus === 'live' ? provider.contactEmail : null,
        contactPhone: provider.participationStatus === 'live' ? provider.contactPhone : null,
        participationStatus: provider.participationStatus,
      },
      offerings,
      areas,
      verifiedDimensions: verifications.map(row => row.dimension),
    };
  }

  /**
   * Directory search with organic ordering only. Commercial participation is
   * deliberately invisible to this code path.
   */
  async directorySearch(input: {
    nodeSlug?: string;
    query?: string;
    provinceId?: number;
    cityId?: number;
    suburbId?: number;
    limit?: number;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const limit = Math.max(1, Math.min(50, Number(input.limit || 20)));

    const conditions = [eq(serviceProviders.participationStatus, 'live')];

    let targetNodeIds: number[] | null = null;
    if (input.nodeSlug) {
      const node = await serviceCatalogService.getNodeBySlug(input.nodeSlug);
      if (!node) return [];
      const allNodes = await serviceCatalogService.listActiveNodes();
      targetNodeIds = allNodes
        .filter(candidate => isDescendantOf(allNodes, candidate.id, node.id))
        .map(candidate => candidate.id);
    }

    const offeringConditions = [
      eq(serviceOfferings.isActive, 1),
      conditions[0],
    ];
    if (targetNodeIds) {
      offeringConditions.push(inArray(serviceOfferings.taxonomyNodeId, targetNodeIds));
    }
    if (normalizeText(input.query)) {
      const needle = `%${String(input.query).trim().toLowerCase()}%`;
      offeringConditions.push(
        or(
          sql`lower(${serviceProviders.name}) LIKE ${needle}`,
          sql`lower(coalesce(${serviceOfferings.displayNameOverride}, '')) LIKE ${needle}`,
          sql`lower(${serviceTaxonomyNodes.name}) LIKE ${needle}`,
        )!,
      );
    }

    const baseQuery = db
      .select({
        providerId: serviceProviders.id,
        slug: serviceProviders.slug,
        name: serviceProviders.name,
        logoUrl: serviceProviders.logoUrl,
        about: serviceProviders.about,
        nodeId: serviceTaxonomyNodes.id,
        nodeName: serviceTaxonomyNodes.name,
        nodeSlug: serviceTaxonomyNodes.slug,
        nodeLevel: serviceTaxonomyNodes.level,
        offeringLabel: serviceOfferings.displayNameOverride,
        priceMin: serviceOfferings.priceMin,
        priceMax: serviceOfferings.priceMax,
      })
      .from(serviceOfferings)
      .innerJoin(serviceProviders, eq(serviceProviders.id, serviceOfferings.providerId))
      .innerJoin(
        serviceTaxonomyNodes,
        eq(serviceTaxonomyNodes.id, serviceOfferings.taxonomyNodeId),
      )
      .where(and(...offeringConditions));

    const rows: Array<{
      providerId: number;
      slug: string;
      name: string;
      logoUrl: string | null;
      about: string | null;
      nodeId: number;
      nodeName: string;
      nodeSlug: string;
      nodeLevel: string;
      offeringLabel: string | null;
      priceMin: number | null;
      priceMax: number | null;
    }> = await baseQuery.limit(400);

    if (rows.length === 0) return [];

    const providerIds: number[] = [...new Set(rows.map(row => Number(row.providerId)))];

    const areaRows = await db
      .select({
        providerId: providerServiceAreas.providerId,
        coverageType: providerServiceAreas.coverageType,
        provinceId: providerServiceAreas.provinceId,
        cityId: providerServiceAreas.cityId,
        suburbId: providerServiceAreas.suburbId,
        radiusKm: providerServiceAreas.radiusKm,
        isPrimary: providerServiceAreas.isPrimary,
      })
      .from(providerServiceAreas)
      .where(inArray(providerServiceAreas.providerId, providerIds));

    const verificationRows = await db
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

    const areasByProvider = new Map<number, typeof areaRows>();
    for (const row of areaRows) {
      const list = areasByProvider.get(row.providerId) || [];
      list.push(row);
      areasByProvider.set(row.providerId, list);
    }

    const verifiedCountByProvider = new Map<number, number>();
    for (const row of verificationRows) {
      verifiedCountByProvider.set(
        row.providerId,
        (verifiedCountByProvider.get(row.providerId) || 0) + 1,
      );
    }

    const matchesGeography = (
      areas: Array<{ coverageType: string; provinceId: number | null; cityId: number | null; suburbId: number | null }>,
    ): boolean => {
      if (!input.provinceId && !input.cityId && !input.suburbId) return true;
      return areas.some(area => {
        if (area.coverageType === 'national' || area.coverageType === 'remote') return true;
        if (
          area.coverageType === 'province_wide' &&
          input.provinceId &&
          area.provinceId === input.provinceId
        ) {
          return true;
        }
        if (area.suburbId && input.suburbId && area.suburbId === input.suburbId) return true;
        if (area.cityId && input.cityId && area.cityId === input.cityId) return true;
        if (area.provinceId && input.provinceId && area.provinceId === input.provinceId) {
          return true;
        }
        return false;
      });
    };

    const providers = new Map<
      number,
      {
        providerId: number;
        slug: string;
        name: string;
        logoUrl: string | null;
        about: string | null;
        topOfferings: Array<{ label: string; nodeSlug: string; priceMin: number | null; priceMax: number | null }>;
        bestCapabilityRank: number;
        geoRank: number;
        verifiedDimensionCount: number;
      }
    >();

    for (const row of rows) {
      const areas = areasByProvider.get(row.providerId) || [];
      if (!matchesGeography(areas)) continue;

      const existing = providers.get(row.providerId) ?? {
        providerId: row.providerId,
        slug: row.slug,
        name: row.name,
        logoUrl: row.logoUrl,
        about: row.about,
        topOfferings: [] as Array<{ label: string; nodeSlug: string; priceMin: number | null; priceMax: number | null }>,
        bestCapabilityRank: 0,
        geoRank: 0,
        verifiedDimensionCount: verifiedCountByProvider.get(row.providerId) || 0,
      };

      if (existing.topOfferings.length < 3) {
        existing.topOfferings.push({
          label: row.offeringLabel || row.nodeName,
          nodeSlug: row.nodeSlug,
          priceMin: row.priceMin,
          priceMax: row.priceMax,
        });
      }

      const capabilityRank = targetNodeIds
        ? row.nodeId === targetNodeIds[targetNodeIds.length - 1]
          ? 3
          : 2
        : 1;
      existing.bestCapabilityRank = Math.max(existing.bestCapabilityRank, capabilityRank);

      const geoRank = areas.some(a => a.suburbId && a.suburbId === input.suburbId)
        ? 3
        : areas.some(a => a.cityId && a.cityId === input.cityId)
          ? 2
          : areas.some(a => a.provinceId && a.provinceId === input.provinceId)
            ? 1
            : 0.5;
      existing.geoRank = Math.max(existing.geoRank, geoRank);

      providers.set(row.providerId, existing);
    }

    const results = [...providers.values()];
    results.sort((a, b) => {
      if (b.bestCapabilityRank !== a.bestCapabilityRank) {
        return b.bestCapabilityRank - a.bestCapabilityRank;
      }
      if (b.geoRank !== a.geoRank) return b.geoRank - a.geoRank;
      if (b.verifiedDimensionCount !== a.verifiedDimensionCount) {
        return b.verifiedDimensionCount - a.verifiedDimensionCount;
      }
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, limit).map(provider => ({
      ...provider,
      areas: (areasByProvider.get(provider.providerId) || []).map(area => ({
        coverageType: area.coverageType,
        radiusKm: area.radiusKm,
        isPrimary: Number(area.isPrimary || 0) === 1,
      })),
    }));
  }
}

export const serviceProvidersService = new ServiceProvidersService();

// Re-exported for sibling modules.
export { buildLineage };
