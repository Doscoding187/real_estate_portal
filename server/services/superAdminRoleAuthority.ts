import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { managerialAuditLogs, users } from '../../drizzle/schema';
import { AuditActions } from '../_core/auditLog';

export type ManagedPlatformRole = 'visitor' | 'agent' | 'agency_admin' | 'super_admin';

type RoleTransactionDatabase = {
  transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
};

/**
 * Platform-wide role changes require an audit row in the same SQL transaction.
 * A failure to write the audit therefore rolls back the privilege change.
 */
export async function updateUserRoleWithAudit(input: {
  database: RoleTransactionDatabase;
  actorUserId: number;
  targetUserId: number;
  role: ManagedPlatformRole;
  requestId: string;
}): Promise<void> {
  await input.database.transaction(async tx => {
    const [target] = await tx
      .select({
        id: users.id,
        role: users.role,
        sessionVersion: users.sessionVersion,
      })
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .limit(1)
      .for('update');

    if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
    if (target.role === input.role) return;

    await tx
      .update(users)
      .set({
        role: input.role,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, input.targetUserId));

    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.actorUserId,
      action: AuditActions.UPDATE_USER_ROLE,
      targetType: 'user',
      targetId: input.targetUserId,
      beforeData: {
        role: target.role,
        sessionVersion: target.sessionVersion,
      },
      afterData: {
        role: input.role,
        sessionVersion: Number(target.sessionVersion) + 1,
      },
      metadata: { requestId: input.requestId },
    });
  });
}
