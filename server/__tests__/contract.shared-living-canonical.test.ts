import { describe, expect, it } from 'vitest';
import { SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER } from '../../shared/sharedLivingDomain';
import { sharedLivingRouter } from '../sharedLivingRouter';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

function caller() {
  return sharedLivingRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
    requestId: 'shared-living-canonical-contract',
  } as never);
}

describe('Shared Living canonical assignment gate', () => {
  it('rejects runtime geography input at the request boundary', async () => {
    await expect(caller().search({ locationId: 'suburb:34' } as never)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('keeps Place-based search and detail closed with the exact schema dependency', async () => {
    await expect(caller().search({ canonicalPlaceId: PLACE_ID })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER,
    });
    await expect(caller().detail({ slug: 'a-shared-place' })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER,
    });
  });
});
