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
