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
import { deriveCanonicalLeadStage } from '../../server/services/developerFunnelService';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-07';
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

type CleanupSeed = {
  userId: number;
  developerId: number;
  developmentId: number;
  leadIds: number[];
};

type TransactionLeadSeed = CleanupSeed & {
  email: string;
  leadId: number;
  leadName: string;
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

async function loginAsSeededDeveloper(page: Page, seed: { userId: number; email: string }) {
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

async function seedRentalLeadOutcomeSyncDevelopment(suffix: string): Promise<TransactionLeadSeed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-rental-lead-sync-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Rental',
    lastName: 'LeadSync',
    name: 'Rental Lead Sync Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Rental Lead Sync Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const unitTypeId = `lead-sync-rent-${suffix}`.slice(0, 36);
  const development = await developmentService.createDevelopment(userId, {
    name: `DLE Rental Lead Outcome Sync ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '124 Rental Lead Sync Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Rental Lead Outcome Proof',
    status: 'leasing',
    description: 'Rental lead outcome sync browser proof keeps leasing language distinct.',
    highlights: ['Lease signed proof', 'Selected renter only', 'Audit ready'],
    images: [{ url: 'https://example.com/dle-rental-lead-sync.jpg' }],
    monthlyRentFrom: 13_500,
    monthlyRentTo: 15_500,
    unitTypes: [
      {
        id: unitTypeId,
        name: `Rental Lead Sync Unit ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentFrom: 13_500,
        monthlyRentTo: 15_500,
        depositRequired: 27_000,
        leaseTerm: '12 months',
        totalUnits: 2,
        availableUnits: 1,
        reservedUnits: 1,
      },
    ],
  } as any);

  const developmentId = Number(development.id);
  const leadName = `Rental Outcome Lead ${suffix}`;
  const leadInsert = await db!.insert(leads).values({
    developmentId,
    name: leadName,
    email: `renter-${email}`,
    phone: '0825550201',
    unitId: unitTypeId,
    unitName: `Rental Lead Sync Unit ${suffix}`,
    unitPriceFrom: 13_500,
    leadType: 'inquiry',
    status: 'converted',
    funnelStage: 'bond',
    leadSource: 'development_detail_contact',
    source: 'development_detail',
  });
  const leadId = getInsertId(leadInsert);

  return {
    userId,
    developerId,
    developmentId,
    email,
    leadId,
    leadName,
    leadIds: [leadId],
  };
}

async function seedAuctionLeadOutcomeSyncDevelopment(
  suffix: string,
  leadNamePrefix = 'Auction Outcome Lead',
): Promise<TransactionLeadSeed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-auction-lead-sync-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Auction',
    lastName: 'LeadSync',
    name: 'Auction Lead Sync Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Auction Lead Sync Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const unitTypeId = `lead-sync-auction-${suffix}`.slice(0, 36);
  const development = await developmentService.createDevelopment(userId, {
    name: `DLE Auction Lead Outcome Sync ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '128 Auction Lead Sync Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Auction Lead Outcome Proof',
    status: 'launching-soon',
    description: 'Auction lead outcome sync browser proof keeps bidder language distinct.',
    highlights: ['Bidder outcome proof', 'Selected bidder only', 'Audit ready'],
    images: [{ url: 'https://example.com/dle-auction-lead-sync.jpg' }],
    startingBidFrom: 850_000,
    reservePriceFrom: 950_000,
    unitTypes: [
      {
        id: unitTypeId,
        name: `Auction Lead Sync Lot ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        startingBid: 850_000,
        reservePrice: 950_000,
        totalUnits: 1,
        availableUnits: 1,
        reservedUnits: 0,
        auctionStatus: 'active',
      },
    ],
  } as any);

  const developmentId = Number(development.id);
  const leadName = `${leadNamePrefix} ${suffix}`;
  const leadInsert = await db!.insert(leads).values({
    developmentId,
    name: leadName,
    email: `bidder-${email}`,
    phone: '0825550202',
    unitId: unitTypeId,
    unitName: `Auction Lead Sync Lot ${suffix}`,
    unitPriceFrom: 850_000,
    leadType: 'inquiry',
    status: 'converted',
    funnelStage: 'bond',
    leadSource: 'development_detail_contact',
    source: 'development_detail',
  });
  const leadId = getInsertId(leadInsert);

  return {
    userId,
    developerId,
    developmentId,
    email,
    leadId,
    leadName,
    leadIds: [leadId],
  };
}

