import * as dotenv from 'dotenv';
dotenv.config();

import { developmentService } from '../services/developmentService';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function verifyFix() {
  console.log('🧪 Starting FK Validation Verification...');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  // Get a valid developer ID (User -> Developer)
  // We need a real developer ID to pass the first check
  const [devUser] = await db.query.users.findMany({
    where: eq(users.role, 'property_developer'),
    limit: 1,
  });

  if (!devUser) {
    console.error('❌ No property_developer user found. Please seed one first.');
    process.exit(1);
  }

  const developer = await db.query.developers.findFirst({
    where: eq(users.id, devUser.id), // Assuming joined or same ID logic
    // Actually developer table has userId column
  });

  // Actually, let's just query developers table directly
  const validDev = await db.query.developers.findFirst();
  if (!validDev) {
    console.error('❌ No developer profile found.');
    process.exit(1);
  }

  console.log(`👤 Using Valid Developer ID: ${validDev.id}`);

  // TEST 1: INVALID LOCATION ID
  console.log('\n[TEST 1] Invalid Location ID...');
  try {
    await developmentService.createDevelopment(validDev.id, {
      name: 'Crash Test Dummy 1',
      developmentType: 'residential',
      city: 'Nowhere',
      province: 'Void',
      locationId: 99999999, // Should fail
    });
    console.log('⚠️ Unexpected Success (Should have stripped invalid location or failed)');
  } catch (error: any) {
    console.log('✅ Caught Error:', error.message);
    if (error.message.includes('Invalid Location ID') || error.code === 'NOT_FOUND') {
      console.log('✅ Validation working as expected (Error thrown)');
    } else {
      console.log('ℹ️ Check if it stripped the ID or threw error. My fix strips it.');
    }
  }

  // TEST 2: INVALID BRAND PROFILE ID
  console.log('\n[TEST 2] Invalid Brand Profile ID...');
  try {
    await developmentService.createDevelopment(validDev.id, {
      name: 'Crash Test Dummy 2',
      developmentType: 'residential',
      city: 'Nowhere',
      province: 'Void',
      developerBrandProfileId: 88888888, // Should fail hard
    });
    console.log('❌ FAILED: Should have thrown Validation Error');
    process.exit(1);
  } catch (error: any) {
    console.log('✅ Caught Error:', error.message);
    if (error.message.includes('Brand Profile with ID') && error.message.includes('not found')) {
      console.log('✅ SUCCESS: Correct Validation Error Thrown');
    } else {
      console.log('⚠️ Unexpected Error format:', error);
    }
  }

  process.exit(0);
}

verifyFix();
