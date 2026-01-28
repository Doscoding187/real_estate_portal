import { createListing } from '../server/db';
import * as dotenv from 'dotenv';
import { getDb } from '../server/db-connection';

dotenv.config();

async function run() {
  console.log('🚀 Starting Reproduction Script...');

  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to DB');
    process.exit(1);
  }

  try {
    // Dummy data mimicking the user's failed request
    const listingData = {
      userId: 270001, // Adjusted based on error log, assuming ownerId 270001 exists
      action: 'sell',
      propertyType: 'house',
      title: '4 Bedroom House for Sale in Highlands North REPRO',
      description: 'Test description for reproduction',
      pricing: {
        askingPrice: 1498000,
        negotiable: false,
      },
      propertyDetails: {
        propertyCategory: 'existing',
        bedrooms: 4,
        bathrooms: 2,
      },
      address: '225 Rahima Moosa Street',
      latitude: -26.2005575,
      longitude: 28.048845,
      city: 'Johannesburg',
      suburb: 'Hillbrow',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: '120001',
      // locationId: undefined, // Simulating undefined/default

      slug: 'repro-slug-' + Date.now(),
      media: [], // Empty media
    };

    console.log('📝 Creating listing with data:', JSON.stringify(listingData, null, 2));

    const listingId = await createListing(listingData);

    console.log(`✅ Listing Created: ID ${listingId}`);
  } catch (error: any) {
    console.error('❌ REPRODUCTION FAILED:', error);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    if (error.parameters) {
      console.error('Params:', error.parameters);
    }
  } finally {
    process.exit(0);
  }
}

run();
