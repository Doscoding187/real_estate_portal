import 'dotenv/config';
import { getDb } from '../server/db-connection';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔧 Starting Surgical Schema Fix...');

  const db = await getDb();
  if (!db) {
    console.error('❌ DB Connection failed');
    process.exit(1);
  }

  try {
    console.log('Checking for missing columns in "developments"...');
    
    // Check if columns exist first to avoid errors
    const [columns] = await db.execute(sql`SHOW COLUMNS FROM developments LIKE 'images'`);
    // @ts-ignore
    const hasImages = columns.length > 0;
    
    const [videoColumns] = await db.execute(sql`SHOW COLUMNS FROM developments LIKE 'videos'`);
     // @ts-ignore
    const hasVideos = videoColumns.length > 0;

    if (!hasImages) {
        console.log('  -> Adding "images" column...');
        await db.execute(sql`ALTER TABLE developments ADD COLUMN images TEXT DEFAULT NULL`);
        console.log('  ✅ Added "images"');
    } else {
        console.log('  -> "images" column already exists.');
    }

    if (!hasVideos) {
        console.log('  -> Adding "videos" column...');
        await db.execute(sql`ALTER TABLE developments ADD COLUMN videos TEXT DEFAULT NULL`);
        console.log('  ✅ Added "videos"');
    } else {
        console.log('  -> "videos" column already exists.');
    }

    console.log('\n✨ Fix Complete. Re-verifying schema...');
    
    // Re-verify
    const [newCols] = await db.execute(sql`SHOW COLUMNS FROM developments`);
    // @ts-ignore
    const colNames = newCols.map((c: any) => c.Field);
    console.log('Current Columns:', colNames.filter((c: string) => ['images', 'videos'].includes(c)));

  } catch (error: any) {
    console.error('🔥 Fix Failed:', error.message);
  }

  process.exit(0);
}

main();
