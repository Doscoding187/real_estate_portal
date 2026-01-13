import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { getDb } from '../server/db-connection';
import { developments } from '../drizzle/schema';

async function checkSlug() {
  console.log('\n--- Checking Leopard\'s Rest slug in database ---');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  const [dev] = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
    })
    .from(developments)
    .where(eq(developments.id, 300001))
    .limit(1);

  if (!dev) {
    console.error('❌ Development not found');
    return;
  }

  console.log('\nDevelopment Info:');
  console.log('  ID:', dev.id);
  console.log('  Name:', dev.name);
  console.log('  Slug:', dev.slug);
  console.log('  IsPublished:', dev.isPublished);
  console.log('  ApprovalStatus:', dev.approvalStatus);
  
  if (!dev.slug) {
    console.log('\n⚠️  ISSUE: Slug is NULL! Generating slug...');
    
    const slug = dev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    console.log('  Generated slug:', slug);
    
    await db
      .update(developments)
      .set({ slug })
      .where(eq(developments.id, 300001));
    
    console.log('✅ Slug updated!');
  } else {
    console.log('\n✅ Slug exists:', dev.slug);
  }

  process.exit(0);
}

checkSlug().catch(console.error);
