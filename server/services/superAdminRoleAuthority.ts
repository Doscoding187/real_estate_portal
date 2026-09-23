import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { managerialAuditLogs, users } from '../../drizzle/schema';
import { AuditActions } from '../_core/auditLog';

/** Every role accepted by the canonical users.role model for global transitions. */
export const MANAGED_PLATFORM_ROLES = [
  'visitor',
  'agent',
  'agency_admin',
  'property_developer',
  'service_provider',
  'super_admin',
] as const;

export type ManagedPlatformRole = (typeof MANAGED_PLATFORM_ROLES)[number];

export function isManagedPlatformRole(value: unknown): value is ManagedPlatformRole {
  return typeof value === 'string' && (MANAGED_PLATFORM_ROLES as readonly string[]).includes(value);
}

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
  if (!isManagedPlatformRole(input.role)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported platform role.' });
  }

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

    // Preserve the existing last-super-admin safeguard inside the same
    // transaction and lock the matching role rows so concurrent demotions
    // cannot both pass a stale count check.
    if (target.role === 'super_admin' && input.role !== 'super_admin') {
      const superAdmins = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'super_admin'))
        .for('update');
      if (superAdmins.length <= 1) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot demote the last super admin.',
        });
      }
    }

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
