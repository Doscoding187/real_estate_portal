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

type Registration = {
  id: number;
  requestedArea: 'distribution_manager' | 'agent' | 'agency_operations' | 'developer_operations' | 'other';
  fullName: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
};

function createCaller(user: { id: number; role: string } | null) {
  return distributionRouter.createCaller({
    user: user as any,
    req: { headers: {} } as any,
    res: {} as any,
    requestId: 'assisted-onboarding-test',
  } as any);
}

function createDb(registrations: Registration[]) {
  const updates: Array<Record<string, unknown>> = [];
  const inserts: Array<Record<string, unknown>> = [];
  const selectCalls: unknown[] = [];
  const selectQueue = registrations.map(registration => [registration]);

  const db = {
    select: vi.fn(() => {
      const builder = {
        from: vi.fn(() => builder),
        where: vi.fn(() => builder),
        limit: vi.fn(async () => {
          selectCalls.push(true);
          return selectQueue.shift() ?? [];
        }),
      };
      return builder;
    }),
    update: vi.fn(() => {
      const builder = {
        set: vi.fn((values: Record<string, unknown>) => {
          updates.push(values);
          return {
            where: vi.fn().mockResolvedValue({ affectedRows: 1 }),
          };
        }),
      };
      return builder;
    }),
    insert: vi.fn(() => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserts.push(values);
        return [{ insertId: 7001 }];
      }),
    })),
  };

  return { db, updates, inserts, selectCalls };
}

describe('assisted onboarding registration authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a non-manager request as reviewed without requiring an account or granting access', async () => {
    const fixture = createDb([
      {
        id: 41,
        requestedArea: 'developer_operations',
        fullName: 'Developer Applicant',
        email: 'applicant@example.com',
        status: 'pending',
      },
    ]);
    mockGetDb.mockResolvedValue(fixture.db);

    const result = await createCaller({ id: 99, role: 'super_admin' }).admin.reviewTeamRegistration({
      registrationId: 41,
      decision: 'approved',
      notes: 'Reviewed; ask applicant to complete account setup.',
    });

    expect(result).toMatchObject({
      success: true,
      registrationId: 41,
      status: 'approved',
      reviewOutcome: 'reviewed',
      userId: null,
      identityCreated: false,
    });
    expect(fixture.updates).toHaveLength(1);
    expect(fixture.updates[0]).toMatchObject({
      status: 'approved',
      reviewedBy: 99,
      reviewNotes: 'Reviewed; ask applicant to complete account setup.',
    });
    expect(fixture.inserts).toHaveLength(0);
    expect(fixture.selectCalls).toHaveLength(1);
  });

  it('keeps manager provisioning fail-closed when the invited person has no account', async () => {
    const fixture = createDb([
      {
        id: 42,
        requestedArea: 'distribution_manager',
        fullName: 'Unregistered Manager',
        email: 'manager@example.com',
        status: 'pending',
      },
      // The second select resolves the user lookup and deliberately returns no user.
      // The helper queue is extended below so the route reaches that precondition.
    ]);
    const firstSelect = fixture.db.select;
    let selectCount = 0;
    fixture.db.select = vi.fn(() => {
      selectCount += 1;
      if (selectCount === 1) return firstSelect();
      const builder = {
        from: vi.fn(() => builder),
        where: vi.fn(() => builder),
        limit: vi.fn(async () => []),
      };
      return builder;
    }) as typeof fixture.db.select;
    mockGetDb.mockResolvedValue(fixture.db);

    await expect(
      createCaller({ id: 99, role: 'super_admin' }).admin.reviewTeamRegistration({
        registrationId: 42,
        decision: 'approved',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('No user account exists'),
    });
    expect(fixture.updates).toHaveLength(0);
    expect(fixture.inserts).toHaveLength(0);
    expect(selectCount).toBe(2);
  });

  it('persists the selected assisted area and no authority mutation on public submission', async () => {
    const fixture = createDb([]);
    // Public submission first checks for a pending duplicate and then inserts.
    const selectBuilder = fixture.db.select;
    fixture.db.select = vi.fn(() => {
      const builder = selectBuilder();
      builder.limit = vi.fn(async () => []);
      return builder;
    }) as typeof fixture.db.select;
    mockGetDb.mockResolvedValue(fixture.db);

    const result = await createCaller(null).submitTeamRegistration({
      fullName: 'Agency Applicant',
      email: '  APPLICANT@EXAMPLE.COM ',
      requestedArea: 'agency_operations',
      notes: '[assisted_onboarding_request]\nMessage: Need workspace help',
    });

    expect(result).toMatchObject({ success: true, registrationId: 7001, status: 'pending' });
    expect(fixture.inserts).toEqual([
      expect.objectContaining({
        fullName: 'Agency Applicant',
        email: 'applicant@example.com',
        requestedArea: 'agency_operations',
        status: 'pending',
      }),
    ]);
    expect(fixture.inserts[0]).not.toHaveProperty('userId');
  });
});
