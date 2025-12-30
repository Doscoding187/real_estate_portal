/**
 * Developer Brand Profile Service
 * 
 * Handles platform-owned brand profile CRUD operations.
 * IMPORTANT: This service manages developerBrandProfiles (platform-owned brands),
 * NOT the developers table (subscriber accounts).
 * 
 * Ownership Semantics:
 * - ownerType='platform' = seeded or unmanaged listing
 * - ownerType='developer' = subscriber-managed with dashboard access
 */

import { db } from '../db';
import { developerBrandProfiles, developments, leads } from '../../drizzle/schema';
import { eq, and, desc, sql, like, or, isNull } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface CreateBrandProfileInput {
  brandName: string;
  slug?: string;
  logoUrl?: string | null;
  about?: string | null;
  foundedYear?: number | null;
  headOfficeLocation?: string | null;
  operatingProvinces?: string[];
  propertyFocus?: string[];
  websiteUrl?: string | null;
  publicContactEmail?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  sourceAttribution?: string | null;
  isVisible?: boolean;
  isContactVerified?: boolean;
  createdBy?: number;
}

export interface UpdateBrandProfileInput {
  brandName?: string;
  slug?: string;
  logoUrl?: string | null;
  about?: string | null;
  foundedYear?: number | null;
  headOfficeLocation?: string | null;
  operatingProvinces?: string[];
  propertyFocus?: string[];
  websiteUrl?: string | null;
  publicContactEmail?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  sourceAttribution?: string | null;
  profileType?: 'industry_reference' | 'verified_partner';
  isSubscriber?: boolean;
  isClaimable?: boolean;
  isVisible?: boolean;
  isContactVerified?: boolean;
  linkedDeveloperAccountId?: number | null;
  ownerType?: 'platform' | 'developer';
  claimRequestedAt?: string | null;
}

export interface BrandProfileFilters {
  brandTier?: 'national' | 'regional' | 'boutique';
  isSubscriber?: boolean;
  isVisible?: boolean;
  ownerType?: 'platform' | 'developer';
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new platform-owned brand profile
 */
async function createBrandProfile(input: CreateBrandProfileInput) {
  const slug = input.slug || generateSlug(input.brandName);
  
  const [result] = await db.insert(developerBrandProfiles).values({
    brandName: input.brandName,
    slug,
    logoUrl: input.logoUrl || null,
    about: input.about || null,
    foundedYear: input.foundedYear || null,
    headOfficeLocation: input.headOfficeLocation || null,
    operatingProvinces: input.operatingProvinces || [],
    propertyFocus: input.propertyFocus || [],
    websiteUrl: input.websiteUrl || null,
    publicContactEmail: input.publicContactEmail || null,
    brandTier: input.brandTier || 'regional',
    sourceAttribution: input.sourceAttribution || null,
    profileType: 'industry_reference',
    isSubscriber: 0,
    isClaimable: 1,
    isVisible: input.isVisible !== false ? 1 : 0,
    isContactVerified: input.isContactVerified ? 1 : 0,
    ownerType: 'platform',
    totalLeadsReceived: 0,
    unclaimedLeadCount: 0,
    createdBy: input.createdBy || null,
  });

  return { id: result.insertId, slug };
}

/**
 * Get brand profile by ID
 */
async function getBrandProfileById(id: number) {
  const [profile] = await db
    .select()
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.id, id))
    .limit(1);

  return profile || null;
}

/**
 * Get brand profile by slug (public lookup)
 */
async function getBrandProfileBySlug(slug: string) {
  const [profile] = await db
    .select()
    .from(developerBrandProfiles)
    .where(
      and(
        eq(developerBrandProfiles.slug, slug),
        eq(developerBrandProfiles.isVisible, 1)
      )
    )
    .limit(1);

  return profile || null;
}

/**
 * List brand profiles with filtering
 */
