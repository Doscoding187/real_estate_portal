/**
 * Seed Cleanup Service
 *
 * Handles automatic deletion of seeded (platform-owned) brand profiles
 * when real developers register with matching identities.
 *
 * Design Principles (Production-Safe):
 * 1. DETERMINISTIC MATCHING: Exact slug/name only, no fuzzy auto-delete
 * 2. FAIL-FAST: If deletion fails, block registration (no duplicate state)
 * 3. SAFE DELETION GUARD: Only delete ownerType='platform' AND seedBatchId IS NOT NULL
 * 4. AUDIT LOGGING: Log counts + metadata, no new tables
 */

import { db } from '../db';
import { developerBrandProfiles, developments, unitTypes } from '../../drizzle/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logAudit } from '../_core/auditLog';
import { brandCleanupService } from './brandCleanupService';

// ============================================================================
// Types
// ============================================================================

export interface SeedCleanupResult {
  deleted: boolean;
  reason: string;
  deletedCounts?: {
    brandProfileId: number;
    brandName: string;
    slug: string;
    seedBatchId: string | null;
    developmentCount: number;
    unitCount: number;
  };
}

export interface SeedCandidate {
  id: number;
  brandName: string;
  slug: string;
  seedBatchId: string | null;
  ownerType: 'platform' | 'developer';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize brand name for matching
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes special characters
 */
function normalizeBrandName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/\s+/g, '');
}

/**
 * Generate slug from brand name (matches developerBrandProfileService.generateSlug)
 */
function generateSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

// ============================================================================
// Seed Candidate Finding (Deterministic Matching)
// ============================================================================

/**
 * Find seed candidate with deterministic matching:
 * 1. seedBatchId + exact slug → match
 * 2. Exact slug only (platform only) → match
 * 3. Exact normalized brandName (platform only) → match
 * 4. Multiple candidates → throw "ambiguous match"
 */
async function findSeedCandidate(
  brandName: string,
  slug: string,
  seedBatchId?: string,
): Promise<SeedCandidate | null> {
  // 1. If seedBatchId provided, try exact match with seedBatchId + slug
  if (seedBatchId) {
    const [exactMatch] = await db
      .select({
        id: developerBrandProfiles.id,
        brandName: developerBrandProfiles.brandName,
        slug: developerBrandProfiles.slug,
        seedBatchId: developerBrandProfiles.seedBatchId,
        ownerType: developerBrandProfiles.ownerType,
      })
      .from(developerBrandProfiles)
      .where(
        and(
          eq(developerBrandProfiles.slug, slug),
          eq(developerBrandProfiles.seedBatchId, seedBatchId),
          eq(developerBrandProfiles.ownerType, 'platform'),
          isNotNull(developerBrandProfiles.seedBatchId),
        ),
      )
      .limit(1);

    if (exactMatch) {
      return exactMatch;
    }
  }

  // 2. Try exact slug match (platform only, with seedBatchId)
  const slugMatches = await db
    .select({
      id: developerBrandProfiles.id,
      brandName: developerBrandProfiles.brandName,
      slug: developerBrandProfiles.slug,
      seedBatchId: developerBrandProfiles.seedBatchId,
      ownerType: developerBrandProfiles.ownerType,
    })
    .from(developerBrandProfiles)
    .where(
      and(
        eq(developerBrandProfiles.slug, slug),
        eq(developerBrandProfiles.ownerType, 'platform'),
        isNotNull(developerBrandProfiles.seedBatchId),
      ),
    );

  if (slugMatches.length === 1) {
    return slugMatches[0];
  }

  if (slugMatches.length > 1) {
    console.error('[SeedCleanup] Ambiguous slug match:', {
      slug,
      matchCount: slugMatches.length,
      matches: slugMatches.map(m => ({ id: m.id, brandName: m.brandName })),
    });
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Ambiguous seed match: ${slugMatches.length} platform-owned profiles match slug "${slug}". Manual cleanup required.`,
    });
  }

  // 3. Try exact normalized brandName match (platform only, with seedBatchId)
  // NOTE: This loads all platform seeds into memory - O(n) but acceptable for now
  const normalizedInput = normalizeBrandName(brandName);
  const allPlatformSeeds = await db
    .select({
      id: developerBrandProfiles.id,
      brandName: developerBrandProfiles.brandName,
      slug: developerBrandProfiles.slug,
      seedBatchId: developerBrandProfiles.seedBatchId,
      ownerType: developerBrandProfiles.ownerType,
    })
    .from(developerBrandProfiles)
    .where(
      and(
        eq(developerBrandProfiles.ownerType, 'platform'),
        isNotNull(developerBrandProfiles.seedBatchId),
      ),
    );

  const nameMatches = allPlatformSeeds.filter(
    seed => normalizeBrandName(seed.brandName) === normalizedInput,
  );

  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  if (nameMatches.length > 1) {
    console.error('[SeedCleanup] Ambiguous name match:', {
      brandName,
      normalizedInput,
      matchCount: nameMatches.length,
      matches: nameMatches.map(m => ({ id: m.id, brandName: m.brandName, slug: m.slug })),
    });
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Ambiguous seed match: ${nameMatches.length} platform-owned profiles match brand name "${brandName}". Manual cleanup required.`,
    });
  }

  // 4. No match found
  return null;
}

