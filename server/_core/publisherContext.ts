/**
 * Developer Engine operating-identity middleware.
 *
 * The client may request a Catalogue Publisher with x-operating-as-publisher. The server
 * resolves and validates that request as a platform-curator identity before
 * placing it on tRPC context.
 */

import type { TrpcContext } from './context';
import { TRPCError } from '@trpc/server';
import { cataloguePublisherContextService } from '../services/cataloguePublisherContextService';
import { requireUser } from './requireUser';

export interface PublisherOperatingContext {
  cataloguePublisherId: number;
  publisherType: 'developer' | 'marketing_agency' | 'hybrid';
  publisherName: string;
  originalUserId: number;
  authorityKind: 'platform_reference';
  mode: 'platform_curator';
}

export interface EnhancedTRPCContext extends TrpcContext {
  operatingAs?: PublisherOperatingContext;
}

/**
 * Resolve a requested platform-curator identity.
 * Only super admins can request this operating mode.
 */
export async function applyPublisherContext(ctx: TrpcContext): Promise<EnhancedTRPCContext> {
  // Only super admins may request a platform-curator publisher context.
  if (!ctx.user || ctx.user.role !== 'super_admin') {
    return ctx as EnhancedTRPCContext;
  }

  const operatingAsHeader = ctx.req?.headers?.['x-operating-as-publisher'];

  if (!operatingAsHeader) {
    return ctx as EnhancedTRPCContext;
  }

  const cataloguePublisherId = parseInt(operatingAsHeader as string, 10);

  if (isNaN(cataloguePublisherId)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid Catalogue Publisher ID in X-Operating-As-Publisher header',
    });
  }

  try {
    // The shared context boundary must enforce the same platform-curator
    // isolation as the dedicated publisher routes: visible, platform-owned,
    // and still unclaimed.
    const publisher = await cataloguePublisherContextService.verifyPublisherContext(
      cataloguePublisherId,
    );

    // Create the server-authorized publisher operating context.
    const enhancedCtx: EnhancedTRPCContext = {
      ...ctx,
      operatingAs: {
        cataloguePublisherId: publisher.cataloguePublisherId,
        publisherType: publisher.publisherType,
        publisherName: publisher.publisherName,
        originalUserId: ctx.user.id,
        authorityKind: 'platform_reference',
        mode: 'platform_curator',
      },
    };

    return enhancedCtx;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to apply Catalogue Publisher context',
      cause: error,
    });
  }
}

/**
 * Resolve the effective Catalogue Publisher ID for an authorized operation.
 */
export async function getEffectiveCataloguePublisherId(
  ctx: EnhancedTRPCContext,
): Promise<number> {
  // Revalidate the selected platform-reference publisher on every operation.
  if (ctx.operatingAs) {
    await cataloguePublisherContextService.verifyPublisherContext(
      ctx.operatingAs.cataloguePublisherId,
    );
    return ctx.operatingAs.cataloguePublisherId;
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

  if (developerProfile.publisherId) {
    return developerProfile.publisherId;
  }

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'No Catalogue Publisher is associated with this developer organisation',
  });
}

/** Type guard for a server-authorized platform-curator context. */
export function isPlatformCuratorContext(ctx: EnhancedTRPCContext): ctx is EnhancedTRPCContext & {
  operatingAs: PublisherOperatingContext;
} {
  return !!ctx.operatingAs;
}

/**
 * Log publisher-context changes for operational diagnostics.
 */
export function logPublisherContextChange(
  userId: number,
  action: 'enter' | 'exit',
  publisherContext?: PublisherOperatingContext,
): void {
  if (action === 'enter' && publisherContext) {
    console.log(
      `[PUBLISHER_CONTEXT] User ${userId} entering platform-curator mode as publisher "${publisherContext.publisherName}" (ID: ${publisherContext.cataloguePublisherId})`,
    );
  } else if (action === 'exit') {
    console.log(`[PUBLISHER_CONTEXT] User ${userId} exiting platform-curator mode`);
  }
}