async function listBrandProfiles(filters: BrandProfileFilters = {}) {
  const conditions = [];

  // Only show visible profiles by default for public queries
  if (filters.isVisible !== false) {
    conditions.push(eq(developerBrandProfiles.isVisible, 1));
  }

  if (filters.brandTier) {
    conditions.push(eq(developerBrandProfiles.brandTier, filters.brandTier));
  }

  if (filters.isSubscriber !== undefined) {
    conditions.push(eq(developerBrandProfiles.isSubscriber, filters.isSubscriber ? 1 : 0));
  }

  if (filters.ownerType) {
    conditions.push(eq(developerBrandProfiles.ownerType, filters.ownerType));
  }

  if (filters.search) {
    conditions.push(
      or(
        like(developerBrandProfiles.brandName, `%${filters.search}%`),
        like(developerBrandProfiles.headOfficeLocation, `%${filters.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const profiles = await db
    .select()
    .from(developerBrandProfiles)
    .where(whereClause)
    .orderBy(desc(developerBrandProfiles.totalLeadsReceived))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  return profiles;
}

/**
 * Update brand profile
 */
async function updateBrandProfile(id: number, input: UpdateBrandProfileInput) {
  const updateData: Record<string, unknown> = {};

  if (input.brandName !== undefined) updateData.brandName = input.brandName;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
  if (input.about !== undefined) updateData.about = input.about;
  if (input.foundedYear !== undefined) updateData.foundedYear = input.foundedYear;
  if (input.headOfficeLocation !== undefined) updateData.headOfficeLocation = input.headOfficeLocation;
  if (input.operatingProvinces !== undefined) updateData.operatingProvinces = input.operatingProvinces;
  if (input.propertyFocus !== undefined) updateData.propertyFocus = input.propertyFocus;
  if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl;
  if (input.publicContactEmail !== undefined) updateData.publicContactEmail = input.publicContactEmail;
  if (input.brandTier !== undefined) updateData.brandTier = input.brandTier;
  if (input.sourceAttribution !== undefined) updateData.sourceAttribution = input.sourceAttribution;
  if (input.profileType !== undefined) updateData.profileType = input.profileType;
  if (input.isSubscriber !== undefined) updateData.isSubscriber = input.isSubscriber ? 1 : 0;
  if (input.isClaimable !== undefined) updateData.isClaimable = input.isClaimable ? 1 : 0;
  if (input.isVisible !== undefined) updateData.isVisible = input.isVisible ? 1 : 0;
  if (input.isContactVerified !== undefined) updateData.isContactVerified = input.isContactVerified ? 1 : 0;
  if (input.linkedDeveloperAccountId !== undefined) updateData.linkedDeveloperAccountId = input.linkedDeveloperAccountId;
  if (input.ownerType !== undefined) updateData.ownerType = input.ownerType;
  if (input.claimRequestedAt !== undefined) updateData.claimRequestedAt = input.claimRequestedAt;

  if (Object.keys(updateData).length === 0) {
    return { success: false, message: 'No fields to update' };
  }

  await db
    .update(developerBrandProfiles)
    .set(updateData)
    .where(eq(developerBrandProfiles.id, id));

  return { success: true };
}

/**
 * Toggle profile visibility
 */
async function toggleVisibility(id: number, visible: boolean) {
  await db
    .update(developerBrandProfiles)
    .set({ isVisible: visible ? 1 : 0 })
    .where(eq(developerBrandProfiles.id, id));

  return { success: true };
}

/**
 * Attach development to brand profile
 */
async function attachDevelopmentToBrand(developmentId: number, brandProfileId: number) {
  await db
    .update(developments)
    .set({
      developerBrandProfileId: brandProfileId,
      devOwnerType: 'platform',
    })
    .where(eq(developments.id, developmentId));

  return { success: true };
}

/**
 * Detach development from brand profile
 */
async function detachDevelopmentFromBrand(developmentId: number) {
  await db
    .update(developments)
    .set({
      developerBrandProfileId: null,
      devOwnerType: 'developer',
    })
    .where(eq(developments.id, developmentId));

  return { success: true };
}

/**
 * Get developments for a brand profile
 */
async function getBrandDevelopments(brandProfileId: number) {
  const devs = await db
    .select()
    .from(developments)
    .where(eq(developments.developerBrandProfileId, brandProfileId));

  return devs;
}

/**
 * Get brand profile with development count
 */
async function getBrandProfileWithStats(id: number) {
  const [profile] = await db
    .select()
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.id, id))
    .limit(1);

  if (!profile) return null;

  const devs = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(developments)
    .where(eq(developments.developerBrandProfileId, id));

  return {
    ...profile,
    developmentCount: devs[0]?.count || 0,
  };
}

/**
 * Request claim on a brand profile
 */
async function requestClaim(brandProfileId: number) {
  await db
    .update(developerBrandProfiles)
    .set({
      claimRequestedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(developerBrandProfiles.id, brandProfileId));

  return { success: true };
}

/**
 * Convert brand profile to subscriber (after claim approval)
 * Links brand profile to developer account
 */
async function convertToSubscriber(
  brandProfileId: number,
  developerAccountId: number
) {
  await db
    .update(developerBrandProfiles)
    .set({
      isSubscriber: 1,
      isClaimable: 0,
      linkedDeveloperAccountId: developerAccountId,
      ownerType: 'developer',
    })
    .where(eq(developerBrandProfiles.id, brandProfileId));

  // Update all developments to be developer-managed
  await db
    .update(developments)
    .set({
      devOwnerType: 'developer',
    })
    .where(eq(developments.developerBrandProfileId, brandProfileId));

  return { success: true };
}

// ============================================================================
// Lead Metrics (Async Updates - Refinement #3)
// ============================================================================

/**
 * Increment lead count asynchronously
 * Called by event handler, not in request path
 */
async function incrementLeadCountAsync(brandProfileId: number) {
  await db
    .update(developerBrandProfiles)
    .set({
      totalLeadsReceived: sql`${developerBrandProfiles.totalLeadsReceived} + 1`,
      unclaimedLeadCount: sql`${developerBrandProfiles.unclaimedLeadCount} + 1`,
      lastLeadDate: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(developerBrandProfiles.id, brandProfileId));

  return { success: true };
}

/**
 * Get lead statistics for a brand profile
 */
async function getBrandLeadStats(brandProfileId: number) {
  const [profile] = await db
    .select({
      totalLeadsReceived: developerBrandProfiles.totalLeadsReceived,
      unclaimedLeadCount: developerBrandProfiles.unclaimedLeadCount,
      lastLeadDate: developerBrandProfiles.lastLeadDate,
      isSubscriber: developerBrandProfiles.isSubscriber,
      isContactVerified: developerBrandProfiles.isContactVerified,
    })
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.id, brandProfileId))
    .limit(1);

  if (!profile) return null;

  // Get leads by status for this brand
  const leadCounts = await db
    .select({
      status: leads.brandLeadStatus,
      count: sql<number>`COUNT(*)`,
    })
    .from(leads)
    .where(eq(leads.developerBrandProfileId, brandProfileId))
    .groupBy(leads.brandLeadStatus);

  return {
    ...profile,
    leadBreakdown: leadCounts,
  };
}

// ============================================================================
// Export Service
// ============================================================================

export const developerBrandProfileService = {
  // CRUD
  createBrandProfile,
  getBrandProfileById,
  getBrandProfileBySlug,
  listBrandProfiles,
  updateBrandProfile,
  toggleVisibility,
  
  // Development linking
  attachDevelopmentToBrand,
  detachDevelopmentFromBrand,
  getBrandDevelopments,
  getBrandProfileWithStats,
  
  // Claim flow
  requestClaim,
  convertToSubscriber,
  
  // Lead metrics
  incrementLeadCountAsync,
  getBrandLeadStats,
};
