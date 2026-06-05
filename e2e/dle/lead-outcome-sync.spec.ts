import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq, inArray, sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import {
  developers,
  developmentOperatingEvents,
  developments,
  leadActivities,
  leads,
  users,
} from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { listDeveloperLeads } from '../../server/services/developerFunnelService';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-04';
fs.mkdirSync(evidenceDir, { recursive: true });

type Seed = {
  userId: number;
  developerId: number;
  developmentId: number;
  developmentName: string;
  email: string;
  wonLeadId: number;
  blockedLeadId: number;
  wonLeadName: string;
  blockedLeadName: string;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Lead Outcome Sync QA`,
  );

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: sessionToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: COOKIE_NAME,
      value: sessionToken,
      url: 'http://localhost:5000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function seedLeadOutcomeSyncDevelopment(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-lead-sync-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Lead',
    lastName: 'Sync',
    name: 'Lead Sync Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Lead Sync Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const unitTypeId = `lead-sync-sale-${suffix}`.slice(0, 36);
  const development = await developmentService.createDevelopment(userId, {
    name: `DLE Lead Outcome Sync ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '120 Lead Sync Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Lead Outcome Proof',
    status: 'selling',
    description: 'Lead outcome sync browser proof keeps inventory and handoff separate.',
    highlights: ['Selected lead only', 'No hidden commission', 'Audit ready'],
    images: [{ url: 'https://example.com/dle-lead-sync.jpg' }],
    priceFrom: 1_250_000,
    priceTo: 1_450_000,
    unitTypes: [
      {
        id: unitTypeId,
        name: `Lead Sync Sale Unit ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_250_000,
        basePriceTo: 1_450_000,
        totalUnits: 2,
        availableUnits: 1,
        reservedUnits: 1,
      },
    ],
  } as any);

  const developmentId = Number(development.id);
  const wonLeadName = `Outcome Won Lead ${suffix}`;
  const blockedLeadName = `Outcome Blocked Lead ${suffix}`;

  const wonLeadInsert = await db!.insert(leads).values({
    developmentId,
    name: wonLeadName,
    email: `won-${email}`,
    phone: '0825550101',
    unitId: unitTypeId,
    unitName: `Lead Sync Sale Unit ${suffix}`,
    unitPriceFrom: 1_250_000,
    leadType: 'inquiry',
    status: 'converted',
    funnelStage: 'bond',
    leadSource: 'development_detail_contact',
    source: 'development_detail',
  });
  const wonLeadId = getInsertId(wonLeadInsert);

  const blockedLeadInsert = await db!.insert(leads).values({
    developmentId,
    name: blockedLeadName,
    email: `blocked-${email}`,
    phone: '0825550102',
    unitId: unitTypeId,
    unitName: `Lead Sync Sale Unit ${suffix}`,
    unitPriceFrom: 1_250_000,
    leadType: 'inquiry',
    status: 'qualified',
    funnelStage: 'qualification',
    leadSource: 'development_detail_contact',
    source: 'development_detail',
  });
  const blockedLeadId = getInsertId(blockedLeadInsert);

  return {
    userId,
    developerId,
    developmentId,
    developmentName: String(development.name),
    email,
    wonLeadId,
    blockedLeadId,
    wonLeadName,
    blockedLeadName,
  };
}

test.describe.serial('DLE lead outcome sync browser proof', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db
      .delete(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId));
    await db.delete(leadActivities).where(inArray(leadActivities.leadId, [
      seed.wonLeadId,
      seed.blockedLeadId,
    ]));
    await db.delete(leads).where(inArray(leads.id, [seed.wonLeadId, seed.blockedLeadId]));
    await db.delete(developments).where(eq(developments.id, seed.developmentId));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('syncs a selected Sale lead to sold and rejects unsafe direct close', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedLeadOutcomeSyncDevelopment(suffix);
    const db = await getDb();
    expect(db).toBeTruthy();

    const seededLeads = await listDeveloperLeads({
      developerId: seed.developerId,
      developmentId: seed.developmentId,
      limit: 10,
    });
    expect(seededLeads.items.map(lead => lead.id)).toContain(String(seed.wonLeadId));
    expect(seededLeads.items.map(lead => lead.id)).toContain(String(seed.blockedLeadId));

    await loginAsSeededDeveloper(page, seed);
    await page.goto(
      `/developer/leads?developmentId=${seed.developmentId}&stage=deal&leadId=${seed.wonLeadId}`,
    );
    await expect(page.getByRole('heading', { name: 'Leads Control Center' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(seed.wonLeadName).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Sync Outcome' }).click();
    await expect(page.getByText('Lead synced: Sold.')).toBeVisible({ timeout: 15_000 });

    let [wonLead] = await db!.select().from(leads).where(eq(leads.id, seed.wonLeadId)).limit(1);
    expect(wonLead.status).toBe('closed');
    expect(wonLead.funnelStage).toBe('sale');
    expect(wonLead.lostReason).toBeNull();

    const leadEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId));
    expect(leadEvents).toHaveLength(1);
    expect(leadEvents[0].eventType).toBe('lead_stage_changed');
    expect(leadEvents[0].leadId).toBe(seed.wonLeadId);
    expect(leadEvents[0].fromStatus).toBe('deal_in_progress');
    expect(leadEvents[0].toStatus).toBe('closed_won');
    expect(parseJsonObject(leadEvents[0].metadata).displayLabel).toBe('Sold');

    const [activityRows] = await db!.execute(sql`
      select leadId, activityType, description
      from lead_activities
      where leadId = ${seed.wonLeadId}
    `);
    const activities = Array.isArray(activityRows) ? activityRows : [];
    expect(activities).toHaveLength(1);
    expect((activities[0] as any).activityType).toBe('status_change');
    expect((activities[0] as any).description).toContain('Sale lead synced as sold');

    await page.goto(
      `/developer/leads?developmentId=${seed.developmentId}&stage=won&leadId=${seed.wonLeadId}`,
    );
    await expect(page.getByText(seed.wonLeadName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('closed_won').first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-lead-outcome-sync-sale-sold.png`,
    });

    await page.goto(
      `/developer/leads?developmentId=${seed.developmentId}&stage=qualified&leadId=${seed.blockedLeadId}`,
    );
    await expect(page.getByText(seed.blockedLeadName).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Sync Outcome' }).click();
    await expect(
      page.getByText('Invalid lead outcome sync from qualified to closed_won.'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Lead synced: Sold.')).toHaveCount(0);

    const [blockedLead] = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, seed.blockedLeadId))
      .limit(1);
    expect(blockedLead.status).toBe('qualified');
    expect(blockedLead.funnelStage).toBe('qualification');

    const eventsAfterFailure = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId));
    expect(eventsAfterFailure).toHaveLength(1);

    await page.screenshot({
      path: `${evidenceDir}/qa-dle-lead-outcome-sync-invalid-no-false-success.png`,
    });
  });
});
