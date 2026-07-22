import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockLogAudit } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  getAgencyDashboardStats: vi.fn(),
  getAgencyPerformanceData: vi.fn(),
  getAgencyRecentLeads: vi.fn(),
  getAgencyRecentListings: vi.fn(),
  getAgencyAgents: vi.fn(),
  getLeadConversionStats: vi.fn(),
  getAgencyCommissionStats: vi.fn(),
  getAgentPerformanceLeaderboard: vi.fn(),
}));

vi.mock('../_core/auditLog', () => ({
  logAudit: mockLogAudit,
}));

import { agencyRouter } from '../agencyRouter';

function createCaller(user: any) {
  return agencyRouter.createCaller({
    user,
    req: {} as any,
    res: {} as any,
    requestId: 'agency-lead-followup-test',
  } as any);
}

function makeAgencyAdmin(agencyId = 44) {
  return {
    id: 9001,
    role: 'agency_admin',
    email: 'agency-admin@example.com',
    agencyId,
  };
}

describe('agency lead visibility and follow-up contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only agency-scoped leads with assigned agent and listing context', async () => {
    const rows = [
      {
        lead: {
          id: 808,
          agencyId: 44,
          agentId: 33,
          propertyId: 501,
          name: 'Buyer One',
          email: 'buyer@example.com',
          phone: '+27110001111',
          message: 'I am interested.',
          status: 'new',
          leadType: 'inquiry',
          source: 'property_detail',
          leadSource: 'property_detail',
          createdAt: '2026-07-04T08:00:00.000Z',
        },
        property: {
          id: 501,
          title: 'Canonical Agent Home',
          city: 'Johannesburg',
          province: 'Gauteng',
          price: 2500000,
          status: 'available',
        },
        agent: {
          id: 33,
          userId: 100,
          firstName: 'Jane',
          lastName: 'Agent',
          displayName: 'Jane Agent',
          email: 'jane@example.com',
          phone: '+27110002222',
        },
      },
    ];

    const limit = vi.fn().mockResolvedValue(rows);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const secondLeftJoin = vi.fn(() => ({ where }));
    const firstLeftJoin = vi.fn(() => ({ leftJoin: secondLeftJoin }));
    const from = vi.fn(() => ({ leftJoin: firstLeftJoin }));
    const select = vi.fn(() => ({ from }));

    mockGetDb.mockResolvedValue({ select });

    const caller = createCaller(makeAgencyAdmin(44));
    const result = await caller.getLeads({ status: 'all', limit: 25 });

    expect(limit).toHaveBeenCalledWith(25);
    expect(where).toHaveBeenCalledOnce();
    expect(result).toEqual([
      expect.objectContaining({
        id: 808,
        agencyId: 44,
        name: 'Buyer One',
        property: expect.objectContaining({
          id: 501,
          title: 'Canonical Agent Home',
          price: 2500000,
        }),
        agent: expect.objectContaining({
          id: 33,
          name: 'Jane Agent',
          email: 'jane@example.com',
        }),
      }),
    ]);
  });

  it('updates status only after finding the lead inside the admin agency', async () => {
    const lead = {
      id: 808,
      agencyId: 44,
      status: 'new',
      lastContactedAt: null,
    };

    const selectLimit = vi.fn().mockResolvedValue([lead]);
    const selectWhere = vi.fn(() => ({ limit: selectLimit }));
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    const select = vi.fn(() => ({ from: selectFrom }));

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set: updateSet }));

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values: insertValues }));

    mockGetDb.mockResolvedValue({ select, update, insert });

    const caller = createCaller(makeAgencyAdmin(44));
    const result = await caller.updateLeadStatus({
      leadId: 808,
      status: 'contacted',
      notes: 'Called buyer.',
    });

    expect(result).toEqual({ success: true });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'contacted',
        lastContactedAt: expect.any(String),
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 808,
        userId: 9001,
        type: 'status_change',
        description: 'Called buyer.',
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9001,
        action: 'agency.lead_status_update',
        targetType: 'lead',
        targetId: 808,
        metadata: expect.objectContaining({
          agencyId: 44,
          previousStatus: 'new',
          nextStatus: 'contacted',
        }),
      }),
    );
  });

  it('does not update a lead outside the admin agency', async () => {
    const selectLimit = vi.fn().mockResolvedValue([]);
    const selectWhere = vi.fn(() => ({ limit: selectLimit }));
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    const select = vi.fn(() => ({ from: selectFrom }));
    const update = vi.fn();
    const insert = vi.fn();

    mockGetDb.mockResolvedValue({ select, update, insert });

    const caller = createCaller(makeAgencyAdmin(44));

    await expect(
      caller.updateLeadStatus({
        leadId: 999,
        status: 'qualified',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Lead not found',
    });

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('keeps buyer contact outcomes, SLA escalation, and My Day work in the canonical lead model', () => {
    const root = process.cwd();
    const router = readFileSync(path.resolve(root, 'server/agencyRouter.ts'), 'utf8');
    const schema = readFileSync(path.resolve(root, 'drizzle/schema/leads.ts'), 'utf8');

    expect(schema).toContain("nextAction: varchar('nextAction'");
    expect(schema).toContain("firstRespondedAt: timestamp('firstRespondedAt'");
    expect(schema).toContain("'contact_attempt'");
    expect(router).toContain('recordLeadContactAttempt');
    expect(router).toContain('Record the next action for every active buyer lead.');
    expect(router).toContain('firstResponseOverdueLeads');
    expect(router).toContain('FIRST_RESPONSE_SLA_MINUTES = 15');
  });
});