// ============================================================================
// Seed Deletion
// ============================================================================

/**
 * Get counts for audit logging
 * NOTE: Lead counting removed - brandCleanupService handles lead deletion via cascades
 */
async function getCountsForAudit(brandProfileId: number): Promise<{
  developmentCount: number;
  unitCount: number;
}> {
  // Development count using Drizzle column references
  const [devCountResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(developments)
    .where(eq(developments.developerBrandProfileId, brandProfileId));

  const developmentCount = devCountResult?.count || 0;

  // Unit count using JOIN (no raw SQL column names)
  const [unitCountResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(unitTypes)
    .innerJoin(developments, eq(unitTypes.developmentId, developments.id))
    .where(eq(developments.developerBrandProfileId, brandProfileId));

  const unitCount = unitCountResult?.count || 0;

  return { developmentCount, unitCount };
}

/**
 * Main cleanup function - called during registration
 *
 * Behavior:
 * - If seed found AND deletion succeeds → { deleted: true }
 * - If seed found AND deletion fails → THROW (blocks registration)
 * - If no seed found → { deleted: false, reason: 'no_match' }
 */
export async function handleSeedDeletionOnRegistration(
  triggerUserId: number,
  brandName: string,
  slug: string,
  seedBatchId?: string,
  req?: any,
): Promise<SeedCleanupResult> {
  const generatedSlug = slug || generateSlug(brandName);

  console.log('[SeedCleanup] Checking for seed to delete:', {
    triggerUserId,
    brandName,
    slug: generatedSlug,
    seedBatchId,
  });

  // 1. Find seed candidate (throws on ambiguous match)
  let candidate: SeedCandidate | null;
  try {
    candidate = await findSeedCandidate(brandName, generatedSlug, seedBatchId);
  } catch (error) {
    // Ambiguous match - re-throw to block registration
    throw error;
  }

  // 2. No match - proceed normally
  if (!candidate) {
    console.log('[SeedCleanup] No matching seed found, proceeding with registration');
    return {
      deleted: false,
      reason: 'no_match',
    };
  }

  console.log('[SeedCleanup] Found seed candidate:', candidate);

  // 3. SAFETY CHECK: Only delete if seedBatchId is set
  if (!candidate.seedBatchId) {
    console.warn('[SeedCleanup] Seed candidate has no seedBatchId, skipping deletion for safety');
    return {
      deleted: false,
      reason: 'missing_seed_batch_id',
    };
  }

  // 4. Get counts for audit
  const counts = await getCountsForAudit(candidate.id);

  // 5. Execute deletion (using existing brandCleanupService)
  try {
    const cleanupResult = await brandCleanupService.executeCleanup(candidate.id, true);

    // 6. Log to audit
    await logAudit({
      userId: triggerUserId,
      action: 'seed_cleanup.auto_delete',
      targetType: 'developer_brand_profile',
      targetId: candidate.id,
      metadata: {
        brandName: candidate.brandName,
        slug: candidate.slug,
        seedBatchId: candidate.seedBatchId,
        developmentCount: counts.developmentCount,
        unitCount: counts.unitCount,
        cleanupMode: cleanupResult.mode,
        reason: 'registration_triggered',
      },
      req,
    });

    console.log('[SeedCleanup] Successfully deleted seeded brand:', {
      brandProfileId: candidate.id,
      brandName: candidate.brandName,
      ...counts,
    });

    return {
      deleted: true,
      reason: 'deleted_on_registration',
      deletedCounts: {
        brandProfileId: candidate.id,
        brandName: candidate.brandName,
        slug: candidate.slug,
        seedBatchId: candidate.seedBatchId,
        ...counts,
      },
    };
  } catch (error) {
    // FAIL-FAST: If deletion fails, block registration
    console.error('[SeedCleanup] Deletion failed, blocking registration:', error);

    // Log the failure
    await logAudit({
      userId: triggerUserId,
      action: 'seed_cleanup.deletion_failed',
      targetType: 'developer_brand_profile',
      targetId: candidate.id,
      metadata: {
        brandName: candidate.brandName,
        slug: candidate.slug,
        seedBatchId: candidate.seedBatchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      req,
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to clean up seeded profile "${candidate.brandName}" before registration. Please contact support.`,
      cause: error,
    });
  }
}

// ============================================================================
// Export Service
// ============================================================================

export const seedCleanupService = {
  handleSeedDeletionOnRegistration,
  findSeedCandidate,
  generateSlug,
  normalizeBrandName,
};
