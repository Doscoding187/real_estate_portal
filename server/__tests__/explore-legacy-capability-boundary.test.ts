import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../routers';

const publicCaller = appRouter.createCaller({
  req: { headers: {} },
  res: {},
  user: null,
} as any);

describe('legacy Explore capability boundary', () => {
  it('does not report disabled category discovery as a successful empty result', async () => {
    await expect(publicCaller.exploreApi.getCategories()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('does not report disabled engagement tracking as a successful write', async () => {
    await expect(
      publicCaller.exploreApi.trackEngagement({
        contentId: 101,
        engagementType: 'view',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });
  it('does not expose the legacy Explore save writer beside canonical favorites', async () => {
    const authenticatedCaller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 42, role: 'visitor' },
    } as any);

    await expect(
      authenticatedCaller.explore.saveProperty({ contentId: 101 }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('does not expose legacy tRPC score writers beside governed discovery engagement', async () => {
    await expect(
      publicCaller.explore.recordInteraction({
        contentId: 101,
        interactionType: 'view',
        feedType: 'recommended',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });

    await expect(
      publicCaller.explore.shareProperty({
        contentId: 101,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('keeps the legacy Express interaction and share routes from reaching the ranking writer', () => {
    const legacyRoutes = readFileSync(resolve('server/routes/exploreShorts.ts'), 'utf8');

    expect(legacyRoutes).not.toContain('exploreInteractionService.recordInteraction');
    expect(legacyRoutes).not.toContain('exploreInteractionService.shareProperty');
    expect(legacyRoutes).toContain("code: 'CAPABILITY_UNAVAILABLE'");
  });
});
