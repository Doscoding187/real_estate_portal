import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { getDb } from '../server/db-connection';
import { developments } from '../drizzle/schema';

async function checkApprovalStatus() {
  console.log('\n--- Checking Leopard\'s Rest approval_status ---');
  
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
      approvalStatus: developments.approvalStatus,
      province: developments.province
    })
    .from(developments)
    .where(eq(developments.id, 300001))
    .limit(1);

  if (!dev) {
    console.error('❌ Development not found');
    return;
  }

  console.log('Development:', dev);
  
  if (dev.approvalStatus !== 'approved') {
    console.log('\n⚠️  ISSUE FOUND: approvalStatus is', dev.approvalStatus, 'but should be "approved"');
    console.log('Fixing by setting approvalStatus to "approved"...');
    
    await db
      .update(developments)
      .set({ approvalStatus: 'approved' })
      .where(eq(developments.id, 300001));
    
    console.log('✅ Fixed! approvalStatus is now "approved".');
  } else {
    console.log('\n✅ Approval status is correct.');
  }

  process.exit(0);
}

checkApprovalStatus().catch(console.error);
