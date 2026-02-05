import { getDb } from '../db-connection';
import { developments } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    process.exit(1);
  }

  const slug = 'test-development';
  console.log(`Searching for development with slug: "${slug}"`);

  const results = await db.select().from(developments).where(eq(developments.slug, slug));

  console.log(`Found ${results.length} results.`);

  if (results.length > 0) {
    const dev = results[0];
    console.log('--- Development Record ---');
    console.log('ID:', dev.id);
    console.log('Name:', dev.name);
    console.log('Slug:', dev.slug);
    console.log('Is Published:', dev.isPublished, typeof dev.isPublished);
    console.log('Status:', dev.status);
    console.log('Approval Status:', (dev as any).approvalStatus); // Check if this field exists on the record
    console.log('Developer ID:', dev.developerId);
    console.log('Brand Profile ID:', dev.developerBrandProfileId);
  } else {
    // Check if it exists with different casing or whitespace
    const allDevs = await db
      .select({ id: developments.id, slug: developments.slug })
      .from(developments);

    console.log('--- All Slugs ---');
    allDevs.forEach(d => console.log(`[${d.id}] "${d.slug}"`));
  }

  process.exit(0);
}

main().catch(console.error);
