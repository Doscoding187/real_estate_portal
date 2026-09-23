import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray, like, or } from 'drizzle-orm';
import { managerialAuditLogs, users } from '../../drizzle/schema';
import { db } from '../db';
import { updateUserRoleWithAudit } from '../services/superAdminRoleAuthority';

const describeWithDatabase: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires the disposable Database Authority target)`, fn)) as typeof describe);

describeWithDatabase('B07 role audit and session invalidation transaction', () => {
  const userIds: number[] = [];

  afterEach(async () => {
    const fixtures = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, 'b07-role-%@example.test'));
    const fixtureIds = [...new Set([...userIds, ...fixtures.map(row => Number(row.id))])];
    if (fixtureIds.length) {
      await db.delete(managerialAuditLogs).where(
        or(
          and(
            eq(managerialAuditLogs.targetType, 'user'),
            inArray(managerialAuditLogs.targetId, fixtureIds),
          ),
          inArray(managerialAuditLogs.actorUserId, fixtureIds),
        ),
      );
      await db.delete(users).where(inArray(users.id, fixtureIds));
    }
    userIds.length = 0;
  });

  async function insertUser(label: string, role: 'visitor' | 'super_admin') {
    const suffix = randomUUID();
    const [result] = await db.insert(users).values({
      email: `b07-role-${label}-${suffix}@example.test`,
      name: `B07 Role ${label}`,
      role,
      emailVerified: 1,
      sessionVersion: 10,
    } as any);
    const id = Number(result.insertId);
    userIds.push(id);
    return id;
  }

  it('persists promotions/demotions with audit evidence and invalidates the target session version', async () => {
    const actorUserId = await insertUser('actor', 'super_admin');
    const targetUserId = await insertUser('target', 'visitor');

    await updateUserRoleWithAudit({
      database: db,
      actorUserId,
      targetUserId,
      role: 'super_admin',
      requestId: 'b07-promotion',
    });
    await updateUserRoleWithAudit({
      database: db,
      actorUserId,
      targetUserId,
      role: 'visitor',
      requestId: 'b07-demotion',
    });

    const [target] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    const auditRows = await db
      .select()
      .from(managerialAuditLogs)
      .where(and(eq(managerialAuditLogs.targetType, 'user'), eq(managerialAuditLogs.targetId, targetUserId)));

    expect(target).toMatchObject({ role: 'visitor', sessionVersion: 12 });
    expect(auditRows).toHaveLength(2);
    expect(auditRows.map(row => [row.beforeData, row.afterData])).toEqual([
      [{ role: 'visitor', sessionVersion: 10 }, { role: 'super_admin', sessionVersion: 11 }],
      [{ role: 'super_admin', sessionVersion: 11 }, { role: 'visitor', sessionVersion: 12 }],
    ]);
    expect(auditRows.every(row => row.actorUserId === actorUserId)).toBe(true);
  });

  it('rolls back the role and session-version update when durable audit insertion fails', async () => {
    const targetUserId = await insertUser('rollback-target', 'visitor');

    await expect(
      updateUserRoleWithAudit({
        database: db,
        actorUserId: 2_000_000_000,
        targetUserId,
        role: 'super_admin',
        requestId: 'b07-audit-failure',
      }),
    ).rejects.toBeDefined();

    const [target] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    const auditRows = await db
      .select()
      .from(managerialAuditLogs)
      .where(and(eq(managerialAuditLogs.targetType, 'user'), eq(managerialAuditLogs.targetId, targetUserId)));

    expect(target).toMatchObject({ role: 'visitor', sessionVersion: 10 });
    expect(auditRows).toEqual([]);
  });
});
