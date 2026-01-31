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
import { developerBrandProfiles, developments, leads, listings } from '../../drizzle/schema';
import { eq, and, desc, sql, like, or, isNull, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

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
  identityType?: 'developer' | 'marketing_agency' | 'hybrid';
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
  identityType?: 'developer' | 'marketing_agency' | 'hybrid';
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
    identityType: input.identityType || 'developer',
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
export async function getBrandProfileById(id: number) {
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
    .where(and(eq(developerBrandProfiles.slug, slug), eq(developerBrandProfiles.isVisible, 1)))
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
        like(developerBrandProfiles.headOfficeLocation, `%${filters.search}%`),
      ),
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

  // If no profiles found, return empty array
  if (profiles.length === 0) {
    return [];
  }

  // Fetch development stats for these profiles
  const profileIds = profiles.map((p: any) => p.id);
  const brandDevelopments = await db
    .select({
      id: developments.id,
      developerBrandProfileId: developments.developerBrandProfileId,
      status: developments.status,
    })
    .from(developments)
    .where(inArray(developments.developerBrandProfileId, profileIds));

  // Enrich profiles with stats
  const enrichedProfiles = profiles.map((profile: any) => {
    const profileDevs = brandDevelopments.filter(
      (d: any) => d.developerBrandProfileId === profile.id,
    );
    const totalProjects = profileDevs.length;

    const readyToMove = profileDevs.filter((d: any) =>
      ['ready-to-move', 'completed', 'phase-completed'].includes(d.status),
    ).length;

    const underConstruction = profileDevs.filter((d: any) =>
      ['under-construction'].includes(d.status),
    ).length;

    const newLaunch = profileDevs.filter((d: any) =>
      ['launching-soon', 'now-selling', 'new-phase-launching', 'coming_soon', 'planning'].includes(
        d.status,
      ),
    ).length;

    const currentYear = new Date().getFullYear();
    const experience = profile.foundedYear ? currentYear - profile.foundedYear : 0;

    return {
      ...profile,
      stats: {
        totalProjects,
        readyToMove,
        underConstruction,
        newLaunch,
        experience,
      },
    };
  });

  return enrichedProfiles;
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
  if (input.headOfficeLocation !== undefined)
    updateData.headOfficeLocation = input.headOfficeLocation;
  if (input.operatingProvinces !== undefined)
    updateData.operatingProvinces = input.operatingProvinces;
  if (input.propertyFocus !== undefined) updateData.propertyFocus = input.propertyFocus;
  if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl;
  if (input.publicContactEmail !== undefined)
    updateData.publicContactEmail = input.publicContactEmail;
  if (input.brandTier !== undefined) updateData.brandTier = input.brandTier;
  if (input.identityType !== undefined) updateData.identityType = input.identityType;
  if (input.sourceAttribution !== undefined) updateData.sourceAttribution = input.sourceAttribution;
  if (input.profileType !== undefined) updateData.profileType = input.profileType;
  if (input.isSubscriber !== undefined) updateData.isSubscriber = input.isSubscriber ? 1 : 0;
  if (input.isClaimable !== undefined) updateData.isClaimable = input.isClaimable ? 1 : 0;
  if (input.isVisible !== undefined) updateData.isVisible = input.isVisible ? 1 : 0;
  if (input.isContactVerified !== undefined)
    updateData.isContactVerified = input.isContactVerified ? 1 : 0;
  if (input.linkedDeveloperAccountId !== undefined)
    updateData.linkedDeveloperAccountId = input.linkedDeveloperAccountId;
  if (input.ownerType !== undefined) updateData.ownerType = input.ownerType;
  if (input.claimRequestedAt !== undefined) updateData.claimRequestedAt = input.claimRequestedAt;

  if (Object.keys(updateData).length === 0) {
    return { success: false, message: 'No fields to update' };
  }

  await db.update(developerBrandProfiles).set(updateData).where(eq(developerBrandProfiles.id, id));

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
async function convertToSubscriber(brandProfileId: number, developerAccountId: number) {
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

/**
 * Delete brand profile
 * - Hard delete if no dependencies (leads/developments)
 * - Soft delete (hide + rename) if dependencies exist
 */
/**
 * Delete brand profile with safety enforcement
 * - HARD DELETE: Only for status='seeded' (test data)
 * - SOFT DELETE: For status='live' (set to 'archived')
 * - PREVENT: Accidental deletion of customer brands
 */
async function deleteBrandProfile(id: number, force: boolean = false) {
  // 1. Get brand profile with status
  const [profile] = await db
    .select({
      id: developerBrandProfiles.id,
      brandName: developerBrandProfiles.brandName,
      status: developerBrandProfiles.status,
      ownerType: developerBrandProfiles.ownerType,
    })
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.id, id));

  if (!profile) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Brand profile ${id} not found`,
    });
  }

  // 2. Safety check: Only seeded brands can be hard deleted (unless force=true)
  if (profile.status !== 'seeded' && !force) {
    // Soft delete: Set to archived
    await db
      .update(developerBrandProfiles)
      .set({
        status: 'archived',
        isVisible: 0,
        brandName: `${profile.brandName} (Archived ${new Date().toISOString().split('T')[0]})`,
        slug: `archived-${id}-${Date.now()}`, // Free up the slug
      })
      .where(eq(developerBrandProfiles.id, id));

    return {
      success: true,
      mode: 'soft',
      message: `Brand "${profile.brandName}" archived. Use force=true to permanently delete.`,
    };
  }

  // 3. Hard delete: Only for seeded brands or force=true
  if (profile.status === 'seeded' || force) {
    // Check dependencies before cascading
    const devCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(developments)
      .where(eq(developments.developerBrandProfileId, id));

    const listingCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(listings)
      .where(eq(listings.brandProfileId, id));

    const leadCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(leads)
      .where(eq(leads.developerBrandProfileId, id));

    const totalDeps =
      (devCount[0]?.count || 0) + (listingCount[0]?.count || 0) + (leadCount[0]?.count || 0);

    // Hard delete (CASCADE will handle related records)
    await db.delete(developerBrandProfiles).where(eq(developerBrandProfiles.id, id));

    return {
      success: true,
      mode: 'hard',
      message: `Brand "${profile.brandName}" permanently deleted. Cascaded ${totalDeps} related records.`,
      cascaded: {
        developments: devCount[0]?.count || 0,
        listings: listingCount[0]?.count || 0,
        leads: leadCount[0]?.count || 0, // Note: leads are SET NULL, not deleted
      },
    };
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `Cannot delete live brand "${profile.brandName}". Set status='seeded' first or use force=true.`,
  });
}

/**
 * Verify brand can be safely operated on by super admin
 */
async function verifyBrandOperation(
  id: number,
  operation: string,
): Promise<{
  canOperate: boolean;
  reason?: string;
  brandProfile?: any;
}> {
  const profile = await getBrandProfileById(id);

  if (!profile) {
    return { canOperate: false, reason: 'Brand profile not found' };
  }

  // Only allow operations on platform-owned profiles for super admin emulator
  if (profile.ownerType !== 'platform') {
    return {
      canOperate: false,
      reason: `Cannot ${operation} on subscriber-owned brand profile. Only platform-owned profiles can be managed in emulator mode.`,
    };
  }

  // Check if brand is claimed by a real developer
  if (profile.linkedDeveloperAccountId) {
    return {
      canOperate: false,
      reason: `Cannot ${operation} on claimed brand profile. Brand is linked to active developer account.`,
    };
  }

  return { canOperate: true, brandProfile: profile };
}

export const developerBrandProfileService = {
  // CRUD
  createBrandProfile,
  getBrandProfileById,
  getBrandProfileBySlug,
  listBrandProfiles,
  updateBrandProfile,
  toggleVisibility,
  deleteBrandProfile, // Added
  verifyBrandOperation,

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
