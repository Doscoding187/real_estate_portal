
import 'dotenv/config';
import { developmentService } from '../services/developmentService.ts';
import { developerSubscriptionService } from '../services/developerSubscriptionService.ts';
import { getDb } from '../db.ts';
import { developments, developers, users, developmentApprovalQueue } from '../../drizzle/schema.ts';
import { eq, desc } from 'drizzle-orm';

async function verifyApprovalWorkflow() {
  console.log('Starting Approval Workflow Verification...');
  
  // Force load env if not loaded
  if (!process.env.DATABASE_URL) {
      console.log('DATABASE_URL not found, attempting manual load...');
      require('dotenv').config();
  }

  const db = await getDb();
  if(!db) {
      console.error('Failed to connect to DB');
      process.exit(1);
  }

  // 1. Get a developer user
  const [dev] = await db.select().from(developers).limit(1);
  if (!dev) {
    console.error('No developers found. Please ensure seed data exists.');
    process.exit(1);
  }
  const [user] = await db.select().from(users).where(eq(users.id, dev.userId || 0)).limit(1);
  // Fallback if dev has no linked user, just use any user as "admin" later
  const [adminUser] = await db.select().from(users).limit(1);

  if (!dev || !adminUser) {
       console.error('Missing prerequisites (developer or user).');
       process.exit(1);
  }

  console.log(`Using Developer: ${dev.name} (ID: ${dev.id})`);
  console.log(`Using Admin User ID: ${adminUser.id}`);

  // Ensure Subscription
  let sub = await developerSubscriptionService.getSubscription(dev.id);
  if (!sub) {
      console.log('No subscription found, creating trial...');
      try {
        await developerSubscriptionService.createSubscription(dev.id);
        console.log('Subscription created.');
      } catch (e: any) {
        console.error('Failed to create subscription:', e);
         // If create fails due to query issues, manual rollback or manual insert might be needed
         // But let's assume valid relations fixed it or we refactor later.
         process.exit(1);
      }
  }

  // 2. Create Draft Development
  console.log('\n--- Step 1: Create Draft ---');
  const newDev = await developmentService.createDevelopment(dev.id, {
    name: "Approval Test Dev " + Date.now(),
    developmentType: "residential",
    city: "Test City",
    province: "Test Province",
  });
  console.log(`Created Development: ${newDev.name} (ID: ${newDev.id})`);

  // 3. Publish (Submit for Review)
  console.log('\n--- Step 2: Submit for Review (Publish) ---');
  await developmentService.publishDevelopment(newDev.id, dev.id);
  
  // Verify Status
  const pendingDev = await developmentService.getDevelopment(newDev.id);
  
  if (pendingDev?.isPublished) {
      console.error('FAILED: Development should NOT be published immediately.');
      process.exit(1);
  }
  if (pendingDev?.approvalStatus !== 'pending') {
       console.error(`FAILED: Expected approvalStatus 'pending', got '${pendingDev?.approvalStatus}'`);
       process.exit(1);
  }
  console.log('SUCCESS: Development is pending review and not published.');

  // Verify Queue Entry
  const [queueEntry] = await db.select()
    .from(developmentApprovalQueue)
    .where(eq(developmentApprovalQueue.developmentId, newDev.id))
    .orderBy(desc(developmentApprovalQueue.submittedAt));
    
  if (!queueEntry || queueEntry.status !== 'pending') {
      console.error('FAILED: Queue entry missing or incorrect status.');
      process.exit(1);
  }
  console.log('SUCCESS: Queue entry created correctly.');


  // 4. Admin Approve
  console.log('\n--- Step 3: Admin Approve ---');
  await developmentService.approveDevelopment(newDev.id, adminUser.id);

  // Verify Published
  const approvedDev = await developmentService.getDevelopment(newDev.id);
  if (!approvedDev?.isPublished) {
    console.error('FAILED: Development should be published after approval.');
    process.exit(1);
  }
  if (approvedDev?.approvalStatus !== 'approved') {
       console.error(`FAILED: Expected approvalStatus 'approved', got '${approvedDev?.approvalStatus}'`);
       process.exit(1);
  }
  console.log('SUCCESS: Development is now published and approved.');

  // 5. Cleanup
  console.log('\n--- Cleanup ---');
  await developmentService.deleteDevelopment(newDev.id, dev.id);
  console.log('Test development deleted.');

  process.exit(0);
}

verifyApprovalWorkflow().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
