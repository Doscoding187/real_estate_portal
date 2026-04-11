import { randomUUID } from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  explorePartners,
  partnerTiers,
  SERVICE_CATEGORY_VALUES,
  SERVICE_INTENT_STAGE_VALUES,
  SERVICE_LEAD_EVENT_TYPE_VALUES,
  SERVICE_LEAD_STATUS_VALUES,
  SERVICE_SOURCE_SURFACE_VALUES,
  serviceExploreVideos,
  serviceLeadEvents,
  serviceLeads,
  serviceProviderLocations,
  serviceProviderProfiles,
  serviceProviderServices,
  serviceProviderSubscriptions,
  serviceProviderReviews,
} from '../../drizzle/schema';
import { getDb } from '../db';

export type ServiceCategory = (typeof SERVICE_CATEGORY_VALUES)[number];
export type ServiceIntentStage = (typeof SERVICE_INTENT_STAGE_VALUES)[number];
export type ServiceLeadEventType = (typeof SERVICE_LEAD_EVENT_TYPE_VALUES)[number];
export type ServiceSourceSurface = (typeof SERVICE_SOURCE_SURFACE_VALUES)[number];
export type ServiceLeadStatus = (typeof SERVICE_LEAD_STATUS_VALUES)[number];

type ProviderDirectoryRecord = {
  providerId: string;
  companyName: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  trustScore: number;
  headline: string | null;
  bio: string | null;
  moderationTier: 'basic' | 'verified' | 'pro';
  subscriptionTier: 'directory' | 'directory_explore' | 'ecosystem_pro';
  averageRating: number;
  reviewCount: number;
  services: Array<{
    category: ServiceCategory;
    code: string;
    displayName: string;
    minPrice: number | null;
    maxPrice: number | null;
  }>;
  locations: Array<{
    province: string | null;
    city: string | null;
    suburb: string | null;
    radiusKm: number;
  }>;
};

export type ProviderScoreInput = {
  serviceCategory: ServiceCategory;
  intentStage: ServiceIntentStage;
  sourceSurface: ServiceSourceSurface;
  providerVerificationStatus: 'pending' | 'verified' | 'rejected';
  providerTrustScore: number;
  providerSubscriptionTier: 'directory' | 'directory_explore' | 'ecosystem_pro';
  matchesCity: boolean;
  matchesSuburb: boolean;
  stageCategoryBoost: number;
};

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const STAGE_CATEGORY_AFFINITY: Record<ServiceIntentStage, ServiceCategory[]> = {
  seller_valuation: ['media_marketing', 'home_improvement', 'inspection_compliance'],
  seller_listing_prep: ['media_marketing', 'home_improvement', 'inspection_compliance'],
  buyer_saved_property: ['finance_legal', 'inspection_compliance', 'insurance'],
  buyer_offer_intent: ['finance_legal', 'inspection_compliance', 'insurance'],
  buyer_move_ready: ['moving', 'insurance', 'home_improvement'],
  developer_listing_wizard: ['media_marketing', 'finance_legal', 'home_improvement'],
  agent_dashboard: [
    'media_marketing',
    'finance_legal',
    'inspection_compliance',
    'home_improvement',
    'moving',
    'insurance',
  ],
  general: [
    'media_marketing',
    'finance_legal',
    'inspection_compliance',
    'home_improvement',
    'moving',
    'insurance',
  ],
};

export function getStageCategoryBoost(
  stage: ServiceIntentStage,
  category: ServiceCategory,
): number {
  return STAGE_CATEGORY_AFFINITY[stage].includes(category) ? 2 : 0;
}

function tierWeight(tier: 'directory' | 'directory_explore' | 'ecosystem_pro'): number {
  if (tier === 'ecosystem_pro') return 2;
  if (tier === 'directory_explore') return 1;
  return 0;
}

export function isBillingEligibleForTier(
  tier: 'directory' | 'directory_explore' | 'ecosystem_pro',
  sourceSurface: ServiceSourceSurface,
): boolean {
  if (tier === 'ecosystem_pro') return true;
  if (tier === 'directory_explore') {
    return sourceSurface === 'directory' || sourceSurface === 'explore';
  }
  return sourceSurface === 'directory';
}

export function scoreProviderCandidate(input: ProviderScoreInput): number {
  let score = 0;
  score += input.stageCategoryBoost;
  if (input.matchesSuburb) score += 2;
  else if (input.matchesCity) score += 1;
  if (input.providerVerificationStatus === 'verified') score += 2;
  else if (input.providerVerificationStatus === 'pending') score += 0.5;
  score += Math.max(0, Math.min(100, input.providerTrustScore)) * 0.03;
  score += tierWeight(input.providerSubscriptionTier);
  return Number(score.toFixed(3));
}

