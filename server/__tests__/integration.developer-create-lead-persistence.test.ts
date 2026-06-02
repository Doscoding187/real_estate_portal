import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developmentService } from '../services/developmentService';
import {
  developerBrandProfiles,
  developers,
  developments,
  leads,
  users,
} from '../../drizzle/schema';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

const getInsertId = (insertResult: unknown): number => {
  const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
    return Number((candidate as { insertId: number }).insertId);
  }
  throw new Error('Unable to read insertId from insert result');
};

function createPublicCaller() {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as any);
}

describeWithDb('developer.createLead persistence integration', () => {
  let createdLeadIds: number[] = [];
  let createdDevelopmentIds: number[] = [];
  let createdDeveloperIds: number[] = [];
  let createdBrandProfileIds: number[] = [];
  let createdUserIds: number[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    for (const leadId of createdLeadIds.splice(0).reverse()) {
      await db.delete(leads).where(eq(leads.id, leadId));
    }
    for (const developmentId of createdDevelopmentIds.splice(0).reverse()) {
      await db.delete(developments).where(eq(developments.id, developmentId));
    }
    for (const developerId of createdDeveloperIds.splice(0).reverse()) {
      await db.delete(developers).where(eq(developers.id, developerId));
    }
    for (const brandProfileId of createdBrandProfileIds.splice(0).reverse()) {
      await db.delete(developerBrandProfiles).where(eq(developerBrandProfiles.id, brandProfileId));
    }
    for (const userId of createdUserIds.splice(0).reverse()) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  async function createApprovedDeveloper(label: string, suffix: string) {
    const db = await getDb();
    expect(db).toBeTruthy();

    const userInsert = await db!.insert(users).values({
      email: `${label}-lead-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: label,
      lastName: 'Lead',
      name: `${label} Lead User`,
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    createdUserIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `${label} Lead Developer ${suffix}`,
      email: `${label}-lead-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    createdDeveloperIds.push(developerId);

    return { userId, developerId };
  }

  async function createDevelopmentForLead(input: {
    label: string;
    suffix: string;
    userId: number;
    unitTypeId: string;
    brandProfileId?: number;
  }) {
    const created = await developmentService.createDevelopment(
      input.userId,
      {
        name: `${input.label} Lead Development ${input.suffix}`,
        developmentType: 'residential',
        transactionType: 'for_sale',
        address: `1 ${input.label} Lead Road`,
        city: `Lead City ${input.suffix}`,
        province: 'Gauteng',
        suburb: 'Lead Gardens',
        status: 'selling',
        ownershipType: 'sectional-title',
        ownershipTypes: ['sectional-title'],
        launchDate: '2026-06-01',
        completionDate: '2027-03-31',
        description: 'Lead persistence test development with canonical unit inventory.',
        highlights: ['Canonical unit identity', 'Lead routing', 'Persistence'],
        images: [{ url: `https://example.com/${input.label}-lead.jpg` }],
        unitTypes: [
          {
            id: input.unitTypeId,
            name: `${input.label} Type A`,
            bedrooms: 3,
            bathrooms: 2,
            unitSize: 92,
            priceFrom: 1_299_000,
            priceTo: 1_449_000,
            totalUnits: 12,
            availableUnits: 8,
            reservedUnits: 1,
            parkingType: 'covered',
            parkingBays: 1,
            displayOrder: 0,
          },
        ],
      } as any,
      input.brandProfileId ? { brandProfileId: input.brandProfileId } : undefined,
      input.brandProfileId ? { brandProfileId: input.brandProfileId } : undefined,
    );
    const developmentId = Number(created.id);
    expect(created.developerBrandProfileId ?? null).toBe(input.brandProfileId ?? null);
    createdDevelopmentIds.push(developmentId);
    return developmentId;
  }

  it('persists canonical unit context for direct development enquiries', async () => {
    const suffix = `${Date.now()}`;
    const unitTypeId = `lead-direct-${suffix}`.slice(0, 36);
    const { userId } = await createApprovedDeveloper('Direct', suffix);
    const developmentId = await createDevelopmentForLead({
      label: 'Direct',
      suffix,
      userId,
      unitTypeId,
    });

    const result = await createPublicCaller().developer.createLead({
      developmentId,
      unitId: unitTypeId,
      unitName: 'Direct Type A',
      unitPriceFrom: 1_299_000,
      unitBedrooms: 3,
      unitBathrooms: 2,
      name: 'Direct Buyer',
      email: `direct-buyer-${suffix}@example.com`,
      phone: '0820000000',
      message: 'Please send direct unit information.',
      leadSource: 'development_detail_info',
      referrerUrl: `https://example.test/development/direct/unit/${unitTypeId}`,
    });
    createdLeadIds.push(Number(result.leadId));

    expect(result.route).toBe('direct');

    const db = await getDb();
    const [persisted] = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, Number(result.leadId)))
      .limit(1);

    expect(persisted).toBeDefined();
    expect(persisted).toMatchObject({
      developmentId,
      developerBrandProfileId: null,
      unitId: unitTypeId,
      unitName: 'Direct Type A',
      name: 'Direct Buyer',
      email: `direct-buyer-${suffix}@example.com`,
      source: 'development_detail_info',
      leadSource: 'development_detail_info',
      referrerUrl: `https://example.test/development/direct/unit/${unitTypeId}`,
      funnelStage: 'interest',
      qualificationStatus: 'pending',
    });
    expect(Number(persisted.unitPriceFrom)).toBe(1_299_000);
    expect(Number(persisted.unitBedrooms)).toBe(3);
    expect(Number(persisted.unitBathrooms)).toBe(2);
  }, 120000);

  it('persists canonical unit context for brand-routed development enquiries', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}`;
    const unitTypeId = `lead-brand-${suffix}`.slice(0, 36);
    const { userId } = await createApprovedDeveloper('Brand', suffix);

    const brandInsert = await db!.insert(developerBrandProfiles).values({
      brandName: `Brand Lead Profile ${suffix}`,
      slug: `brand-lead-profile-${suffix}`,
      ownerType: 'platform',
      identityType: 'developer',
      profileType: 'industry_reference',
      isVisible: 1,
      isSubscriber: 0,
      isContactVerified: 0,
      createdBy: userId,
    });
    const brandProfileId = getInsertId(brandInsert);
    createdBrandProfileIds.push(brandProfileId);

    const developmentId = await createDevelopmentForLead({
      label: 'Brand',
      suffix,
      userId,
      unitTypeId,
      brandProfileId,
    });

    const result = await createPublicCaller().developer.createLead({
      developmentId,
      unitId: unitTypeId,
      unitName: 'Brand Type A',
      unitPriceFrom: 1_399_000,
      unitBedrooms: 3,
      unitBathrooms: 2,
      name: 'Brand Buyer',
      email: `brand-buyer-${suffix}@example.com`,
      phone: '0830000000',
      message: 'Please send brand-routed unit information.',
      leadSource: 'development_detail_info',
      referrerUrl: `https://example.test/development/brand/unit/${unitTypeId}`,
    });
    createdLeadIds.push(Number(result.leadId));

    expect(result.route).toBe('brand');
    expect(result.brandLeadStatus).toBe('captured');

    const [persisted] = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, Number(result.leadId)))
      .limit(1);

    expect(persisted).toBeDefined();
    expect(persisted).toMatchObject({
      developmentId,
      developerBrandProfileId: brandProfileId,
      unitId: unitTypeId,
      unitName: 'Brand Type A',
      name: 'Brand Buyer',
      email: `brand-buyer-${suffix}@example.com`,
      source: 'development_detail_info',
      leadSource: 'development_detail_info',
      referrerUrl: `https://example.test/development/brand/unit/${unitTypeId}`,
      brandLeadStatus: 'captured',
      leadDeliveryMethod: 'none',
      funnelStage: 'interest',
      qualificationStatus: 'pending',
    });
    expect(Number(persisted.unitPriceFrom)).toBe(1_399_000);
    expect(Number(persisted.unitBedrooms)).toBe(3);
    expect(Number(persisted.unitBathrooms)).toBe(2);
  }, 120000);
});
