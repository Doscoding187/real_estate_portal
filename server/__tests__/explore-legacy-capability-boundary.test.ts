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
});
