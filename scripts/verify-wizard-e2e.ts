import { developmentService } from '../server/services/developmentService';
import { developments, unitTypes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { getDb } from '../server/db-connection';

dotenv.config();

async function runVerification() {
  console.log('🚀 Starting Service-Level Wizard E2E Verification...');

  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to DB');
    process.exit(1);
  }

  // 1. Setup / Cleanup
  const TEST_DEV_SLUG = 'service-e2e-test-' + Date.now();

  // 2. Use fixed test developer context
  const USER_ID = 210008;
  const DEVELOPER_ID = 90003;

  const devProfile = await db.query.developers.findFirst({
    where: (developers, { eq }) => eq(developers.id, DEVELOPER_ID),
  });
  if (!devProfile) {
    console.error(`❌ Developer profile ${DEVELOPER_ID} not found.`);
    process.exit(1);
  }
  if (devProfile.userId !== USER_ID) {
    console.error(
      `❌ Developer profile ${DEVELOPER_ID} is linked to user ${devProfile.userId}, expected ${USER_ID}.`,
    );
    process.exit(1);
  }
  const developerUserId = USER_ID;
  console.log(`👤 Using Developer User ID: ${developerUserId} (profile ${DEVELOPER_ID})`);

  try {
    // =========================================================================
    // STEP 1: CREATE DEVELOPMENT
    // =========================================================================
    console.log('\n📝 Step 1: Create Development (Service)...');

    const createdDev = await developmentService.createDevelopment(developerUserId, {
      name: 'Service E2E Property',
      slug: TEST_DEV_SLUG,
      developmentType: 'residential',
      description: 'Created via service verification script',
      address: '456 Service Lane',
      city: 'Johannesburg',
      province: 'Gauteng',
      amenities: ['Gym', 'Concierge'],
      // Testing Unit Persistence in Create
      unitTypes: [
        {
          name: 'Initial Unit',
          bedrooms: 1,
          bathrooms: 1,
          basePriceFrom: 900000,
          parkingType: 'none',
          parkingBays: 0,
        },
      ],
    });

    console.log(`✅ Development Created: ID ${createdDev.id}, Slug: ${createdDev.slug}`);

    // VERIFY DB STATE
    const dbDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdDev.id),
    });

    if (dbDev?.devOwnerType !== 'developer')
      throw new Error(`❌ devOwnerType mismatch: ${dbDev?.devOwnerType}`);
    console.log('✅ DB Contract Verified: dev_owner_type correctly set');

    const existingUnits = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDev.id));
    const initialUnitId = existingUnits[0]?.id;
    if (!initialUnitId) {
      throw new Error('❌ No initial unit type found after createDevelopment');
    }

    // =========================================================================
    // STEP 2: UPDATE (ADD MORE UNITS & MEDIA)
    // =========================================================================
    console.log('\n🏗️ Step 2: Update with more Units & Media...');

    await developmentService.updateDevelopment(createdDev.id, developerUserId, {
      name: 'Service E2E Property Updated',
      developmentType: 'residential', // Required by type even if not changing
      unitTypes: [
        // Keep Initial
        {
          id: initialUnitId,
          name: 'Initial Unit',
          bedrooms: 1,
          bathrooms: 1,
          basePriceFrom: 900000,
          parkingType: 'none',
          parkingBays: 0,
        },
        // Add New
        {
          name: 'Penthouse Suite',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 2500000,
          parkingType: 'garage',
          parkingBays: 2,
        },
      ],
      media: {
        photos: [{ url: 'https://service-test.com/img1.jpg', category: 'interior' }],
        videos: [],
      },
      images: ['https://service-test.com/img1.jpg'],
    });
    console.log('✅ Update Completed');

    // VERIFY UNITS
    const dbUnits = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDev.id));
    console.log(`✅ DB Verification: Found ${dbUnits.length} units (Expected 2)`);

    const penthouse = dbUnits.find(u => u.name === 'Penthouse Suite');
    if (!penthouse) throw new Error('Penthouse unit not found');
    console.log(
      `   Penthouse Parking: ${penthouse.parkingType}`,
    );

    if (penthouse.parkingType !== 'garage')
      throw new Error(`❌ Parking Enum mismatch: ${penthouse.parkingType}`);

    // =========================================================================
    // STEP 3: PUBLISH
    // =========================================================================
    console.log('\n🚀 Step 3: Publish...');

    await developmentService.publishDevelopment(createdDev.id, developerUserId);
    console.log('✅ Publish Service Method Called');

    // VERIFY FINAL STATE
    const finalDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdDev.id),
    });

    if (!finalDev?.isPublished) throw new Error('❌ Development is NOT published in DB');
    console.log(`✅ DB Verification: isPublished = ${finalDev.isPublished}`);
    console.log(`✅ DB Verification: status = ${finalDev.status}`);

    // =========================================================================
    // STEP 4: CREATE RENTAL DEVELOPMENT
    // =========================================================================
    console.log('\n🏠 Step 4: Create Rental Development (Service)...');

    const RENTAL_DEV_SLUG = 'service-e2e-rent-' + Date.now();

    const createdRentDev = await developmentService.createDevelopment(developerUserId, {
      name: 'Service E2E Rental',
      slug: RENTAL_DEV_SLUG,
      developmentType: 'residential',
      transactionType: 'for_rent',
      description: 'Created via service verification script (rental)',
      address: '789 Rent Road',
      city: 'Cape Town',
      province: 'Western Cape',
      unitTypes: [
        {
          name: 'Studio Loft',
          bedrooms: 0,
          bathrooms: 1,
          monthlyRentFrom: 7500,
          monthlyRentTo: 9000,
          leaseTerm: '12 months',
          isFurnished: true,
          parkingType: 'none',
          parkingBays: 0,
        },
      ],
    });

    console.log(`✅ Rental Development Created: ID ${createdRentDev.id}, Slug: ${createdRentDev.slug}`);

    const rentDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdRentDev.id),
    });

    if (rentDev?.transactionType !== 'for_rent')
      throw new Error(`❌ transactionType mismatch: ${rentDev?.transactionType}`);

    const rentUnits = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdRentDev.id));

    const studio = rentUnits.find(u => u.name === 'Studio Loft');
    if (!studio) throw new Error('❌ Rental unit not found after createDevelopment');
    if (!studio.monthlyRentFrom) throw new Error('❌ monthlyRentFrom missing for rental unit');

    // =========================================================================
    // STEP 5: UPDATE RENTAL DEVELOPMENT
    // =========================================================================
    console.log('\n🏠 Step 5: Update Rental Development with more Units...');

    const studioId = studio.id;

    await developmentService.updateDevelopment(createdRentDev.id, developerUserId, {
      name: 'Service E2E Rental Updated',
      developmentType: 'residential',
      transactionType: 'for_rent',
      unitTypes: [
        {
          id: studioId,
          name: 'Studio Loft',
          bedrooms: 0,
          bathrooms: 1,
          monthlyRentFrom: 7500,
          monthlyRentTo: 9000,
          leaseTerm: '12 months',
          isFurnished: true,
          parkingType: 'none',
          parkingBays: 0,
        },
        {
          name: 'Two Bedroom',
          bedrooms: 2,
          bathrooms: 1,
          monthlyRentFrom: 12000,
          monthlyRentTo: 15000,
          leaseTerm: '24 months',
          isFurnished: false,
          parkingType: 'open',
          parkingBays: 1,
        },
      ],
    });

    const updatedRentDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdRentDev.id),
    });

    if (!updatedRentDev?.monthlyRentFrom || !updatedRentDev?.monthlyRentTo)
      throw new Error('❌ Development monthly rent range not saved');

    const updatedRentUnits = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdRentDev.id));

    const twoBed = updatedRentUnits.find(u => u.name === 'Two Bedroom');
    if (!twoBed) throw new Error('❌ Two Bedroom unit not found');
    if (!twoBed.monthlyRentFrom || !twoBed.monthlyRentTo)
      throw new Error('❌ Rental unit monthly rent range missing');

    // =========================================================================
    // STEP 6: PUBLISH RENTAL DEVELOPMENT
    // =========================================================================
    console.log('\n🚀 Step 6: Publish Rental Development...');

    await developmentService.publishDevelopment(createdRentDev.id, developerUserId);
    console.log('✅ Publish Service Method Called (Rental)');

    const finalRentDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdRentDev.id),
    });

    if (!finalRentDev?.isPublished)
      throw new Error('❌ Rental development is NOT published in DB');

    // =========================================================================
    // STEP 7: CREATE AUCTION DEVELOPMENT
    // =========================================================================
    console.log('\n🔨 Step 7: Create Auction Development (Service)...');

    const AUCTION_DEV_SLUG = 'service-e2e-auction-' + Date.now();
    const auctionStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const auctionEnd = new Date(auctionStart.getTime() + 3 * 24 * 60 * 60 * 1000);

    const createdAuctionDev = await developmentService.createDevelopment(developerUserId, {
      name: 'Service E2E Auction',
      slug: AUCTION_DEV_SLUG,
      developmentType: 'residential',
      transactionType: 'auction',
      description: 'Created via service verification script (auction)',
      address: '999 Auction Ave',
      city: 'Cape Town',
      province: 'Western Cape',
      unitTypes: [
        {
          name: 'Auction Penthouse',
          bedrooms: 3,
          bathrooms: 2,
          startingBid: 2500000,
          reservePrice: 3000000,
          auctionStartDate: auctionStart.toISOString(),
          auctionEndDate: auctionEnd.toISOString(),
          auctionStatus: 'scheduled',
          parkingType: 'garage',
          parkingBays: 2,
        },
      ],
    });

    console.log(`✅ Auction Development Created: ID ${createdAuctionDev.id}, Slug: ${createdAuctionDev.slug}`);

    const auctionDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdAuctionDev.id),
    });

    if (auctionDev?.transactionType !== 'auction')
      throw new Error(`❌ transactionType mismatch: ${auctionDev?.transactionType}`);
    if (!auctionDev?.auctionStartDate || !auctionDev?.auctionEndDate)
      throw new Error('❌ Auction dates not aggregated to development level');

    const auctionUnits = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdAuctionDev.id));

    const auctionPenthouse = auctionUnits.find(u => u.name === 'Auction Penthouse');
    if (!auctionPenthouse) throw new Error('❌ Auction unit not found');
    if (!auctionPenthouse.startingBid) throw new Error('❌ Starting bid missing');
    if (!auctionPenthouse.auctionStartDate) throw new Error('❌ Auction start date missing');

    // =========================================================================
    // STEP 8: UPDATE AUCTION DEVELOPMENT
    // =========================================================================
    console.log('\n🔨 Step 8: Update Auction Development...');

    const penthouseId = auctionPenthouse.id;

    await developmentService.updateDevelopment(createdAuctionDev.id, developerUserId, {
      name: 'Service E2E Auction Updated',
      developmentType: 'residential',
      transactionType: 'auction',
      unitTypes: [
        {
          id: penthouseId,
          name: 'Auction Penthouse',
          bedrooms: 3,
          bathrooms: 2,
          startingBid: 2500000,
          reservePrice: 3000000,
          auctionStartDate: auctionStart.toISOString(),
          auctionEndDate: auctionEnd.toISOString(),
          auctionStatus: 'scheduled',
          parkingType: 'garage',
          parkingBays: 2,
        },
        {
          name: 'Auction Townhouse',
          bedrooms: 2,
          bathrooms: 1,
          startingBid: 1800000,
          reservePrice: 2200000,
          auctionStartDate: auctionStart.toISOString(),
          auctionEndDate: auctionEnd.toISOString(),
          auctionStatus: 'scheduled',
          parkingType: 'open',
          parkingBays: 1,
        },
      ],
    });

    const updatedAuctionDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdAuctionDev.id),
    });

    if (!updatedAuctionDev?.startingBidFrom)
      throw new Error('❌ Starting bid range not computed');

    // =========================================================================
    // STEP 9: PUBLISH AUCTION DEVELOPMENT
    // =========================================================================
    console.log('\n🚀 Step 9: Publish Auction Development...');

    await developmentService.publishDevelopment(createdAuctionDev.id, developerUserId);
    console.log('✅ Publish Service Method Called (Auction)');

    const finalAuctionDev = await db.query.developments.findFirst({
      where: eq(developments.id, createdAuctionDev.id),
    });

    if (!finalAuctionDev?.isPublished)
      throw new Error('❌ Auction development is NOT published in DB');

    console.log('\n✨ SERVICE E2E VERIFICATION PASSED! ✨');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runVerification();
