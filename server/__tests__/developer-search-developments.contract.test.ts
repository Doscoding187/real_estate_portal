import { describe, expect, it } from 'vitest';
import { developerRouter } from '../developerRouter';

describe('developer.searchDevelopments canonical assignment gate', () => {
  it('does not resolve public Development records by text while they lack Place assignments', async () => {
    const caller = developerRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as never);

    await expect(
      caller.searchDevelopments({ query: 'Harbour', developerId: 7, limit: 10 }),
    ).resolves.toEqual([]);
  });
});
