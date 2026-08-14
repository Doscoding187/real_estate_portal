/**
 * Server-owned Developer Engine operating identity.
 *
 * Browser supplied publisher/context IDs are selectors only. Authority comes
 * from the authenticated user's active organisation membership or a
 * separately verified platform-reference publisher.
 */
import { TRPCError } from '@trpc/server';
import type { EnhancedTRPCContext } from './publisherContext';
import { getDeveloperByUserId } from '../services/developerService';
import { cataloguePublisherContextService } from '../services/cataloguePublisherContextService';

export type DeveloperEngineOperatingMode = 'developer' | 'platform_curator';

export type ResolvedIdentity =
  | {
      mode: 'developer';
      actor: { userId: number; role: 'property_developer' };
      /** Organisation ID. Kept under the historical name only at this boundary. */
      developerId: number;
      organisationId: number;
      cataloguePublisherId: number;
    }
  | {
      mode: 'platform_curator';
      actor: { userId: number; role: 'super_admin' };
      cataloguePublisherId: number;
      publisherName: string;
      publisherType: 'developer' | 'marketing_agency' | 'hybrid';
    };

export type OperatingIdentityOptions = {
  mode?: DeveloperEngineOperatingMode;
  cataloguePublisherId?: number | null;
};

function requestedPublisherId(
  ctx: EnhancedTRPCContext,
  options?: OperatingIdentityOptions,
): number | null {
  const requested = options?.cataloguePublisherId ?? null;
  const contextual = ctx.operatingAs?.cataloguePublisherId ?? null;
  if (requested !== null && contextual !== null && requested !== contextual) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'The requested publisher does not match the server operating identity.',
    });
  }
  return requested ?? contextual;
}

export async function resolveOperatingIdentity(
  ctx: EnhancedTRPCContext,
  options: OperatingIdentityOptions = {},
): Promise<ResolvedIdentity> {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });

  const publisherId = requestedPublisherId(ctx, options);
  if (options.mode === 'platform_curator' || ctx.user.role === 'super_admin') {
    if (ctx.user.role !== 'super_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'A super-admin is required for platform context.' });
    }
    if (!publisherId) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'An explicit platform curator publisher context is required.',
      });
    }
    if (!ctx.operatingAs) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'An active server-resolved platform curator context is required.',
      });
    }
    const publisher = await cataloguePublisherContextService.verifyPublisherContext(publisherId);
    return {
      mode: 'platform_curator',
      actor: { userId: ctx.user.id, role: 'super_admin' },
      cataloguePublisherId: publisher.cataloguePublisherId,
      publisherName: publisher.publisherName,
      publisherType: publisher.publisherType,
    };
  }

  if (options.mode === 'developer' || ctx.user.role === 'property_developer') {
    if (ctx.user.role !== 'property_developer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'A property developer actor is required.' });
    }
    const profile = await getDeveloperByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer organisation not found. Please complete onboarding.' });
    }
    if (!profile.publisherId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Developer organisation has no first-party catalogue publisher.',
      });
    }
    if (publisherId !== null && publisherId !== profile.publisherId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'The requested publisher is not owned by the authenticated organisation.',
      });
    }
    return {
      mode: 'developer',
      actor: { userId: ctx.user.id, role: 'property_developer' },
      developerId: profile.organisationId,
      organisationId: profile.organisationId,
      cataloguePublisherId: profile.publisherId,
    };
  }

  throw new TRPCError({ code: 'FORBIDDEN', message: 'The authenticated actor cannot operate the Developer Engine.' });
}

export function validateOwnership(fields: {
  developerId?: number | null;
  cataloguePublisherId?: number | null;
  organisationId?: number | null;
}): void {
  const publisherPaths = [fields.cataloguePublisherId].filter(
    value => value !== null && value !== undefined,
  );
  const organisationPaths = [fields.developerId, fields.organisationId].filter(
    value => value !== null && value !== undefined,
  );
  if (publisherPaths.length === 0 && organisationPaths.length === 0) {
    throw new Error('At least one ownership field must be set');
  }
  if (new Set(publisherPaths).size > 1 || new Set(organisationPaths).size > 1) {
    throw new Error('Conflicting ownership aliases supplied');
  }
}

export function getOwnershipFields(identity: ResolvedIdentity) {
  if (identity.mode === 'platform_curator') {
    return {
      cataloguePublisherId: identity.cataloguePublisherId,
      developerOrganisationId: null,
      developerId: null,
      devOwnerType: 'platform' as const,
    };
  }
  return {
    cataloguePublisherId: identity.cataloguePublisherId,
    developerOrganisationId: identity.organisationId,
    developerId: identity.organisationId,
    devOwnerType: 'developer' as const,
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
