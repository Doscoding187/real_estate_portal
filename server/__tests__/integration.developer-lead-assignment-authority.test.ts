import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  developerOrganisationMemberships,
  developments,
  leads,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developmentService } from '../services/developmentService';
import {
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';
import { createConfirmedDeveloperTestMedia } from '../test-utils/developerMediaTestFixture';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

type Fixture = {
  context: DeveloperTestContext;
  userId: number;
  developmentId: number;
  leadId: number;
};

const fixtures: Fixture[] = [];
const extraUserIds: number[] = [];
const extraMembershipIds: number[] = [];

function callerFor(userId: number, role: string = 'property_developer') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

async function createUser(label: string, role: string = 'property_developer') {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed.');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const [result] = await db.insert(users).values({
    email: `b06-lead-${label}-${suffix}@example.com`,
    name: `B06 ${label}`,
    firstName: 'B06',
    lastName: label,
    role: role as any,
    emailVerified: 1,
  });
  const id = Number(result.insertId);
  extraUserIds.push(id);
  return id;
}

async function addMembership(input: {
  organisationId: number;
  userId: number;
  status: 'active' | 'suspended';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed.');
  const [result] = await db.insert(developerOrganisationMemberships).values({
    organisationId: input.organisationId,
    userId: input.userId,
    role: 'sales_consultant',
    status: input.status,
  });
  extraMembershipIds.push(Number(result.insertId));
}

async function createLeadFixture(label: string): Promise<Fixture> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed.');
  const ownerUserId = await createUser(`${label}-owner`);
  const context = await createDeveloperTestContext({
    userId: ownerUserId,
    name: `B06 Lead ${label} Developer`,
    email: `b06-lead-${label}-${Date.now()}@example.com`,
  });
  const heroImage = await createConfirmedDeveloperTestMedia(context);
  const development = await developmentService.createDevelopment(ownerUserId, {
    name: `B06 Lead ${label} Development`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    city: 'Johannesburg',
    province: 'Gauteng',
    suburb: 'Berea',
    address: '1 Assignment Authority Road',
    ownershipType: 'sectional-title',
    status: 'selling',
    description: 'Developer lead assignment authority fixture with legitimate development data.',
    highlights: ['Secure estate', 'Close to transport', 'Energy efficient'],
    images: [heroImage],
    unitTypes: [
      {
        name: 'Two Bedroom Apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 70,
        priceFrom: 1_200_000,
        totalUnits: 10,
        availableUnits: 10,
        parkingType: 'none',
        parkingBays: 0,
      },
    ],
  } as any);
  const developmentId = Number(development.id);
  const [leadResult] = await db.insert(leads).values({
    developmentId,
    cataloguePublisherId: context.cataloguePublisherId,
    name: 'B06 Prospect',
    email: `b06-prospect-${Date.now()}@example.com`,
    source: 'development_detail',
    leadSource: 'development_detail',
    status: 'new',
    funnelStage: 'interest',
  });
  const fixture = {
    context,
    userId: ownerUserId,
    developmentId,
    leadId: Number(leadResult.insertId),
  };
  fixtures.push(fixture);
  return fixture;
}

describeWithDb('B06 Developer lead assignment authority', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    while (extraMembershipIds.length > 0) {
      await db
        .delete(developerOrganisationMemberships)
        .where(eq(developerOrganisationMemberships.id, extraMembershipIds.pop()!));
    }
    while (fixtures.length > 0) {
      const fixture = fixtures.pop()!;
      if (fixture.developmentId > 0) {
        await db.delete(leads).where(eq(leads.developmentId, fixture.developmentId));
        await db.delete(unitTypes).where(eq(unitTypes.developmentId, fixture.developmentId));
        await db.delete(developments).where(eq(developments.id, fixture.developmentId));
      }
      await deleteDeveloperTestContext(fixture.context);
    }
    while (extraUserIds.length > 0) {
      await db.delete(users).where(eq(users.id, extraUserIds.pop()!));
    }
  });

  it('allows self, same-organisation active operators, and unassignment without changing lead custody', async () => {
    const fixture = await createLeadFixture('valid');
    const operatorUserId = await createUser('same-organisation-operator');
    await addMembership({
      organisationId: fixture.context.organisationId,
      userId: operatorUserId,
      status: 'active',
    });
    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');
    const [before] = await db
      .select({ cataloguePublisherId: leads.cataloguePublisherId, developmentId: leads.developmentId })
      .from(leads)
      .where(eq(leads.id, fixture.leadId));

    await expect(
      callerFor(fixture.userId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'developer_sales',
        ownerId: operatorUserId,
      }),
    ).resolves.toMatchObject({ lead: { owner: { ownerType: 'developer_sales' } } });

    await expect(
      callerFor(operatorUserId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'developer_sales',
        ownerId: operatorUserId,
      }),
    ).resolves.toMatchObject({ lead: { owner: { ownerId: String(operatorUserId) } } });

    await expect(
      callerFor(fixture.userId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'unassigned',
        ownerId: null,
      }),
    ).resolves.toMatchObject({ lead: { owner: { ownerType: 'unassigned', ownerId: null } } });

    const [after] = await db
      .select({
        cataloguePublisherId: leads.cataloguePublisherId,
        developmentId: leads.developmentId,
        assignedTo: leads.assignedTo,
      })
      .from(leads)
      .where(eq(leads.id, fixture.leadId));
    expect(after).toMatchObject({
      cataloguePublisherId: before.cataloguePublisherId,
      developmentId: before.developmentId,
      assignedTo: null,
    });
  });

  it('rejects unrelated, suspended, Agency, and cross-Developer assignment attempts', async () => {
    const fixture = await createLeadFixture('denied');
    const unrelatedUserId = await createUser('unrelated');
    const suspendedUserId = await createUser('suspended');
    const agencyUserId = await createUser('agency-user', 'agency_admin');
    await addMembership({
      organisationId: fixture.context.organisationId,
      userId: suspendedUserId,
      status: 'suspended',
    });

    await expect(
      callerFor(fixture.userId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'developer_sales',
        ownerId: unrelatedUserId,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      callerFor(fixture.userId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'developer_sales',
        ownerId: suspendedUserId,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      callerFor(fixture.userId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'developer_sales',
        ownerId: agencyUserId,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      callerFor(fixture.userId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'agency',
        ownerId: agencyUserId,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const otherUserId = await createUser('other-developer');
    const otherContext = await createDeveloperTestContext({
      userId: otherUserId,
      name: 'B06 Other Developer',
      email: `b06-other-developer-${Date.now()}@example.com`,
    });
    const otherFixture: Fixture = {
      context: otherContext,
      userId: otherUserId,
      developmentId: -1,
      leadId: -1,
    };
    fixtures.push(otherFixture);

    await expect(
      callerFor(otherUserId).developer.assignLead({
        leadId: fixture.leadId,
        ownerType: 'developer_sales',
        ownerId: otherUserId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');
    const [unchanged] = await db
      .select({ assignedTo: leads.assignedTo, cataloguePublisherId: leads.cataloguePublisherId })
      .from(leads)
      .where(eq(leads.id, fixture.leadId));
    expect(unchanged).toMatchObject({
      assignedTo: null,
      cataloguePublisherId: fixture.context.cataloguePublisherId,
    });
  });
});
