import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { getDb } from '../server/db-connection';
import { developments } from '../drizzle/schema';

async function checkPublishedAt() {
  console.log('\n--- Checking Leopard\'s Rest publishedAt ---');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  const [dev] = await db
    .select({
      id: developments.id,
      name: developments.name,
      isPublished: developments.isPublished,
      publishedAt: developments.publishedAt,
      province: developments.province,
      status: developments.status
    })
    .from(developments)
    .where(eq(developments.id, 300001))
    .limit(1);

  if (!dev) {
    console.error('❌ Development not found');
    return;
  }

  console.log('Development:', dev);
  
  if (dev.isPublished === 1 && !dev.publishedAt) {
    console.log('\n⚠️  ISSUE FOUND: isPublished=1 but publishedAt is NULL');
    console.log('Fixing by setting publishedAt to now...');
    
    await db
      .update(developments)
      .set({ publishedAt: new Date().toISOString() })
      .where(eq(developments.id, 300001));
    
    console.log('✅ Fixed! publishedAt is now set.');
  } else {
    console.log('\n✅ No issue found.');
  }

  process.exit(0);
}

checkPublishedAt().catch(console.error);
