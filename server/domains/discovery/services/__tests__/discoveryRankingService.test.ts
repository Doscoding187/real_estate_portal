import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoveryRankingService } from '../discoveryRankingService';

describe('discoveryRankingService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefers stronger query matches and fresher engagement', () => {
    const ranked = discoveryRankingService.rankItems(
      [
        {
          id: 1,
          category: 'property',
          contentType: 'video',
          createdAt: '2026-03-10T00:00:00.000Z',
          actor: { id: 5 },
          viewCount: 1200,
        },
        {
          id: 2,
          category: 'service',
          contentType: 'video',
          createdAt: '2026-03-19T00:00:00.000Z',
          actor: { id: 9 },
          viewCount: 100,
        },
        {
          id: 3,
          category: 'property',
          contentType: 'walkthrough',
          createdAt: '2026-03-19T12:00:00.000Z',
          actor: { id: 9 },
          viewCount: 4200,
        },
      ],
      {
        mode: 'shorts',
        category: 'property',
        creatorActorId: 9,
        contentType: 'video',
        limit: 20,
      },
    );

    expect(ranked.map(item => item.id)).toEqual([3, 2, 1]);
    expect(ranked[0].discoveryRanking.score).toBeGreaterThan(ranked[1].discoveryRanking.score);
  });
});
