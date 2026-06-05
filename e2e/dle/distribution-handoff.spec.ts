import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { desc, eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import {
  developers,
  developmentOperatingEvents,
  developments,
  distributionDealEvents,
  distributionDeals,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-05';
fs.mkdirSync(evidenceDir, { recursive: true });

type Seed = {
  userId: number;
  developerId: number;
  managerUserId: number;
  agentUserId: number;
  developmentId: number;
  developmentName: string;
  programId: number;
  dealId: number;
  buyerName: string;
  email: string;
  managerEmail: string;
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
    `${seed.email} DLE Distribution Handoff QA`,
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

async function loginAsSeededManager(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.managerUserId,
    seed.managerEmail,
    `${seed.managerEmail} DLE Distribution Handoff Manager QA`,
  );

  await page.context().clearCookies();
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

async function seedDistributionHandoffDevelopment(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-handoff-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Distribution',
    lastName: 'Handoff',
    name: 'Distribution Handoff Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Distribution Handoff Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const managerEmail = `dle-handoff-manager-${suffix}@example.com`;
  const managerInsert = await db!.insert(users).values({
    email: managerEmail,
    passwordHash,
    role: 'super_admin',
    firstName: 'Referral',
    lastName: 'Manager',
    name: 'Referral Manager',
    emailVerified: 1,
  });
  const managerUserId = getInsertId(managerInsert);

  const agentInsert = await db!.insert(users).values({
    email: `dle-handoff-agent-${suffix}@example.com`,
    passwordHash,
    role: 'agent',
    firstName: 'Referral',
    lastName: 'Partner',
    name: 'Referral Partner',
    emailVerified: 1,
  });
  const agentUserId = getInsertId(agentInsert);

  const unitTypeId = `handoff-sale-${suffix}`.slice(0, 36);
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Distribution Handoff ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '18 Referral Handoff Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Referral Proof',
    status: 'selling',
    description: 'Distribution handoff browser proof keeps DLE and referral ownership separate.',
    highlights: ['Manager review ready', 'Commission protected', 'Audit linked'],
    images: [{ url: 'https://example.com/dle-distribution-handoff.jpg' }],
    priceFrom: 1_750_000,
    priceTo: 1_950_000,
    unitTypes: [
      {
        id: unitTypeId,
        name: `Referral Handoff Sale Unit ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_750_000,
        basePriceTo: 1_950_000,
        totalUnits: 4,
        availableUnits: 2,
        reservedUnits: 1,
      },
    ],
  } as any);
  const developmentId = Number(created.id);

  const programInsert = await db!.insert(distributionPrograms).values({
    developmentId,
    isActive: 1,
    isReferralEnabled: 1,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    tierAccessPolicy: 'restricted',
    currencyCode: 'ZAR',
  } as any);
  const programId = getInsertId(programInsert);

  const buyerName = `Referral Buyer ${suffix}`;
  const dealInsert = await db!.insert(distributionDeals).values({
    programId,
    developmentId,
    agentId: agentUserId,
    managerUserId,
    buyerName,
    buyerEmail: `buyer-${email}`,
    buyerPhone: '0825550303',
    currentStage: 'contract_signed',
    commissionStatus: 'not_ready',
    dealAmount: 1_850_000,
  } as any);
  const dealId = getInsertId(dealInsert);

  return {
    userId,
    developerId,
    managerUserId,
    agentUserId,
    developmentId,
    developmentName: String(created.name),
    programId,
    dealId,
    buyerName,
    email,
    managerEmail,
  };
}

async function selectDevelopment(page: Page, developmentName: string) {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: developmentName }).click();
  await expect(page.getByText(`snapshot for ${developmentName}.`)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe.serial('DLE distribution handoff browser proof', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db.delete(distributionDealEvents).where(eq(distributionDealEvents.dealId, seed.dealId));
    await db
      .delete(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId));
    await db.delete(distributionDeals).where(eq(distributionDeals.id, seed.dealId));
    await db.delete(distributionPrograms).where(eq(distributionPrograms.id, seed.programId));
    await db.delete(developments).where(eq(developments.id, seed.developmentId));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.agentUserId));
    await db.delete(users).where(eq(users.id, seed.managerUserId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('requests referral handoff review without changing distribution stage or commission', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedDistributionHandoffDevelopment(suffix);
    const db = await getDb();
    expect(db).toBeTruthy();

    const [beforeDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, seed.dealId))
      .limit(1);
    expect(beforeDeal.currentStage).toBe('contract_signed');
    expect(beforeDeal.commissionStatus).toBe('not_ready');

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.developmentName);
    await expect(page.getByText('Distribution Impact')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(seed.buyerName)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Contract Signed')).toBeVisible();
    await expect(page.getByText('Not Ready')).toBeVisible();

    await page.getByTestId(`dle-distribution-handoff-open-${seed.dealId}`).click();
    await expect(page.getByRole('heading', { name: 'Request Referral Handoff Review' })).toBeVisible();
    await page
      .getByTestId('dle-distribution-handoff-note')
      .fill('Buyer signed offer pack uploaded. Please review before any stage or commission movement.');
    await page.getByTestId('dle-distribution-handoff-submit').click();
    await expect(page.getByText('Referral handoff review requested')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Referral handoff', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    const handoffReadback = page.getByTestId(
      `dle-distribution-handoff-readback-${seed.dealId}`,
    );
    await expect(handoffReadback).toBeVisible({ timeout: 15_000 });
    await expect(handoffReadback.getByText('Review requested')).toBeVisible();
    await expect(handoffReadback.getByText('Buyer signed offer pack uploaded')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-review-readback.png`,
    });

    await loginAsSeededManager(page, seed);
    await page.goto(`/distribution/manager/developments/${seed.developmentId}`);
    await expect(page.getByRole('heading', { name: 'Development Deals' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(seed.buyerName)).toBeVisible({ timeout: 15_000 });
    const managerReadback = page.getByTestId(
      `dle-manager-handoff-readback-${seed.dealId}`,
    );
    await expect(managerReadback).toBeVisible({ timeout: 15_000 });
    await expect(managerReadback.getByText('Developer review requested')).toBeVisible();
    await expect(managerReadback.getByText('Buyer signed offer pack uploaded')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-manager-readback.png`,
    });

    const [afterDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, seed.dealId))
      .limit(1);
    expect(afterDeal.currentStage).toBe(beforeDeal.currentStage);
    expect(afterDeal.commissionStatus).toBe(beforeDeal.commissionStatus);

    const operatingEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(operatingEvents).toHaveLength(1);
    expect(operatingEvents[0].eventType).toBe('distribution_handoff_created');
    expect(operatingEvents[0].distributionDealId).toBe(seed.dealId);
    expect(operatingEvents[0].fromStatus).toBe('contract_signed');
    expect(operatingEvents[0].toStatus).toBe('review_requested');
    expect(parseJsonObject(operatingEvents[0].metadata).action).toBe('request_review');
    expect(parseJsonObject(operatingEvents[0].afterData).stageChanged).toBe(false);
    expect(parseJsonObject(operatingEvents[0].afterData).commissionChanged).toBe(false);

    const distributionEvents = await db!
      .select()
      .from(distributionDealEvents)
      .where(eq(distributionDealEvents.dealId, seed.dealId));
    expect(distributionEvents).toHaveLength(1);
    expect(distributionEvents[0].eventType).toBe('note');
    expect(distributionEvents[0].fromStage).toBe('contract_signed');
    expect(distributionEvents[0].toStage).toBe('contract_signed');
    expect(distributionEvents[0].notes).toContain('Buyer signed offer pack uploaded');
    expect(parseJsonObject(distributionEvents[0].metadata).source).toBe(
      'dle.distribution_handoff',
    );
  });
});
