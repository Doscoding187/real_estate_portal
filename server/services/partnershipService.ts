/**
 * Partnership Service
 * Handles development partnerships and source-based lead routing
 *
 * Core Principles:
 * 1. Development has ONE canonical owner
 * 2. Lead routing is source-based, not ownership-based
 * 3. Permissions are versioned and preset-based
 */

import { db } from '../db';
import {
  developmentPartners,
  developmentLeadRoutes,
  developments,
  developerBrandProfiles,
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  PERMISSION_PRESETS,
  getDefaultPermissions,
  type PartnerType,
  type PartnerPermissions,
  type LeadSourceType,
  type VisibilityScope,
} from '../../shared/partnership-enums';

// ============================================
// PARTNER MANAGEMENT
// ============================================

/**
 * Add a partner to a development
 */
export async function addPartner(
  developmentId: number,
  brandProfileId: number,
  partnerType: PartnerType,
  options?: {
    visibilityScope?: VisibilityScope;
    isPrimary?: boolean;
    displayOrder?: number;
    customPermissions?: Partial<PartnerPermissions>;
  },
): Promise<{ id: number }> {
  const permissions = {
    ...getDefaultPermissions(partnerType),
    ...(options?.customPermissions || {}),
  };

  const [result] = await db.insert(developmentPartners).values({
    developmentId,
    brandProfileId,
    partnerType,
    permissions,
    visibilityScope: options?.visibilityScope || 'profile_public',
    isPrimary: options?.isPrimary ? 1 : 0,
    displayOrder: options?.displayOrder ?? 0,
  });

  const insertId = (result as any).insertId;

  // Auto-create lead routes for agency partners
  if (partnerType === 'marketing_agency' || partnerType === 'selling_agency') {
    await createAgencyLeadRoute(developmentId, brandProfileId);
  }

  return { id: insertId };
}

/**
 * Remove a partner from a development
 */
export async function removePartner(developmentId: number, brandProfileId: number): Promise<void> {
  // Deactivate lead routes (don't delete - preserve history)
  await db
    .update(developmentLeadRoutes)
    .set({ isActive: 0 })
    .where(
      and(
        eq(developmentLeadRoutes.developmentId, developmentId),
        eq(developmentLeadRoutes.sourceBrandProfileId, brandProfileId),
      ),
    );

  // Remove partner record
  await db
    .delete(developmentPartners)
    .where(
      and(
        eq(developmentPartners.developmentId, developmentId),
        eq(developmentPartners.brandProfileId, brandProfileId),
      ),
    );
}

/**
 * Get all partners for a development
 */
export async function getPartners(developmentId: number) {
  return await db
    .select({
      id: developmentPartners.id,
      developmentId: developmentPartners.developmentId,
      brandProfileId: developmentPartners.brandProfileId,
      partnerType: developmentPartners.partnerType,
      permissions: developmentPartners.permissions,
      visibilityScope: developmentPartners.visibilityScope,
      isPrimary: developmentPartners.isPrimary,
      displayOrder: developmentPartners.displayOrder,
      createdAt: developmentPartners.createdAt,
      // Join brand profile info
      brandName: developerBrandProfiles.name,
      brandLogo: developerBrandProfiles.logo,
      brandSlug: developerBrandProfiles.slug,
    })
    .from(developmentPartners)
    .leftJoin(
      developerBrandProfiles,
      eq(developmentPartners.brandProfileId, developerBrandProfiles.id),
    )
    .where(eq(developmentPartners.developmentId, developmentId))
    .orderBy(desc(developmentPartners.isPrimary), developmentPartners.displayOrder);
}

/**
 * Get developments where a brand is a partner (for profile pages)
 */
export async function getPartneredDevelopments(
  brandProfileId: number,
  visibilityScope: VisibilityScope = 'profile_public',
) {
  return await db
    .select({
      developmentId: developmentPartners.developmentId,
      partnerType: developmentPartners.partnerType,
      isPrimary: developmentPartners.isPrimary,
      // Join development info
      developmentName: developments.name,
      developmentSlug: developments.slug,
      developmentCity: developments.city,
      developmentProvince: developments.province,
      developmentStatus: developments.status,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
    })
    .from(developmentPartners)
    .innerJoin(developments, eq(developmentPartners.developmentId, developments.id))
    .where(
      and(
        eq(developmentPartners.brandProfileId, brandProfileId),
        eq(developmentPartners.visibilityScope, visibilityScope),
        eq(developments.isPublished, 1),
      ),
    )
    .orderBy(desc(developments.publishedAt));
}

// ============================================
// LEAD ROUTING
// ============================================

/**
 * Create auto-routes when a development is published
 */
