import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: getDbMock,
}));

import { servicesEngineService } from '../servicesEngineService';

const LEAD_FIXTURES = [
  {
    id: 11,
    serviceCategory: 'moving',
    status: 'quoted',
    createdAt: '2026-10-20 09:00:00',
    updatedAt: '2026-10-21 09:00:00',
    contextJson: JSON.stringify({ serviceCode: 'home_move' }),
    requesterLastName: 'Nkosi',
    requesterFirstName: 'Amina',
  },
];

function makeFakeLeadsDb(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: async () => rows,
              }),
            }),
          }),
        }),
      }),
    }),
  };
}

describe('servicesEngineService.listProviderLeads status filter', () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it('rejects a status outside the canonical lead vocabulary before querying', async () => {
    getDbMock.mockResolvedValue(makeFakeLeadsDb(LEAD_FIXTURES));

    await expect(
      servicesEngineService.listProviderLeads(20, 50, 0, 'bogus' as 'new'),
    ).rejects.toThrow('Invalid lead status filter');
  });

  it('filters custodian leads by the canonical status when supplied', async () => {
    getDbMock.mockResolvedValue(makeFakeLeadsDb(LEAD_FIXTURES));

    const rows = await servicesEngineService.listProviderLeads(20, 50, 0, 'quoted');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 11,
      status: 'quoted',
      serviceCode: 'home_move',
      requesterName: 'Amina Nkosi',
    });
  });

  it('returns unfiltered inbox rows without a status', async () => {
    getDbMock.mockResolvedValue(makeFakeLeadsDb(LEAD_FIXTURES));

    const rows = await servicesEngineService.listProviderLeads(20);

    expect(rows).toHaveLength(1);
  });
});
