import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function applyWizardMigration() {
  console.log('Applying wizard field migration...');
  
  // Initialize database connection
  const db = await getDb();
  
  try {
    // Add tagline to developments
    await db.execute(sql`ALTER TABLE developments ADD COLUMN tagline varchar(255)`);
    console.log('✓ Added developments.tagline');
  } catch (e: any) {
    if (e.message.includes('Duplicate column')) {
      console.log('⏭ developments.tagline already exists');
    } else {
      console.error('✗ Error adding tagline:', e.message);
    }
  }

  try {
    // Add marketing_name to developments
    await db.execute(sql`ALTER TABLE developments ADD COLUMN marketing_name varchar(255)`);
    console.log('✓ Added developments.marketing_name');
  } catch (e: any) {
    if (e.message.includes('Duplicate column')) {
      console.log('⏭ developments.marketing_name already exists');
    } else {
      console.error('✗ Error adding marketing_name:', e.message);
    }
  }

  try {
    // Add reserved_units to unit_types
    await db.execute(sql`ALTER TABLE unit_types ADD COLUMN reserved_units int DEFAULT 0`);
    console.log('✓ Added unit_types.reserved_units');
  } catch (e: any) {
    if (e.message.includes('Duplicate column')) {
      console.log('⏭ unit_types.reserved_units already exists');
    } else {
      console.error('✗ Error adding reserved_units:', e.message);
    }
  }

  try {
    // Add transfer_costs_included to unit_types
    await db.execute(sql`ALTER TABLE unit_types ADD COLUMN transfer_costs_included tinyint DEFAULT 0`);
    console.log('✓ Added unit_types.transfer_costs_included');
  } catch (e: any) {
    if (e.message.includes('Duplicate column')) {
      console.log('⏭ unit_types.transfer_costs_included already exists');
    } else {
      console.error('✗ Error adding transfer_costs_included:', e.message);
    }
  }

  try {
    // Add monthly_levy to unit_types
    await db.execute(sql`ALTER TABLE unit_types ADD COLUMN monthly_levy int`);
    console.log('✓ Added unit_types.monthly_levy');
  } catch (e: any) {
    if (e.message.includes('Duplicate column')) {
      console.log('⏭ unit_types.monthly_levy already exists');
    } else {
      console.error('✗ Error adding monthly_levy:', e.message);
    }
  }

  console.log('\n✅ Migration complete!');
  process.exit(0);
}

applyWizardMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
