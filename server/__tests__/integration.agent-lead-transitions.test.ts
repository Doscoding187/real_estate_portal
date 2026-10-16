import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe;

import { db } from '../db';
import { agents, leads, users } from '../../drizzle/schema';
import { appRouter } from '../routers';

const created = {
  userIds: [] as number[],
  agentIds: [] as number[],
  leadIds: [] as number[],
};

async function insertId(result: any): Promise<number> {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

async function insertAgentUser(label: string) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db
    .insert(users)
    .values({
      email: `${label}-${suffix}@example.test`,
      name: label,
      role: 'agent',
      emailVerified: 1,
    } as any);
  const id = await insertId(result);
  created.userIds.push(id);
  return id;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  for (const id of created.leadIds) {
    await db.delete(leads).where(eq(leads.id, id)).catch(() => undefined);
  }
  for (const id of created.agentIds) {
    await db.delete(agents).where(eq(agents.id, id)).catch(() => undefined);
  }
  for (const id of created.userIds) {
    await db.delete(users).where(eq(users.id, id)).catch(() => undefined);
  }
});

function agentCaller(userId: number) {
  return appRouter.createCaller({
    req: { hostname: 'localhost', path: '/', method: 'POST', headers: { host: 'localhost:5000' } },
    res: { cookie: () => undefined },
    user: { id: userId, role: 'agent', agencyId: null },
  } as any);
}