test.describe.serial('DLE lead outcome sync browser proof', () => {
  let seed: Seed | null = null;
  const cleanupSeeds: CleanupSeed[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    const seedsToClean: CleanupSeed[] = [
      ...(seed
        ? [
            {
              userId: seed.userId,
              developerId: seed.developerId,
              developmentId: seed.developmentId,
              leadIds: [seed.wonLeadId, seed.blockedLeadId],
            },
          ]
        : []),
      ...cleanupSeeds,
    ];

    for (const cleanup of seedsToClean.reverse()) {
      await db
        .delete(developmentOperatingEvents)
        .where(eq(developmentOperatingEvents.developmentId, cleanup.developmentId));
      await db.delete(leadActivities).where(inArray(leadActivities.leadId, cleanup.leadIds));
      await db.delete(leads).where(inArray(leads.id, cleanup.leadIds));
      await db.delete(developments).where(eq(developments.id, cleanup.developmentId));
      await db.delete(developers).where(eq(developers.id, cleanup.developerId));
      await db.delete(users).where(eq(users.id, cleanup.userId));
    }
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
    await expect(page.getByTestId(`dle-lead-outcome-label-${seed.wonLeadId}`)).toHaveText('Sold');
    await expect(page.getByTestId(`dle-lead-outcome-detail-${seed.wonLeadId}`)).toHaveText('Sold');
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

  test('syncs a selected Rental lead with lease-native outcome language', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rentalSeed = await seedRentalLeadOutcomeSyncDevelopment(suffix);
    cleanupSeeds.push(rentalSeed);
    const db = await getDb();
    expect(db).toBeTruthy();

    await loginAsSeededDeveloper(page, rentalSeed);
    await page.goto(
      `/developer/leads?developmentId=${rentalSeed.developmentId}&stage=deal&leadId=${rentalSeed.leadId}`,
    );
    await expect(page.getByRole('heading', { name: 'Leads Control Center' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(rentalSeed.leadName).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Sync Outcome' }).click();
    await expect(page.getByText('Lead synced: Lease signed / Let.')).toBeVisible({
      timeout: 15_000,
    });

    const [rentalLead] = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, rentalSeed.leadId))
      .limit(1);
    expect(rentalLead.status).toBe('closed');
    expect(rentalLead.funnelStage).toBe('sale');

    const leadEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, rentalSeed.developmentId));
    expect(leadEvents).toHaveLength(1);
    expect(leadEvents[0].eventType).toBe('lead_stage_changed');
    expect(leadEvents[0].leadId).toBe(rentalSeed.leadId);
    expect(leadEvents[0].transactionType).toBe('for_rent');
    expect(leadEvents[0].fromStatus).toBe('deal_in_progress');
    expect(leadEvents[0].toStatus).toBe('closed_won');
    expect(parseJsonObject(leadEvents[0].metadata).displayLabel).toBe('Lease signed / Let');

    const [activityRows] = await db!.execute(sql`
      select leadId, activityType, description
      from lead_activities
      where leadId = ${rentalSeed.leadId}
    `);
    const activities = Array.isArray(activityRows) ? activityRows : [];
    expect(activities).toHaveLength(1);
    expect((activities[0] as any).description).toContain(
      'Rental lead synced as lease signed / let',
    );

    await page.goto(
      `/developer/leads?developmentId=${rentalSeed.developmentId}&stage=won&leadId=${rentalSeed.leadId}`,
    );
    await expect(page.getByText(rentalSeed.leadName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('closed_won').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`dle-lead-outcome-label-${rentalSeed.leadId}`)).toHaveText(
      'Lease signed / Let',
    );
    await expect(page.getByTestId(`dle-lead-outcome-detail-${rentalSeed.leadId}`)).toHaveText(
      'Lease signed / Let',
    );
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-lead-outcome-sync-rental-let.png`,
    });
  });

  test('syncs selected Auction leads with sold and loss outcome language', async ({ page }) => {
    const soldSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const soldSeed = await seedAuctionLeadOutcomeSyncDevelopment(
      soldSuffix,
      'Auction Sold Outcome Lead',
    );
    cleanupSeeds.push(soldSeed);
    const withdrawnSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const withdrawnSeed = await seedAuctionLeadOutcomeSyncDevelopment(
      withdrawnSuffix,
      'Auction Withdrawn Outcome Lead',
    );
    cleanupSeeds.push(withdrawnSeed);
    const db = await getDb();
    expect(db).toBeTruthy();

    await loginAsSeededDeveloper(page, soldSeed);
    await page.goto(
      `/developer/leads?developmentId=${soldSeed.developmentId}&stage=deal&leadId=${soldSeed.leadId}`,
    );
    await expect(page.getByRole('heading', { name: 'Leads Control Center' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(soldSeed.leadName).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Sync Outcome' }).click();
    await expect(page.getByText('Lead synced: Sold at auction.')).toBeVisible({
      timeout: 15_000,
    });

    const [soldLead] = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, soldSeed.leadId))
      .limit(1);
    expect(soldLead.status).toBe('closed');
    expect(soldLead.funnelStage).toBe('sale');

    let leadEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, soldSeed.developmentId));
    expect(leadEvents).toHaveLength(1);
    expect(leadEvents[0].eventType).toBe('lead_stage_changed');
    expect(leadEvents[0].leadId).toBe(soldSeed.leadId);
    expect(leadEvents[0].transactionType).toBe('auction');
    expect(leadEvents[0].fromStatus).toBe('deal_in_progress');
    expect(leadEvents[0].toStatus).toBe('closed_won');
    expect(parseJsonObject(leadEvents[0].metadata).displayLabel).toBe('Sold at auction');

    await page.goto(
      `/developer/leads?developmentId=${soldSeed.developmentId}&stage=won&leadId=${soldSeed.leadId}`,
    );
    await expect(page.getByText(soldSeed.leadName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`dle-lead-outcome-label-${soldSeed.leadId}`)).toHaveText(
      'Sold at auction',
    );
    await expect(page.getByTestId(`dle-lead-outcome-detail-${soldSeed.leadId}`)).toHaveText(
      'Sold at auction',
    );
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-lead-outcome-sync-auction-sold.png`,
    });

    await loginAsSeededDeveloper(page, withdrawnSeed);
    await page.goto(
      `/developer/leads?developmentId=${withdrawnSeed.developmentId}&stage=deal&leadId=${withdrawnSeed.leadId}`,
    );
    await expect(page.getByText(withdrawnSeed.leadName).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('combobox').filter({ hasText: 'Sold at auction' }).click();
    await page.getByRole('option', { name: 'Withdrawn follow-up' }).click();
    await page
      .getByPlaceholder('Outcome note...')
      .fill('Lot withdrawn by auction team; keep bidder in manual follow-up.');
    await page.getByRole('button', { name: 'Sync Outcome' }).click();
    await expect(page.getByText('Lead synced: Withdrawn follow-up.')).toBeVisible({
      timeout: 15_000,
    });

    const [withdrawnLead] = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, withdrawnSeed.leadId))
      .limit(1);
    expect(withdrawnLead.status).toBe('lost');
    expect(deriveCanonicalLeadStage(withdrawnLead)).toBe('closed_lost');
    expect(withdrawnLead.lostReason).toBe('lost');

    leadEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, withdrawnSeed.developmentId));
    expect(leadEvents).toHaveLength(1);
    expect(leadEvents[0].eventType).toBe('lead_stage_changed');
    expect(leadEvents[0].leadId).toBe(withdrawnSeed.leadId);
    expect(leadEvents[0].transactionType).toBe('auction');
    expect(leadEvents[0].fromStatus).toBe('deal_in_progress');
    expect(leadEvents[0].toStatus).toBe('closed_lost');
    expect(parseJsonObject(leadEvents[0].metadata).displayLabel).toBe('Withdrawn follow-up');
    expect(parseJsonObject(leadEvents[0].metadata).note).toContain('Lot withdrawn');

    const [activityRows] = await db!.execute(sql`
      select leadId, activityType, description
      from lead_activities
      where leadId = ${withdrawnSeed.leadId}
    `);
    const activities = Array.isArray(activityRows) ? activityRows : [];
    expect(activities).toHaveLength(1);
    expect((activities[0] as any).description).toContain(
      'Auction lead synced as withdrawn follow-up',
    );

    await page.goto(
      `/developer/leads?developmentId=${withdrawnSeed.developmentId}&stage=lost&leadId=${withdrawnSeed.leadId}`,
    );
    await expect(page.getByText(withdrawnSeed.leadName).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('closed_lost').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`dle-lead-outcome-label-${withdrawnSeed.leadId}`)).toHaveText(
      'Withdrawn follow-up',
    );
    await expect(page.getByTestId(`dle-lead-outcome-detail-${withdrawnSeed.leadId}`)).toHaveText(
      'Withdrawn follow-up',
    );
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-lead-outcome-sync-auction-withdrawn.png`,
    });
  });
});
