import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCompletePlatformLeadAction, mockCorrectLeadRouting } = vi.hoisted(() => ({
  mockCompletePlatformLeadAction: vi.fn(),
  mockCorrectLeadRouting: vi.fn(),
}));

vi.mock('../services/leadRoutingCorrectionService', () => ({
  completePlatformLeadAction: mockCompletePlatformLeadAction,
  correctLeadRouting: mockCorrectLeadRouting,
}));

import { appRouter } from '../routers';

const callerFor = (role?: string) =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: role ? { id: 1, role } : null,
  } as any);

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
    mockCompletePlatformLeadAction.mockResolvedValue({
      id: 88,
      action: 'contacted',
      status: 'contacted',
      deliveryStatus: 'delivered',
    });
  });

  const correctionInput = {
    leadId: 88,
    routeType: 'agent' as const,
    agentId: 11,
    note: 'Assign to the correct listing agent',
  };

  it('rejects anonymous callers before mutating global lead custody', async () => {
    await expect(callerFor().system.correctLeadRouting(correctionInput)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    expect(mockCorrectLeadRouting).not.toHaveBeenCalled();
  });

  it.each(['visitor', 'agent', 'agency_admin', 'property_developer', 'service_provider'])(
    'rejects %s before mutating global lead custody',
    async role => {
      await expect(
        callerFor(role).system.correctLeadRouting(correctionInput),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockCorrectLeadRouting).not.toHaveBeenCalled();
    },
  );

  it('routes super-admin corrections through the correction service', async () => {
    const caller = callerFor('super_admin');

    const result = await caller.system.correctLeadRouting(correctionInput);

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

  it.each(['private', 'clear'])('rejects the legacy %s custody route at the API boundary', async routeType => {
    await expect(
      callerFor('super_admin').system.correctLeadRouting({
        leadId: 88,
        routeType: routeType as any,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockCorrectLeadRouting).not.toHaveBeenCalled();
  });

  it('protects platform custody completion and records the super-admin actor', async () => {
    const input = { leadId: 88, action: 'contacted' as const, note: 'Buyer reached by phone' };

    await expect(callerFor('agency_admin').system.completePlatformLeadAction(input)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockCompletePlatformLeadAction).not.toHaveBeenCalled();

    await expect(callerFor('super_admin').system.completePlatformLeadAction(input)).resolves.toMatchObject({
      deliveryStatus: 'delivered',
    });
    expect(mockCompletePlatformLeadAction).toHaveBeenCalledWith(input, 1);
  });

  it('keeps the global platform-custody queue behind the super-admin boundary', async () => {
    await expect(
      callerFor().superAdminPublisher.getPlatformManagedLeads({ limit: 10, offset: 0 }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      callerFor('agency_admin').superAdminPublisher.getPlatformManagedLeads({
        limit: 10,
        offset: 0,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
