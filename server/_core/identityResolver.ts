/**
 * Identity Resolver
 *
 * Resolves operating identity from tRPC context.
 * - Emulator mode: Super admin with brand context
 * - Real developer mode: Developer authenticated user
 * - Real agency mode: Agency admin authenticated user
 */

import { TRPCError } from '@trpc/server';
import type { EnhancedTRPCContext } from './brandContext';
import { getDeveloperByUserId } from '../services/developerService';

// ============================================================================
// Types
// ============================================================================

export type ResolvedIdentity =
  | {
      mode: 'real_developer';
      developerId: number;
      brandProfileId: number | null;
      userId: number;
    }
  | {
      mode: 'real_agency';
      agencyId: number;
      userId: number;
    }
  | {
      mode: 'emulator';
      brandProfileId: number;
      identityType: 'developer' | 'marketing_agency' | 'hybrid';
      superAdminUserId: number;
    };

// ============================================================================
// Identity Resolution
// ============================================================================

/**
 * Resolve operating identity from tRPC context.
 *
 * Rules:
 * 1. If ctx.operatingAs exists AND user is super_admin → emulator mode
 * 2. If user is property_developer → real developer mode
 * 3. If user is agency_admin → real agency mode
 * 4. Otherwise → throw FORBIDDEN
 */
export async function resolveOperatingIdentity(
  ctx: EnhancedTRPCContext,
): Promise<ResolvedIdentity> {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  // Emulator mode: Super admin with operating context
  if (ctx.user.role === 'super_admin' && ctx.operatingAs) {
    return {
      mode: 'emulator',
      brandProfileId: ctx.operatingAs.brandProfileId,
      identityType: ctx.operatingAs.brandType,
      superAdminUserId: ctx.user.id,
    };
  }

  // Real developer mode
  if (ctx.user.role === 'property_developer') {
    const profile = await getDeveloperByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Developer profile not found. Please complete onboarding.',
      });
    }
    return {
      mode: 'real_developer',
      developerId: profile.id,
      brandProfileId: profile.brandProfileId || null,
      userId: ctx.user.id,
    };
  }

  // Real agency mode
  if (ctx.user.role === 'agency_admin') {
    // Agency service lookup would go here
    // For now, return a placeholder - will be expanded when agency flows are implemented
    return {
      mode: 'real_agency',
      agencyId: 0, // Will be replaced with actual lookup
      userId: ctx.user.id,
    };
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Invalid role for content creation',
  });
}

// ============================================================================
// Ownership Validation
// ============================================================================

/**
 * Validate that exactly one ownership path is set.
 * Prevents mixed ownership (emulator vs real user).
 */
export function validateOwnership(fields: {
  brandProfileId?: number | null;
  developerId?: number | null;
  agencyId?: number | null;
}): void {
  const paths = [fields.brandProfileId, fields.developerId, fields.agencyId].filter(
    v => v !== null && v !== undefined,
  );

  if (paths.length === 0) {
    throw new Error('At least one ownership field must be set');
  }
  if (paths.length > 1) {
    throw new Error('Only one ownership path allowed (brand OR developer OR agency)');
  }
}

/**
 * Get ownership fields from resolved identity.
 * Returns the correct fields to set on created entities.
 */
export function getOwnershipFields(identity: ResolvedIdentity): {
  developerBrandProfileId: number | null;
  developerId: number | null;
  devOwnerType: 'platform' | 'developer';
} {
  if (identity.mode === 'emulator') {
    return {
      developerBrandProfileId: identity.brandProfileId,
      developerId: null,
      devOwnerType: 'platform',
    };
  }

  if (identity.mode === 'real_developer') {
    return {
      developerBrandProfileId: identity.brandProfileId,
      developerId: identity.developerId,
      devOwnerType: 'developer',
    };
  }

  // Real agency mode - will be expanded when agency flows are implemented
  return {
    developerBrandProfileId: null,
    developerId: null,
    devOwnerType: 'platform',
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isEmulatorMode(
  identity: ResolvedIdentity,
): identity is Extract<ResolvedIdentity, { mode: 'emulator' }> {
  return identity.mode === 'emulator';
}

export function isRealDeveloperMode(
  identity: ResolvedIdentity,
): identity is Extract<ResolvedIdentity, { mode: 'real_developer' }> {
  return identity.mode === 'real_developer';
}