export type UpsertProviderIdentityInput = {
  userId: number;
  companyName: string;
  tierId?: number;
  description?: string | null;
  logoUrl?: string | null;
};

export type UpsertProviderProfileInput = {
  headline?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  moderationTier?: 'basic' | 'verified' | 'pro';
  directoryActive?: boolean;
  exploreCreatorActive?: boolean;
  dashboardActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

type ReplaceProviderServiceInput = {
  category: ServiceCategory;
  code: string;
  displayName: string;
  description?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  currency?: string | null;
  isActive?: boolean;
};

type ReplaceProviderLocationInput = {
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  radiusKm?: number | null;
  isPrimary?: boolean;
};

type DirectorySearchInput = {
  query?: string;
  category?: ServiceCategory;
  province?: string;
  city?: string;
  suburb?: string;
  limit?: number;
};

type RecommendProvidersInput = {
  category: ServiceCategory;
  intentStage: ServiceIntentStage;
  sourceSurface: ServiceSourceSurface;
  province?: string;
  city?: string;
  suburb?: string;
  limit?: number;
};

type CreateServiceLeadInput = {
  requesterUserId?: number | null;
  providerId?: string | null;
  category: ServiceCategory;
  sourceSurface: ServiceSourceSurface;
  intentStage: ServiceIntentStage;
  propertyId?: number | null;
  listingId?: number | null;
  developmentId?: number | null;
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
  notes?: string | null;
  context?: Record<string, unknown> | null;
  requestedProviderCount?: number;
};

type LeadInteractionEventType =
  | 'recommendations_shown'
  | 'provider_card_clicked'
  | 'quote_requested'
  | 'results_empty_shown'
  | 'nearby_market_clicked';

export class ServicesEngineService {
  async getProviderByUserId(userId: number) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db.query.explorePartners.findFirst({
      where: eq(explorePartners.userId, String(userId)),
    });
  }

  async getProviderPublicProfile(providerId: string) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [base] = await db
      .select({
        providerId: explorePartners.id,
        companyName: explorePartners.companyName,
        description: explorePartners.description,
        logoUrl: explorePartners.logoUrl,
        verificationStatus: explorePartners.verificationStatus,
        trustScore: explorePartners.trustScore,
        tierId: explorePartners.tierId,
        profileHeadline: serviceProviderProfiles.headline,
        profileBio: serviceProviderProfiles.bio,
        profileWebsiteUrl: serviceProviderProfiles.websiteUrl,
        profileContactEmail: serviceProviderProfiles.contactEmail,
        profileContactPhone: serviceProviderProfiles.contactPhone,
        profileModerationTier: serviceProviderProfiles.moderationTier,
        profileAverageRating: serviceProviderProfiles.averageRating,
        profileReviewCount: serviceProviderProfiles.reviewCount,
        subscriptionTier: serviceProviderSubscriptions.tier,
        subscriptionStatus: serviceProviderSubscriptions.status,
      })
      .from(explorePartners)
      .leftJoin(serviceProviderProfiles, eq(serviceProviderProfiles.providerId, explorePartners.id))
      .leftJoin(
        serviceProviderSubscriptions,
        eq(serviceProviderSubscriptions.providerId, explorePartners.id),
      )
      .where(eq(explorePartners.id, providerId))
      .limit(1);

    if (!base) return null;

    const services = await db
      .select({
        id: serviceProviderServices.id,
        category: serviceProviderServices.serviceCategory,
        code: serviceProviderServices.serviceCode,
        displayName: serviceProviderServices.displayName,
        description: serviceProviderServices.description,
        minPrice: serviceProviderServices.minPrice,
        maxPrice: serviceProviderServices.maxPrice,
        currency: serviceProviderServices.currency,
      })
      .from(serviceProviderServices)
      .where(
        and(
          eq(serviceProviderServices.providerId, providerId),
          eq(serviceProviderServices.isActive, 1),
        ),
      )
      .orderBy(serviceProviderServices.displayName);

    const locations = await db
      .select({
        id: serviceProviderLocations.id,
        countryCode: serviceProviderLocations.countryCode,
        province: serviceProviderLocations.province,
        city: serviceProviderLocations.city,
        suburb: serviceProviderLocations.suburb,
        postalCode: serviceProviderLocations.postalCode,
        radiusKm: serviceProviderLocations.radiusKm,
        isPrimary: serviceProviderLocations.isPrimary,
      })
      .from(serviceProviderLocations)
      .where(eq(serviceProviderLocations.providerId, providerId))
      .orderBy(desc(serviceProviderLocations.isPrimary), serviceProviderLocations.city);

    const reviewRows = await db
      .select({
        id: serviceProviderReviews.id,
        rating: serviceProviderReviews.rating,
        title: serviceProviderReviews.title,
        content: serviceProviderReviews.content,
        isVerified: serviceProviderReviews.isVerified,
        createdAt: serviceProviderReviews.createdAt,
      })
      .from(serviceProviderReviews)
      .where(
        and(
          eq(serviceProviderReviews.providerId, providerId),
          eq(serviceProviderReviews.isPublished, 1),
        ),
      )
      .orderBy(desc(serviceProviderReviews.createdAt))
      .limit(12);

    return {
      providerId: base.providerId,
      companyName: base.companyName,
      description: base.description || null,
      logoUrl: base.logoUrl || null,
      verificationStatus: base.verificationStatus,
      trustScore: Number(base.trustScore || 0),
      tierId: Number(base.tierId || 0),
      headline: base.profileHeadline || null,
      bio: base.profileBio || null,
      websiteUrl: base.profileWebsiteUrl || null,
      contactEmail: base.profileContactEmail || null,
      contactPhone: base.profileContactPhone || null,
      moderationTier: base.profileModerationTier || 'basic',
      averageRating: Number(base.profileAverageRating || 0),
      reviewCount: Number(base.profileReviewCount || 0),
      subscriptionTier: base.subscriptionTier || 'directory',
      subscriptionStatus: base.subscriptionStatus || 'trial',
      services: services.map(item => ({
        id: Number(item.id),
        category: item.category,
        code: item.code,
        displayName: item.displayName,
        description: item.description || null,
        minPrice:
          item.minPrice !== null && item.minPrice !== undefined ? Number(item.minPrice) : null,
        maxPrice:
          item.maxPrice !== null && item.maxPrice !== undefined ? Number(item.maxPrice) : null,
        currency: item.currency,
      })),
      locations: locations.map(item => ({
        id: Number(item.id),
        countryCode: item.countryCode,
        province: item.province || null,
        city: item.city || null,
        suburb: item.suburb || null,
        postalCode: item.postalCode || null,
        radiusKm: Number(item.radiusKm || 25),
        isPrimary: Number(item.isPrimary || 0) === 1,
      })),
      reviews: reviewRows.map(item => ({
        id: Number(item.id),
        rating: Number(item.rating || 0),
        title: item.title || null,
        content: item.content || null,
        isVerified: Number(item.isVerified || 0) === 1,
        createdAt: item.createdAt,
      })),
    };
  }

  async getProviderReviews(providerId: string, limit = 50) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select({
        id: serviceProviderReviews.id,
        rating: serviceProviderReviews.rating,
        title: serviceProviderReviews.title,
        content: serviceProviderReviews.content,
        isVerified: serviceProviderReviews.isVerified,
        createdAt: serviceProviderReviews.createdAt,
      })
      .from(serviceProviderReviews)
      .where(
        and(
          eq(serviceProviderReviews.providerId, providerId),
          eq(serviceProviderReviews.isPublished, 1),
        ),
      )
      .orderBy(desc(serviceProviderReviews.createdAt))
      .limit(Math.max(1, Math.min(200, Number(limit || 50))));
  }

  async getMyProviderProfile(userId: number) {
    const provider = await this.getProviderByUserId(userId);
    if (!provider?.id) return null;
    return this.getProviderPublicProfile(String(provider.id));
  }

  async upsertProviderIdentity(input: UpsertProviderIdentityInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const existing = await this.getProviderByUserId(input.userId);
    if (existing) {
      return existing;
    }

    let tierId = Number(input.tierId || 0);
    if (!tierId) {
      const [preferredTier] = await db
        .select({ id: partnerTiers.id })
        .from(partnerTiers)
        .where(eq(partnerTiers.id, 2))
        .limit(1);
      const [fallbackTier] = await db
        .select({ id: partnerTiers.id })
        .from(partnerTiers)
        .orderBy(partnerTiers.id)
        .limit(1);
      const resolvedTierId = Number(preferredTier?.id || fallbackTier?.id || 0);
      if (!resolvedTierId) {
        throw new Error('Cannot create provider without a partner tier. Seed partner_tiers first.');
      }
      tierId = resolvedTierId;
    }

    const providerId = randomUUID();
    await db.insert(explorePartners).values({
      id: providerId,
      userId: String(input.userId),
      tierId,
      companyName: input.companyName,
      description: normalizeText(input.description) || null,
      logoUrl: normalizeText(input.logoUrl) || null,
      verificationStatus: 'pending',
      trustScore: '50.00',
      serviceLocations: [],
      approvedContentCount: 0,
    });

    await db.insert(serviceProviderProfiles).values({
      providerId,
      headline: null,
      bio: null,
      moderationTier: 'basic',
      directoryActive: 1,
      exploreCreatorActive: 1,
      dashboardActive: 1,
      averageRating: '0.00',
      reviewCount: 0,
      metadata: null,
    });

    await db.insert(serviceProviderSubscriptions).values({
      providerId,
      tier: 'directory',
      status: 'trial',
      metadata: null,
    });

    return db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, providerId),
    });
  }

  async upsertProviderProfile(providerId: string, input: UpsertProviderProfileInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const profileValues = {
      providerId,
      headline: normalizeText(input.headline) || null,
      bio: normalizeText(input.bio) || null,
      websiteUrl: normalizeText(input.websiteUrl) || null,
      contactEmail: normalizeText(input.contactEmail) || null,
      contactPhone: normalizeText(input.contactPhone) || null,
      moderationTier: input.moderationTier || 'basic',
      directoryActive: input.directoryActive === undefined ? 1 : input.directoryActive ? 1 : 0,
      exploreCreatorActive:
        input.exploreCreatorActive === undefined ? 1 : input.exploreCreatorActive ? 1 : 0,
      dashboardActive: input.dashboardActive === undefined ? 1 : input.dashboardActive ? 1 : 0,
      metadata: input.metadata ?? null,
    };

    await db
      .insert(serviceProviderProfiles)
      .values(profileValues)
      .onDuplicateKeyUpdate({
        set: {
          headline: profileValues.headline,
          bio: profileValues.bio,
          websiteUrl: profileValues.websiteUrl,
          contactEmail: profileValues.contactEmail,
          contactPhone: profileValues.contactPhone,
          moderationTier: profileValues.moderationTier,
          directoryActive: profileValues.directoryActive,
          exploreCreatorActive: profileValues.exploreCreatorActive,
          dashboardActive: profileValues.dashboardActive,
          metadata: profileValues.metadata,
        },
      });

    const [profile] = await db
      .select()
      .from(serviceProviderProfiles)
      .where(eq(serviceProviderProfiles.providerId, providerId))
      .limit(1);

    return profile || null;
  }

  async replaceProviderServices(providerId: string, services: ReplaceProviderServiceInput[]) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .delete(serviceProviderServices)
      .where(eq(serviceProviderServices.providerId, providerId));

    const rows = services
      .filter(item => normalizeText(item.code) && normalizeText(item.displayName))
      .map(item => ({
        providerId,
        serviceCategory: item.category,
        serviceCode: String(item.code).trim(),
        displayName: String(item.displayName).trim(),
        description: normalizeText(item.description) || null,
        minPrice: item.minPrice ?? null,
        maxPrice: item.maxPrice ?? null,
        currency: normalizeText(item.currency) || 'ZAR',
        isActive: item.isActive === false ? 0 : 1,
      }));

    if (rows.length > 0) {
      await db.insert(serviceProviderServices).values(rows);
    }

    return db
      .select()
      .from(serviceProviderServices)
      .where(eq(serviceProviderServices.providerId, providerId))
      .orderBy(serviceProviderServices.displayName);
  }

  async replaceProviderLocations(providerId: string, locations: ReplaceProviderLocationInput[]) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .delete(serviceProviderLocations)
      .where(eq(serviceProviderLocations.providerId, providerId));

    const normalized = locations
      .map((location, index) => ({
        providerId,
        countryCode: normalizeText(location.countryCode) || 'ZA',
        province: normalizeText(location.province) || null,
        city: normalizeText(location.city) || null,
        suburb: normalizeText(location.suburb) || null,
        postalCode: normalizeText(location.postalCode) || null,
        radiusKm: Number.isFinite(Number(location.radiusKm)) ? Number(location.radiusKm) : 25,
        isPrimary: location.isPrimary || index === 0 ? 1 : 0,
      }))
      .filter(location => location.province || location.city || location.suburb);

    if (normalized.length > 0) {
      await db.insert(serviceProviderLocations).values(normalized);
    }

    return db
      .select()
      .from(serviceProviderLocations)
      .where(eq(serviceProviderLocations.providerId, providerId))
      .orderBy(desc(serviceProviderLocations.isPrimary), serviceProviderLocations.city);
  }

  async directorySearch(input: DirectorySearchInput): Promise<ProviderDirectoryRecord[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const limit = Math.max(1, Math.min(50, Number(input.limit || 20)));
    const normalizedQuery = normalizeText(input.query)?.toLowerCase() || null;
    const normalizedProvince = normalizeText(input.province)?.toLowerCase() || null;
    const normalizedCity = normalizeText(input.city)?.toLowerCase() || null;
    const normalizedSuburb = normalizeText(input.suburb)?.toLowerCase() || null;

    const baseRows = await db
      .select({
        providerId: explorePartners.id,
        companyName: explorePartners.companyName,
        verificationStatus: explorePartners.verificationStatus,
        trustScore: explorePartners.trustScore,
        headline: serviceProviderProfiles.headline,
        bio: serviceProviderProfiles.bio,
        moderationTier: serviceProviderProfiles.moderationTier,
        averageRating: serviceProviderProfiles.averageRating,
        reviewCount: serviceProviderProfiles.reviewCount,
        subscriptionTier: serviceProviderSubscriptions.tier,
      })
      .from(explorePartners)
      .innerJoin(
        serviceProviderProfiles,
        eq(serviceProviderProfiles.providerId, explorePartners.id),
      )
      .leftJoin(
        serviceProviderSubscriptions,
        eq(serviceProviderSubscriptions.providerId, explorePartners.id),
      )
      .where(eq(serviceProviderProfiles.directoryActive, 1))
      .orderBy(desc(explorePartners.trustScore))
      .limit(300);

    if (baseRows.length === 0) {
      return [];
    }

    const baseProviderIds = baseRows.map(row => row.providerId);

    const services = await db
      .select({
        providerId: serviceProviderServices.providerId,
        category: serviceProviderServices.serviceCategory,
        code: serviceProviderServices.serviceCode,
        displayName: serviceProviderServices.displayName,
        minPrice: serviceProviderServices.minPrice,
        maxPrice: serviceProviderServices.maxPrice,
      })
      .from(serviceProviderServices)
      .where(
        and(
          inArray(serviceProviderServices.providerId, baseProviderIds),
          eq(serviceProviderServices.isActive, 1),
        ),
      );

    const locations = await db
      .select({
        providerId: serviceProviderLocations.providerId,
        province: serviceProviderLocations.province,
        city: serviceProviderLocations.city,
        suburb: serviceProviderLocations.suburb,
        radiusKm: serviceProviderLocations.radiusKm,
      })
      .from(serviceProviderLocations)
      .where(inArray(serviceProviderLocations.providerId, baseProviderIds));

    const servicesByProvider = new Map<string, ProviderDirectoryRecord['services']>();
    for (const row of services) {
      const current = servicesByProvider.get(row.providerId) || [];
      current.push({
        category: row.category as ServiceCategory,
        code: row.code,
        displayName: row.displayName,
        minPrice: row.minPrice !== null && row.minPrice !== undefined ? Number(row.minPrice) : null,
        maxPrice: row.maxPrice !== null && row.maxPrice !== undefined ? Number(row.maxPrice) : null,
      });
      servicesByProvider.set(row.providerId, current);
    }

    const locationsByProvider = new Map<string, ProviderDirectoryRecord['locations']>();
    for (const row of locations) {
      const current = locationsByProvider.get(row.providerId) || [];
      current.push({
        province: row.province || null,
        city: row.city || null,
        suburb: row.suburb || null,
        radiusKm: Number(row.radiusKm || 25),
      });
      locationsByProvider.set(row.providerId, current);
    }

    const records: ProviderDirectoryRecord[] = baseRows.map(row => ({
      providerId: row.providerId,
      companyName: row.companyName,
      verificationStatus: row.verificationStatus as 'pending' | 'verified' | 'rejected',
      trustScore: Number(row.trustScore || 0),
      headline: row.headline || null,
      bio: row.bio || null,
      moderationTier: row.moderationTier as 'basic' | 'verified' | 'pro',
      subscriptionTier:
        (row.subscriptionTier as 'directory' | 'directory_explore' | 'ecosystem_pro') ||
        'directory',
      averageRating: Number(row.averageRating || 0),
      reviewCount: Number(row.reviewCount || 0),
      services: servicesByProvider.get(row.providerId) || [],
      locations: locationsByProvider.get(row.providerId) || [],
    }));

    const filtered = records.filter(record => {
      if (input.category && !record.services.some(service => service.category === input.category)) {
        return false;
      }

      if (normalizedSuburb || normalizedCity || normalizedProvince) {
        const locationMatch = record.locations.some(location => {
          const providerProvince = String(location.province || '').toLowerCase();
          const providerCity = String(location.city || '').toLowerCase();
          const providerSuburb = String(location.suburb || '').toLowerCase();
          if (normalizedSuburb && providerSuburb === normalizedSuburb) return true;
          if (normalizedCity && providerCity === normalizedCity) return true;
          if (normalizedProvince && providerProvince === normalizedProvince) return true;
          return false;
        });
        if (!locationMatch) return false;
      }

      if (!normalizedQuery) return true;

      const serviceText = record.services
        .map(service => service.displayName.toLowerCase())
        .join(' ');
      const haystack = [record.companyName, record.headline || '', record.bio || '', serviceText]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    filtered.sort((a, b) => {
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.reviewCount - a.reviewCount;
    });

    return filtered.slice(0, limit);
  }

  async recommendProviders(input: RecommendProvidersInput) {
    const directory = await this.directorySearch({
      category: input.category,
      province: input.province,
      city: input.city,
      suburb: input.suburb,
      limit: Math.max(20, input.limit || 20),
    });

    const cityLower = normalizeText(input.city)?.toLowerCase() || null;
    const suburbLower = normalizeText(input.suburb)?.toLowerCase() || null;
    const stageCategoryBoost = getStageCategoryBoost(input.intentStage, input.category);
    const scored = directory.map(provider => {
      const matchesSuburb = suburbLower
        ? provider.locations.some(
            location => String(location.suburb || '').toLowerCase() === suburbLower,
          )
        : false;
      const matchesCity = cityLower
        ? provider.locations.some(
            location => String(location.city || '').toLowerCase() === cityLower,
          )
        : false;
      const score = scoreProviderCandidate({
        serviceCategory: input.category,
        intentStage: input.intentStage,
        sourceSurface: input.sourceSurface,
        providerVerificationStatus: provider.verificationStatus,
        providerTrustScore: provider.trustScore,
        providerSubscriptionTier: provider.subscriptionTier,
        matchesCity,
        matchesSuburb,
        stageCategoryBoost,
      });

      return {
        provider,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(20, Number(input.limit || 6))));
  }

  async createLeadFromContext(input: CreateServiceLeadInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    let providerIds: string[] = [];
    if (normalizeText(input.providerId)) {
      providerIds = [String(input.providerId)];
    } else {
      const recommendations = await this.recommendProviders({
        category: input.category,
        intentStage: input.intentStage,
        sourceSurface: input.sourceSurface,
        province: input.province || undefined,
        city: input.city || undefined,
        suburb: input.suburb || undefined,
        limit: Math.max(1, Math.min(5, Number(input.requestedProviderCount || 3))),
      });
      providerIds = recommendations.map(item => item.provider.providerId);
    }

    const leadIds: number[] = [];
    const subscriptionMap = new Map<
      string,
      { tier: 'directory' | 'directory_explore' | 'ecosystem_pro' | null }
    >();

    if (providerIds.length > 0) {
      const subscriptionRows = await db
        .select({
          providerId: serviceProviderSubscriptions.providerId,
          tier: serviceProviderSubscriptions.tier,
        })
        .from(serviceProviderSubscriptions)
        .where(inArray(serviceProviderSubscriptions.providerId, providerIds));
      for (const row of subscriptionRows) {
        subscriptionMap.set(row.providerId, { tier: row.tier as any });
      }
    }

    const targetProviderIds = providerIds.length > 0 ? providerIds : [null];
    for (const providerId of targetProviderIds) {
      const tier = providerId
        ? (subscriptionMap.get(providerId)?.tier as
            | 'directory'
            | 'directory_explore'
            | 'ecosystem_pro'
            | null) || 'directory'
        : null;
      const billingEligible = providerId
        ? isBillingEligibleForTier(tier || 'directory', input.sourceSurface)
        : false;

      const insertResult = await db.insert(serviceLeads).values({
        requesterUserId: input.requesterUserId || null,
        providerId: providerId || null,
        serviceCategory: input.category,
        sourceSurface: input.sourceSurface,
        intentStage: input.intentStage,
        propertyId: input.propertyId ?? null,
        listingId: input.listingId ?? null,
        developmentId: input.developmentId ?? null,
        geoProvince: normalizeText(input.province) || null,
        geoCity: normalizeText(input.city) || null,
        geoSuburb: normalizeText(input.suburb) || null,
        notes: normalizeText(input.notes) || null,
        contextJson: input.context || null,
        status: 'new',
        billingEligible: billingEligible ? 1 : 0,
        billingTierSnapshot: tier || null,
      });

      const leadId = Number((insertResult as any)?.[0]?.insertId || 0);
      if (!leadId) continue;
      leadIds.push(leadId);

      await db.insert(serviceLeadEvents).values({
        leadId,
        eventType: 'created',
        actorUserId: input.requesterUserId || null,
        payload: {
          providerId,
          sourceSurface: input.sourceSurface,
          intentStage: input.intentStage,
          billingEligible,
        },
      });
    }

    return {
      leadIds,
      providerIds: providerIds,
      unmatched: providerIds.length === 0,
    };
  }

  async logLeadInteractionEvent(input: {
    leadId: number;
    eventType: LeadInteractionEventType;
    actorUserId: number;
    actorRole?: string | null;
    providerId?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [lead] = await db
      .select({
        id: serviceLeads.id,
        requesterUserId: serviceLeads.requesterUserId,
      })
      .from(serviceLeads)
      .where(eq(serviceLeads.id, input.leadId))
      .limit(1);

    if (!lead) {
      throw new Error('Lead not found');
    }

    const isSuperAdmin = String(input.actorRole || '').toLowerCase() === 'super_admin';
    const isOwner = Number(lead.requesterUserId || 0) === Number(input.actorUserId);
    if (!isSuperAdmin && !isOwner) {
      throw new Error('Forbidden');
    }

    // De-duplicate noisy "shown" events per lead/user over a short window.
    if (input.eventType === 'recommendations_shown') {
      const [recent] = await db
        .select({
          id: serviceLeadEvents.id,
          createdAt: serviceLeadEvents.createdAt,
        })
        .from(serviceLeadEvents)
        .where(
          and(
            eq(serviceLeadEvents.leadId, input.leadId),
            eq(serviceLeadEvents.eventType, input.eventType),
            eq(serviceLeadEvents.actorUserId, input.actorUserId),
          ),
        )
        .orderBy(desc(serviceLeadEvents.createdAt))
        .limit(1);

      if (recent?.createdAt) {
        const eventTime = new Date(String(recent.createdAt)).getTime();
        const now = Date.now();
        if (Number.isFinite(eventTime) && now - eventTime < 10 * 60 * 1000) {
          return { ok: true, deduped: true, eventId: Number(recent.id || 0) };
        }
      }
    }

    const payload: Record<string, unknown> = {};
    if (normalizeText(input.providerId)) payload.providerId = normalizeText(input.providerId);
    if (input.metadata && Object.keys(input.metadata).length > 0) payload.metadata = input.metadata;

    const insertResult = await db.insert(serviceLeadEvents).values({
      leadId: input.leadId,
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      payload: Object.keys(payload).length > 0 ? payload : null,
    });

    return { ok: true, deduped: false, eventId: Number((insertResult as any)?.[0]?.insertId || 0) };
  }

  async updateProviderLeadStatus(input: {
    leadId: number;
    providerId: string;
    status: ServiceLeadStatus;
    actorUserId?: number | null;
    note?: string | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [lead] = await db
      .select({
        id: serviceLeads.id,
        providerId: serviceLeads.providerId,
        status: serviceLeads.status,
      })
      .from(serviceLeads)
      .where(and(eq(serviceLeads.id, input.leadId), eq(serviceLeads.providerId, input.providerId)))
      .limit(1);

    if (!lead) {
      throw new Error('Lead not found for provider');
    }

    await db
      .update(serviceLeads)
      .set({
        status: input.status,
      })
      .where(eq(serviceLeads.id, input.leadId));

    await db.insert(serviceLeadEvents).values({
      leadId: input.leadId,
      eventType: 'status_changed',
      actorUserId: input.actorUserId || null,
      payload: {
        from: lead.status,
        to: input.status,
        note: normalizeText(input.note) || null,
      },
    });
  }

  async listProviderLeads(providerId: string, limit = 50) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select()
      .from(serviceLeads)
      .where(eq(serviceLeads.providerId, providerId))
      .orderBy(desc(serviceLeads.createdAt))
      .limit(Math.max(1, Math.min(100, Number(limit || 50))));
  }

  async listMyExploreVideos(providerId: string, limit = 50) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select()
      .from(serviceExploreVideos)
      .where(eq(serviceExploreVideos.providerId, providerId))
      .orderBy(desc(serviceExploreVideos.submittedAt))
      .limit(Math.max(1, Math.min(100, Number(limit || 50))));
  }

  async getProviderDashboard(providerId: string, days = 30) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const safeDays = Math.max(1, Math.min(365, Number(days || 30)));
    const sinceMs = Date.now() - safeDays * 24 * 60 * 60 * 1000;

    const rows = await db
      .select({
        id: serviceLeads.id,
        status: serviceLeads.status,
        sourceSurface: serviceLeads.sourceSurface,
        createdAt: serviceLeads.createdAt,
      })
      .from(serviceLeads)
      .where(eq(serviceLeads.providerId, providerId))
      .orderBy(desc(serviceLeads.createdAt));

    const filtered = rows.filter(row => {
      const createdAt = new Date(String(row.createdAt || '')).getTime();
      return Number.isFinite(createdAt) && createdAt >= sinceMs;
    });
    const totalsByStatus: Record<string, number> = {};
    const totalsBySource: Record<string, number> = {};
    for (const row of filtered) {
      const statusKey = String(row.status || 'new');
      const sourceKey = String(row.sourceSurface || 'directory');
      totalsByStatus[statusKey] = (totalsByStatus[statusKey] || 0) + 1;
      totalsBySource[sourceKey] = (totalsBySource[sourceKey] || 0) + 1;
    }

    const won = totalsByStatus.won || 0;
    const lost = totalsByStatus.lost || 0;
    const quoted = totalsByStatus.quoted || 0;
    const activePipeline = (totalsByStatus.new || 0) + (totalsByStatus.accepted || 0) + quoted;
    const conversionBase = won + lost + quoted + (totalsByStatus.accepted || 0);
    const conversionRate =
      conversionBase > 0 ? Number(((won / conversionBase) * 100).toFixed(1)) : 0;

    const moderationRows = await db
      .select({
        id: serviceExploreVideos.id,
        moderationStatus: serviceExploreVideos.moderationStatus,
      })
      .from(serviceExploreVideos)
      .where(eq(serviceExploreVideos.providerId, providerId));
    const pendingModeration = moderationRows.filter(row =>
      ['pending', 'reviewing', 'changes_requested'].includes(String(row.moderationStatus)),
    ).length;

    return {
      windowDays: safeDays,
      totalLeads: filtered.length,
      activePipeline,
      conversionRate,
      byStatus: totalsByStatus,
      bySource: totalsBySource,
      pendingModeration,
    };
  }

  async submitExploreVideo(input: {
    providerId: string;
    title: string;
    description?: string | null;
    vertical:
      | 'walkthroughs'
      | 'home_improvement'
      | 'finance_legal'
      | 'moving_lifestyle'
      | 'developer_story';
    submittedByUserId?: number | null;
    exploreContentId?: number | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const insertResult = await db.insert(serviceExploreVideos).values({
      providerId: input.providerId,
      exploreContentId: input.exploreContentId ?? null,
      vertical: input.vertical,
      title: input.title,
      description: normalizeText(input.description) || null,
      moderationStatus: 'pending',
      submittedByUserId: input.submittedByUserId || null,
    });

    const videoId = Number((insertResult as any)?.[0]?.insertId || 0);
    return { videoId };
  }

  async listModerationQueue(limit = 50) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select({
        id: serviceExploreVideos.id,
        providerId: serviceExploreVideos.providerId,
        title: serviceExploreVideos.title,
        vertical: serviceExploreVideos.vertical,
        moderationStatus: serviceExploreVideos.moderationStatus,
        submittedAt: serviceExploreVideos.submittedAt,
      })
      .from(serviceExploreVideos)
      .where(
        inArray(serviceExploreVideos.moderationStatus, [
          'pending',
          'reviewing',
          'changes_requested',
        ]),
      )
      .orderBy(desc(serviceExploreVideos.submittedAt))
      .limit(Math.max(1, Math.min(100, Number(limit || 50))));
  }

  async moderateExploreVideo(input: {
    videoId: number;
    moderationStatus: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'changes_requested';
    reviewedByUserId: number;
    moderationNotes?: string | null;
  }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .update(serviceExploreVideos)
      .set({
        moderationStatus: input.moderationStatus,
        reviewedByUserId: input.reviewedByUserId,
        moderationNotes: normalizeText(input.moderationNotes) || null,
        reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        publishedAt:
          input.moderationStatus === 'approved'
            ? new Date().toISOString().slice(0, 19).replace('T', ' ')
            : null,
      })
      .where(eq(serviceExploreVideos.id, input.videoId));
  }
}

export const servicesEngineService = new ServicesEngineService();
