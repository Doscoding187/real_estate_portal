/**
 * Read-only helper to validate listPublicDevelopments output.
 * Run: npx tsx server/scripts/verify-hot-selling-final.ts
 */
import * as dotenv from 'dotenv';
import path from 'path';
import { safeErrorSummary } from '../_core/safeError';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { listPublicDevelopments } from '../services/developmentService';

async function verifyFinal() {
  console.log('--- VERIFYING listPublicDevelopments ---');
  try {
    const devs = await listPublicDevelopments({ limit: 10, province: 'Gauteng' });

    if (devs.length === 0) {
      console.log('No developments found. Check seed data.');
      return;
    }

    console.log(`Found ${devs.length} developments.`);

    for (const dev of devs) {
      console.log(`\n---------------------------------------------------`);
      console.log(`Development: ${dev.name} (ID: ${dev.id})`);

      // Check Hero Image
      console.log(
        `Hero Image: ${dev.heroImage ? '✅ PRESENT' : '❌ MISSING (Should have been filtered out!)'}`,
      );

      // Safety check: Strict filter means we shouldn't see missing hero images
      if (!dev.heroImage) {
        console.log('🔴 FAILURE: Development without hero image slipped through filter.');
      }

      // Check Prices
      console.log(`Price Range: ${dev.priceFrom} - ${dev.priceTo}`);

      if (Number(dev.priceFrom) <= 0 && Number(dev.priceTo) <= 0) {
        console.log('⚠️ Price on request (Both 0)');
      } else {
        console.log('✅ Valid Pricing');
      }
    }
  } catch (err) {
    console.error('Error calling service:', safeErrorSummary(err));
  }
}

verifyFinal().then(() => process.exit(0));
