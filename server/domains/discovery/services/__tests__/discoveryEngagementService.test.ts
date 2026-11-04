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
          eventId: 'event-like-42',
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
        eventId: 'event-complete-42',
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
        eventId: 'event-open-42',
        action: 'listingOpen',
        context: {
          mode: 'feed',
          query: {
            mode: 'feed',
            canonicalPlaceId: 'pl-place-01-000000000000000000000007',
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

  it('keys the guest session fallback by a stable hash instead of raw network/agent parts', async () => {
    const context = {
      req: {
        headers: {
          'user-agent': 'Mozilla/5.0 Test',
        },
        ip: '10.0.0.5',
      },
    };

    await discoveryEngagementService.handle(
      {
        itemId: '9',
        eventId: 'event-share-9',
        action: 'share',
        context: {
          mode: 'home',
          query: { mode: 'home' },
        },
      },
      context,
    );

    await discoveryEngagementService.handle(
      {
        itemId: '9',
        eventId: 'event-share-10',
        action: 'share',
        context: {
          mode: 'home',
          query: { mode: 'home' },
        },
      },
      context,
    );

    const [first, second] = recordInteractionMock.mock.calls.map(call => call[0]);

    expect(first.sessionId).toMatch(/^guest-[0-9a-f]{32}$/);
    expect(first.sessionId).not.toContain('10-0-0-5');
    expect(first.sessionId).not.toContain('Mozilla');
    expect(second.sessionId).toBe(first.sessionId);
    expect(first).toEqual(
      expect.objectContaining({
        interactionType: 'share',
        feedType: 'recommended',
      }),
    );
  });
});
