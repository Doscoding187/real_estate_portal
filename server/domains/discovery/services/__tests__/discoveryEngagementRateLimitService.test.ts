import { describe, expect, it } from 'vitest';

import {
  getDiscoveryEngagementActorKey,
  InMemoryDiscoveryEngagementRateLimiter,
} from '../discoveryEngagementRateLimitService';

describe('discovery engagement rate limit service', () => {
  it('uses the framework-resolved request IP instead of a caller-controlled forwarded header', () => {
    expect(
      getDiscoveryEngagementActorKey({
        req: {
          headers: { 'x-forwarded-for': '203.0.113.99, 10.0.0.8' },
          ip: '198.51.100.42',
          socket: { remoteAddress: '10.0.0.8' },
        },
      }),
    ).toBe('guest:198.51.100.42');
  });

  it('uses an authenticated user as the rate-limit identity', () => {
    expect(
      getDiscoveryEngagementActorKey({
        user: { id: 42 },
        req: { ip: '198.51.100.42' },
      }),
    ).toBe('user:42');
  });

  it('suppresses repeated content and action signals during their cooldown', () => {
    let now = 1_000;
    const limiter = new InMemoryDiscoveryEngagementRateLimiter({
      now: () => now,
      cooldownMsByInteractionType: { view: 5_000 },
    });
    const input = {
      actorKey: 'guest:198.51.100.42',
      contentId: 9,
      interactionType: 'view' as const,
    };

    expect(limiter.check(input)).toEqual({ allowed: true });
    expect(limiter.check(input)).toEqual({
      allowed: false,
      reason: 'cooldown',
      retryAfterMs: 5_000,
    });

    now += 5_000;

    expect(limiter.check(input)).toEqual({ allowed: true });
  });

  it('caps the number of distinct events an actor can record in a time window', () => {
    const limiter = new InMemoryDiscoveryEngagementRateLimiter({
      maxEventsPerWindow: 2,
      cooldownMsByInteractionType: { view: 0 },
      now: () => 1_000,
    });

    expect(
      limiter.check({ actorKey: 'guest:198.51.100.42', contentId: 1, interactionType: 'view' }),
    ).toEqual({ allowed: true });
    expect(
      limiter.check({ actorKey: 'guest:198.51.100.42', contentId: 2, interactionType: 'view' }),
    ).toEqual({ allowed: true });
    expect(
      limiter.check({ actorKey: 'guest:198.51.100.42', contentId: 3, interactionType: 'view' }),
    ).toMatchObject({ allowed: false, reason: 'window' });
  });
});
