
import 'dotenv/config';
import { getDb } from '../server/db';
import { listings } from '../drizzle/schema';
import { sql, eq } from 'drizzle-orm';

async function testStats() {
    const db = await getDb();
    if (!db) {
        console.error('DB not available');
        return;
    }

    console.log('Running Quality Stats Query...');

    try {
        const [stats] = await db
        .select({
            averageQuality: sql<number>`avg(${listings.qualityScore})`,
            featuredCount: sql<number>`count(case when ${listings.qualityScore} >= 90 then 1 end)`,
            optimizedCount: sql<number>`count(case when ${listings.qualityScore} >= 75 AND ${listings.qualityScore} < 90 then 1 end)`,
            total: sql<number>`count(*)`
        })
        .from(listings)
        .where(eq(listings.status, 'published'));

        console.log('Stats Result:', stats);
    } catch (e) {
        console.error('Error running stats query:', e);
    }
    process.exit(0);
}

testStats();
