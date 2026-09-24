import { createHash } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  developers,
  developments,
  listings,
  partners,
  properties,
  SERVICE_CATEGORY_VALUES,
  SERVICE_INTENT_STAGE_VALUES,
  SERVICE_LEAD_EVENT_TYPE_VALUES,
  SERVICE_LEAD_STATUS_VALUES,
  SERVICE_SOURCE_SURFACE_VALUES,
  serviceLeadEvents,
  serviceLeads,
  serviceProviderLocations,
  serviceProviderProfiles,
  serviceProviderServices,
  serviceProviderSubscriptions,
  serviceProviderReviews,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';

export type ServiceCategory = (typeof SERVICE_CATEGORY_VALUES)[number];
export type ServiceIntentStage = (typeof SERVICE_INTENT_STAGE_VALUES)[number];
export type ServiceLeadEventType = (typeof SERVICE_LEAD_EVENT_TYPE_VALUES)[number];
export type ServiceSourceSurface = (typeof SERVICE_SOURCE_SURFACE_VALUES)[number];
export type ServiceLeadStatus = (typeof SERVICE_LEAD_STATUS_VALUES)[number];

type ProviderDirectoryRecord = {
  providerId: number;
  companyName: string;
  logoUrl: string | null;
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

type PublicProviderDirectoryRecord = Omit<
  ProviderDirectoryRecord,
  | 'trustScore'
  | 'moderationTier'
  | 'subscriptionTier'
  | 'averageRating'
  | 'reviewCount'
  | 'locations'
> & {
  locations: Array<Omit<ProviderDirectoryRecord['locations'][number], 'radiusKm'>>;
};

type ProviderProfileResult = {
  providerId: number;
  companyName: string;
  description: string | null;
  logoUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isPublished: boolean;
  publicationStatus: 'published' | 'pending_review' | 'rejected';
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  moderationTier?: 'basic' | 'verified' | 'pro';
  directoryActive?: boolean;
  exploreCreatorActive?: boolean;
  dashboardActive?: boolean;
  subscriptionTier?: 'directory' | 'directory_explore' | 'ecosystem_pro';
  subscriptionStatus?: 'trial' | 'active' | 'past_due' | 'cancelled';
  contactEmail?: string | null;
  contactPhone?: string | null;
  services: Array<{
    id: number;
    category: ServiceCategory;
    code: string;
    displayName: string;
    description: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    currency: string;
  }>;
  locations: Array<{
    id: number;
    countryCode: string;
    province: string | null;
    city: string | null;
    suburb: string | null;
    postalCode: string | null;
    radiusKm: number;
    isPrimary: boolean;
  }>;
  reviews: Array<{
    id: number;
    title: string | null;
    content: string | null;
    createdAt: string;
  }>;
};

type PublicProviderProfileResult = Omit<
  ProviderProfileResult,
  | 'moderationTier'
  | 'directoryActive'
  | 'exploreCreatorActive'
  | 'dashboardActive'
  | 'subscriptionTier'
  | 'subscriptionStatus'
  | 'contactEmail'
  | 'contactPhone'
  | 'locations'
> & {
  locations: Array<Omit<ProviderProfileResult['locations'][number], 'radiusKm'>>;
};

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const SERVICE_REQUEST_CONTEXT_KEYS = new Set([
  'sourceDetail',
  'reasonKey',
  'propertyLinked',
  'serviceCode',
]);

function normalizeServiceRequestContext(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!value) return {};
  if (Array.isArray(value)) throw new Error('Request context is invalid');

  const normalized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!SERVICE_REQUEST_CONTEXT_KEYS.has(key)) {
      throw new Error('Request context is invalid');
    }
    if (key === 'propertyLinked') {
      if (typeof entry !== 'boolean') throw new Error('Request context is invalid');
      normalized[key] = entry;
      continue;
    }
    if (typeof entry !== 'string' || entry.length > 160) {
      throw new Error('Request context is invalid');
    }
    normalized[key] = entry;
  }
  return normalized;
}

function isValidServiceRequestKey(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,120}$/.test(value);
}

