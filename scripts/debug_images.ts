
import 'dotenv/config';
import { getDb } from '../server/db';
import { developments } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkImages() {
  const db = await getDb();
  if (!db) {
    console.error('No DB connection');
    return;
  }

  // Fetch the specific development (ID 210008 from context, or just recent ones)
  const recentDevs = await db.select({
    id: developments.id,
    name: developments.name,
    images: developments.images
  })
  .from(developments)
  .orderBy(developments.id) // Get recent ones
  .limit(5);

  console.log('Recent Developments Images:');
  recentDevs.forEach(dev => {
    console.log(`ID: ${dev.id}, Name: ${dev.name}`);
    console.log(`Images Raw:`, dev.images);
    console.log(`Type of Images:`, typeof dev.images);
    console.log('---');
  });
}

checkImages().catch(console.error).finally(() => process.exit());
