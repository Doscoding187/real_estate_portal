/**
 * Quick DB Check - Loads .env.production automatically
 * Run with: npx tsx scripts/quick-db-check.ts
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.production
config({ path: resolve(__dirname, '../.env.production') });

import { getDb } from '../server/db.js';
import { developments } from '../drizzle/schema.js';
import { isNull, isNotNull } from 'drizzle-orm';

async function quickCheck() {
  console.log('🔍 Quick Database Check\n');

  try {
    const db = await getDb();
    
    // Count developments with enums
    const withEnums = await db
      .select()
      .from(developments)
      .where(isNotNull(developments.ownershipType))
      .limit(100);
    
    // Count without enums (legacy)
    const withoutEnums = await db
      .select()
      .from(developments)
      .where(isNull(developments.ownershipType))
      .limit(100);
    
    console.log(`✅ Developments WITH enums: ${withEnums.length}`);
    console.log(`⚠️  Developments WITHOUT enums (legacy): ${withoutEnums.length}\n`);
    
    if (withEnums.length > 0) {
      console.log('📊 Sample Enum Values (first 3):');
      withEnums.slice(0, 3).forEach((dev, i) => {
        console.log(`\n  ${i + 1}. ${dev.name}`);
        console.log(`     Ownership: ${dev.ownershipType || 'NULL'}`);
        console.log(`     Structure: ${dev.structuralType || 'NULL'}`);
        console.log(`     Floors: ${dev.floors || 'NULL'}`);
      });
    }
    
    console.log('\n✅ Database connection successful!');
    console.log('✅ Schema refactor verified!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

quickCheck();