export async function createAutoRoutes(
  developmentId: number,
  ownerBrandProfileId: number,
  uploadedByAgency?: number,
): Promise<void> {
  const routes = [];

  // Developer profile route -> always goes to owner
  routes.push({
    developmentId,
    sourceType: 'developer_profile' as const,
    sourceBrandProfileId: ownerBrandProfileId,
    receiverBrandProfileId: ownerBrandProfileId,
    fallbackBrandProfileId: null,
    priority: 0,
    isActive: 1,
  });

  // Development page route
  if (uploadedByAgency) {
    // Agency uploaded -> leads go to agency
    routes.push({
      developmentId,
      sourceType: 'development_page' as const,
      sourceBrandProfileId: null,
      receiverBrandProfileId: uploadedByAgency,
      fallbackBrandProfileId: ownerBrandProfileId,
      priority: 0,
      isActive: 1,
    });

    // Agency profile route
    routes.push({
      developmentId,
      sourceType: 'agency_profile' as const,
      sourceBrandProfileId: uploadedByAgency,
      receiverBrandProfileId: uploadedByAgency,
      fallbackBrandProfileId: ownerBrandProfileId,
      priority: 0,
      isActive: 1,
    });
  } else {
    // Developer uploaded -> leads go to developer
    routes.push({
      developmentId,
      sourceType: 'development_page' as const,
      sourceBrandProfileId: null,
      receiverBrandProfileId: ownerBrandProfileId,
      fallbackBrandProfileId: null,
      priority: 0,
      isActive: 1,
    });
  }

  await db.insert(developmentLeadRoutes).values(routes);
}

/**
 * Create agency profile lead route when adding agency partner
 */
async function createAgencyLeadRoute(
  developmentId: number,
  agencyBrandProfileId: number,
): Promise<void> {
  // Get development owner for fallback
  const [dev] = await db
    .select({ ownerBrandProfileId: developments.developerBrandProfileId })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!dev) return;

  await db.insert(developmentLeadRoutes).values({
    developmentId,
    sourceType: 'agency_profile',
    sourceBrandProfileId: agencyBrandProfileId,
    receiverBrandProfileId: agencyBrandProfileId,
    fallbackBrandProfileId: dev.ownerBrandProfileId,
    priority: 0,
    isActive: 1,
  });
}

/**
 * Resolve which brand profile should receive a lead
 * This is the core routing algorithm
 */
export async function resolveLeadReceiver(
  developmentId: number,
  sourceType: LeadSourceType,
  sourceBrandProfileId?: number,
): Promise<{ receiverBrandProfileId: number; fallbackBrandProfileId: number | null }> {
  // Step 1: Find matching active route with highest priority
  const routes = await db
    .select()
    .from(developmentLeadRoutes)
    .where(
      and(
        eq(developmentLeadRoutes.developmentId, developmentId),
        eq(developmentLeadRoutes.sourceType, sourceType),
        eq(developmentLeadRoutes.isActive, 1),
        // Match source brand if provided, or look for null (development_page)
        sourceBrandProfileId
          ? eq(developmentLeadRoutes.sourceBrandProfileId, sourceBrandProfileId)
          : sql`${developmentLeadRoutes.sourceBrandProfileId} IS NULL`,
      ),
    )
    .orderBy(desc(developmentLeadRoutes.priority))
    .limit(1);

  if (routes.length > 0) {
    return {
      receiverBrandProfileId: routes[0].receiverBrandProfileId,
      fallbackBrandProfileId: routes[0].fallbackBrandProfileId,
    };
  }

  // Step 2: No route found - fall back to development owner
  const [dev] = await db
    .select({
      ownerBrandProfileId: developments.developerBrandProfileId,
    })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!dev?.ownerBrandProfileId) {
    throw new Error(`Development ${developmentId} has no owner - cannot route lead`);
  }

  return {
    receiverBrandProfileId: dev.ownerBrandProfileId,
    fallbackBrandProfileId: null,
  };
}

/**
 * Get lead routes for a development (for UI display)
 */
export async function getLeadRoutes(developmentId: number) {
  return await db
    .select({
      id: developmentLeadRoutes.id,
      sourceType: developmentLeadRoutes.sourceType,
      sourceBrandProfileId: developmentLeadRoutes.sourceBrandProfileId,
      receiverBrandProfileId: developmentLeadRoutes.receiverBrandProfileId,
      fallbackBrandProfileId: developmentLeadRoutes.fallbackBrandProfileId,
      priority: developmentLeadRoutes.priority,
      isActive: developmentLeadRoutes.isActive,
    })
    .from(developmentLeadRoutes)
    .where(eq(developmentLeadRoutes.developmentId, developmentId))
    .orderBy(developmentLeadRoutes.sourceType, desc(developmentLeadRoutes.priority));
}

/**
 * Update development page lead receiver
 */
export async function updateDevelopmentPageReceiver(
  developmentId: number,
  receiverBrandProfileId: number,
  fallbackBrandProfileId?: number,
): Promise<void> {
  await db
    .update(developmentLeadRoutes)
    .set({
      receiverBrandProfileId,
      fallbackBrandProfileId: fallbackBrandProfileId ?? null,
    })
    .where(
      and(
        eq(developmentLeadRoutes.developmentId, developmentId),
        eq(developmentLeadRoutes.sourceType, 'development_page'),
        sql`${developmentLeadRoutes.sourceBrandProfileId} IS NULL`,
      ),
    );
}
