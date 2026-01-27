
import { db, getDb } from '../server/db';
import { developmentService } from '../server/services/developmentService';
import { developments, developers, developerBrandProfiles } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

dotenv.config();

async function testSuperAdminSeeding() {
  console.log('Testing Super Admin Seeding (Platform Ownership)...');

  try {
    const dbConn = await getDb();
    if (!dbConn) throw new Error('No DB Connection');

    // 1. Get Valid Developer and User ID
    let developerId = 1;
    let userId = 1;
    let devProfile = await dbConn.select().from(developers).where(eq(developers.id, 1)).limit(1);
    
    if (devProfile.length) {
        developerId = devProfile[0].id;
        userId = devProfile[0].userId; 
    } else {
        console.log('Developer ID 1 not found, fetching any developer...');
        const anyDev = await dbConn.select().from(developers).limit(1);
        if (anyDev.length) {
            developerId = anyDev[0].id;
            userId = anyDev[0].userId;
        } else {
            console.warn('WARNING: No developers found in DB. FK might fail.');
             // Fallback to finding ANY user if no developer
             const anyUser = await dbConn.select().from(users).limit(1);
             if (anyUser.length) userId = anyUser[0].id;
        }
    }
    console.log(`Using Developer ID: ${developerId}, User ID: ${userId}`);

    // 2. Ensuring Test Brands Exist (Developer & Agency)
    let developerBrandId: number;
    let agencyBrandId: number;

    const [existingDevBrand] = await dbConn.select().from(developerBrandProfiles)
        .where(eq(developerBrandProfiles.brandName, 'AutoTest Developer'))
        .limit(1);

    if (existingDevBrand) {
        developerBrandId = existingDevBrand.id;
        console.log('Found existing AutoTest Developer:', developerBrandId);
    } else {
        const [res] = await dbConn.insert(developerBrandProfiles).values({
            brandName: 'AutoTest Developer',
            slug: 'autotest-developer-' + Date.now(),
            identityType: 'developer',
            ownerType: 'platform',
            isVisible: 1,
            brandTier: 'national',
            createdBy: developerId 
        });
        developerBrandId = res.insertId;
        console.log('Created AutoTest Developer:', developerBrandId);
    }

    const [existingAgencyBrand] = await dbConn.select().from(developerBrandProfiles)
        .where(eq(developerBrandProfiles.brandName, 'AutoTest Agency'))
        .limit(1);

    if (existingAgencyBrand) {
        agencyBrandId = existingAgencyBrand.id;
        console.log('Found existing AutoTest Agency:', agencyBrandId);
    } else {
        const [res] = await dbConn.insert(developerBrandProfiles).values({
            brandName: 'AutoTest Agency',
            slug: 'autotest-agency-' + Date.now(),
            identityType: 'marketing_agency',
            ownerType: 'platform',
            isVisible: 1,
            brandTier: 'regional',
            createdBy: developerId
        });
        agencyBrandId = res.insertId;
        console.log('Created AutoTest Agency:', agencyBrandId);
    }
    
    // Default to Developer for the rest of the existing script logic
    let brandProfileId = developerBrandId;
    console.log('Using Brand Profile ID for Creation Test:', brandProfileId);

    const payload: any = {
        name: 'Super Admin Seeded Dev ' + Date.now(),
        slug: 'seeded-dev-' + Date.now(),
        developmentType: 'residential',
        brandProfileId: brandProfileId,
        // Explicitly providing optional/defaulted fields
        marketingRole: 'exclusive',
        marketingBrandProfileId: null,
        legacyStatus: 'planning', // Providing a valid enum value
        constructionPhase: 'planning',
        status: 'launching-soon',
        description: 'Test Description',
        address: '123 Test St',
        city: 'Cape Town', // Explicit Valid City
        province: 'Western Cape', // Explicit Valid Province
        postalCode: '8001',
        latitude: '-33.9249',
        longitude: '18.4241',
        totalUnits: 10,
        availableUnits: 10,
        priceFrom: 1000000,
        priceTo: 2000000,
        images: [],
    };

    const metadata = {
        ownerType: 'platform' as const,
        brandProfileId: brandProfileId, 
    };

    console.log('Calling developmentService.createDevelopment...');
    const dev = await developmentService.createDevelopment(developerId, payload, metadata);

    console.log('Development Created:', {
      id: dev.id,
      slug: dev.slug,
      status: dev.status,
      ownerType: dev.devOwnerType,
      city: dev.city,
      approvalStatus: dev.approvalStatus,
      isPublished: dev.isPublished,
      developerBrandProfileId: dev.developerBrandProfileId,
    });

    // Verification Checks
    const [fetchedDev] = await dbConn.select().from(developments).where(eq(developments.id, dev.id));
    
    if (fetchedDev.city !== 'Unknown') console.error('FAIL: City fallback failed');
    if (fetchedDev.approvalStatus !== 'approved') console.error('FAIL: Auto-approval failed');
    if (fetchedDev.isPublished !== 1) console.error('FAIL: Auto-publish failed');
    if (fetchedDev.developerBrandProfileId !== brandProfileId) console.error('FAIL: Brand linking failed');

    if (fetchedDev.city === 'Unknown' && fetchedDev.approvalStatus === 'approved' && fetchedDev.isPublished === 1 && fetchedDev.developerBrandProfileId === brandProfileId) {
        console.log('SUCCESS: Super Admin Seeding logic verified!');
    } else {
        console.log('PARTIAL SUCCESS: Development created but checks failed.');
    }

  } catch (error) {
    console.error('FAILED to create seeded development:');
    console.dir(error, { depth: null, colors: true });
    if (error instanceof Error && 'cause' in error) {
        console.log('Cause:', (error as any).cause);
    }
  } finally {
    process.exit(0);
  }
}

testSuperAdminSeeding();
