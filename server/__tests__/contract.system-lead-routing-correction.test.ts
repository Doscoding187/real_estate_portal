import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCorrectLeadRouting } = vi.hoisted(() => ({
  mockCorrectLeadRouting: vi.fn(),
}));

vi.mock('../services/leadRoutingCorrectionService', () => ({
  correctLeadRouting: mockCorrectLeadRouting,
}));

import { appRouter } from '../routers';

describe('system.correctLeadRouting contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCorrectLeadRouting.mockResolvedValue({
      id: 88,
      agentId: 11,
      agencyId: 4,
      developerBrandProfileId: null,
      brandLeadStatus: null,
      leadDeliveryMethod: null,
    });
  });

  it('routes admin corrections through the correction service', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.correctLeadRouting({
      leadId: 88,
      routeType: 'agent',
      agentId: 11,
      note: 'Assign to the correct listing agent',
    });

    expect(mockCorrectLeadRouting).toHaveBeenCalledWith(
      {
        leadId: 88,
        routeType: 'agent',
        agentId: 11,
        note: 'Assign to the correct listing agent',
      },
      1,
    );
    expect(result).toMatchObject({
      id: 88,
      agentId: 11,
      agencyId: 4,
    });
  });
});
