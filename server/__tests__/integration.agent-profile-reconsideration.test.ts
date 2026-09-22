import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { agents, auditLogs, notifications, users } from '../../drizzle/schema';
import { appRouter } from '../routers';
import { getDb } from '../db';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase('Agent profile reconsideration', () => {
  const created = {
    reviewerId: 0,
    agentUserId: 0,
    agentId: 0,
  };

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (created.reviewerId && created.agentId) {
      await db
        .delete(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, created.reviewerId),
            eq(auditLogs.targetType, 'agent'),
            eq(auditLogs.targetId, created.agentId),
          ),
        );
    }
    if (created.agentUserId) {
      await db.delete(notifications).where(eq(notifications.userId, created.agentUserId));
    }
    if (created.agentId) await db.delete(agents).where(eq(agents.id, created.agentId));
    if (created.agentUserId) await db.delete(users).where(eq(users.id, created.agentUserId));
    if (created.reviewerId) await db.delete(users).where(eq(users.id, created.reviewerId));

    Object.assign(created, { reviewerId: 0, agentUserId: 0, agentId: 0 });
  });

  it('reconsiders a corrected rejected profile through the privileged authority with an audit trail', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();

    const [reviewerResult] = await db
      .insert(users)
      .values({
        email: `profile-reviewer-${suffix}@invalid.example`,
        name: 'Profile Reviewer',
        role: 'super_admin',
        emailVerified: 1,
      } as any);
    created.reviewerId = Number(reviewerResult.insertId);

    const [agentUserResult] = await db
      .insert(users)
      .values({
        email: `corrected-agent-${suffix}@invalid.example`,
        name: 'Corrected Agent',
        role: 'agent',
        emailVerified: 1,
      } as any);
    created.agentUserId = Number(agentUserResult.insertId);

    const [agentResult] = await db
      .insert(agents)
      .values({
        userId: created.agentUserId,
        firstName: 'Corrected',
        lastName: 'Agent',
        displayName: 'Corrected Agent',
        email: `corrected-agent-${suffix}@invalid.example`,
        slug: `corrected-agent-${suffix}`,
        bio: 'Corrected professional profile details for reviewer reconsideration.',
        status: 'rejected',
        rejectionReason: 'Please correct the professional profile details.',
        isFeatured: 0,
        isVerified: 0,
      } as any);
    created.agentId = Number(agentResult.insertId);

    const reviewer = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: created.reviewerId, role: 'super_admin' },
    } as any);

    await expect(reviewer.admin.approveAgent({ agentId: created.agentId })).resolves.toEqual({
      success: true,
    });

    const [reconsidered] = await db
      .select({
        status: agents.status,
        rejectionReason: agents.rejectionReason,
        approvedBy: agents.approvedBy,
        approvedAt: agents.approvedAt,
        isVerified: agents.isVerified,
      })
      .from(agents)
      .where(eq(agents.id, created.agentId))
      .limit(1);
    expect(reconsidered).toMatchObject({
      status: 'approved',
      rejectionReason: null,
      approvedBy: created.reviewerId,
      isVerified: 0,
    });
    expect(reconsidered.approvedAt).not.toBeNull();

    const [audit] = await db
      .select({ action: auditLogs.action, metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, created.reviewerId),
          eq(auditLogs.targetType, 'agent'),
          eq(auditLogs.targetId, created.agentId),
        ),
      )
      .limit(1);
    expect(audit?.action).toBe('approve_join_request');
    expect(JSON.parse(audit?.metadata || '{}')).toMatchObject({ previousStatus: 'rejected' });
  });

  it('does not treat profile approval as suspended-account restoration', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();

    const [reviewerResult] = await db
      .insert(users)
      .values({
        email: `suspension-reviewer-${suffix}@invalid.example`,
        name: 'Suspension Reviewer',
        role: 'super_admin',
        emailVerified: 1,
      } as any);
    created.reviewerId = Number(reviewerResult.insertId);

    const [agentUserResult] = await db
      .insert(users)
      .values({
        email: `suspended-agent-${suffix}@invalid.example`,
        name: 'Suspended Agent',
        role: 'agent',
        emailVerified: 1,
      } as any);
    created.agentUserId = Number(agentUserResult.insertId);

    const [agentResult] = await db
      .insert(agents)
      .values({
        userId: created.agentUserId,
        firstName: 'Suspended',
        lastName: 'Agent',
        displayName: 'Suspended Agent',
        email: `suspended-agent-${suffix}@invalid.example`,
        slug: `suspended-agent-${suffix}`,
        status: 'suspended',
        isFeatured: 0,
        isVerified: 0,
      } as any);
    created.agentId = Number(agentResult.insertId);

    const reviewer = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: created.reviewerId, role: 'super_admin' },
    } as any);

    await expect(reviewer.admin.approveAgent({ agentId: created.agentId })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Suspended agent accounts'),
    });

    const [suspended] = await db
      .select({ status: agents.status, isVerified: agents.isVerified })
      .from(agents)
      .where(eq(agents.id, created.agentId))
      .limit(1);
    expect(suspended).toMatchObject({ status: 'suspended', isVerified: 0 });
  });
});
