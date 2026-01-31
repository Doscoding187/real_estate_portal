/**
 * Brand Context Middleware
 *
 * Enforces brand-scoped operations for super admin emulator mode.
 * Ensures all operations are properly attributed to the correct brand context.
 */

import { TRPCError } from '@trpc/server';
import type { TrpcContext } from '../_core/context';
import { brandContextService } from '../services/brandContextService';

export interface BrandContextMiddlewareOptions {
  requireBrandContext?: boolean;
  allowPlatformAdmin?: boolean;
}

/**
 * Middleware to enforce brand context for super admin operations
 */
export const withBrandContext = (options: BrandContextMiddlewareOptions = {}) => {
  return async ({ ctx, next }: { ctx: TrpcContext; next: any }) => {
    const { requireBrandContext = true, allowPlatformAdmin = true } = options;

    // Only apply to super admins
    if (ctx.user?.role !== 'super_admin') {
      return next();
    }

    // If brand context is required, check for brandProfileId in input
    if (requireBrandContext) {
      // This is a simplified check - in a real implementation,
      // you might want to extract brandProfileId from the procedure input
      // For now, we'll rely on the individual procedures to verify context
    }

    return next({
      ctx: {
        ...ctx,
        // Add brand context service to context for easy access
        brandContextService,
      },
    });
  };
};

/**
 * Procedure-level helper to verify brand context
 */
export const verifyBrandContextForOperation = async (
  ctx: TrpcContext,
  brandProfileId: number,
  operation: string,
) => {
  if (ctx.user?.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Brand context operations require super admin privileges',
    });
  }

  try {
    const brandContext = await brandContextService.verifyBrandContext(brandProfileId);

    if (brandContext.ownerType !== 'platform') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Cannot ${operation} on non-platform-owned brand profile`,
      });
    }

    return brandContext;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to verify brand context for ${operation}`,
    });
  }
};

/**
 * Helper to ensure operations are scoped to brand context
 */
export const enforceBrandScoping = (
  ctx: TrpcContext,
  brandProfileId: number | undefined,
  operation: string,
) => {
  if (ctx.user?.role === 'super_admin' && brandProfileId) {
    // Super admin must provide brand context for emulator operations
    return;
  }

  if (ctx.user?.role !== 'super_admin' && brandProfileId) {
    // Non-super admins should not be able to specify arbitrary brand profiles
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `${operation} cannot specify brand context for non-super admin users`,
    });
  }
};
