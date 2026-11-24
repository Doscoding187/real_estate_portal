import { beforeEach, describe, expect, it, vi } from 'vitest';
const { captureMock, getDbMock } = vi.hoisted(() => ({ captureMock: vi.fn(), getDbMock: vi.fn() }));
vi.mock('../services/publicLeadCaptureService', () => ({ capturePublicLead: captureMock }));
vi.mock('../db-connection', () => ({ getDb: getDbMock }));

import { sharedLivingRouter } from '../sharedLivingRouter';

function caller(user: { id: number; role: string } | null = null) {
  return sharedLivingRouter.createCaller({
    req: { headers: {} },
    res: {},
    user,
    requestId: 'shared-living-canonical-contract',
  } as never);
}

describe('Shared Living platform boundaries', () => {
  beforeEach(() => { captureMock.mockReset(); getDbMock.mockResolvedValue(null); });

  it('rejects display-text or legacy geography at the public search boundary', async () => {
    await expect(caller().search({ locationId: 'suburb:34' } as never)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller().search({ location: 'Sandton' } as never)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('restricts inventory management to authenticated agent accounts', async () => {
    await expect(caller().myPlaces()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller({ id: 15, role: 'visitor' }).myPlaces()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller({ id: 15, role: 'agent' }).myPlaces()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('requires an exact residence and space target and routes enquiries through canonical lead capture', async () => {
    await expect(caller().enquire({
      slPlaceId: 4,
      name: 'Test Person',
      email: 'test@example.com',
      message: 'Is this space available?',
      captureRequestId: '123e4567-e89b-42d3-a456-426614174000',
      consent: { accepted: true, version: 'shared-living-enquiry-v1', source: 'test' },
    } as never)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(captureMock).not.toHaveBeenCalled();

    captureMock.mockResolvedValue({ success: true, captureRequestId: '123e4567-e89b-42d3-a456-426614174000' });
    await caller().enquire({
      slPlaceId: 4,
      slSpaceId: 9,
      name: 'Test Person',
      email: 'test@example.com',
      message: 'Is this space available?',
      captureRequestId: '123e4567-e89b-42d3-a456-426614174000',
      consent: { accepted: true, version: 'shared-living-enquiry-v1', source: 'test' },
    });
    expect(captureMock).toHaveBeenCalledWith(expect.objectContaining({ slPlaceId: 4, slSpaceId: 9, source: 'shared_living' }));
  });
});
