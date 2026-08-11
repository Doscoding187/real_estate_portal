/**
 * Developer Engine operating-identity authority.
 *
 * A browser may request an operating brand, but it never supplies authority.
 * Every returned identity is resolved from the authenticated user and a
 * fresh database-backed ownership/context check.
 */

import { TRPCError } from '@trpc/server';
import type { EnhancedTRPCContext } from './brandContext';
import { getDeveloperByUserId } from '../services/developerService';
import { brandContextService } from '../services/brandContextService';
import { getDb } from '../db-connection';
import { developerBrandProfiles } from '../../drizzle/schema';
import { and, eq } from 'drizzle-orm';

export type DeveloperEngineOperatingMode = 'developer' | 'platform_curator';

export type ResolvedIdentity =
  | {
      mode: 'developer';
      actor: { userId: number; role: 'property_developer' };
      developerId: number;
      /**
       * A developer profile can exist before its public brand is linked.
       * Developer-scoped authoring remains valid in that onboarding state;
       * a requested brand still has to pass the ownership check below.
       */
      brandProfileId: number | null;
      ownerType: 'developer';
    }
  | {
      mode: 'platform_curator';
      actor: { userId: number; role: 'super_admin' };
      brandProfileId: number;
      brandName: string;
      identityType: 'developer' | 'marketing_agency' | 'hybrid';
      ownerType: 'platform';
    };

export type OperatingIdentityOptions = {
  mode?: DeveloperEngineOperatingMode;
  brandProfileId?: number | null;
};

function requestedBrandProfileId(
  ctx: EnhancedTRPCContext,
  options?: OperatingIdentityOptions,
): number | null {
  const requested = options?.brandProfileId ?? null;
  const contextual = ctx.operatingAs?.brandProfileId ?? null;

  if (requested !== null && contextual !== null && requested !== contextual) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'The requested brand does not match the server operating identity.',
    });
  }

  return requested ?? contextual;
}

/**
 * Resolve one of the two supported Developer Engine operating modes.
 *
 * The platform-curator branch revalidates the brand even when the request
 * already passed tRPC middleware. This makes the service reusable at a
 * mutation boundary and closes the stale browser-context gap.
 */
export async function resolveOperatingIdentity(
  ctx: EnhancedTRPCContext,
  options: OperatingIdentityOptions = {},
): Promise<ResolvedIdentity> {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  const requestedMode = options.mode;
  const brandProfileId = requestedBrandProfileId(ctx, options);

  if (requestedMode === 'platform_curator' || ctx.user.role === 'super_admin') {
    if (ctx.user.role !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only an authenticated super-admin can operate as a platform curator.',
      });
    }

    if (!brandProfileId) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'An explicit platform curator brand context is required.',
      });
    }
    if (!ctx.operatingAs) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'An active server-resolved platform curator context is required.',
      });
    }

    const brand = await brandContextService.verifyBrandContext(brandProfileId);
    return {
      mode: 'platform_curator',
      actor: { userId: ctx.user.id, role: 'super_admin' },
      brandProfileId: brand.brandProfileId,
      brandName: brand.brandName,
      identityType: brand.identityType,
      ownerType: 'platform',
    };
  }

  if (requestedMode === 'developer' || ctx.user.role === 'property_developer') {
    if (ctx.user.role !== 'property_developer') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'A property developer actor is required for developer operations.',
      });
    }

    const profile = await getDeveloperByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Developer profile not found. Please complete onboarding.',
      });
    }

    const resolvedBrandProfileId = profile.brandProfile?.id ?? null;
    if (brandProfileId !== null && brandProfileId !== resolvedBrandProfileId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'The requested brand is not owned by the authenticated developer.',
      });
    }

    // Brand authority is required only when a brand is part of the requested
    // operating identity. A newly onboarded developer can still operate at
    // developer scope while its public brand profile is being established.
    if (resolvedBrandProfileId !== null) {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const [brand] = await database
        .select({
          id: developerBrandProfiles.id,
          ownerType: developerBrandProfiles.ownerType,
          linkedDeveloperAccountId: developerBrandProfiles.linkedDeveloperAccountId,
        })
        .from(developerBrandProfiles)
        .where(
          and(
            eq(developerBrandProfiles.id, resolvedBrandProfileId),
            eq(developerBrandProfiles.ownerType, 'developer'),
            eq(developerBrandProfiles.linkedDeveloperAccountId, profile.id),
          ),
        )
        .limit(1);

      if (!brand) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'The authenticated developer does not own the requested brand.',
        });
      }
    }

    return {
      mode: 'developer',
      actor: { userId: ctx.user.id, role: 'property_developer' },
      developerId: profile.id,
      brandProfileId: resolvedBrandProfileId,
      ownerType: 'developer',
    };
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'The authenticated actor cannot operate the Developer Engine.',
  });
}

/** Validate that exactly one supported ownership path is set. */
export function validateOwnership(fields: {
  brandProfileId?: number | null;
  developerId?: number | null;
}): void {
  const paths = [fields.brandProfileId, fields.developerId].filter(
    value => value !== null && value !== undefined,
  );

  if (paths.length === 0) throw new Error('At least one ownership field must be set');
  if (paths.length > 1) throw new Error('Only one ownership path allowed');
}

export function getOwnershipFields(identity: ResolvedIdentity): {
  developerBrandProfileId: number | null;
  developerId: number | null;
  devOwnerType: 'platform' | 'developer';
} {
  if (identity.mode === 'platform_curator') {
    return {
      developerBrandProfileId: identity.brandProfileId,
      developerId: null,
      devOwnerType: 'platform',
    };
  }

  return {
    developerBrandProfileId: identity.brandProfileId,
    developerId: identity.developerId,
    devOwnerType: 'developer',
  };
}

export function isPlatformCuratorMode(
  identity: ResolvedIdentity,
): identity is Extract<ResolvedIdentity, { mode: 'platform_curator' }> {
  return identity.mode === 'platform_curator';
}

export function isDeveloperMode(
  identity: ResolvedIdentity,
): identity is Extract<ResolvedIdentity, { mode: 'developer' }> {
  return identity.mode === 'developer';
}
