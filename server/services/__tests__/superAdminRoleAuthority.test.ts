import { describe, expect, it, vi } from 'vitest';
import { updateUserRoleWithAudit } from '../superAdminRoleAuthority';

type RoleState = {
  target: { id: number; role: string; sessionVersion: number } | null;
  audit: Array<Record<string, unknown>>;
};

function transactionalDatabase(initialTarget: RoleState['target'], failAudit = false) {
  let committed: RoleState = { target: initialTarget, audit: [] };
  const database = {
    transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
      const working: RoleState = {
        target: committed.target ? { ...committed.target } : null,
        audit: [...committed.audit],
      };
      const query = {} as any;
      query.from = vi.fn(() => query);
      query.where = vi.fn(() => query);
      query.limit = vi.fn(() => query);
      query.for = vi.fn(async () => (working.target ? [{ ...working.target }] : []));

      const tx = {
        select: vi.fn(() => query),
        update: vi.fn(() => ({
          set: vi.fn(values => ({
            where: vi.fn(async () => {
              if (!working.target) return;
              working.target = {
                ...working.target,
                role: values.role,
                sessionVersion: working.target.sessionVersion + 1,
              };
            }),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(async (entry: Record<string, unknown>) => {
            if (failAudit) throw new Error('audit write failed');
            working.audit.push(entry);
          }),
        })),
      };

      const result = await callback(tx);
      committed = working;
      return result;
    }),
  };

  return { database, snapshot: () => committed };
}

describe('super-admin role authority', () => {
  it('audits the before/after role and invalidates the target sessions in one transaction', async () => {
    const harness = transactionalDatabase({ id: 44, role: 'visitor', sessionVersion: 7 });

    await updateUserRoleWithAudit({
      database: harness.database,
      actorUserId: 3,
      targetUserId: 44,
      role: 'super_admin',
      requestId: 'role-change-request-1',
    });

    expect(harness.snapshot()).toMatchObject({
      target: { id: 44, role: 'super_admin', sessionVersion: 8 },
      audit: [
        {
          actorUserId: 3,
          action: 'update_user_role',
          targetType: 'user',
          targetId: 44,
          beforeData: { role: 'visitor', sessionVersion: 7 },
          afterData: { role: 'super_admin', sessionVersion: 8 },
          metadata: { requestId: 'role-change-request-1' },
        },
      ],
    });
  });

  it('rolls back privilege and session changes if the required audit insert fails', async () => {
    const harness = transactionalDatabase({ id: 44, role: 'visitor', sessionVersion: 7 }, true);

    await expect(
      updateUserRoleWithAudit({
        database: harness.database,
        actorUserId: 3,
        targetUserId: 44,
        role: 'super_admin',
        requestId: 'role-change-request-2',
      }),
    ).rejects.toThrow('audit write failed');

    expect(harness.snapshot()).toEqual({
      target: { id: 44, role: 'visitor', sessionVersion: 7 },
      audit: [],
    });
  });

  it('leaves the version unchanged for a no-op and rejects a missing target', async () => {
    const unchanged = transactionalDatabase({ id: 44, role: 'visitor', sessionVersion: 7 });
    await updateUserRoleWithAudit({
      database: unchanged.database,
      actorUserId: 3,
      targetUserId: 44,
      role: 'visitor',
      requestId: 'role-noop',
    });
    expect(unchanged.snapshot()).toEqual({
      target: { id: 44, role: 'visitor', sessionVersion: 7 },
      audit: [],
    });

    const missing = transactionalDatabase(null);
    await expect(
      updateUserRoleWithAudit({
        database: missing.database,
        actorUserId: 3,
        targetUserId: 44,
        role: 'agent',
        requestId: 'role-missing',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
