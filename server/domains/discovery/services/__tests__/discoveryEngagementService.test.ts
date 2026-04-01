import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoveryEngagementService } from '../discoveryEngagementService';

const { recordInteractionMock } = vi.hoisted(() => ({
  recordInteractionMock: vi.fn(),
}));

vi.mock('../../../../services/exploreInteractionService', () => ({
  exploreInteractionService: {
    recordInteraction: recordInteractionMock,
  },
}));

describe('discoveryEngagementService', () => {
  beforeEach(() => {
    recordInteractionMock.mockReset();
    recordInteractionMock.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated like actions', async () => {
    await expect(
      discoveryEngagementService.handle(
        {
          itemId: '42',
          action: 'like',
        },
        {
          user: null,
        },
      ),
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: 'UNAUTHORIZED',
    });
  });

  it('maps completion and listing-open actions to richer legacy interaction types', async () => {
    await discoveryEngagementService.handle(
      {
        itemId: '42',
        action: 'viewComplete',
        context: {
          mode: 'shorts',
          position: 3,
          query: {
            mode: 'shorts',
            category: 'property',
          },
        },
      },
      {
        req: {
          headers: {
            'user-agent': 'vitest-agent',
            'x-session-id': 'session-abc',
          },
          ip: '127.0.0.1',
        },
      },
    );

    await discoveryEngagementService.handle(
      {
        itemId: '42',
        action: 'listingOpen',
        context: {
          mode: 'feed',
          query: {
            mode: 'feed',
            location: { type: 'city', id: 7 },
          },
        },
      },
      {
        req: {
          headers: {
            'user-agent': 'vitest-agent',
            'x-session-id': 'session-abc',
          },
          ip: '127.0.0.1',
        },
      },
    );

    expect(recordInteractionMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        contentId: 42,
        sessionId: 'guest-session-abc',
        interactionType: 'complete',
        feedType: 'category',
      }),
    );

    expect(recordInteractionMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        contentId: 42,
        sessionId: 'guest-session-abc',
        interactionType: 'click_cta',
        feedType: 'area',
      }),
    );
  });

  it('uses a stable guest session fallback when no explicit session header exists', async () => {
    await discoveryEngagementService.handle(
      {
        itemId: '9',
        action: 'share',
        context: {
          mode: 'home',
          query: { mode: 'home' },
        },
      },
      {
        req: {
          headers: {
            'user-agent': 'Mozilla/5.0 Test',
          },
          ip: '10.0.0.5',
        },
      },
    );

    expect(recordInteractionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'guest-10-0-0-5-Mozilla-5-0-Test',
        interactionType: 'share',
        feedType: 'recommended',
      }),
    );
  });
});
