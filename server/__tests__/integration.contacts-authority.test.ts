import { randomUUID } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { agencies, agents, contacts, users } from '../../drizzle/schema';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';
import { getDb } from '../db';
import { appRouter } from '../routers';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

function usesApprovedDisposableDatabase(databaseUrl?: string) {
  try {
    const authority = resolveDatabaseAuthority({
      operation: 'test-fixture',
      explicitDatabaseUrl: databaseUrl,
    });
    return (
      ['disposable-test', 'disposable-worktree'].includes(authority.context.targetClass) &&
      authority.context.worktree.ownershipMatches
    );
  } catch {
    return false;
  }
}

const hasTestDb = usesApprovedDisposableDatabase(process.env.DATABASE_URL);
const describeWithTestDb: typeof describe = hasTestDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires an approved disposable database)`, fn)) as typeof describe);

const created = {
  contactIds: [] as number[],
  agentIds: [] as number[],
  userIds: [] as number[],
  agencyIds: [] as number[],
};

function insertId(result: any): number {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db;
}

async function createAgency(label: string) {
  const db = await database();
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db.insert(agencies).values({
    name: `${label} Contacts Agency`,
    slug: `${label.toLowerCase()}-contacts-${suffix}`,
    email: `${label.toLowerCase()}-${suffix}@example.test`,
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const id = insertId(result);
  created.agencyIds.push(id);
  return id;
}

async function createUser(
  label: string,
  role: 'agent' | 'agency_admin',
  agencyId: number | null = null,
) {
  const db = await database();
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db.insert(users).values({
    agencyId,
    role,
    name: label,
    firstName: label.split(' ')[0],
    lastName: label.split(' ').slice(1).join(' ') || 'User',
    email: `${label.toLowerCase().replaceAll(' ', '-')}-${suffix}@example.test`,
    emailVerified: 1,
    onboardingComplete: 1,
  } as any);
  const id = insertId(result);
  created.userIds.push(id);
  return id;
}

async function approveAgent(userId: number, agencyId: number) {
  const db = await database();
  const suffix = randomUUID().slice(0, 8);
  const [result] = await db.insert(agents).values({
    userId,
    agencyId,
    firstName: 'Contacts',
    lastName: 'Agent',
    displayName: `Contacts Agent ${suffix}`,
    email: `profile-${suffix}@example.test`,
    status: 'approved',
    isVerified: 1,
    isFeatured: 0,
    profileCompletionScore: 80,
    approvedAt: new Date(),
  } as any);
  const id = insertId(result);
  created.agentIds.push(id);
  return id;
}

function caller(user: { id: number; role: 'agent' | 'agency_admin'; agencyId?: number | null }) {
  return appRouter.createCaller({
    user,
    req: { headers: {} },
    res: {},
    requestId: `contacts-authority-${user.id}`,
  } as any);
}

beforeAll(async () => {
  if (!hasTestDb) return;
  // Importing the router is intentionally part of the real server boundary.
  await import('../routers');
});

afterAll(async () => {
  if (!hasTestDb) return;
  const db = await database();
  for (const id of created.contactIds) {
    await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .catch(() => undefined);
  }
  for (const id of created.agentIds) {
    await db
      .delete(agents)
      .where(eq(agents.id, id))
      .catch(() => undefined);
  }
  for (const id of created.userIds) {
    await db
      .delete(users)
      .where(eq(users.id, id))
      .catch(() => undefined);
  }
  for (const id of created.agencyIds) {
    await db
      .delete(agencies)
      .where(eq(agencies.id, id))
      .catch(() => undefined);
  }
});

describeWithTestDb('Contacts authority authorization', () => {
  it('supports independent contacts while enforcing agency private/shared and manager scope', async () => {
    const db = await database();
    const agencyA = await createAgency('Alpha');
    const agencyB = await createAgency('Beta');

    const independentOwner = await createUser('Independent Owner', 'agent');
    const independentOutsider = await createUser('Independent Outsider', 'agent');
    const agencyAgentA = await createUser('Agency Agent A', 'agent', agencyA);
    const agencyAgentA2 = await createUser('Agency Agent A Two', 'agent', agencyA);
    const managerA = await createUser('Agency Manager A', 'agency_admin', agencyA);
    const managerB = await createUser('Agency Manager B', 'agency_admin', agencyB);

    await approveAgent(agencyAgentA, agencyA);
    await approveAgent(agencyAgentA2, agencyA);

    const independent = caller({ id: independentOwner, role: 'agent' });
    const independentOther = caller({ id: independentOutsider, role: 'agent' });
    const agentA = caller({ id: agencyAgentA, role: 'agent', agencyId: agencyA });
    const agentA2 = caller({ id: agencyAgentA2, role: 'agent', agencyId: agencyA });
    const manager = caller({ id: managerA, role: 'agency_admin', agencyId: agencyA });
    const outsideManager = caller({ id: managerB, role: 'agency_admin', agencyId: agencyB });

    const independentCreated = await independent.contacts.create({
      fullName: 'Independent Contact',
      email: 'INDEPENDENT@EXAMPLE.TEST',
      phone: '  +27 11 555 0101 ',
    });
    const independentId = independentCreated.contactId;
    created.contactIds.push(independentId);

    expect(await independent.contacts.getById({ contactId: independentId })).toMatchObject({
      id: independentId,
      email: 'independent@example.test',
      canEdit: true,
    });
    expect((await independent.contacts.list({ query: 'independent' })).contacts).toHaveLength(1);
    await independent.contacts.update({
      contactId: independentId,
      company: 'Independent Realty',
    });
    await expect(
      independentOther.contacts.getById({ contactId: independentId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      independentOther.contacts.update({ contactId: independentId, fullName: 'Stolen' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      independent.contacts.create({ fullName: 'Invalid shared', visibility: 'agency_shared' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const agencyPrivate = await agentA.contacts.create({ fullName: 'Agency Private' });
    const agencyShared = await agentA.contacts.create({
      fullName: 'Agency Shared',
      visibility: 'agency_shared',
    });
    const manipulated = await agentA.contacts.create({
      fullName: 'Server-owned Contact',
      ownerUserId: managerB,
      agencyId: agencyB,
    } as any);
    created.contactIds.push(agencyPrivate.contactId, agencyShared.contactId, manipulated.contactId);

    const manipulatedRow = (
      await db.select().from(contacts).where(eq(contacts.id, manipulated.contactId)).limit(1)
    )[0];
    expect(manipulatedRow).toMatchObject({
      ownerUserId: agencyAgentA,
      agencyId: agencyA,
      visibility: 'private',
    });
    await agentA.contacts.update({
      contactId: manipulated.contactId,
      company: 'Still server owned',
      ownerUserId: managerB,
      agencyId: agencyB,
    } as any);
    const manipulatedAfterUpdate = (
      await db.select().from(contacts).where(eq(contacts.id, manipulated.contactId)).limit(1)
    )[0];
    expect(manipulatedAfterUpdate).toMatchObject({
      ownerUserId: agencyAgentA,
      agencyId: agencyA,
      company: 'Still server owned',
    });

    const agentA2List = await agentA2.contacts.list({});
    expect(agentA2List.contacts.map(contact => contact.id)).toContain(agencyShared.contactId);
    expect(agentA2List.contacts.map(contact => contact.id)).not.toContain(agencyPrivate.contactId);
    await expect(
      agentA2.contacts.getById({ contactId: agencyPrivate.contactId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      agentA2.contacts.update({ contactId: agencyShared.contactId, notes: 'unauthorised edit' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const managerList = await manager.contacts.list({ query: 'agency' });
    expect(managerList.contacts.map(contact => contact.id)).toEqual(
      expect.arrayContaining([agencyPrivate.contactId, agencyShared.contactId]),
    );
    expect((await manager.contacts.getById({ contactId: agencyPrivate.contactId })).canEdit).toBe(
      true,
    );
    await manager.contacts.update({
      contactId: agencyPrivate.contactId,
      notes: 'Manager-maintained note',
    });
    await expect(
      outsideManager.contacts.getById({ contactId: agencyPrivate.contactId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsideManager.contacts.update({
        contactId: agencyShared.contactId,
        fullName: 'Cross agency',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const persisted = (
      await db
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.id, agencyPrivate.contactId), eq(contacts.ownerUserId, agencyAgentA)),
        )
        .limit(1)
    )[0];
    expect(persisted?.notes).toBe('Manager-maintained note');
  });
});
