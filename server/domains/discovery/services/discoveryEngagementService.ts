import { TRPCError } from '@trpc/server';
import type { DiscoveryEngagementEvent } from '../../../../shared/discovery/contracts';
import { exploreInteractionService } from '../../../services/exploreInteractionService';

interface DiscoveryEngagementContext {
  user?: {
    id: number;
  } | null;
  req?: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
  };
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

export class DiscoveryEngagementService {
  async handle(input: DiscoveryEngagementEvent, context: DiscoveryEngagementContext = {}) {
    const userId = context.user?.id;
    requireAuthForAction(input.action, userId);

    const contentId = toContentId(input.itemId);
    const sessionId = userId ? `user-${userId}` : `guest-${Date.now()}`;
    const userAgentHeader = context.req?.headers?.['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    switch (input.action) {
      case 'like':
        await exploreInteractionService.recordInteraction({
          contentId,
          userId,
          sessionId,
          interactionType: 'like',
          feedType: 'recommended',
          deviceType: 'mobile',
          feedContext: {
            discoveryMode: input.context?.mode,
            discoveryPosition: input.context?.position,
            discoveryQuery: input.context?.query,
            discoveryAction: input.action,
          },
          userAgent,
          ipAddress: context.req?.ip,
        });
        return { success: true, action: input.action, forwarded: true };

      case 'save':
        await exploreInteractionService.saveProperty(contentId, userId!);
        return { success: true, action: input.action, forwarded: true };

      case 'share':
        await exploreInteractionService.shareProperty(contentId, userId, sessionId, 'discovery');
        return { success: true, action: input.action, forwarded: true };

      case 'view':
      case 'viewProgress':
      case 'viewComplete':
      case 'notInterested':
      case 'listingOpen':
        await exploreInteractionService.recordInteraction({
          contentId,
          userId,
          sessionId,
          interactionType:
            input.action === 'notInterested'
              ? 'skip'
              : input.action === 'listingOpen'
                ? 'contact'
                : 'view',
          feedType: 'recommended',
          deviceType: 'mobile',
          feedContext: {
            discoveryMode: input.context?.mode,
            discoveryPosition: input.context?.position,
            discoveryQuery: input.context?.query,
            discoveryAction: input.action,
          },
          userAgent,
          ipAddress: context.req?.ip,
        });
        return { success: true, action: input.action, forwarded: true };

      default:
        return { success: false, action: input.action, forwarded: false };
    }
  }
}

export const discoveryEngagementService = new DiscoveryEngagementService();
