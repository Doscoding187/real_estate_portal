import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER } from '../../shared/sharedLivingDomain';
const { getDbMock, captureMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  captureMock: vi.fn(),
}));
vi.mock('../db', () => ({ getDb: getDbMock }));
vi.mock('../services/publicLeadCaptureService', () => ({ capturePublicLead: captureMock }));

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
  beforeEach(() => {
    getDbMock.mockClear();
    captureMock.mockClear();
  });

  it('rejects runtime geography input at the request boundary', async () => {
    await expect(caller().search({ locationId: 'suburb:34' } as never)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('answers public search with an empty page and never touches the database', async () => {
    const empty = {
      items: [],
      total: 0,
      page: 0,
      pageSize: 24,
      hasMore: false,
      locationState: 'none',
    };
    await expect(caller().search({ canonicalPlaceId: PLACE_ID })).resolves.toEqual(empty);
    await expect(caller().search()).resolves.toEqual(empty);
    await expect(caller().search({ page: 3 })).resolves.toEqual({ ...empty, page: 3 });
    expect(getDbMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('answers detail and enquiry with NOT_FOUND, never reaching the lead capture or database', async () => {
    await expect(caller().detail({ slug: 'a-shared-place' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'This shared living listing was not found.',
    });
    await expect(
      caller().enquire({
        slPlaceId: 1,
        slSpaceId: 1,
        name: 'Test Person',
        email: 'test@example.com',
        message: 'Is this available?',
        captureRequestId: '123e4567-e89b-42d3-a456-426614174000',
        consent: { accepted: true, version: 'v1', source: 'test' },
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'This shared living listing was not found.',
    });
    expect(getDbMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('keeps authoring held with the exact schema dependency', async () => {
    const authed = sharedLivingRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'agent' },
      requestId: 'shared-living-canonical-contract-authed',
    } as never);
    await expect(authed.myPlaces()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER,
    });
  });
});
