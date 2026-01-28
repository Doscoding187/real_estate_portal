/**
 * Quick Database Query Helper for Verification
 * Run with: npx tsx scripts/verify-db-state.ts
 */

import { getDb } from '../server/db';
import { developments } from '../drizzle/schema';
import { eq, isNull, isNotNull } from 'drizzle-orm';

async function verifyDatabaseState() {
  console.log('🔍 Database State Verification\n');

  try {
    // Initialize database connection
    const db = await getDb();
    // Test 1: Count developments with new enum fields
    const withEnums = await db
      .select()
      .from(developments)
      .where(isNotNull(developments.ownershipType));
    
    console.log(`✅ Developments with ownershipType: ${withEnums.length}`);

    // Test 2: Count developments without enums (legacy data)
    const withoutEnums = await db
      .select()
      .from(developments)
      .where(isNull(developments.ownershipType));
    
    console.log(`⚠️  Legacy developments (NULL enums): ${withoutEnums.length}`);

    // Test 3: Show sample of enum values
    if (withEnums.length > 0) {
      console.log('\n📊 Sample Enum Values:');
      const sample = withEnums.slice(0, 3);
      sample.forEach((dev, i) => {
        console.log(`\n  ${i + 1}. ${dev.name}`);
        console.log(`     Ownership: ${dev.ownershipType || 'NULL'}`);
        console.log(`     Structure: ${dev.structuralType || 'NULL'}`);
        console.log(`     Floors: ${dev.floors || 'NULL'}`);
      });
    }

    // Test 4: Verify enum value distribution
    console.log('\n📈 Enum Distribution:');
    const allDevs = await db.select().from(developments);
    
    const ownershipCounts: Record<string, number> = {};
    const structureCounts: Record<string, number> = {};
    const floorsCounts: Record<string, number> = {};

    allDevs.forEach(dev => {
      if (dev.ownershipType) {
        ownershipCounts[dev.ownershipType] = (ownershipCounts[dev.ownershipType] || 0) + 1;
      }
      if (dev.structuralType) {
        structureCounts[dev.structuralType] = (structureCounts[dev.structuralType] || 0) + 1;
      }
      if (dev.floors) {
        floorsCounts[dev.floors] = (floorsCounts[dev.floors] || 0) + 1;
      }
    });

    console.log('\n  Ownership Types:');
    Object.entries(ownershipCounts).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('\n  Structural Types:');
    Object.entries(structureCounts).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('\n  Floors:');
    Object.entries(floorsCounts).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('\n✅ Verification Complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

verifyDatabaseState();
