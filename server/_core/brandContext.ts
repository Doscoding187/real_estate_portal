/**
 * Developer Engine operating-identity middleware.
 *
 * The client may request a brand with x-operating-as-brand. The server
 * resolves and validates that request as a platform-curator identity before
 * placing it on tRPC context.
 */

import type { TrpcContext } from './context';
import { TRPCError } from '@trpc/server';
import { brandContextService } from '../services/brandContextService';
import { requireUser } from './requireUser';

export interface BrandOperatingContext {
  brandProfileId: number;
  brandType: 'developer' | 'marketing_agency' | 'hybrid';
  brandName: string;
  originalUserId: number;
  ownerType: 'platform';
  mode: 'platform_curator';
  brandProfileType?: 'developer' | 'marketing_agency' | 'hybrid';
  brandProfileName?: string;
}

export interface EnhancedTRPCContext extends TrpcContext {
  operatingAs?: BrandOperatingContext;
}

/**
 * Resolve a requested platform-curator identity.
 * Only super admins can request this operating mode.
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
    // The shared context boundary must enforce the same platform-curator
    // isolation as the dedicated publisher routes: visible, platform-owned,
    // and still unclaimed.
    const brandProfile = await brandContextService.verifyBrandContext(brandProfileId);

    // Create enhanced context with brand operating context
    const enhancedCtx: EnhancedTRPCContext = {
      ...ctx,
      operatingAs: {
        brandProfileId: brandProfile.brandProfileId,
        brandType: (brandProfile.identityType || 'developer') as any,
        brandName: brandProfile.brandName,
        originalUserId: ctx.user.id,
        ownerType: 'platform',
        mode: 'platform_curator',
        brandProfileType: (brandProfile.identityType || 'developer') as any,
        brandProfileName: brandProfile.brandName,
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
 * In platform-curator mode, revalidates and uses the operating-as brand ID
 * In normal mode, uses the user's developer profile
 */
export async function getEffectiveBrandId(ctx: EnhancedTRPCContext): Promise<number> {
  // If operating as a brand in emulator mode
  if (ctx.operatingAs) {
    await brandContextService.verifyBrandContext(ctx.operatingAs.brandProfileId);
    return ctx.operatingAs.brandProfileId;
  }

  // Normal mode: get developer profile for the user
  const { getDeveloperByUserId } = await import('../services/developerService');
  const developerProfile = await getDeveloperByUserId(requireUser(ctx).id);

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

/** Type guard for a server-authorized platform-curator context. */
export function isPlatformCuratorContext(ctx: EnhancedTRPCContext): ctx is EnhancedTRPCContext & {
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
      `[BRAND_CONTEXT] User ${userId} entering platform-curator mode as brand "${brandContext.brandName}" (ID: ${brandContext.brandProfileId})`,
    );
  } else if (action === 'exit') {
    console.log(`[BRAND_CONTEXT] User ${userId} exiting platform-curator mode`);
  }
}
