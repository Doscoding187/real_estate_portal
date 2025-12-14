
import 'dotenv/config';
import * as db from './server/db';
import { sql } from 'drizzle-orm';

async function applyHotfix() {
  console.log('🔧 Applying Hotfix: Add missing slug column to developers table...\n');

  try {
    const _db = await db.getDb();
    if (!_db) {
        console.error("No DB connection");
        return;
    }

    // Direct SQL execution to alter the table
    // Using raw query via the driver if possible, or sql tag
    try {
        await _db.execute(sql`ALTER TABLE developers ADD COLUMN slug varchar(255)`);
        console.log('✅ Successfully added "slug" column to developers table.');
    } catch (e: any) {
        if (e.message && e.message.includes('Duplicate column')) {
             console.log('⚠️ "slug" column already exists.');
        } else {
            console.error('❌ Error adding slug column:', e);
            throw e;
        }
    }
    
    console.log('\n✨ Hotfix applied successfully.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to verify:', error);
    process.exit(1);
  }
}

applyHotfix();
