/**
 * Read-only helper to validate hot-selling developments output.
 * Run: npx tsx server/scripts/verify-hot-selling.ts
 */
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { listPublicDevelopments } from '../services/developmentService';
import { getDb } from '../db-connection';

async function verify() {
  console.log('Verifying Hot Selling Developments backend logic...');

  try {
    const devs = await listPublicDevelopments({ limit: 5, province: 'Gauteng' });

    if (devs.length === 0) {
      console.log('No developments found to verify.');
      return;
    }

    console.log(`Found ${devs.length} developments.`);

    for (const dev of devs) {
      console.log(`\nDevelopment: ${dev.name} (${dev.id})`);
      console.log(`- Suburb: ${dev.suburb}`);
      console.log(`- City: ${dev.city}`);
      console.log(`- Price Range: ${dev.priceFrom} - ${dev.priceTo}`);

      // Check strict media contract
      const hasUnitImages = (dev.images || []).some(
        (img: any) => typeof img === 'object' && img.category === 'unit',
      );
      console.log(`- Images count: ${dev.images.length}`);
      console.log(`- Has Unit Images (Should be false): ${hasUnitImages}`);

      if (dev.suburb === undefined) {
        console.error('❌ Suburb is undefined! Field not selected.');
      } else {
        console.log('✅ Suburb field present.');
      }
    }
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verify();
