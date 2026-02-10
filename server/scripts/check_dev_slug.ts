import { config } from 'dotenv';
config({ path: '.env.local' });
import { getDb } from '../db-connection';
import { developments } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkSlug() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('No DB connection');
      return;
    }
    console.log('Querying for test-development...');
    const result = await db
      .select()
      .from(developments)
      .where(eq(developments.slug, 'test-development'))
      .limit(1);
    console.log('Development:', result[0] ? 'FOUND' : 'NOT FOUND');
    if (result[0]) {
      console.log('dev values:', result[0]);

      const brandId = result[0].developerBrandProfileId;
      if (brandId) {
        const brand = await db.query.developerBrandProfiles.findFirst({
          where: (t, { eq }) => eq(t.id, brandId),
        });
        console.log('Brand Profile ID ' + brandId + ':', brand ? 'FOUND' : 'NOT FOUND');
      } else {
        console.log('No developerBrandProfileId on development');
      }
    }

    // Simulate service query structure validation
    // We'll just rely on the above check for now as the service query is complex to copy-paste
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkSlug();
