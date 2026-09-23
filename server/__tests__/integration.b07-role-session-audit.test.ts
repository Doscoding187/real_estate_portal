import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

// Auth snapshots JWT_SECRET when its environment module loads. Seed a
// deterministic test-only value before the router/auth import chain executes.
const priorJwtSecret = vi.hoisted(() => {
  const prior = process.env.JWT_SECRET;
  if (!prior) process.env.JWT_SECRET = 'b07-role-authority-test-secret';
  return prior;
});

import { and, asc, eq, inArray, like, or } from 'drizzle-orm';
import { COOKIE_NAME } from '../../shared/const';
import { managerialAuditLogs, users } from '../../drizzle/schema';
import { AuthService } from '../_core/auth';
import type { TrpcContext } from '../_core/context';
import { db } from '../db';
import { appRouter } from '../routers';
import type { ManagedPlatformRole } from '../services/superAdminRoleAuthority';

const describeWithDatabase: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(
        `${name} (requires the disposable Database Authority target)`,
        fn,
      )) as typeof describe);

describeWithDatabase('B07 mounted global role mutation authority', () => {
  const userIds: number[] = [];
  const authService = new AuthService();

  afterEach(async () => {
    const fixtures = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, 'b07-role-%@example.test'));
    const fixtureIds = [...new Set([...userIds, ...fixtures.map(row => Number(row.id))])];
    if (fixtureIds.length) {
      await db
        .delete(managerialAuditLogs)
        .where(
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

  afterAll(() => {
    if (priorJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = priorJwtSecret;
  });

  async function insertUser(label: string, role: ManagedPlatformRole) {
    const suffix = randomUUID();
    const email = `b07-role-${label}-${suffix}@example.test`;
    const [result] = await db.insert(users).values({
      email,
      name: `B07 Role ${label}`,
      role,
      emailVerified: 1,
      sessionVersion: 10,
    });
    const id = Number(result.insertId);
    userIds.push(id);
    return { id, email };
  }

  function callerFor(user: { id: number; role: string }, requestId: string) {
    return appRouter.createCaller({
      user,
      req: { headers: {} },
      res: {},
      requestId,
    } as unknown as TrpcContext);
  }

  async function authenticateToken(token: string) {
    return authService.authenticateRequest({
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    } as unknown as TrpcContext['req']);
  }

  it('routes both mounted role endpoints through atomic audit and revokes old sessions', async () => {
    const actor = await insertUser('actor', 'super_admin');
    const target = await insertUser('target', 'visitor');
    const prePromotionToken = await authService.createSessionToken(
      target.id,
      target.email,
      'B07 Role target',
      10,
    );
    const caller = callerFor({ id: actor.id, role: 'super_admin' }, 'b07-user-role-promotion');

    const promoted = await caller.user.updateRole({ userId: target.id, role: 'super_admin' });
    expect(promoted).toMatchObject({ role: 'super_admin', sessionVersion: 11 });
    await expect(authenticateToken(prePromotionToken)).rejects.toMatchObject({ statusCode: 403 });

    const preDemotionToken = await authService.createSessionToken(
      target.id,
      target.email,
      'B07 Role target',
      11,
    );
    await expect(authenticateToken(preDemotionToken)).resolves.toMatchObject({
      id: target.id,
      role: 'super_admin',
    });

    const adminCaller = callerFor({ id: actor.id, role: 'super_admin' }, 'b07-admin-role-demotion');
    await adminCaller.admin.updateUserRole({ userId: target.id, role: 'visitor' });
    const [demoted] = await db.select().from(users).where(eq(users.id, target.id)).limit(1);
    expect(demoted).toMatchObject({ role: 'visitor', sessionVersion: 12 });
    await expect(authenticateToken(preDemotionToken)).rejects.toMatchObject({ statusCode: 403 });

    const auditRows = await db
      .select()
      .from(managerialAuditLogs)
      .where(
        and(
          eq(managerialAuditLogs.targetType, 'user'),
          eq(managerialAuditLogs.targetId, target.id),
        ),
      )
      .orderBy(asc(managerialAuditLogs.id));

    expect(auditRows).toHaveLength(2);
    expect(auditRows.map(row => [row.beforeData, row.afterData])).toEqual([
      [
        { role: 'visitor', sessionVersion: 10 },
        { role: 'super_admin', sessionVersion: 11 },
      ],
      [
        { role: 'super_admin', sessionVersion: 11 },
        { role: 'visitor', sessionVersion: 12 },
      ],
    ]);
    expect(auditRows.every(row => row.actorUserId === actor.id)).toBe(true);
    expect(auditRows.every(row => row.action === 'update_user_role')).toBe(true);
    expect(auditRows.every(row => row.createdAt != null)).toBe(true);
    expect(
      auditRows.map(row => (row.metadata as { requestId?: string } | null)?.requestId),
    ).toEqual([
      'b07-user-role-promotion',
      'b07-admin-role-demotion',
    ]);
  });

  it('denies non-super-admin, unsupported role, and missing target requests', async () => {
    const actor = await insertUser('validation-actor', 'super_admin');
    const target = await insertUser('validation-target', 'visitor');
    const caller = callerFor({ id: actor.id, role: 'super_admin' }, 'b07-user-role-validation');
    const visitorCaller = callerFor({ id: target.id, role: 'visitor' }, 'b07-user-role-denied');

    await expect(
      visitorCaller.user.updateRole({ userId: actor.id, role: 'super_admin' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      caller.user.updateRole({
        userId: target.id,
        role: 'platform_owner' as unknown as ManagedPlatformRole,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      caller.user.updateRole({ userId: 2_000_000_000, role: 'agent' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const [unchanged] = await db.select().from(users).where(eq(users.id, target.id)).limit(1);
    expect(unchanged).toMatchObject({ role: 'visitor', sessionVersion: 10 });
    const auditRows = await db
      .select()
      .from(managerialAuditLogs)
      .where(eq(managerialAuditLogs.targetId, target.id));
    expect(auditRows).toEqual([]);
  });

  it('rolls back the mounted user route role change when required audit insertion fails', async () => {
    const target = await insertUser('rollback-target', 'visitor');
    // The tRPC caller is test context; this nonexistent actor ID deliberately
    // makes the real managerial_audit_logs foreign key reject the insert.
    const caller = callerFor({ id: 2_000_000_000, role: 'super_admin' }, 'b07-audit-failure');

    await expect(
      caller.user.updateRole({ userId: target.id, role: 'super_admin' }),
    ).rejects.toBeDefined();

    const [unchanged] = await db.select().from(users).where(eq(users.id, target.id)).limit(1);
    const auditRows = await db
      .select()
      .from(managerialAuditLogs)
      .where(
        and(
          eq(managerialAuditLogs.targetType, 'user'),
          eq(managerialAuditLogs.targetId, target.id),
        ),
      );

    expect(unchanged).toMatchObject({ role: 'visitor', sessionVersion: 10 });
    expect(auditRows).toEqual([]);
  });

  it('preserves the last-super-admin safeguard through the canonical authority', async () => {
    const onlyAdmin = await insertUser('only-admin', 'super_admin');
    const caller = callerFor({ id: onlyAdmin.id, role: 'super_admin' }, 'b07-last-admin');

    await expect(
      caller.user.updateRole({ userId: onlyAdmin.id, role: 'visitor' }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const [unchanged] = await db.select().from(users).where(eq(users.id, onlyAdmin.id)).limit(1);
    expect(unchanged).toMatchObject({ role: 'super_admin', sessionVersion: 10 });
  });
});
