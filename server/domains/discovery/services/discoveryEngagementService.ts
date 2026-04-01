import { TRPCError } from '@trpc/server';
import type { DiscoveryEngagementEvent } from '../../../../shared/discovery/contracts';
import { exploreInteractionService } from '../../../services/exploreInteractionService';
import type { FeedType, InteractionType } from '../../../../shared/types';

interface DiscoveryEngagementContext {
  user?: {
    id: number;
  } | null;
  req?: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
  };
}

function toSafeSessionPart(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 64);
}

function requireAuthForAction(action: DiscoveryEngagementEvent['action'], userId?: number) {
  if ((action === 'like' || action === 'save') && !userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: `Authentication is required for discovery action "${action}"`,
    });
  }
}

function toContentId(itemId: string): number {
  const parsed = Number(itemId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Discovery engagement itemId must be a positive numeric string in the legacy adapter',
    });
  }
  return parsed;
}

function deriveFeedType(input: DiscoveryEngagementEvent): FeedType {
  if (input.context?.query?.location) return 'area';
  if (input.context?.query?.category) return 'category';
  return 'recommended';
}

function deriveInteractionType(action: DiscoveryEngagementEvent['action']): InteractionType {
  switch (action) {
    case 'view':
    case 'viewProgress':
      return 'view';
    case 'viewComplete':
      return 'complete';
    case 'like':
      return 'like';
    case 'save':
      return 'save';
    case 'share':
      return 'share';
    case 'notInterested':
      return 'skip';
    case 'listingOpen':
      return 'click_cta';
    default:
      return 'view';
  }
}

function buildSessionId(context: DiscoveryEngagementContext, userId?: number): string {
  if (userId) return `user-${userId}`;

  const explicitSessionHeader = context.req?.headers?.['x-session-id'];
  const forwardedForHeader = context.req?.headers?.['x-forwarded-for'];
  const userAgentHeader = context.req?.headers?.['user-agent'];

  const explicitSessionId = Array.isArray(explicitSessionHeader)
    ? explicitSessionHeader[0]
    : explicitSessionHeader;
  const forwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader;
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

  const headerSession = toSafeSessionPart(explicitSessionId);
  if (headerSession) return `guest-${headerSession}`;

  const ipPart = toSafeSessionPart(context.req?.ip || forwardedFor) ?? 'unknown-ip';
  const uaPart = toSafeSessionPart(userAgent) ?? 'unknown-agent';
  return `guest-${ipPart}-${uaPart}`;
}

export class DiscoveryEngagementService {
  async handle(input: DiscoveryEngagementEvent, context: DiscoveryEngagementContext = {}) {
    const userId = context.user?.id;
    requireAuthForAction(input.action, userId);

    const contentId = toContentId(input.itemId);
    const sessionId = buildSessionId(context, userId);
    const userAgentHeader = context.req?.headers?.['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;
    const interactionType = deriveInteractionType(input.action);

    await exploreInteractionService.recordInteraction({
      contentId,
      userId,
      sessionId,
      interactionType,
      feedType: deriveFeedType(input),
      deviceType: 'mobile',
      feedContext: {
        discoveryMode: input.context?.mode,
        discoveryPosition: input.context?.position,
        discoveryQuery: input.context?.query,
        discoveryAction: input.action,
      },
      userAgent,
      ipAddress: context.req?.ip,
      metadata: {
        discoveryAction: input.action,
        discoveryMode: input.context?.mode,
        discoveryPosition: input.context?.position,
      },
    });

    return {
      success: true,
      action: input.action,
      forwarded: true,
      interactionType,
    };
  }
}

export const discoveryEngagementService = new DiscoveryEngagementService();