function normalizeOptionalPositiveId(
  value: number | null | undefined,
  label: string,
): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${label} context`);
  }
  return value;
}

function newProviderProfileValues(providerId: number) {
  return {
    providerId,
    headline: null,
    bio: null,
    moderationTier: 'basic' as const,
    directoryActive: 0,
    exploreCreatorActive: 0,
    dashboardActive: 1,
    averageRating: '0.00',
    reviewCount: 0,
    metadata: null,
  };
}

function newProviderSubscriptionValues(providerId: number) {
  return {
    providerId,
    tier: 'directory' as const,
    status: 'trial' as const,
    metadata: null,
  };
}

function normalizePublicWebsiteUrl(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? normalized : null;
  } catch {
    return null;
  }
}

function getServiceCodeFromContext(value: unknown): string | null {
  if (typeof value === 'string') {
    try {
      return getServiceCodeFromContext(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const serviceCode = (value as { serviceCode?: unknown }).serviceCode;
  return typeof serviceCode === 'string' && serviceCode.trim() ? serviceCode.trim() : null;
}

export function isProviderDirectoryEligible(input: {
  verificationStatus: string | null | undefined;
  isActive: boolean;
  directoryActive: boolean;
  subscriptionStatus: string | null | undefined;
}): boolean {
  return (
    input.isActive &&
    input.directoryActive &&
    input.verificationStatus === 'verified' &&
    (input.subscriptionStatus === 'trial' || input.subscriptionStatus === 'active')
  );
}

export function providerCoversLocation(
  locations: Array<{
    province: string | null;
    city: string | null;
    suburb: string | null;
  }>,
  location: {
    province?: string | null;
    city?: string | null;
    suburb?: string | null;
  },
): boolean {
  const province = normalizeText(location.province)?.toLowerCase() || null;
  const city = normalizeText(location.city)?.toLowerCase() || null;
  const suburb = normalizeText(location.suburb)?.toLowerCase() || null;

  if (!province && !city && !suburb) return true;

  return locations.some(providerLocation => {
    if (
      province &&
      String(providerLocation.province || '')
        .trim()
        .toLowerCase() !== province
    ) {
      return false;
    }
    if (
      city &&
      String(providerLocation.city || '')
        .trim()
        .toLowerCase() !== city
    ) {
      return false;
    }
    if (
      suburb &&
      String(providerLocation.suburb || '')
        .trim()
        .toLowerCase() !== suburb
    ) {
      return false;
    }
    return true;
  });
}

const LEAD_STATUS_TRANSITIONS: Record<ServiceLeadStatus, ServiceLeadStatus[]> = {
  new: ['accepted', 'expired', 'lost'],
  accepted: ['quoted', 'won', 'lost', 'expired'],
  quoted: ['won', 'lost', 'expired'],
  won: [],
  lost: [],
  expired: [],
};

export function canTransitionServiceLeadStatus(
  from: ServiceLeadStatus,
  to: ServiceLeadStatus,
): boolean {
  return from !== to && LEAD_STATUS_TRANSITIONS[from].includes(to);
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

export type UpsertProviderIdentityInput = {
  userId: number;
  companyName: string;
  description?: string | null;
  logoUrl?: string | null;
};

export type UpsertProviderProfileInput = {
  headline?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
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
  serviceCode?: string;
  province?: string;
  city?: string;
  suburb?: string;
  limit?: number;
};

type CreateServiceLeadInput = {
  requesterUserId?: number | null;
  requesterRole?: string | null;
  requestKey: string;
  providerId: number;

  category: ServiceCategory;
  sourceSurface: ServiceSourceSurface;
  intentStage: ServiceIntentStage;
  propertyId?: number | null;
  listingId?: number | null;
  developmentId?: number | null;
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
  notes: string;
  serviceCode: string;
  context?: Record<string, unknown> | null;
};

export class ServicesEngineService {
  async getProviderById(providerId: number) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [provider] = await db.select().from(partners).where(eq(partners.id, providerId)).limit(1);

    return provider || null;
  }

  async getProviderByUserId(userId: number) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [provider] = await db.select().from(partners).where(eq(partners.userId, userId)).limit(1);

    return provider || null;
  }

  private async getProviderProfile(
    providerId: number,
    includePrivate: boolean,
  ): Promise<ProviderProfileResult | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [base] = await db
      .select({
        providerId: partners.id,
        providerUserId: partners.userId,
        companyName: partners.companyName,
        description: partners.description,
        logoUrl: partners.logoUrl,
        verificationStatus: partners.verificationStatus,
        isActive: partners.isActive,
        profileHeadline: serviceProviderProfiles.headline,
        profileBio: serviceProviderProfiles.bio,
        profileWebsiteUrl: serviceProviderProfiles.websiteUrl,
        profileContactEmail: serviceProviderProfiles.contactEmail,
        profileContactPhone: serviceProviderProfiles.contactPhone,
        profileModerationTier: serviceProviderProfiles.moderationTier,
        directoryActive: serviceProviderProfiles.directoryActive,
        exploreCreatorActive: serviceProviderProfiles.exploreCreatorActive,
        dashboardActive: serviceProviderProfiles.dashboardActive,
        subscriptionTier: serviceProviderSubscriptions.tier,
        subscriptionStatus: serviceProviderSubscriptions.status,
      })
      .from(partners)
      .leftJoin(serviceProviderProfiles, eq(serviceProviderProfiles.providerId, partners.id))
      .leftJoin(
        serviceProviderSubscriptions,
        eq(serviceProviderSubscriptions.providerId, partners.id),
      )
      .where(eq(partners.id, providerId))
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
        title: serviceProviderReviews.title,

        content: serviceProviderReviews.content,
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

    const servicesResult = services.map(item => ({
      id: Number(item.id),
      category: item.category as ServiceCategory,
      code: item.code,
      displayName: item.displayName,
      description: item.description || null,
      minPrice:
        item.minPrice !== null && item.minPrice !== undefined ? Number(item.minPrice) : null,
      maxPrice:
        item.maxPrice !== null && item.maxPrice !== undefined ? Number(item.maxPrice) : null,
      currency: item.currency,
    }));
    const locationsResult = locations.map(item => ({
      id: Number(item.id),
      countryCode: item.countryCode,
      province: item.province || null,
      city: item.city || null,
      suburb: item.suburb || null,
      postalCode: item.postalCode || null,
      radiusKm: Number(item.radiusKm || 25),
      isPrimary: Number(item.isPrimary || 0) === 1,
    }));
    const isPublished =
      isProviderDirectoryEligible({
        verificationStatus: base.verificationStatus,
        isActive: Number(base.isActive || 0) === 1,
        directoryActive: Number(base.directoryActive || 0) === 1,
        subscriptionStatus: base.subscriptionStatus,
      }) &&
      servicesResult.length > 0 &&
      locationsResult.length > 0;

    const common: ProviderProfileResult = {
      providerId: Number(base.providerId),
      companyName: base.companyName,
      description: base.description || null,
      logoUrl: base.logoUrl || null,
      verificationStatus: base.verificationStatus,
      isPublished,
      publicationStatus:
        base.verificationStatus === 'rejected'
          ? 'rejected'
          : isPublished
            ? 'published'
            : 'pending_review',
      headline: base.profileHeadline || null,
      bio: base.profileBio || null,
      websiteUrl: normalizePublicWebsiteUrl(base.profileWebsiteUrl),

      services: servicesResult,

      locations: locationsResult,
      reviews: reviewRows.map(item => ({
        id: Number(item.id),
        title: item.title || null,

        content: item.content || null,
        createdAt: String(item.createdAt),
      })),
    };

    if (!includePrivate) return common;

    return {
      ...common,
      moderationTier: base.profileModerationTier || 'basic',
      directoryActive: Number(base.directoryActive || 0) === 1,
      exploreCreatorActive: Number(base.exploreCreatorActive || 0) === 1,
      dashboardActive: Number(base.dashboardActive || 0) === 1,
      subscriptionTier: base.subscriptionTier || 'directory',
      subscriptionStatus: base.subscriptionStatus || 'trial',
      contactEmail: base.profileContactEmail || null,
      contactPhone: base.profileContactPhone || null,
    };
  }

  async getProviderPublicProfile(providerId: number): Promise<PublicProviderProfileResult | null> {
    const profile = await this.getProviderProfile(providerId, false);
    if (!profile?.isPublished) return null;

    return {
      providerId: profile.providerId,
      companyName: profile.companyName,
      description: profile.description,
      logoUrl: profile.logoUrl,
      verificationStatus: profile.verificationStatus,
      isPublished: profile.isPublished,
      publicationStatus: profile.publicationStatus,
      headline: profile.headline,
      bio: profile.bio,
      websiteUrl: profile.websiteUrl,
      services: profile.services,

      locations: profile.locations.map(location => ({
        id: location.id,
        countryCode: location.countryCode,
        province: location.province,
        city: location.city,
        suburb: location.suburb,
        postalCode: location.postalCode,
        isPrimary: location.isPrimary,
      })),

      reviews: profile.reviews,
    };
  }

  async getProviderReviews(providerId: number, limit = 50) {
    const profile = await this.getProviderPublicProfile(providerId);
    if (!profile) return [];

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const reviews = await db
      .select({
        id: serviceProviderReviews.id,
        title: serviceProviderReviews.title,
        content: serviceProviderReviews.content,
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

    return reviews.map(review => ({
      ...review,
      id: Number(review.id),
      createdAt: String(review.createdAt),
    }));
  }

  async getMyProviderProfile(userId: number) {
    const provider = await this.getProviderByUserId(userId);
    if (!provider?.id) return null;
    return this.getProviderProfile(Number(provider.id), true);
  }

  async upsertProviderIdentity(input: UpsertProviderIdentityInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const existing = await this.getProviderByUserId(input.userId);
    if (existing?.id) {
      const providerId = Number(existing.id);
      await db.transaction(async tx => {
        const [profile] = await tx
          .select({ id: serviceProviderProfiles.id })
          .from(serviceProviderProfiles)
          .where(eq(serviceProviderProfiles.providerId, providerId))
          .limit(1);
        if (!profile) {
          await tx.insert(serviceProviderProfiles).values(newProviderProfileValues(providerId));
        }

        const [subscription] = await tx
          .select({ id: serviceProviderSubscriptions.id })
          .from(serviceProviderSubscriptions)
          .where(eq(serviceProviderSubscriptions.providerId, providerId))
          .limit(1);
        if (!subscription) {
          await tx
            .insert(serviceProviderSubscriptions)
            .values(newProviderSubscriptionValues(providerId));
        }
      });
      return this.getProviderById(providerId);
    }

    let providerId = 0;
    await db.transaction(async tx => {
      const insertResult = await tx.insert(partners).values({
        userId: input.userId,
        companyName: input.companyName,
        description: normalizeText(input.description) || null,
        logoUrl: normalizeText(input.logoUrl) || null,
        verificationStatus: 'pending',
        trustScore: '50.00',
        approvedContentCount: 0,
        isActive: 1,
      });

      providerId = Number((insertResult as any)?.[0]?.insertId || 0);
      if (!providerId) {
        throw new Error('Failed to create canonical Service Partner identity.');
      }

      await tx.insert(serviceProviderProfiles).values(newProviderProfileValues(providerId));
      await tx
        .insert(serviceProviderSubscriptions)
        .values(newProviderSubscriptionValues(providerId));
    });

    return this.getProviderById(providerId);
  }

  async upsertProviderProfile(providerId: number, input: UpsertProviderProfileInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [existingProfile] = await db
      .select()
      .from(serviceProviderProfiles)
      .where(eq(serviceProviderProfiles.providerId, providerId))
      .limit(1);

    const profileValues = {
      providerId,
      headline:
        input.headline === undefined
          ? existingProfile?.headline || null
          : normalizeText(input.headline) || null,
      bio:
        input.bio === undefined ? existingProfile?.bio || null : normalizeText(input.bio) || null,
      websiteUrl:
        input.websiteUrl === undefined
          ? existingProfile?.websiteUrl || null
          : normalizeText(input.websiteUrl) || null,
      contactEmail:
        input.contactEmail === undefined
          ? existingProfile?.contactEmail || null
          : normalizeText(input.contactEmail) || null,
      contactPhone:
        input.contactPhone === undefined
          ? existingProfile?.contactPhone || null
          : normalizeText(input.contactPhone) || null,
      moderationTier: existingProfile?.moderationTier || 'basic',
      directoryActive: existingProfile ? Number(existingProfile.directoryActive || 0) : 0,
      exploreCreatorActive: existingProfile ? Number(existingProfile.exploreCreatorActive || 0) : 0,
      dashboardActive: existingProfile ? Number(existingProfile.dashboardActive || 0) : 1,
      metadata: input.metadata === undefined ? (existingProfile?.metadata ?? null) : input.metadata,
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

  async replaceProviderServices(providerId: number, services: ReplaceProviderServiceInput[]) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const rows = services
      .filter(item => normalizeText(item.code) && normalizeText(item.displayName))
      .map(item => {
        const minPrice = item.minPrice ?? null;
        const maxPrice = item.maxPrice ?? null;
        const currency = (normalizeText(item.currency) || 'ZAR').toUpperCase();
        if (currency !== 'ZAR') throw new Error('Service prices must use ZAR');
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
          throw new Error('Minimum price must not exceed maximum price');
        }
        return {
          providerId,
          serviceCategory: item.category,
          serviceCode: String(item.code).trim(),
          displayName: String(item.displayName).trim(),
          description: normalizeText(item.description) || null,
          minPrice,
          maxPrice,
          currency,
          isActive: item.isActive === false ? 0 : 1,
        };
      });

    const serviceCodes = new Set<string>();
    for (const row of rows) {
      const normalizedCode = row.serviceCode.toLowerCase();
      if (serviceCodes.has(normalizedCode)) {
        throw new Error('Service codes must be unique within a provider profile');
      }
      serviceCodes.add(normalizedCode);
    }

    await db.transaction(async tx => {
      await tx
        .delete(serviceProviderServices)
        .where(eq(serviceProviderServices.providerId, providerId));
      if (rows.length > 0) {
        await tx.insert(serviceProviderServices).values(rows);
      }
    });

    return db
      .select()
      .from(serviceProviderServices)
      .where(eq(serviceProviderServices.providerId, providerId))
      .orderBy(serviceProviderServices.displayName);
  }

  async replaceProviderLocations(providerId: number, locations: ReplaceProviderLocationInput[]) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

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

    await db.transaction(async tx => {
      await tx
        .delete(serviceProviderLocations)
        .where(eq(serviceProviderLocations.providerId, providerId));
      if (normalized.length > 0) {
        await tx.insert(serviceProviderLocations).values(normalized);
      }
    });

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
    const normalizedServiceCode = normalizeText(input.serviceCode)?.toLowerCase() || null;
    const normalizedProvince = normalizeText(input.province)?.toLowerCase() || null;
    const normalizedCity = normalizeText(input.city)?.toLowerCase() || null;
    const normalizedSuburb = normalizeText(input.suburb)?.toLowerCase() || null;

    const baseRows = await db
      .select({
        providerId: partners.id,
        companyName: partners.companyName,
        logoUrl: partners.logoUrl,
        verificationStatus: partners.verificationStatus,
        trustScore: partners.trustScore,
        isActive: partners.isActive,
        headline: serviceProviderProfiles.headline,
        bio: serviceProviderProfiles.bio,
        moderationTier: serviceProviderProfiles.moderationTier,
        averageRating: serviceProviderProfiles.averageRating,
        reviewCount: serviceProviderProfiles.reviewCount,
        subscriptionTier: serviceProviderSubscriptions.tier,
        subscriptionStatus: serviceProviderSubscriptions.status,
      })
      .from(partners)
      .innerJoin(serviceProviderProfiles, eq(serviceProviderProfiles.providerId, partners.id))
      .leftJoin(
        serviceProviderSubscriptions,
        eq(serviceProviderSubscriptions.providerId, partners.id),
      )
      .where(
        and(
          eq(partners.isActive, 1),
          eq(partners.verificationStatus, 'verified'),
          eq(serviceProviderProfiles.directoryActive, 1),
          inArray(serviceProviderSubscriptions.status, ['trial', 'active']),
        ),
      )
      .orderBy(partners.companyName, partners.id)

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

    const servicesByProvider = new Map<number, ProviderDirectoryRecord['services']>();
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

    const locationsByProvider = new Map<number, ProviderDirectoryRecord['locations']>();
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
      logoUrl: row.logoUrl || null,
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
      if (record.services.length === 0 || record.locations.length === 0) return false;

      if (input.category || normalizedServiceCode) {
        const matchingService = record.services.find(
          service =>
            (!input.category || service.category === input.category) &&
            (!normalizedServiceCode || service.code.toLowerCase() === normalizedServiceCode),
        );
        if (!matchingService) return false;
      }

      if (
        !providerCoversLocation(record.locations, {
          province: normalizedProvince,
          city: normalizedCity,
          suburb: normalizedSuburb,
        })
      ) {
        return false;
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
      const companyComparison = a.companyName.localeCompare(b.companyName);
      return companyComparison || a.providerId - b.providerId;
    });

    return filtered.slice(0, limit);
  }

  async publicDirectorySearch(
    input: DirectorySearchInput,
  ): Promise<PublicProviderDirectoryRecord[]> {
    const records = await this.directorySearch(input);
    return records.map(record => ({
      providerId: record.providerId,
      companyName: record.companyName,
      logoUrl: record.logoUrl,
      verificationStatus: record.verificationStatus,
      headline: record.headline,
      bio: record.bio,
      services: record.services,

      locations: record.locations.map(location => ({
        province: location.province,
        city: location.city,
        suburb: location.suburb,
      })),
    }));
  }

  async createLeadFromContext(input: CreateServiceLeadInput) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    if (!Number.isInteger(input.requesterUserId) || Number(input.requesterUserId) <= 0) {
      throw new Error('Authenticated requester required');
    }
    const requesterUserId = Number(input.requesterUserId);

    if (!Number.isInteger(input.providerId) || Number(input.providerId) <= 0) {
      throw new Error('Select a provider before submitting a service request');
    }

    const providerId = Number(input.providerId);
    const requestKey = normalizeText(input.requestKey);
    if (!requestKey || !isValidServiceRequestKey(requestKey)) {
      throw new Error('A stable request key is required');
    }
    const requestId = `sv1:${createHash('sha256')
      .update(JSON.stringify([requesterUserId, requestKey]))
      .digest('hex')}`;
    if (input.sourceSurface === 'explore') {
      throw new Error('Explore is not available for service requests');
    }
    if (input.intentStage === 'agent_dashboard' && input.sourceSurface !== 'agent_dashboard') {
      throw new Error('Agent dashboard attribution requires the agent dashboard surface');
    }
    if (input.intentStage === 'developer_listing_wizard' && !input.developmentId) {
      throw new Error('Developer listing attribution requires a development');
    }
    const requesterRole = String(input.requesterRole || '').toLowerCase();
    if (
      (input.sourceSurface === 'agent_dashboard' || input.intentStage === 'agent_dashboard') &&
      !['agent', 'agency_admin', 'super_admin'].includes(requesterRole)
    ) {
      throw new Error('Agent dashboard attribution is not available for this account');
    }
    if (
      input.intentStage === 'developer_listing_wizard' &&
      !['property_developer', 'super_admin'].includes(requesterRole)
    ) {
      throw new Error('Developer listing attribution is not available for this account');
    }

    const propertyId = normalizeOptionalPositiveId(input.propertyId, 'property');
    const listingId = normalizeOptionalPositiveId(input.listingId, 'listing');
    const developmentId = normalizeOptionalPositiveId(input.developmentId, 'development');
    if (
      input.context &&
      Object.prototype.hasOwnProperty.call(input.context, 'propertyLinked') &&
      input.context.propertyLinked !== Boolean(propertyId)
    ) {
      throw new Error('Request context is unavailable');
    }
    const requestedServiceCode = normalizeText(input.serviceCode);

    const notes = normalizeText(input.notes);
    const province = normalizeText(input.province);
    const city = normalizeText(input.city);
    const suburb = normalizeText(input.suburb);
    if (!requestedServiceCode) {
      throw new Error('Select a service before submitting a service request');
    }
    if (!notes) {
      throw new Error('A project description is required');
    }
    if (!province && !city && !suburb) {
      throw new Error('A request area is required');
    }

    const requestedContext = {
      ...normalizeServiceRequestContext(input.context),
      serviceCode: requestedServiceCode,
      requestKey,
    };
    const resultForLead = (id: number) => ({
      leadId: id,
      leadIds: [id],
      providerId,
      providerIds: [providerId],
      unmatched: false,
    });
    const findExistingRequest = async (executor: any, lock = false) => {
      let query = executor
        .select({
          id: serviceLeads.id,
          requesterUserId: serviceLeads.requesterUserId,
          providerId: serviceLeads.providerId,
          serviceCategory: serviceLeads.serviceCategory,
          sourceSurface: serviceLeads.sourceSurface,
          intentStage: serviceLeads.intentStage,
          contextJson: serviceLeads.contextJson,
          notes: serviceLeads.notes,
          geoProvince: serviceLeads.geoProvince,
          geoCity: serviceLeads.geoCity,
          geoSuburb: serviceLeads.geoSuburb,
          propertyId: serviceLeads.propertyId,
          listingId: serviceLeads.listingId,
          developmentId: serviceLeads.developmentId,
        })
        .from(serviceLeads)
        .where(eq(serviceLeads.requestId, requestId))
        .limit(1);
      if (lock) query = query.for('update');
      const [existing] = await query;
      return existing;
    };

    const matchesExistingRequest = (existing: any) =>
      Boolean(existing) &&
      Number(existing.requesterUserId || 0) === requesterUserId &&
      Number(existing.providerId || 0) === providerId &&
      existing.serviceCategory === input.category &&
      existing.sourceSurface === input.sourceSurface &&
      existing.intentStage === input.intentStage &&
      normalizeText(existing.notes) === notes &&
      normalizeText(existing.geoProvince) === province &&
      normalizeText(existing.geoCity) === city &&
      normalizeText(existing.geoSuburb) === suburb &&
      Number(existing.propertyId || 0) === Number(propertyId || 0) &&
      Number(existing.listingId || 0) === Number(listingId || 0) &&
      Number(existing.developmentId || 0) === Number(developmentId || 0) &&
      getServiceCodeFromContext(existing.contextJson)?.toLowerCase() ===
        requestedServiceCode.toLowerCase();

    const existingBeforeValidation = await findExistingRequest(db);
    if (existingBeforeValidation) {
      if (!matchesExistingRequest(existingBeforeValidation)) {
        throw new Error('Request key has already been used');
      }
      return resultForLead(Number(existingBeforeValidation.id));
    }

    const contextUnavailable = 'Request context is unavailable';

    if (propertyId) {
      const [property] = await db
        .select({
          id: properties.id,
          sourceListingId: properties.sourceListingId,
          developmentId: properties.developmentId,
          ownerId: properties.ownerId,
          status: properties.status,
        })
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);
      const propertyAccessible =
        property &&
        (property.status === 'published' ||
          property.status === 'available' ||
          Number(property.ownerId || 0) === requesterUserId);
      if (!propertyAccessible) throw new Error(contextUnavailable);
      if (listingId && Number(property.sourceListingId || 0) !== listingId) {
        throw new Error(contextUnavailable);
      }
      if (developmentId && Number(property.developmentId || 0) !== developmentId) {
        throw new Error(contextUnavailable);
      }
    }

    if (listingId) {
      const [listing] = await db
        .select({ id: listings.id, ownerId: listings.ownerId, status: listings.status })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);
      const listingAccessible =
        listing &&
        (listing.status === 'published' || Number(listing.ownerId || 0) === requesterUserId);
      if (!listingAccessible) throw new Error(contextUnavailable);
    }

    if (developmentId) {
      const [development] = await db
        .select({
          id: developments.id,
          isPublished: developments.isPublished,
          approvalStatus: developments.approvalStatus,
          developerUserId: developers.userId,
        })
        .from(developments)
        .leftJoin(developers, eq(developers.id, developments.developerId))
        .where(eq(developments.id, developmentId))
        .limit(1);
      const developmentAccessible =
        development &&
        ((Number(development.isPublished || 0) === 1 &&
          development.approvalStatus === 'approved') ||
          Number(development.developerUserId || 0) === requesterUserId);
      if (!developmentAccessible) throw new Error(contextUnavailable);
    }

    if (listingId && developmentId) {
      const [linkedProperty] = await db
        .select({ id: properties.id, developmentId: properties.developmentId })
        .from(properties)
        .where(eq(properties.sourceListingId, listingId))
        .limit(1);
      if (!linkedProperty || Number(linkedProperty.developmentId || 0) !== developmentId) {
        throw new Error(contextUnavailable);
      }
    }

    const profile = await this.getProviderPublicProfile(providerId);
    if (!profile) {
      throw new Error('This provider is not currently available');
    }

    const matchingService = profile.services.find(
      service =>
        service.category === input.category &&
        service.code.toLowerCase() === requestedServiceCode.toLowerCase(),
    );
    if (!matchingService) {
      throw new Error('This provider does not offer the selected service');
    }
    const serviceCode = matchingService.code;

    if (
      !providerCoversLocation(profile.locations, {
        province,
        city,
        suburb,
      })
    ) {
      throw new Error('This provider does not list coverage for the selected area');
    }

    const context = {
      ...requestedContext,
      serviceCode,
    };

    let leadId = 0;
    await db.transaction(async tx => {
      const [requester] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, requesterUserId))
        .limit(1)
        .for('update');
      if (!requester) throw new Error('Authenticated requester required');

      const existingLead = await findExistingRequest(tx, true);

      if (existingLead) {
        if (!matchesExistingRequest(existingLead)) {
          throw new Error('Request key has already been used');
        }
        leadId = Number(existingLead.id);
        return;
      }

      const insertResult = await tx.insert(serviceLeads).values({
        requestId,
        requesterUserId,
        providerId,
        serviceCategory: input.category,
        sourceSurface: input.sourceSurface,
        intentStage: input.intentStage,
        propertyId,
        listingId,
        developmentId,
        geoProvince: province,
        geoCity: city,
        geoSuburb: suburb,
        notes,
        contextJson: Object.keys(context).length > 0 ? context : null,
        status: 'new',
        billingEligible: 0,
        billingTierSnapshot: null,
      });

      leadId = Number((insertResult as any)?.[0]?.insertId || 0);
      if (!leadId) {
        throw new Error('The service request could not be saved');
      }

      await tx.insert(serviceLeadEvents).values({
        leadId,
        eventType: 'created',
        actorUserId: requesterUserId,
        payload: {
          providerId,
          sourceSurface: input.sourceSurface,
          intentStage: input.intentStage,
          serviceCode,
        },
      });
    });

    return {
      leadId,
      leadIds: [leadId],
      providerId,
      providerIds: [providerId],
      unmatched: false,
    };
  }

  async updateProviderLeadStatus(input: {
    leadId: number;
    providerId: number;
    status: ServiceLeadStatus;
    actorUserId?: number | null;
    note?: string | null;
  }) {
    const note = normalizeText(input.note);
    if (!note) {
      throw new Error('A response note is required');
    }

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.transaction(async tx => {
      const [lead] = await tx
        .select({
          id: serviceLeads.id,
          providerId: serviceLeads.providerId,
          status: serviceLeads.status,
        })
        .from(serviceLeads)
        .where(
          and(eq(serviceLeads.id, input.leadId), eq(serviceLeads.providerId, input.providerId)),
        )
        .limit(1);

      if (!lead) {
        throw new Error('Lead not found for provider');
      }

      const currentStatus = lead.status as ServiceLeadStatus;
      if (!canTransitionServiceLeadStatus(currentStatus, input.status)) {
        throw new Error('Invalid lead status transition');
      }

      if (currentStatus === input.status) {
        throw new Error('Lead status is already current');
      }

      const updateResult = await tx
        .update(serviceLeads)
        .set({
          status: input.status,
        })
        .where(
          and(
            eq(serviceLeads.id, input.leadId),
            eq(serviceLeads.providerId, input.providerId),
            eq(serviceLeads.status, currentStatus),
          ),
        );
      const affectedRows = Number(
        (updateResult as any)?.affectedRows ?? (updateResult as any)?.[0]?.affectedRows ?? 0,
      );
      if (affectedRows !== 1) {
        throw new Error('Lead status changed; refresh and try again');
      }

      const eventType: ServiceLeadEventType =
        input.status === 'accepted'
          ? 'accepted'
          : input.status === 'quoted'
            ? 'quoted'
            : input.status === 'won'
              ? 'won'
              : input.status === 'lost'
                ? 'lost'
                : 'status_changed';

      await tx.insert(serviceLeadEvents).values({
        leadId: input.leadId,
        eventType,
        actorUserId: input.actorUserId || null,
        payload: {
          from: currentStatus,
          to: input.status,
          note,
        },
      });
    });
  }

  async getServiceLeadForViewer(input: { leadId: number; userId: number; role?: string | null }) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [lead] = await db
      .select({
        id: serviceLeads.id,
        requesterUserId: serviceLeads.requesterUserId,
        providerId: serviceLeads.providerId,
        serviceCategory: serviceLeads.serviceCategory,
        sourceSurface: serviceLeads.sourceSurface,
        intentStage: serviceLeads.intentStage,
        propertyId: serviceLeads.propertyId,
        listingId: serviceLeads.listingId,
        developmentId: serviceLeads.developmentId,
        geoProvince: serviceLeads.geoProvince,
        geoCity: serviceLeads.geoCity,
        geoSuburb: serviceLeads.geoSuburb,
        notes: serviceLeads.notes,
        contextJson: serviceLeads.contextJson,
        status: serviceLeads.status,
        createdAt: serviceLeads.createdAt,
        updatedAt: serviceLeads.updatedAt,
        requesterName: users.name,
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        requesterEmail: users.email,
        requesterPhone: users.phone,
        providerUserId: partners.userId,
        providerCompanyName: partners.companyName,
      })
      .from(serviceLeads)
      .leftJoin(users, eq(users.id, serviceLeads.requesterUserId))
      .leftJoin(partners, eq(partners.id, serviceLeads.providerId))
      .where(eq(serviceLeads.id, input.leadId))

      .limit(1);

    if (!lead) throw new Error('Lead not found');

    const isRequester = Number(lead.requesterUserId || 0) === Number(input.userId);
    const isServiceProviderRole = String(input.role || '').toLowerCase() === 'service_provider';
    const isProvider =
      isServiceProviderRole && Number(lead.providerUserId || 0) === Number(input.userId);
    const isAdmin = String(input.role || '').toLowerCase() === 'super_admin';
    if (!isRequester && !isProvider && !isAdmin) {
      throw new Error('Forbidden');
    }

    const requesterName =
      [lead.requesterFirstName, lead.requesterLastName].filter(Boolean).join(' ').trim() ||
      lead.requesterName ||
      'Registered Property Listify user';
    const provider = lead.providerId
      ? {
          providerId: Number(lead.providerId),
          companyName: lead.providerCompanyName || 'Service provider',
        }
      : null;

    const providerProfile = lead.providerId
      ? await this.getProviderPublicProfile(Number(lead.providerId))
      : null;
    const [latestResponse] = await db
      .select({
        eventType: serviceLeadEvents.eventType,
        payload: serviceLeadEvents.payload,
        createdAt: serviceLeadEvents.createdAt,
      })
      .from(serviceLeadEvents)
      .where(
        and(
          eq(serviceLeadEvents.leadId, input.leadId),
          inArray(serviceLeadEvents.eventType, [
            'accepted',
            'quoted',
            'won',
            'lost',
            'status_changed',
          ]),
        ),
      )
      .orderBy(desc(serviceLeadEvents.createdAt), desc(serviceLeadEvents.id))
      .limit(1);
    const responsePayload =
      latestResponse?.payload && typeof latestResponse.payload === 'object'
        ? (latestResponse.payload as { note?: unknown })
        : null;
    const providerResponseNote =
      responsePayload?.note && typeof responsePayload.note === 'string'
        ? responsePayload.note.trim() || null
        : null;

    return {
      id: Number(lead.id),
      serviceCategory: lead.serviceCategory,
      serviceCode: getServiceCodeFromContext(lead.contextJson),
      sourceSurface: lead.sourceSurface,

      intentStage: lead.intentStage,
      propertyId: lead.propertyId ? Number(lead.propertyId) : null,
      listingId: lead.listingId ? Number(lead.listingId) : null,
      developmentId: lead.developmentId ? Number(lead.developmentId) : null,
      location: {
        province: lead.geoProvince || null,
        city: lead.geoCity || null,
        suburb: lead.geoSuburb || null,
      },
      notes: lead.notes || null,
      context: isProvider || isAdmin ? lead.contextJson || null : null,

      status: lead.status,
      createdAt: String(lead.createdAt),
      updatedAt: String(lead.updatedAt),
      requester:
        isProvider || isAdmin
          ? {
              name: requesterName,
              email: lead.requesterEmail || null,
              phone: lead.requesterPhone || null,
            }
          : { name: requesterName },
      providerResponse: {
        status: lead.status,
        note: providerResponseNote,
        createdAt: latestResponse?.createdAt ? String(latestResponse.createdAt) : null,
      },
      provider: providerProfile
        ? {
            ...provider,
            logoUrl: providerProfile.logoUrl,
            services: providerProfile.services,
            locations: providerProfile.locations,
            reviews: providerProfile.reviews,
          }
        : provider,
    };
  }

  async listProviderLeads(providerId: number, limit = 50) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const leads = await db
      .select({
        id: serviceLeads.id,
        serviceCategory: serviceLeads.serviceCategory,
        sourceSurface: serviceLeads.sourceSurface,
        intentStage: serviceLeads.intentStage,
        propertyId: serviceLeads.propertyId,
        listingId: serviceLeads.listingId,
        developmentId: serviceLeads.developmentId,
        geoProvince: serviceLeads.geoProvince,
        geoCity: serviceLeads.geoCity,
        geoSuburb: serviceLeads.geoSuburb,
        notes: serviceLeads.notes,
        contextJson: serviceLeads.contextJson,
        status: serviceLeads.status,
        createdAt: serviceLeads.createdAt,
        updatedAt: serviceLeads.updatedAt,
        requesterName: users.name,
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        requesterEmail: users.email,
        requesterPhone: users.phone,
      })
      .from(serviceLeads)
      .leftJoin(users, eq(users.id, serviceLeads.requesterUserId))
      .where(eq(serviceLeads.providerId, providerId))
      .orderBy(desc(serviceLeads.createdAt))
      .limit(Math.max(1, Math.min(100, Number(limit || 50))));

    return leads.map(lead => ({
      ...lead,
      id: Number(lead.id),
      serviceCode: getServiceCodeFromContext(lead.contextJson),
      requesterName:
        [lead.requesterFirstName, lead.requesterLastName].filter(Boolean).join(' ').trim() ||
        lead.requesterName ||
        'Registered Property Listify user',
      requesterEmail: lead.requesterEmail || null,
      requesterPhone: lead.requesterPhone || null,
      createdAt: String(lead.createdAt),
      updatedAt: String(lead.updatedAt),
    }));
  }

  async getProviderDashboard(providerId: number, days = 30) {
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

    return {
      windowDays: safeDays,
      totalLeads: filtered.length,
      activePipeline,
      conversionRate,
      byStatus: totalsByStatus,
      bySource: totalsBySource,
    };
  }
}

export const servicesEngineService = new ServicesEngineService();
