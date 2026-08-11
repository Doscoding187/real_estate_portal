import { describe, expect, it } from 'vitest';

import {
  assertDevelopmentPublicTransitionAllowed,
  SUPERSESSION_ACTIVATION_REQUIRED,
  SUPERSESSION_REVERSAL_REQUIRED,
} from '../developmentSupersessionPolicy';

function transactionFor(rows: Array<Record<string, unknown>>) {
  const query = {
    from: () => query,
    where: () => query,
    for: async () => rows,
  };

  return { select: () => query } as any;
}

describe('development supersession public-transition policy', () => {
  it('blocks a verified replacement until supersession activation', async () => {
    await expect(
      assertDevelopmentPublicTransitionAllowed(
        transactionFor([
          {
            id: 11,
            sourceDevelopmentId: 101,
            replacementDevelopmentId: 202,
            status: 'verified',
          },
        ]),
        202,
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: SUPERSESSION_ACTIVATION_REQUIRED,
    });
  });

  it('blocks an active source until supersession reversal', async () => {
    await expect(
      assertDevelopmentPublicTransitionAllowed(
        transactionFor([
          {
            id: 12,
            sourceDevelopmentId: 101,
            replacementDevelopmentId: 202,
            status: 'active',
          },
        ]),
        101,
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: SUPERSESSION_REVERSAL_REQUIRED,
    });
  });

  it('allows an active replacement through the normal publication lifecycle', async () => {
    await expect(
      assertDevelopmentPublicTransitionAllowed(
        transactionFor([
          {
            id: 13,
            sourceDevelopmentId: 101,
            replacementDevelopmentId: 202,
            status: 'active',
          },
        ]),
        202,
      ),
    ).resolves.toBeUndefined();
  });
});
