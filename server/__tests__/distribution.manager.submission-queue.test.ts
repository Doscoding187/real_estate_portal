import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../_core/env', () => ({
  ENV: {
    distributionNetworkEnabled: true,
    appUrl: 'http://localhost:5173',
  },
}));

import { distributionRouter } from '../distributionRouter';

function createSelectBuilder(result: unknown) {
  const builder: any = {};
  builder.from = vi.fn(() => builder);
  builder.innerJoin = vi.fn(() => builder);
  builder.leftJoin = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.orderBy = vi.fn(() => builder);
  builder.limit = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function createMockDb(selectResults: unknown[]) {
  const queue = [...selectResults];
  return {
    select: vi.fn(() => createSelectBuilder(queue.shift() ?? [])),
  } as any;
}

function createSuperAdminCaller() {
  return distributionRouter.createCaller({
    user: {
      id: 1,
      role: 'super_admin',
      email: 'superadmin@test.com',
    } as any,
    req: {} as any,
    res: {} as any,
    requestId: 'test-request',
  } as any);
}

describe('distribution.manager submission operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listSubmissionQueue derives docs-complete and at-risk flags for submitted deals', async () => {
    const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    mockGetDb.mockResolvedValue(
      createMockDb([
        [
          {
            id: 101,
            programId: 11,
            developmentId: 21,
            developmentName: 'Skyline Estate',
            agentId: 501,
            buyerName: 'Alice Buyer',
            buyerEmail: 'alice@test.com',
            buyerPhone: '0820000000',
            commissionStatus: 'not_ready',
            submittedAt: '2026-02-20 08:00:00',
            updatedAt: fiftyHoursAgo,
          },
        ],
        [
          {
            id: 501,
            name: 'Referrer One',
            firstName: 'Referrer',
            lastName: 'One',
            email: 'referrer.one@test.com',
            role: 'agent',
          },
        ],
        [
          {
            id: 301,
            dealId: 101,
            metadata: {
              referralContext: {
                documentChecklist: {
                  idUploaded: true,
                  payslipsUploaded: true,
                  bankStatementsUploaded: true,
                  additionalRequiredDocuments: [],
                  additionalDocumentsUploaded: false,
                },
              },
            },
            eventAt: '2026-02-20 08:00:00',
          },
        ],
      ]),
    );

    const caller = createSuperAdminCaller();
    const result = await caller.manager.listSubmissionQueue({ limit: 20 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 101,
      currentStage: 'application_submitted',
      documentsComplete: true,
      atRisk: true,
    });
    expect(String(result[0].agentDisplayName || '')).toContain('Referrer');
    expect(typeof result[0].hoursInQueue === 'number').toBe(true);
  });

  it('listSubmissionDecisionAudit returns manager decisions with actor and rejection reason', async () => {
    mockGetDb.mockResolvedValue(
      createMockDb([
        [
          {
            id: 901,
            dealId: 101,
            programId: 11,
            developmentId: 21,
            developmentName: 'Skyline Estate',
            buyerName: 'Alice Buyer',
            fromStage: 'application_submitted',
            toStage: 'cancelled',
            eventType: 'stage_transition',
            eventAt: '2026-02-25 09:00:00',
            notes: 'Rejected at manager gate',
            metadata: {
              source: 'manager.advanceDealStage',
              rejectionReason: 'Incomplete KYC pack',
            },
            actorUserId: 88,
            actorName: 'Manager Neo',
            actorFirstName: 'Neo',
            actorLastName: 'Mokoena',
            actorEmail: 'neo@test.com',
          },
          {
            id: 900,
            dealId: 100,
            programId: 11,
            developmentId: 21,
            developmentName: 'Skyline Estate',
            buyerName: 'John Buyer',
            fromStage: 'application_submitted',
            toStage: 'contract_signed',
            eventType: 'stage_transition',
            eventAt: '2026-02-25 08:00:00',
            notes: 'Approved by manager',
            metadata: {
              source: 'manager.advanceDealStage',
              rejectionReason: null,
            },
            actorUserId: 88,
            actorName: 'Manager Neo',
            actorFirstName: 'Neo',
            actorLastName: 'Mokoena',
            actorEmail: 'neo@test.com',
          },
          {
            id: 899,
            dealId: 99,
            programId: 11,
            developmentId: 21,
            developmentName: 'Skyline Estate',
            buyerName: 'Filtered Out',
            fromStage: 'application_submitted',
            toStage: 'contract_signed',
            eventType: 'stage_transition',
            eventAt: '2026-02-25 07:00:00',
            notes: 'System transition',
            metadata: {
              source: 'system',
              rejectionReason: null,
            },
            actorUserId: 0,
            actorName: 'System',
            actorFirstName: null,
            actorLastName: null,
            actorEmail: null,
          },
        ],
      ]),
    );

    const caller = createSuperAdminCaller();
    const result = await caller.manager.listSubmissionDecisionAudit({ limit: 10 });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 901,
      decision: 'rejected',
      rejectionReason: 'Incomplete KYC pack',
    });
    expect(result[1]).toMatchObject({
      id: 900,
      decision: 'approved',
      rejectionReason: null,
    });
    expect(String(result[0].actorDisplayName || '')).toContain('Manager');
  });
});
