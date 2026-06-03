import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVELOPMENT_UNIT_ID_MAX_LENGTH } from '../../shared/developmentUnitIdentity';

const capturePublicLeadMock = vi.hoisted(() => vi.fn());

vi.mock('../services/publicLeadCaptureService', () => ({
  capturePublicLead: capturePublicLeadMock,
}));

import { appRouter } from '../routers';

function createPublicCaller() {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as any);
}

describe('developer.createLead contract', () => {
  beforeEach(() => {
    capturePublicLeadMock.mockReset();
    capturePublicLeadMock.mockResolvedValue({
      success: true,
      leadId: 44,
      route: 'direct',
      message: 'Lead captured',
    });
  });

  it('passes canonical unit identity and pricing context to public lead capture', async () => {
    const canonicalUnitId = '123e4567-e89b-12d3-a456-426614174000';

    expect(canonicalUnitId).toHaveLength(DEVELOPMENT_UNIT_ID_MAX_LENGTH);

    const result = await createPublicCaller().developer.createLead({
      developmentId: 77,
      developerBrandProfileId: 13,
      unitId: canonicalUnitId,
      unitName: 'Type A',
      unitPriceFrom: 1299000,
      unitPriceLabel: 'Price from',
      transactionType: 'sale',
      unitBedrooms: 3,
      unitBathrooms: 2,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0820000000',
      message: 'Please send me more information.',
      leadSource: 'development_detail_info',
      referrerUrl: 'https://example.test/development/demo/unit/123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result).toEqual({
      success: true,
      leadId: 44,
      route: 'direct',
      message: 'Lead captured',
    });
    expect(capturePublicLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        developerBrandProfileId: 13,
        unitId: canonicalUnitId,
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitPriceLabel: 'Price from',
        transactionType: 'sale',
        unitBedrooms: 3,
        unitBathrooms: 2,
        source: 'development_detail_info',
        leadSource: 'development_detail_info',
      }),
    );
  });

  it('rejects unit identity values longer than the persisted unit id contract', async () => {
    await expect(
      createPublicCaller().developer.createLead({
        developmentId: 77,
        unitId: 'x'.repeat(DEVELOPMENT_UNIT_ID_MAX_LENGTH + 1),
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    ).rejects.toThrow();

    expect(capturePublicLeadMock).not.toHaveBeenCalled();
  });
});
