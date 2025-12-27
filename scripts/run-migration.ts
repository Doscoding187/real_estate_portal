import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    process.exit(1);
  }

  console.log('--- ADDING MISSING COLUMNS TO LISTINGS TABLE ---');
  
  // Add columns one by one using Drizzle's execute
  const columns = [
    { name: 'readiness_score', sql: 'ALTER TABLE listings ADD COLUMN readiness_score int(11) NOT NULL DEFAULT 0 AFTER slug' },
    { name: 'quality_score', sql: 'ALTER TABLE listings ADD COLUMN quality_score int(11) NOT NULL DEFAULT 0 AFTER readiness_score' },
    { name: 'quality_breakdown', sql: 'ALTER TABLE listings ADD COLUMN quality_breakdown json DEFAULT NULL AFTER quality_score' },
    { name: 'rejection_reasons', sql: 'ALTER TABLE listings ADD COLUMN rejection_reasons json DEFAULT NULL AFTER quality_breakdown' },
    { name: 'rejection_note', sql: 'ALTER TABLE listings ADD COLUMN rejection_note text DEFAULT NULL AFTER rejection_reasons' },
  ];

  for (const col of columns) {
    try {
      console.log(`Adding column: ${col.name}...`);
      // @ts-ignore - sql.raw exists
      await db.execute(sql.raw(col.sql));
      console.log(`✓ ${col.name} added successfully`);
    } catch (e: any) {
      if (e.message?.includes('Duplicate column') || e.code === 'ER_DUP_FIELDNAME') {
        console.log(`✓ ${col.name} already exists, skipping`);
      } else {
        console.error(`✗ Error adding ${col.name}:`, e.message || e);
      }
    }
  }

  console.log('\n--- VERIFYING SCHEMA ---');
  try {
    const [rows] = await db.execute(sql`SHOW COLUMNS FROM listings LIKE 'readiness_score'`);
    // @ts-ignore
    if (rows.length > 0) {
      console.log('✓ readiness_score column exists');
    } else {
      console.log('✗ readiness_score column NOT found');
    }
  } catch (e) {
    console.error('Error verifying:', e);
  }

  console.log('\nDone. Please retry listing creation.');
  process.exit(0);
}

main();
