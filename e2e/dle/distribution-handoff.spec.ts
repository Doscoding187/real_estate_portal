import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { desc, eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import {
  developers,
  developmentOperatingEvents,
  developmentRequiredDocuments,
  distributionCommissionEntries,
  developments,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionManagerAssignments,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-07';
fs.mkdirSync(evidenceDir, { recursive: true });
const manualReadinessEvidenceDir = 'docs/dle/evidence/2026-06-10';
fs.mkdirSync(manualReadinessEvidenceDir, { recursive: true });
const transactionRuleEvidenceDir = 'docs/dle/evidence/2026-06-11';
fs.mkdirSync(transactionRuleEvidenceDir, { recursive: true });

type HandoffTransactionType = 'for_sale' | 'for_rent' | 'auction';

type Seed = {
  userId: number;
  developerId: number;
  managerUserId: number;
  agentUserId: number;
  developmentId: number;
  developmentName: string;
  programId: number;
  dealId: number;
  commissionEntryId?: number;
  requiredDocumentIds?: number[];
  dealDocumentIds?: number[];
  managerAssignmentId?: number;
  buyerName: string;
  email: string;
  managerEmail: string;
  transactionType: HandoffTransactionType;
};

function getInsertId(result: unknown): number {
  if (Array.isArray(result)) return Number(result[0]?.insertId || 0);
  return Number((result as { insertId?: number })?.insertId || 0);
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

function buildSeedDraftTransactionRuleNotes(transactionType: HandoffTransactionType) {
  if (transactionType === 'auction') {
    return [
      '[DLE draft transaction rule]',
      'Lane: Auction',
      'Trigger: winning_bidder_confirmed',
      'Required conditions:',
      '- Auction programme payout trigger is explicitly selected.',
      '- Winning-bidder evidence is verified when required by the selected trigger.',
      '- Manager manual auction bidder readiness review is accepted.',
      'Automation: disabled until programme terms, document review rules, manager/admin approval gates, and DLE outcome conditions are explicitly implemented and tested.',
    ].join('\n');
  }

  if (transactionType === 'for_rent') {
    return [
      '[DLE draft transaction rule]',
      'Lane: Rental',
      'Trigger: deposit_received',
      'Required conditions:',
      '- Rental programme payout trigger is explicitly selected.',
      '- Deposit evidence is verified when required by the selected trigger.',
      '- Manager manual rental readiness review is accepted.',
      'Automation: disabled until programme terms, document review rules, manager/admin approval gates, and DLE outcome conditions are explicitly implemented and tested.',
    ].join('\n');
  }

  return null;
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

function buildTransactionDevelopmentPayload(input: {
  suffix: string;
  transactionType: HandoffTransactionType;
  unitTypeId: string;
}) {
  const { suffix, transactionType, unitTypeId } = input;
  const commonPayload = {
    name: `DLE Distribution Handoff ${suffix}`,
    developmentType: 'residential',
    transactionType,
    address: '18 Referral Handoff Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Referral Proof',
    description: 'Distribution handoff browser proof keeps DLE and referral ownership separate.',
    highlights: ['Manager review ready', 'Commission protected', 'Audit linked'],
    images: [{ url: 'https://example.com/dle-distribution-handoff.jpg' }],
  };

  if (transactionType === 'for_rent') {
    return {
      ...commonPayload,
      name: `DLE Rental Distribution Handoff ${suffix}`,
      status: 'leasing',
      monthlyRentFrom: 13_500,
      monthlyRentTo: 15_500,
      unitTypes: [
        {
          id: unitTypeId,
          name: `Referral Handoff Rental Unit ${suffix}`,
          bedrooms: 2,
          bathrooms: 2,
          monthlyRentFrom: 13_500,
          monthlyRentTo: 15_500,
          depositRequired: 27_000,
          leaseTerm: '12 months',
          totalUnits: 4,
          availableUnits: 2,
          reservedUnits: 1,
        },
      ],
    };
  }

  if (transactionType === 'auction') {
    return {
      ...commonPayload,
      name: `DLE Auction Distribution Handoff ${suffix}`,
      status: 'launching-soon',
      startingBidFrom: 850_000,
      reservePriceFrom: 950_000,
      unitTypes: [
        {
          id: unitTypeId,
          name: `Referral Handoff Auction Lot ${suffix}`,
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
    };
  }

  return {
    ...commonPayload,
    status: 'selling',
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
  };
}

async function seedDistributionHandoffDevelopment(
  suffix: string,
  transactionType: HandoffTransactionType = 'for_sale',
): Promise<Seed> {
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

  const unitTypeId = `handoff-${transactionType}-${suffix}`.slice(0, 36);
  const created = await developmentService.createDevelopment(
    userId,
    buildTransactionDevelopmentPayload({ suffix, transactionType, unitTypeId }) as any,
  );
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
    transactionType,
  };
}

async function seedManualReadinessPrerequisites(seed: Seed) {
  const db = await getDb();
  expect(db).toBeTruthy();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [assignmentInsert] = await db!.insert(distributionManagerAssignments).values({
    developmentId: seed.developmentId,
    managerUserId: seed.managerUserId,
    isPrimary: 1,
    isActive: 1,
    assignedAt: now,
    workloadCapacity: 0,
    timezone: null,
  } as any);
  seed.managerAssignmentId = getInsertId(assignmentInsert);

  const requiredDocumentInputs =
    seed.transactionType === 'auction'
      ? [
          {
            documentLabel: 'Auction registration pack',
            transactionType: 'auction',
            participantType: 'bidder',
            readinessRole: 'auction_registration',
          },
          {
            documentLabel: 'Auction terms acceptance',
            transactionType: 'auction',
            participantType: 'bidder',
            readinessRole: 'auction_terms',
          },
        ]
      : [
          {
            documentLabel: 'Lease readiness pack',
            transactionType: 'rent',
            participantType: 'renter',
            readinessRole: 'lease',
          },
        ];

  const requiredDocumentIds: number[] = [];
  const dealDocumentIds: number[] = [];
  const draftRuleNotes = buildSeedDraftTransactionRuleNotes(seed.transactionType);
  if (draftRuleNotes) {
    await db!
      .update(distributionPrograms)
      .set({
        payoutMilestone: 'custom',
        payoutMilestoneNotes: draftRuleNotes,
      } as any)
      .where(eq(distributionPrograms.id, seed.programId));
  }

  for (const [index, documentInput] of requiredDocumentInputs.entries()) {
    const [documentInsert] = await db!.insert(developmentRequiredDocuments).values({
      developmentId: seed.developmentId,
      documentCode: 'custom' as any,
      documentLabel: documentInput.documentLabel,
      transactionType: documentInput.transactionType as any,
      participantType: documentInput.participantType as any,
      readinessRole: documentInput.readinessRole as any,
      blocksPayout: 1,
      isRequired: 1,
      sortOrder: index,
      isActive: 1,
    });
    const requiredDocumentId = getInsertId(documentInsert);
    requiredDocumentIds.push(requiredDocumentId);

    const [dealDocumentInsert] = await db!.insert(distributionDealDocuments).values({
      dealId: seed.dealId,
      developmentRequiredDocumentId: requiredDocumentId,
      status: 'verified',
      receivedAt: now,
      verifiedAt: now,
      receivedBy: seed.managerUserId,
      verifiedBy: seed.managerUserId,
      notes: 'Browser proof pre-verified readiness document.',
    } as any);
    dealDocumentIds.push(getInsertId(dealDocumentInsert));
  }

  const [commissionInsert] = await db!.insert(distributionCommissionEntries).values({
    dealId: seed.dealId,
    programId: seed.programId,
    developmentId: seed.developmentId,
    agentId: seed.agentUserId,
    calculationBaseAmount: seed.transactionType === 'for_rent' ? 27_000 : 950_000,
    commissionPercent: '2.50',
    commissionAmount: seed.transactionType === 'for_rent' ? 675 : 23_750,
    currency: 'ZAR',
    triggerStage: 'contract_signed',
    entryStatus: 'pending',
    notes: 'Browser proof reward row; manual readiness must remain read-only.',
    createdBy: seed.managerUserId,
  } as any);

  seed.requiredDocumentIds = requiredDocumentIds;
  seed.dealDocumentIds = dealDocumentIds;
  seed.commissionEntryId = getInsertId(commissionInsert);
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
  const cleanupSeeds: Seed[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    const seedsToClean = [...(seed ? [seed] : []), ...cleanupSeeds];
    for (const cleanup of seedsToClean.reverse()) {
      await db.delete(distributionDealEvents).where(eq(distributionDealEvents.dealId, cleanup.dealId));
      if (cleanup.dealDocumentIds?.length) {
        for (const dealDocumentId of cleanup.dealDocumentIds) {
          await db.delete(distributionDealDocuments).where(eq(distributionDealDocuments.id, dealDocumentId));
        }
      }
      if (cleanup.commissionEntryId) {
        await db
          .delete(distributionCommissionEntries)
          .where(eq(distributionCommissionEntries.id, cleanup.commissionEntryId));
      }
      await db
        .delete(developmentOperatingEvents)
        .where(eq(developmentOperatingEvents.developmentId, cleanup.developmentId));
      await db.delete(distributionDeals).where(eq(distributionDeals.id, cleanup.dealId));
      await db.delete(distributionPrograms).where(eq(distributionPrograms.id, cleanup.programId));
      if (cleanup.requiredDocumentIds?.length) {
        for (const requiredDocumentId of cleanup.requiredDocumentIds) {
          await db
            .delete(developmentRequiredDocuments)
            .where(eq(developmentRequiredDocuments.id, requiredDocumentId));
        }
      }
      if (cleanup.managerAssignmentId) {
        await db
          .delete(distributionManagerAssignments)
          .where(eq(distributionManagerAssignments.id, cleanup.managerAssignmentId));
      }
      await db.delete(developments).where(eq(developments.id, cleanup.developmentId));
      await db.delete(developers).where(eq(developers.id, cleanup.developerId));
      await db.delete(users).where(eq(users.id, cleanup.agentUserId));
      await db.delete(users).where(eq(users.id, cleanup.managerUserId));
      await db.delete(users).where(eq(users.id, cleanup.userId));
    }
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
    const handoffReadback = page.getByTestId(
      `dle-distribution-handoff-readback-${seed.dealId}`,
    );
    await expect(handoffReadback).toBeVisible({ timeout: 15_000 });
    await expect(handoffReadback.getByText('Review requested')).toBeVisible();
    await expect(handoffReadback.getByText('Sale referral review')).toBeVisible();
    await expect(handoffReadback.getByText('Buyer signed offer pack uploaded')).toBeVisible();
    const operatingReview = page.getByTestId('dle-operating-review-context');
    await expect(operatingReview).toBeVisible();
    await expect(page.getByTestId('dle-operating-review-inventory')).toContainText(
      'Inventory outcome not recorded',
    );
    await expect(page.getByTestId('dle-operating-review-lead')).toContainText(
      'Lead sync not recorded',
    );
    await expect(page.getByTestId('dle-operating-review-handoff')).toContainText(
      'Review requested',
    );
    await expect(page.getByTestId('dle-operating-review-handoff')).toContainText(
      'Buyer signed offer pack uploaded',
    );
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-review-readback.png`,
    });

    await loginAsSeededManager(page, seed);
    await page.goto(`/distribution/manager/developments/${seed.developmentId}`);
    await expect(page.getByRole('heading', { name: 'Development Referrals' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(seed.buyerName)).toBeVisible({ timeout: 15_000 });
    const managerReadback = page.getByTestId(
      `dle-manager-handoff-readback-${seed.dealId}`,
    );
    await expect(managerReadback).toBeVisible({ timeout: 15_000 });
    await expect(managerReadback.getByText('Developer review requested')).toBeVisible();
    await expect(managerReadback.getByText('Sale referral review')).toBeVisible();
    await expect(managerReadback.getByText('Buyer signed offer pack uploaded')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-manager-readback.png`,
    });

    await page.getByTestId(`dle-manager-handoff-ack-${seed.dealId}`).click();
    await expect(page.getByText('DLE handoff acknowledged.')).toBeVisible({
      timeout: 15_000,
    });
    const managerAcknowledgement = page.getByTestId(
      `dle-manager-handoff-acknowledged-${seed.dealId}`,
    );
    await expect(managerAcknowledgement).toBeVisible({ timeout: 15_000 });
    await expect(managerAcknowledgement.getByText('Acknowledged', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-manager-acknowledged.png`,
    });

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.developmentName);
    const developerAcknowledgement = page.getByTestId(
      `dle-distribution-handoff-acknowledged-${seed.dealId}`,
    );
    await expect(developerAcknowledgement).toBeVisible({ timeout: 15_000 });
    await expect(developerAcknowledgement.getByText('Manager acknowledged')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-developer-acknowledged.png`,
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
      .where(eq(distributionDealEvents.dealId, seed.dealId))
      .orderBy(desc(distributionDealEvents.id));
    expect(distributionEvents).toHaveLength(2);

    const handoffNoteEvent = distributionEvents.find(
      event => parseJsonObject(event.metadata).source === 'dle.distribution_handoff',
    );
    expect(handoffNoteEvent).toBeTruthy();
    expect(handoffNoteEvent!.eventType).toBe('note');
    expect(handoffNoteEvent!.fromStage).toBe('contract_signed');
    expect(handoffNoteEvent!.toStage).toBe('contract_signed');
    expect(handoffNoteEvent!.notes).toContain('Buyer signed offer pack uploaded');

    const acknowledgementEvent = distributionEvents.find(
      event =>
        parseJsonObject(event.metadata).source ===
        'distribution.manager.acknowledgeDleHandoff',
    );
    expect(acknowledgementEvent).toBeTruthy();
    expect(acknowledgementEvent!.eventType).toBe('note');
    expect(acknowledgementEvent!.fromStage).toBe('contract_signed');
    expect(acknowledgementEvent!.toStage).toBe('contract_signed');
    expect(acknowledgementEvent!.notes).toContain('DLE handoff acknowledged');
    expect(parseJsonObject(acknowledgementEvent!.metadata).handoffEventId).toBe(
      operatingEvents[0].id,
    );
    expect(parseJsonObject(acknowledgementEvent!.metadata).stageChanged).toBe(false);
    expect(parseJsonObject(acknowledgementEvent!.metadata).commissionChanged).toBe(false);
  });

  test('requests Rental referral handoff review without changing stage or commission', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rentalSeed = await seedDistributionHandoffDevelopment(suffix, 'for_rent');
    cleanupSeeds.push(rentalSeed);
    const db = await getDb();
    expect(db).toBeTruthy();

    const [beforeDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, rentalSeed.dealId))
      .limit(1);

    await loginAsSeededDeveloper(page, rentalSeed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, rentalSeed.developmentName);
    await expect(page.getByText('Distribution Impact')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(rentalSeed.buyerName)).toBeVisible({ timeout: 15_000 });

    await page.getByTestId(`dle-distribution-handoff-open-${rentalSeed.dealId}`).click();
    await page
      .getByTestId('dle-distribution-handoff-note')
      .fill('Rental application pack is ready. Please review referral handoff without commission movement.');
    await page.getByTestId('dle-distribution-handoff-submit').click();
    await expect(page.getByText('Referral handoff review requested')).toBeVisible({
      timeout: 15_000,
    });
    const handoffReadback = page.getByTestId(
      `dle-distribution-handoff-readback-${rentalSeed.dealId}`,
    );
    await expect(handoffReadback).toBeVisible({ timeout: 15_000 });
    await expect(handoffReadback.getByText('Rental referral review')).toBeVisible();
    await expect(handoffReadback.getByText('Rental application pack is ready')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-rental-review-readback.png`,
    });

    await loginAsSeededManager(page, rentalSeed);
    await page.goto(`/distribution/manager/developments/${rentalSeed.developmentId}`);
    await expect(page.getByRole('heading', { name: 'Development Deals' })).toBeVisible({
      timeout: 15_000,
    });
    const managerReadback = page.getByTestId(
      `dle-manager-handoff-readback-${rentalSeed.dealId}`,
    );
    await expect(managerReadback).toBeVisible({ timeout: 15_000 });
    await expect(managerReadback.getByText('Rental referral review')).toBeVisible();
    await expect(managerReadback.getByText('Rental application pack is ready')).toBeVisible();

    const [afterDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, rentalSeed.dealId))
      .limit(1);
    expect(afterDeal.currentStage).toBe(beforeDeal.currentStage);
    expect(afterDeal.commissionStatus).toBe(beforeDeal.commissionStatus);

    const operatingEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, rentalSeed.developmentId));
    expect(operatingEvents).toHaveLength(1);
    expect(operatingEvents[0].eventType).toBe('distribution_handoff_created');
    expect(operatingEvents[0].transactionType).toBe('for_rent');
    expect(operatingEvents[0].distributionDealId).toBe(rentalSeed.dealId);
    expect(parseJsonObject(operatingEvents[0].afterData).stageChanged).toBe(false);
    expect(parseJsonObject(operatingEvents[0].afterData).commissionChanged).toBe(false);
  });

  test('requests Auction referral handoff review without changing stage or commission', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const auctionSeed = await seedDistributionHandoffDevelopment(suffix, 'auction');
    cleanupSeeds.push(auctionSeed);
    const db = await getDb();
    expect(db).toBeTruthy();

    const [beforeDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, auctionSeed.dealId))
      .limit(1);

    await loginAsSeededDeveloper(page, auctionSeed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, auctionSeed.developmentName);
    await expect(page.getByText('Distribution Impact')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(auctionSeed.buyerName)).toBeVisible({ timeout: 15_000 });

    await page.getByTestId(`dle-distribution-handoff-open-${auctionSeed.dealId}`).click();
    await page
      .getByTestId('dle-distribution-handoff-note')
      .fill('Auction bidder file needs manager review before any referral stage or commission movement.');
    await page.getByTestId('dle-distribution-handoff-submit').click();
    await expect(page.getByText('Referral handoff review requested')).toBeVisible({
      timeout: 15_000,
    });
    const handoffReadback = page.getByTestId(
      `dle-distribution-handoff-readback-${auctionSeed.dealId}`,
    );
    await expect(handoffReadback).toBeVisible({ timeout: 15_000 });
    await expect(handoffReadback.getByText('Auction referral review')).toBeVisible();
    await expect(handoffReadback.getByText('Auction bidder file needs manager review')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-distribution-handoff-auction-review-readback.png`,
    });

    await loginAsSeededManager(page, auctionSeed);
    await page.goto(`/distribution/manager/developments/${auctionSeed.developmentId}`);
    await expect(page.getByRole('heading', { name: 'Development Deals' })).toBeVisible({
      timeout: 15_000,
    });
    const managerReadback = page.getByTestId(
      `dle-manager-handoff-readback-${auctionSeed.dealId}`,
    );
    await expect(managerReadback).toBeVisible({ timeout: 15_000 });
    await expect(managerReadback.getByText('Auction referral review')).toBeVisible();
    await expect(managerReadback.getByText('Auction bidder file needs manager review')).toBeVisible();

    const [afterDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, auctionSeed.dealId))
      .limit(1);
    expect(afterDeal.currentStage).toBe(beforeDeal.currentStage);
    expect(afterDeal.commissionStatus).toBe(beforeDeal.commissionStatus);

    const operatingEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, auctionSeed.developmentId));
    expect(operatingEvents).toHaveLength(1);
    expect(operatingEvents[0].eventType).toBe('distribution_handoff_created');
    expect(operatingEvents[0].transactionType).toBe('auction');
    expect(operatingEvents[0].distributionDealId).toBe(auctionSeed.dealId);
    expect(parseJsonObject(operatingEvents[0].afterData).stageChanged).toBe(false);
    expect(parseJsonObject(operatingEvents[0].afterData).commissionChanged).toBe(false);
  });

  test('shows manager manual readiness decisions in admin deal and reward rows without automation', async ({
    page,
  }) => {
    const rentalSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const auctionSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rentalSeed = await seedDistributionHandoffDevelopment(rentalSuffix, 'for_rent');
    const auctionSeed = await seedDistributionHandoffDevelopment(auctionSuffix, 'auction');
    cleanupSeeds.push(rentalSeed, auctionSeed);
    await seedManualReadinessPrerequisites(rentalSeed);
    await seedManualReadinessPrerequisites(auctionSeed);

    const db = await getDb();
    expect(db).toBeTruthy();
    const [rentalBeforeDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, rentalSeed.dealId))
      .limit(1);
    const [auctionBeforeDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, auctionSeed.dealId))
      .limit(1);

    await loginAsSeededManager(page, rentalSeed);
    await page.goto(`/distribution/manager/deals/${rentalSeed.dealId}`);
    await expect(page.getByRole('heading', { name: 'Manual Readiness Review' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Transaction rule model')).toBeVisible();
    await expect(page.getByText('Transaction-specific rules required')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^Lease Signed$/ })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^Deposit Received$/ })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^First Rent Paid$/ })).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: /^Manager manual rental readiness review is accepted\.$/ }).first(),
    ).toBeVisible();
    await expect(page.getByText('Saved draft rule notes')).toBeVisible();
    await expect(page.getByText(/Trigger: Deposit Received/i)).toBeVisible();
    await expect(page.getByText('Deposit evidence is verified when required by the selected trigger.')).toBeVisible();
    await expect(page.getByText('Lease readiness review')).toBeVisible();
    await page.getByPlaceholder('Manual review note').fill('Lease readiness accepted in browser proof.');
    await page.getByRole('button', { name: 'Accept readiness' }).click();
    await expect(page.getByText('Manual readiness accepted.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Accepted', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${manualReadinessEvidenceDir}/qa-dle-admin-manual-readiness-manager-rental.png`,
    });
    await page.screenshot({
      path: `${transactionRuleEvidenceDir}/qa-dle-transaction-rule-manager-rental.png`,
    });

    await loginAsSeededManager(page, auctionSeed);
    await page.goto(`/distribution/manager/deals/${auctionSeed.dealId}`);
    await expect(page.getByRole('heading', { name: 'Manual Readiness Review' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Transaction rule model')).toBeVisible();
    await expect(page.getByText('Transaction-specific rules required')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^Winning Bidder Confirmed$/ })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^Auction Terms Signed$/ })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^Settlement Confirmed$/ })).toBeVisible();
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: /^Manager manual auction bidder readiness review is accepted\.$/ })
        .first(),
    ).toBeVisible();
    await expect(page.getByText('Saved draft rule notes')).toBeVisible();
    await expect(page.getByText(/Trigger: Winning Bidder Confirmed/i)).toBeVisible();
    await expect(page.getByText('Winning-bidder evidence is verified when required by the selected trigger.')).toBeVisible();
    await expect(page.getByText('Bidder readiness review', { exact: true })).toBeVisible();
    await page.getByPlaceholder('Manual review note').fill('Bidder readiness accepted in browser proof.');
    await page.getByRole('button', { name: 'Accept readiness' }).click();
    await expect(page.getByText('Manual readiness accepted.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Accepted', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${manualReadinessEvidenceDir}/qa-dle-admin-manual-readiness-manager-auction.png`,
    });
    await page.screenshot({
      path: `${transactionRuleEvidenceDir}/qa-dle-transaction-rule-manager-auction.png`,
    });

    await page.goto('/admin/distribution/deal-pipeline');
    await expect(page.getByRole('heading', { name: 'Distribution Network' })).toBeVisible({
      timeout: 15_000,
    });
    const rentalDealRow = page.locator('div.rounded.border').filter({
      hasText: rentalSeed.developmentName,
    });
    await expect(rentalDealRow.getByText('Manual readiness: Lease readiness review accepted')).toBeVisible({
      timeout: 15_000,
    });
    await expect(rentalDealRow.getByText('Lease readiness accepted in browser proof')).toBeVisible();
    await expect(
      rentalDealRow.getByText(
        'Manual readiness: Lease readiness review accepted by Referral Manager. Note: Lease readiness accepted in browser proof. Reward automation remains disabled.',
      ),
    ).toBeVisible();
    await expect(
      rentalDealRow.getByText('Rule model: transaction-specific rules required', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      rentalDealRow.getByText('triggers: Lease Signed, Deposit Received, First Rent Paid, Manual Approval', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(rentalDealRow.getByText('required conditions: 5.', { exact: false })).toBeVisible();
    await expect(
      rentalDealRow.getByText('Draft rule saved: Deposit Received; automation disabled.', {
        exact: false,
      }),
    ).toBeVisible();

    const auctionDealRow = page.locator('div.rounded.border').filter({
      hasText: auctionSeed.developmentName,
    });
    await expect(
      auctionDealRow.getByText('Manual readiness: Bidder readiness review accepted'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(auctionDealRow.getByText('Bidder readiness accepted in browser proof')).toBeVisible();
    await expect(
      auctionDealRow.getByText(
        'Manual readiness: Bidder readiness review accepted by Referral Manager. Note: Bidder readiness accepted in browser proof. Reward automation remains disabled.',
      ),
    ).toBeVisible();
    await expect(
      auctionDealRow.getByText('Rule model: transaction-specific rules required', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      auctionDealRow.getByText(
        'triggers: Winning Bidder Confirmed, Auction Terms Signed, Deposit Paid, Settlement Confirmed, Manual Approval',
        { exact: false },
      ),
    ).toBeVisible();
    await expect(auctionDealRow.getByText('required conditions: 5.', { exact: false })).toBeVisible();
    await expect(
      auctionDealRow.getByText('Draft rule saved: Winning Bidder Confirmed; automation disabled.', {
        exact: false,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${manualReadinessEvidenceDir}/qa-dle-admin-manual-readiness-deal-pipeline.png`,
    });
    await page.screenshot({
      path: `${transactionRuleEvidenceDir}/qa-dle-transaction-rule-admin-deal-pipeline.png`,
    });

    await page.goto('/admin/distribution/commission-incentives');
    await expect(page.getByRole('heading', { name: 'Distribution Network' })).toBeVisible({
      timeout: 15_000,
    });
    const rentalRewardRow = page.locator('div.rounded.border').filter({
      hasText: rentalSeed.developmentName,
    });
    await expect(
      rentalRewardRow.getByText('Manual readiness: Lease readiness review accepted'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      rentalRewardRow.getByText(
        'Manual readiness: Lease readiness review accepted by Referral Manager. Note: Lease readiness accepted in browser proof. Reward automation remains disabled.',
      ),
    ).toBeVisible();
    await expect(
      rentalRewardRow.getByText('Rule model: transaction-specific rules required', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      rentalRewardRow.getByText('triggers: Lease Signed, Deposit Received, First Rent Paid, Manual Approval', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      rentalRewardRow.getByText('Draft rule saved: Deposit Received; automation disabled.', {
        exact: false,
      }),
    ).toBeVisible();

    const auctionRewardRow = page.locator('div.rounded.border').filter({
      hasText: auctionSeed.developmentName,
    });
    await expect(
      auctionRewardRow.getByText('Manual readiness: Bidder readiness review accepted'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      auctionRewardRow.getByText(
        'Manual readiness: Bidder readiness review accepted by Referral Manager. Note: Bidder readiness accepted in browser proof. Reward automation remains disabled.',
      ),
    ).toBeVisible();
    await expect(
      auctionRewardRow.getByText('Rule model: transaction-specific rules required', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      auctionRewardRow.getByText(
        'triggers: Winning Bidder Confirmed, Auction Terms Signed, Deposit Paid, Settlement Confirmed, Manual Approval',
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      auctionRewardRow.getByText('Draft rule saved: Winning Bidder Confirmed; automation disabled.', {
        exact: false,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${manualReadinessEvidenceDir}/qa-dle-admin-manual-readiness-reward-rows.png`,
    });
    await page.screenshot({
      path: `${transactionRuleEvidenceDir}/qa-dle-transaction-rule-admin-reward-rows.png`,
    });

    const [rentalAfterDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, rentalSeed.dealId))
      .limit(1);
    const [auctionAfterDeal] = await db!
      .select()
      .from(distributionDeals)
      .where(eq(distributionDeals.id, auctionSeed.dealId))
      .limit(1);
    expect(rentalAfterDeal.currentStage).toBe(rentalBeforeDeal.currentStage);
    expect(rentalAfterDeal.commissionStatus).toBe(rentalBeforeDeal.commissionStatus);
    expect(auctionAfterDeal.currentStage).toBe(auctionBeforeDeal.currentStage);
    expect(auctionAfterDeal.commissionStatus).toBe(auctionBeforeDeal.commissionStatus);

    const manualEvents = await db!
      .select()
      .from(distributionDealEvents)
      .where(eq(distributionDealEvents.eventType, 'validation'));
    const rentalManualEvent = manualEvents.find(
      event =>
        event.dealId === rentalSeed.dealId &&
        parseJsonObject(event.metadata).kind === 'manual_readiness_review',
    );
    const auctionManualEvent = manualEvents.find(
      event =>
        event.dealId === auctionSeed.dealId &&
        parseJsonObject(event.metadata).kind === 'manual_readiness_review',
    );
    expect(parseJsonObject(rentalManualEvent?.metadata).stageChanged).toBe(false);
    expect(parseJsonObject(rentalManualEvent?.metadata).commissionChanged).toBe(false);
    expect(parseJsonObject(rentalManualEvent?.metadata).payoutReadyChanged).toBe(false);
    expect(parseJsonObject(auctionManualEvent?.metadata).stageChanged).toBe(false);
    expect(parseJsonObject(auctionManualEvent?.metadata).commissionChanged).toBe(false);
    expect(parseJsonObject(auctionManualEvent?.metadata).payoutReadyChanged).toBe(false);
  });
});
