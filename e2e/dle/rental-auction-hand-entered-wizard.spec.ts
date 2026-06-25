import { expect, test, type Locator, type Page, type Request } from '@playwright/test';
import dotenv from 'dotenv';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developmentDrafts, developments, leads, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { COOKIE_NAME } from '../../shared/const';

type Lane = 'rental' | 'auction';

type Scenario = {
  auctionEnd?: string;
  auctionStart?: string;
  auctionType?: string;
  deposit?: number;
  expectedLeadPriceLabel: 'Rent from' | 'Starting bid';
  expectedLeadTransactionType: 'rent' | 'auction';
  expectedPublicPricing: RegExp;
  expectedSearchPricing: RegExp;
  expectedSubmitCta: RegExp;
  expectedTransactionType: 'for_rent' | 'auction';
  lane: Lane;
  leaseTerm?: string;
  name: string;
  priceFrom: number;
  priceTo?: number;
  reservePrice?: number;
  transactionChoice: string;
  unitName: string;
  workflowId: 'residential_rent' | 'residential_auction';
};

type Seed = {
  developerId: number;
  email: string;
  userId: number;
};

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const TINY_PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function getTrpcResponseData(payload: any) {
  const response = Array.isArray(payload) ? payload[0] : payload;
  return response?.result?.data?.json ?? response?.result?.data ?? null;
}

function getTrpcRequestInput(request: Request) {
  const payload = request.postDataJSON();
  const input = Array.isArray(payload) ? payload[0] : payload;
  return input?.json ?? input?.['0']?.json ?? input;
}

function getLeadContext(row: any) {
  const raw = row?.affordabilityData;
  if (!raw) return {};
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return parsed?.leadContext ?? {};
}

async function seedDeveloper(lane: Lane): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${lane}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-hand-entered-${suffix}@example.com`;

  const userInsert = await db!.insert(users).values({
    email,
    role: 'property_developer',
    firstName: 'Hand',
    lastName: 'Entered',
    name: `DLE Hand Entered ${lane}`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `DLE Hand Entered ${lane} Developer`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  return { developerId, email, userId };
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Hand Entered QA`,
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

function inputAfterLabel(scope: Page | Locator, label: string) {
  return scope
    .locator(
      `xpath=.//label[contains(normalize-space(.), ${JSON.stringify(label)})]/following::*[self::input or self::textarea][1]`,
    )
    .first();
}

function sectionByText(scope: Page | Locator, text: string) {
  return scope.locator('div,section,article').filter({ hasText: text }).first();
}

async function selectOptionByVisibleText(page: Page, visibleText: string, optionText: string) {
  await page.getByText(visibleText, { exact: true }).first().click();
  await page.getByRole('option', { name: optionText, exact: true }).click();
}

async function selectOptionNearLabel(page: Page, scope: Page | Locator, label: string, optionText: string) {
  await scope
    .locator(
      `xpath=.//label[contains(normalize-space(.), ${JSON.stringify(label)})]/following::*[@role="combobox"][1]`,
    )
    .first()
    .click();
  await page.getByRole('option', { name: optionText, exact: true }).click();
}

async function clickWizardNext(page: Page, expectedHeading: string | RegExp) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: expectedHeading }).first()).toBeVisible({
    timeout: 15_000,
  });
}

