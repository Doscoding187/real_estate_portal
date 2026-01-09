import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Applying pricing column migration...');
  
  try {
    const db = await getDb();

    // Modify developments table
    await db.execute(sql`ALTER TABLE developments ADD COLUMN IF NOT EXISTS monthly_levy_from decimal(10, 2) DEFAULT '0'`);
    await db.execute(sql`ALTER TABLE developments ADD COLUMN IF NOT EXISTS monthly_levy_to decimal(10, 2) DEFAULT '0'`);
    await db.execute(sql`ALTER TABLE developments ADD COLUMN IF NOT EXISTS rates_from decimal(10, 2) DEFAULT '0'`);
    await db.execute(sql`ALTER TABLE developments ADD COLUMN IF NOT EXISTS rates_to decimal(10, 2) DEFAULT '0'`);
    await db.execute(sql`ALTER TABLE developments ADD COLUMN IF NOT EXISTS transfer_costs_included tinyint DEFAULT 0`);
    
    // Modify unit_types table
    await db.execute(sql`ALTER TABLE unit_types ADD COLUMN IF NOT EXISTS extras json`);

    console.log('Migration applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
