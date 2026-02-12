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
import { developmentLeadRoutes, developments } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
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
  // development_partners table not available yet
  return { id: 0 };
}

/**
 * Remove a partner from a development
 */
export async function removePartner(developmentId: number, brandProfileId: number): Promise<void> {
  // development_partners table not available yet
}

/**
 * Get all partners for a development
 */
export async function getPartners(developmentId: number) {
  // development_partners table not available yet
  return [];
}

/**
 * Get developments where a brand is a partner (for profile pages)
 */
export async function getPartneredDevelopments(
  brandProfileId: number,
  visibilityScope: VisibilityScope = 'profile_public',
) {
  // development_partners table not available yet
  return [];
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
  type PartnershipRoute = {
    developmentId: number;
    sourceType: 'developer_profile' | 'development_page' | 'agency_profile';
    sourceBrandProfileId: number | null;
    receiverBrandProfileId: number;
    fallbackBrandProfileId: number | null;
    priority: number;
    isActive: number;
  };
  const routes: PartnershipRoute[] = [];

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
