/**
 * Brand Context Middleware
 * Enables super admin to operate as specific brands for emulator mode
 */

import type { TrpcContext } from './context';
import { TRPCError } from '@trpc/server';
import { developerBrandProfileService } from '../services/developerBrandProfileService';

export interface BrandOperatingContext {
  brandProfileId: number;
  brandType: 'developer' | 'marketing_agency' | 'hybrid';
  brandName: string;
  originalUserId: number;
}

export interface EnhancedTRPCContext extends TrpcContext {
  operatingAs?: BrandOperatingContext;
}

/**
 * Middleware to handle brand switching for emulator mode
 * Only super admins can switch brand context
 */
export async function applyBrandContext(ctx: TrpcContext): Promise<EnhancedTRPCContext> {
  // Only allow super admins to operate as brands
  if (!ctx.user || ctx.user.role !== 'super_admin') {
    return ctx as EnhancedTRPCContext;
  }

  // Check for X-Operating-As-Brand header
  const operatingAsHeader = ctx.req?.headers?.['x-operating-as-brand'];

  if (!operatingAsHeader) {
    return ctx as EnhancedTRPCContext;
  }

  const brandProfileId = parseInt(operatingAsHeader as string, 10);

  if (isNaN(brandProfileId)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid brand profile ID in X-Operating-As-Brand header',
    });
  }

  try {
    // Verify the brand profile exists
    const brandProfile = await developerBrandProfileService.getBrandProfileById(brandProfileId);

    if (!brandProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Brand profile ${brandProfileId} not found`,
      });
    }

    // Create enhanced context with brand operating context
    const enhancedCtx: EnhancedTRPCContext = {
      ...ctx,
      operatingAs: {
        brandProfileId: brandProfile.id,
        brandType: (brandProfile.identityType || 'developer') as any,
        brandName: brandProfile.brandName,
        originalUserId: ctx.user.id,
      },
      // ✅ BRIDGE: legacy code expects this
      brandEmulationContext: {
        mode: 'seeding',
        brandProfileId: brandProfile.id,
        brandProfileType: (brandProfile.identityType || 'developer') as any,
      },
    };

    return enhancedCtx;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to apply brand context',
      cause: error,
    });
  }
}

/**
 * Helper to get the effective brand ID for operations
 * In emulator mode, uses the operating-as brand ID
 * In normal mode, uses the user's developer profile
 */
export async function getEffectiveBrandId(ctx: EnhancedTRPCContext): Promise<number> {
  // If operating as a brand in emulator mode
  if (ctx.operatingAs) {
    return ctx.operatingAs.brandProfileId;
  }

  // Normal mode: get developer profile for the user
  const { getDeveloperByUserId } = await import('../services/developerService');
  const developerProfile = await getDeveloperByUserId(ctx.user.id);

  if (!developerProfile) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Developer profile not found for user',
    });
  }

  // Get the brand profile associated with this developer
  if (developerProfile.brandProfileId) {
    return developerProfile.brandProfileId;
  }

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'No brand profile associated with developer account',
  });
}

/**
 * Type guard to check if context is in emulator mode
 */
export function isEmulatorMode(ctx: EnhancedTRPCContext): ctx is EnhancedTRPCContext & {
  operatingAs: BrandOperatingContext;
} {
  return !!ctx.operatingAs;
}

/**
 * Log brand context changes for audit purposes
 */
export function logBrandContextChange(
  userId: number,
  action: 'enter' | 'exit',
  brandContext?: BrandOperatingContext,
): void {
  if (action === 'enter' && brandContext) {
    console.log(
      `[BRAND_CONTEXT] User ${userId} entering emulator mode as brand "${brandContext.brandName}" (ID: ${brandContext.brandProfileId})`,
    );
  } else if (action === 'exit') {
    console.log(`[BRAND_CONTEXT] User ${userId} exiting emulator mode`);
  }
}
