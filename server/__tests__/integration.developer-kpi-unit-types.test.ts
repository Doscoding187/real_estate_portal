import { afterEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { getDb } from '../db-connection';
import { developments, unitTypes, users } from '../../drizzle/schema';
import { calculateKPIs } from '../services/kpiService';
import {
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)` as string, fn)) as typeof describe);

const created = {
  userIds: [] as number[],
  developerContexts: [] as DeveloperTestContext[],
  developmentIds: [] as number[],
  unitTypeIds: [] as string[],
};

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return db;
}

function fixtureSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

describeWithDb('Developer KPI canonical unitTypes authority', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (created.unitTypeIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, created.unitTypeIds));
    }
    if (created.developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, created.developmentIds));
    }
    for (const context of created.developerContexts) {
      await deleteDeveloperTestContext(context);
    }
    if (created.userIds.length) {
      await db.delete(users).where(inArray(users.id, created.userIds));
    }

    created.userIds = [];
    created.developerContexts = [];
    created.developmentIds = [];
    created.unitTypeIds = [];
  });

  it('includes active unitTypes and excludes inactive unitTypes from inventory KPIs', async () => {
    const db = await database();
    const suffix = fixtureSuffix();

    const [userResult] = await db.insert(users).values({
      email: `developer-kpi-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'KPI',
      lastName: 'Fixture',
      name: `KPI Fixture ${suffix}`,
      emailVerified: 1,
      onboardingComplete: 1,
    });
    const userId = Number(userResult.insertId);
    created.userIds.push(userId);

    const developerContext = await createDeveloperTestContext({
      userId,
      name: `KPI Developer ${suffix}`,
      email: `developer-profile-${suffix}@example.com`,
    });
    created.developerContexts.push(developerContext);

    const [developmentResult] = await db.insert(developments).values({
      cataloguePublisherId: developerContext.cataloguePublisherId,
      name: `KPI Development ${suffix}`,
      developmentType: 'residential',
      city: 'Johannesburg',
      province: 'Gauteng',
      approvalStatus: 'draft',
      isPublished: 0,
    });
    const developmentId = Number(developmentResult.insertId);
    created.developmentIds.push(developmentId);

    const activeUnitId = randomUUID();
    const inactiveUnitId = randomUUID();
    await db.insert(unitTypes).values([
      {
        id: activeUnitId,
        developmentId,
        name: 'Active Two Bedroom',
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_000_000,
        totalUnits: 10,
        availableUnits: 4,
        reservedUnits: 1,
        isActive: 1,
      },
      {
        id: inactiveUnitId,
        developmentId,
        name: 'Archived Four Bedroom',
        bedrooms: 4,
        bathrooms: 3,
        basePriceFrom: 4_000_000,
        totalUnits: 100,
        availableUnits: 90,
        reservedUnits: 0,
        isActive: 0,
      },
    ]);
    created.unitTypeIds.push(activeUnitId, inactiveUnitId);

    const kpis = await calculateKPIs(developerContext.cataloguePublisherId, '30d');

    // The active row contributes 4 available and 5 sold (10 - 4 - 1).
    // The inactive row would add 90 available and 10 sold if it were treated
    // as current inventory, so these assertions protect the authority boundary.
    expect(kpis.unitsAvailable).toBe(4);
    expect(kpis.unitsSold).toBe(5);
  });
});
