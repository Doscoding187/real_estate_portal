import { getDb } from '../db';
import { developers } from '../../drizzle/schema';
import { desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.production as user suggested
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function listDevelopers() {
  console.log('Loading DB with URL:', process.env.DATABASE_URL ? 'Found (masked)' : 'MISSING');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing. Please check .env.production');
    process.exit(1);
  }

  try {
    const db = await getDb();
    const devs = await db.select().from(developers).orderBy(desc(developers.id)).limit(5);

    console.log('Found developers:');
    console.table(
      devs.map(d => ({
        id: d.id,
        userId: d.userId,
        name: d.name,
        status: d.status,
        brandProfileId: d.developerBrandProfileId,
      })),
    );
  } catch (err) {
    console.error('Failed to fetch developers:', err);
  } finally {
    process.exit(0);
  }
}

listDevelopers();