describeWithDb('agent lead transitions follow canonical rules', () => {
  it('rejects an invalid status jump through the production mutation', async () => {
    const userId = await insertAgentUser('JumpAgent');
    const [agentInsert] = await db
      .insert(agents)
      .values({
        userId,
        firstName: 'Jump',
        lastName: 'Agent',
        displayName: 'Jump Agent',
        email: `jump-${suffix()}`,
        slug: `jump-${suffix()}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 1,
      } as any);
    const agentId = await insertId(agentInsert);
    created.agentIds.push(agentId);

    const leadId = await insertLead({ agentId });
    const before = (await db.select().from(leads).where(eq(leads.id, leadId)).limit(1))[0];

    await expect(
      agentCaller(userId).agent.updateLeadStatus({ leadId, status: 'converted' }),
    ).rejects.toThrow(/Cannot move lead from new to converted/i);

    const after = (await db.select().from(leads).where(eq(leads.id, leadId)).limit(1))[0];
    expect(after.status).toBe(before.status);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it('stamps first-response and contact truth on a contacted transition', async () => {
    const userId = await insertAgentUser('ContactAgent');
    const [agentInsert] = await db
      .insert(agents)
      .values({
        userId,
        firstName: 'Contact',
        lastName: 'Agent',
        displayName: 'Contact Agent',
        email: `contact-${suffix()}`,
        slug: `contact-${suffix()}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 1,
      } as any);
    const agentId = await insertId(agentInsert);
    created.agentIds.push(agentId);

    const leadId = await insertLead({ agentId });
    const pristine = (await db.select().from(leads).where(eq(leads.id, leadId)).limit(1))[0];
    expect(pristine.firstRespondedAt).toBeNull();

    await agentCaller(userId).agent.updateLeadStatus({ leadId, status: 'contacted' });

    const after = (await db.select().from(leads).where(eq(leads.id, leadId)).limit(1))[0];
    expect(after.status).toBe('contacted');
    expect(after.firstRespondedAt).not.toBeNull();
    expect(after.lastContactedAt).not.toBeNull();
  });

  it('does not record a first response when an outreach attempt gets no answer', async () => {
    const userId = await insertAgentUser('NoAnswerAgent');
    const agentSuffix = suffix();
    const [agentInsert] = await db
      .insert(agents)
      .values({
        userId,
        firstName: 'No Answer',
        lastName: 'Agent',
        displayName: 'No Answer Agent',
        email: `no-answer-${agentSuffix}@example.test`,
        slug: `no-answer-${agentSuffix}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 1,
      } as any);
    const agentId = await insertId(agentInsert);
    created.agentIds.push(agentId);

    const leadId = await insertLead({ agentId });
    const caller = agentCaller(userId);
    const result = await caller.agent.recordLeadContactAttempt({
      leadId,
      channel: 'call',
      outcome: 'no_answer',
      summary: 'Called the buyer; no answer.',
      nextAction: 'Try WhatsApp tomorrow.',
    });

    expect(result.status).toBe('new');
    const [after] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(after).toMatchObject({
      status: 'new',
      firstRespondedAt: null,
      lastContactedAt: null,
      nextAction: 'Try WhatsApp tomorrow.',
    });

    const afterAttemptSummary = await caller.agent.getLeadResponseSummary();
    expect(afterAttemptSummary).toMatchObject({
      totalLeads: 1,
      outreachAttemptedLeads: 1,
      awaitingFirstOutreach: 0,
      connectedLeads: 0,
      awaitingTwoWayConnection: 1,
    });

    await caller.agent.recordLeadContactAttempt({
      leadId,
      channel: 'whatsapp',
      outcome: 'replied',
      summary: 'Buyer replied and asked for more details.',
      nextAction: 'Send property information.',
    });

    const afterReplySummary = await caller.agent.getLeadResponseSummary();
    expect(afterReplySummary).toMatchObject({
      totalLeads: 1,
      outreachAttemptedLeads: 1,
      awaitingFirstOutreach: 0,
      connectedLeads: 1,
      awaitingTwoWayConnection: 0,
    });
    const [afterReply] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(afterReply).toMatchObject({
      status: 'new',
      nextAction: 'Send property information.',
    });
    expect(afterReply.firstRespondedAt).not.toBeNull();
  });

  it('requires a lost reason on the agent surface too', async () => {
    const userId = await insertAgentUser('LostAgent');
    const [agentInsert] = await db
      .insert(agents)
      .values({
        userId,
        firstName: 'Lost',
        lastName: 'Agent',
        displayName: 'Lost Agent',
        email: `lost-${suffix()}`,
        slug: `lost-${suffix()}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 1,
      } as any);
    const agentId = await insertId(agentInsert);
    created.agentIds.push(agentId);

    const leadId = await insertLead({ agentId, status: 'qualified' });

    await expect(
      agentCaller(userId).agent.updateLeadStatus({ leadId, status: 'lost' }),
    ).rejects.toThrow(/lost reason is required/i);
  });

  it('requires the recorded offer checklist even when a lead has a passing qualification score', async () => {
    const userId = await insertAgentUser('OfferReadinessAgent');
    const agentSuffix = suffix();
    const [agentInsert] = await db
      .insert(agents)
      .values({
        userId,
        firstName: 'Offer Readiness',
        lastName: 'Agent',
        displayName: 'Offer Readiness Agent',
        email: `offer-readiness-${agentSuffix}@example.test`,
        slug: `offer-readiness-${agentSuffix}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 1,
      } as any);
    const agentId = await insertId(agentInsert);
    created.agentIds.push(agentId);

    const leadId = await insertLead({ agentId, status: 'qualified' });
    await db
      .update(leads)
      .set({
        qualificationScore: 80,
        qualificationStatus: 'qualified',
        lastContactedAt: '2026-10-15 09:00:00',
      } as any)
      .where(eq(leads.id, leadId));

    const caller = agentCaller(userId);
    await expect(caller.agent.moveLeadToStage({ leadId, targetStage: 'offer' })).rejects.toThrow(
      /Record that the viewing is complete before sending an offer/i,
    );
    await expect(caller.agent.updateLeadStatus({ leadId, status: 'offer_sent' })).rejects.toThrow(
      /Record that the viewing is complete before sending an offer/i,
    );
    const [stillQualified] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(stillQualified.status).toBe('qualified');

    await caller.agent.setLeadOfferReadiness({
      leadId,
      readiness: {
        viewingCompleted: true,
        feedbackLogged: true,
        affordabilityConfirmed: true,
      },
    });
    await caller.agent.moveLeadToStage({ leadId, targetStage: 'offer' });
    await caller.agent.setLeadOfferReadiness({
      leadId,
      readiness: {
        viewingCompleted: false,
        feedbackLogged: false,
        affordabilityConfirmed: false,
      },
    });
    await caller.agent.moveLeadToStage({ leadId, targetStage: 'won' });

    const [won] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(won.status).toBe('converted');
    expect(won.convertedAt).not.toBeNull();
  });

  it('keeps another independent Agent from reading or mutating a custodied lead', async () => {
    const ownerUserId = await insertAgentUser('CustodiedLeadOwner');
    const outsiderUserId = await insertAgentUser('CustodiedLeadOutsider');
    const ownerSuffix = suffix();
    const outsiderSuffix = suffix();

    const [ownerAgentInsert] = await db
      .insert(agents)
      .values({
        userId: ownerUserId,
        firstName: 'Custodied',
        lastName: 'Owner',
        displayName: 'Custodied Lead Owner',
        email: `custodied-owner-${ownerSuffix}@example.test`,
        slug: `custodied-owner-${ownerSuffix}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 0,
      } as any);
    const ownerAgentId = await insertId(ownerAgentInsert);
    created.agentIds.push(ownerAgentId);

    const [outsiderAgentInsert] = await db
      .insert(agents)
      .values({
        userId: outsiderUserId,
        firstName: 'Custodied',
        lastName: 'Outsider',
        displayName: 'Custodied Lead Outsider',
        email: `custodied-outsider-${outsiderSuffix}@example.test`,
        slug: `custodied-outsider-${outsiderSuffix}`,
        status: 'approved',
        isFeatured: 0,
        isVerified: 0,
      } as any);
    const outsiderAgentId = await insertId(outsiderAgentInsert);
    created.agentIds.push(outsiderAgentId);

    const leadId = await insertLead({ agentId: ownerAgentId });
    const outsider = agentCaller(outsiderUserId);

    const outsiderLeads = await outsider.agent.getMyLeads({ status: 'all', limit: 100 });
    expect(outsiderLeads.some(lead => Number(lead.id) === leadId)).toBe(false);

    await expect(
      outsider.agent.updateLeadStatus({ leadId, status: 'contacted' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsider.agent.addLeadActivity({
        leadId,
        activityType: 'note',
        description: 'Unauthorized cross-Agent note.',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsider.agent.setLeadFollowUp({
        leadId,
        nextFollowUp: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const [storedLead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(storedLead).toMatchObject({
      agentId: ownerAgentId,
      status: 'new',
      nextFollowUp: null,
    });
  });
});

function suffix() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

async function insertLead(input: { agentId: number; status?: string }) {
  const suffix2 = randomUUID().slice(0, 8);
  const [result] = await db
    .insert(leads)
    .values({
      name: `Lead ${suffix2}`,
      email: `lead-${suffix2}@example.test`,
      phone: '+27110000000',
      source: 'property_detail',
      status: input.status ?? 'new',
      agentId: input.agentId,
      propertyType: 'residential',
    } as any);
  const id = await insertId(result);
  created.leadIds.push(id);
  return id;
}