async function uploadHeroAndDocument(page: Page, lane: Lane) {
  await page.locator('input[type="file"]').first().setInputFiles({
    name: `${lane}-hand-entered-hero.png`,
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });
  await expect(page.getByText('Primary Hero')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('tab', { name: /Documents/i }).click();
  await page.locator('input[accept="application/pdf"]').setInputFiles({
    name: `${lane}-hand-entered-pack.pdf`,
    mimeType: 'application/pdf',
    buffer: TINY_PDF,
  });
  await expect(page.getByText(`${lane}-hand-entered-pack.pdf`, { exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

async function fillIdentity(page: Page, scenario: Scenario) {
  await expect(page.getByRole('heading', { name: 'Identity & Market' }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel(/Development Name/i).fill(scenario.name);
  await page.getByLabel(/Subtitle/i).fill(
    scenario.lane === 'rental'
      ? 'Lease-ready homes with renter clarity'
      : 'Auction-ready lots with bidder clarity',
  );
  await selectOptionByVisibleText(page, 'Select nature of development', 'New Development');
  await selectOptionByVisibleText(page, 'Select development status', 'Launching Soon');
  await page.locator('#launchDate').fill('2030-02-01');
  await page.locator('#completionDate').fill('2031-02-01');

  if (scenario.auctionType) {
    await selectOptionByVisibleText(page, 'Select auction type', scenario.auctionType);
  }

  await page.getByLabel('Sectional Title').check();
}

async function fillLocation(page: Page, scenario: Scenario) {
  await inputAfterLabel(page, 'Street Address').fill(
    scenario.lane === 'rental' ? '44 Hand Rental Road' : '55 Hand Auction Road',
  );
  await inputAfterLabel(page, 'City / Town').fill('Cape Town');
  await inputAfterLabel(page, 'Suburb').fill(
    scenario.lane === 'rental' ? 'Hand Rental Proof' : 'Hand Auction Proof',
  );
  await selectOptionByVisibleText(page, 'Select Province', 'Western Cape');
  await inputAfterLabel(page, 'Postal Code').fill('8001');
}

async function fillGovernance(page: Page) {
  await inputAfterLabel(page, 'Min Estimate').fill('900');
  await inputAfterLabel(page, 'Max Estimate').fill('1300');
}

async function fillMarketing(page: Page, scenario: Scenario) {
  await page.getByPlaceholder(/Where coastal luxury meets modern living/i).fill(
    scenario.lane === 'rental'
      ? 'Lease-ready city living'
      : 'Bid-ready coastal opportunity',
  );
  await page.getByPlaceholder(/Describe the lifestyle/i).fill(
    scenario.lane === 'rental'
      ? 'Hand-entered rental packaging proof with monthly rent, deposit, lease term, media, highlights, and renter-ready unit inventory.'
      : 'Hand-entered auction packaging proof with starting bid, reserve strategy, auction window, media, highlights, and bidder-ready lot inventory.',
  );

  const highlights =
    scenario.lane === 'rental'
      ? ['Lease terms visible', 'Deposit expectations clear', 'Rental availability ready']
      : ['Auction window scheduled', 'Reserve strategy tracked', 'Bidder pack ready'];

  for (const highlight of highlights) {
    const highlightInput = page.getByPlaceholder(
      /No Transfer Duty|Lease terms visible|Auction window scheduled/i,
    );
    await highlightInput.fill(highlight);
    await highlightInput.press('Enter');
    await expect(page.getByText(highlight)).toBeVisible();
  }
}

async function fillUnitDialog(page: Page, scenario: Scenario) {
  await page.getByRole('button', { name: /Add Unit Type/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Add Unit Type' })).toBeVisible();

  await inputAfterLabel(dialog, 'Unit Type Name').fill(scenario.unitName);
  await inputAfterLabel(dialog, 'Description').fill(
    scenario.lane === 'rental'
      ? 'Hand-entered rental unit with lease-ready commercial context.'
      : 'Hand-entered auction lot with bidder-ready commercial context.',
  );
  await selectOptionNearLabel(page, dialog, 'Bedrooms', scenario.lane === 'rental' ? '2' : '3');
  await selectOptionNearLabel(page, dialog, 'Bathrooms', '2');
  await inputAfterLabel(dialog, 'Unit Size').fill(scenario.lane === 'rental' ? '78' : '96');

  await dialog.getByRole('button', { name: /Next: Pricing/i }).click();
  await expect(dialog.getByRole('tab', { name: 'Pricing' })).toHaveAttribute('data-state', 'active');

  if (scenario.lane === 'rental') {
    await inputAfterLabel(dialog, 'Monthly Rent From').fill(String(scenario.priceFrom));
    await inputAfterLabel(dialog, 'Monthly Rent To').fill(String(scenario.priceTo));
    await inputAfterLabel(dialog, 'Deposit').fill(String(scenario.deposit));
    await inputAfterLabel(dialog, 'Lease Term').fill(scenario.leaseTerm!);
    await dialog.getByRole('checkbox').click();
    await expect(dialog.getByText('Furnished').first()).toBeVisible();
    await expect(dialog.getByText('Rental package readiness')).toBeVisible();
  } else {
    await inputAfterLabel(dialog, 'Auction Start Date').fill(scenario.auctionStart!);
    await inputAfterLabel(dialog, 'Auction End Date').fill(scenario.auctionEnd!);
    await inputAfterLabel(dialog, 'Starting Bid').fill(String(scenario.priceFrom));
    await inputAfterLabel(dialog, 'Reserve Price').fill(String(scenario.reservePrice));
    await expect(dialog.getByText('Auction package readiness')).toBeVisible();
  }

  await dialog.getByRole('button', { name: /Next: Media/i }).click();
  await dialog.getByRole('button', { name: /Next: Features/i }).click();
  await dialog.getByRole('button', { name: /Next: Stock/i }).click();
  await inputAfterLabel(dialog, 'Available Units').fill(scenario.lane === 'rental' ? '5' : '2');
  await inputAfterLabel(dialog, 'Reserved / Under Offer').fill(scenario.lane === 'rental' ? '1' : '0');
  await dialog.getByRole('button', { name: 'Save Unit Type', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(scenario.unitName).first()).toBeVisible();
}

async function saveDraftAndRead(page: Page) {
  const saveResponsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.saveDraft') &&
      response.request().method() === 'POST',
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();
  const responseData = getTrpcResponseData(await saveResponse.json());
  expect(responseData).toMatchObject({ success: true });

  const requestInput = getTrpcRequestInput(saveResponse.request());
  const draftId = Number(responseData?.id ?? requestInput?.id);
  expect(Number.isFinite(draftId)).toBe(true);

  const db = await getDb();
  expect(db).toBeTruthy();
  const [draft] = await db!
    .select()
    .from(developmentDrafts)
    .where(eq(developmentDrafts.id, draftId))
    .limit(1);
  expect(draft).toBeTruthy();
  return draft;
}

async function publishAndFindDevelopment(page: Page, scenario: Scenario) {
  await page.getByText('Publishing Controls').scrollIntoViewIfNeeded();
  const publishButtonName =
    scenario.lane === 'rental' ? 'Publish Rental Package' : 'Publish Auction Package';
  const confirmButtonName =
    scenario.lane === 'rental' ? 'Confirm & Publish Rental' : 'Confirm & Publish Auction';
  await expect(page.getByRole('button', { name: publishButtonName })).toBeEnabled();

  await page.getByRole('button', { name: publishButtonName }).click();
  await page.getByRole('button', { name: confirmButtonName }).click();
  await expect(page).toHaveURL(/\/developer\/developments/, { timeout: 20_000 });

  const db = await getDb();
  expect(db).toBeTruthy();

  await expect
    .poll(
      async () => {
        const [row] = await db!
          .select()
          .from(developments)
          .where(eq(developments.name, scenario.name))
          .limit(1);
        return row ?? null;
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();

  const [development] = await db!
    .select()
    .from(developments)
    .where(eq(developments.name, scenario.name))
    .limit(1);

  expect(development.isPublished).toBe(1);
  expect(development.approvalStatus).toBe('approved');
  expect(development.transactionType).toBe(scenario.expectedTransactionType);
  return development as any;
}

async function provePublicSearchAndLead(page: Page, scenario: Scenario, development: any, unitId: string) {
  await page.goto(`/development/${development.slug}`);
  await expect(page.getByRole('heading', { name: scenario.name })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(scenario.unitName).first()).toBeVisible();
  await expect(page.locator('body')).toContainText(scenario.expectedPublicPricing);
  await expect(page.getByText(scenario.lane === 'rental' ? 'Lease terms visible' : 'Auction window scheduled').first()).toBeVisible();

  if (scenario.lane === 'rental') {
    await page.goto('/property-to-rent?city=Cape%20Town&province=western-cape&listingSource=development');
  } else {
    await page.goto(
      '/property-for-sale?listingType=auction&city=Cape%20Town&province=western-cape&listingSource=development',
    );
  }
  await expect(page.getByText(scenario.unitName).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(scenario.expectedSearchPricing).first()).toBeVisible();

  await page.goto(`/development/${development.slug}`);
  await page
    .getByRole('button', {
      name: /Request Rental Details|Register Auction Interest|Request Auction Details/i,
    })
    .first()
    .click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText(`Unit: ${scenario.unitName}`).first()).toBeVisible();
  await expect(dialog.getByText(scenario.expectedLeadPriceLabel, { exact: false }).first()).toBeVisible();

  const email = `lead-hand-entered-${scenario.lane}-${Date.now()}@example.com`;
  await page.getByPlaceholder('Full name').fill(`${scenario.lane} Hand Entered Lead`);
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Phone number').fill('0820000000');
  await page
    .getByPlaceholder('Message (optional)')
    .fill('Please send the hand-entered development pack.');
  await page.getByRole('button', { name: scenario.expectedSubmitCta }).click();

  const db = await getDb();
  expect(db).toBeTruthy();
  await expect
    .poll(
      async () => {
        const [lead] = await db!.select().from(leads).where(eq(leads.email, email)).limit(1);
        return lead ?? null;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();

  const [lead] = await db!.select().from(leads).where(eq(leads.email, email)).limit(1);
  const leadContext = getLeadContext(lead);
  expect(Number(lead.developmentId)).toBe(Number(development.id));
  expect(lead.unitId).toBe(unitId);
  expect(lead.unitName).toBe(scenario.unitName);
  expect(lead.leadSource).toBe('development_detail_contact');
  expect(lead.funnelStage).toBe('interest');
  expect(leadContext.transactionType).toBe(scenario.expectedLeadTransactionType);
  expect(leadContext.unitPriceLabel).toBe(scenario.expectedLeadPriceLabel);
}

function expectHandEnteredDraft(draftData: any, scenario: Scenario) {
  expect(draftData).toMatchObject({
    workflowId: scenario.workflowId,
    currentStepId: 'review_publish',
    developmentData: {
      name: scenario.name,
      transactionType: scenario.expectedTransactionType,
    },
    stepData: {
      configuration: {
        transactionType: scenario.expectedTransactionType,
      },
      identity_market: {
        name: scenario.name,
        transactionType: scenario.expectedTransactionType,
      },
      location: {
        city: 'Cape Town',
        province: 'Western Cape',
      },
      marketing_summary: {},
      development_media: {},
      unit_types: {},
    },
  });

  const mediaStep = draftData.stepData.development_media;
  expect(mediaStep.heroImage?.url || mediaStep.photos?.[0]?.url).toContain('/local-uploads/');
  expect(mediaStep.documents?.[0]?.url).toContain('/local-uploads/');

  const unit = draftData.stepData.unit_types.unitTypes[0];
  expect(unit).toMatchObject({
    name: scenario.unitName,
    availableUnits: scenario.lane === 'rental' ? 5 : 2,
  });

  if (scenario.lane === 'rental') {
    expect(unit).toMatchObject({
      monthlyRentFrom: scenario.priceFrom,
      monthlyRentTo: scenario.priceTo,
      depositRequired: scenario.deposit,
      leaseTerm: scenario.leaseTerm,
      isFurnished: true,
    });
    expect(unit.priceFrom ?? 0).toBe(0);
    expect(unit.startingBid).toBeUndefined();
  } else {
    expect(unit).toMatchObject({
      startingBid: scenario.priceFrom,
      reservePrice: scenario.reservePrice,
      auctionStatus: 'scheduled',
    });
    expect(unit.monthlyRentFrom).toBeUndefined();
    expect(unit.priceFrom ?? 0).toBe(0);
  }
}

test.describe.serial('DLE Rental and Auction hand-entered wizard packaging proof', () => {
  const createdUserIds: number[] = [];
  const createdDeveloperIds: number[] = [];
  const createdDraftIds: number[] = [];
  const createdDevelopmentIds: number[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentIds.length > 0) {
      await db.delete(leads).where(inArray(leads.developmentId, createdDevelopmentIds));
      await db.delete(developments).where(inArray(developments.id, createdDevelopmentIds));
    }
    if (createdDraftIds.length > 0) {
      await db.delete(developmentDrafts).where(inArray(developmentDrafts.id, createdDraftIds));
    }
    if (createdDeveloperIds.length > 0) {
      await db.delete(developers).where(inArray(developers.id, createdDeveloperIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  const scenarios: Scenario[] = [
    {
      deposit: 38_000,
      expectedLeadPriceLabel: 'Rent from',
      expectedLeadTransactionType: 'rent',
      expectedPublicPricing: /R\s*18[\s,]500\s*-\s*R\s*21[\s,]000/i,
      expectedSearchPricing: /Rent from\s+R\s*18,500/i,
      expectedSubmitCta: /Send Rental Enquiry/i,
      expectedTransactionType: 'for_rent',
      lane: 'rental',
      leaseTerm: '12 months',
      name: 'DLE Hand Entered Rental Package Proof',
      priceFrom: 18_500,
      priceTo: 21_000,
      transactionChoice: 'To Let / Rent',
      unitName: 'Hand Entered Rental Two Bed',
      workflowId: 'residential_rent',
    },
    {
      auctionEnd: '2030-04-08T17:00',
      auctionStart: '2030-04-01T09:00',
      auctionType: 'Online Auction',
      expectedLeadPriceLabel: 'Starting bid',
      expectedLeadTransactionType: 'auction',
      expectedPublicPricing: /R\s*920[\s,]000/i,
      expectedSearchPricing: /Bid from\s+R\s*920,000/i,
      expectedSubmitCta: /Register Auction Interest|Send Auction Enquiry/i,
      expectedTransactionType: 'auction',
      lane: 'auction',
      name: 'DLE Hand Entered Auction Package Proof',
      priceFrom: 920_000,
      reservePrice: 1_080_000,
      transactionChoice: 'Auction',
      unitName: 'Hand Entered Auction Three Bed',
      workflowId: 'residential_auction',
    },
  ];

  for (const scenario of scenarios) {
    test(`publishes a hand-entered ${scenario.lane} package with transaction-native public output`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const suffix = `${scenario.lane}-${Date.now()}`;
      const seededScenario = {
        ...scenario,
        name: `${scenario.name} ${suffix}`,
        unitName: `${scenario.unitName} ${suffix}`,
      };
      const seed = await seedDeveloper(scenario.lane);
      createdUserIds.push(seed.userId);
      createdDeveloperIds.push(seed.developerId);

      await loginAsSeededDeveloper(page, seed);
      await page.goto('/developer/create-development');
      await expect(page.getByRole('heading', { name: 'Project Setup' })).toBeVisible({
        timeout: 20_000,
      });
      await page.getByText('Residential Development', { exact: true }).click();
      await page.getByText(seededScenario.transactionChoice, { exact: true }).click();
      await page.getByRole('button', { name: 'Start Wizard' }).click();

      await expect(page.getByRole('heading', { name: 'Configuration', exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await page.getByText('Apartment Complex', { exact: true }).click();
      await clickWizardNext(page, 'Identity & Market');
      await fillIdentity(page, seededScenario);
      await clickWizardNext(page, 'Location & Address');
      await fillLocation(page, seededScenario);
      await clickWizardNext(page, 'Governance & Finances');
      await fillGovernance(page);
      await clickWizardNext(page, 'Amenities & Features');
      await page.getByRole('button', { name: 'Apply All' }).click();
      await clickWizardNext(page, 'Marketing Summary');
      await fillMarketing(page, seededScenario);
      await clickWizardNext(page, 'Development Media');
      await uploadHeroAndDocument(page, seededScenario.lane);
      await clickWizardNext(page, 'Unit Types');
      await fillUnitDialog(page, seededScenario);
      await clickWizardNext(page, 'Review & Publish');
      await expect(
        page.getByLabel(`${seededScenario.lane === 'rental' ? 'Rental' : 'Auction'} Engine packaging context`),
      ).toBeVisible();
      await expect(page.getByText(seededScenario.unitName).first()).toBeVisible();

      const draft = await saveDraftAndRead(page);
      createdDraftIds.push(Number(draft.id));
      expectHandEnteredDraft(draft.draftData as any, seededScenario);
      const unitId = String((draft.draftData as any).stepData.unit_types.unitTypes[0].id);

      const development = await publishAndFindDevelopment(page, seededScenario);
      createdDevelopmentIds.push(Number(development.id));
      await provePublicSearchAndLead(page, seededScenario, development, unitId);
    });
  }
});
