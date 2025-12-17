
import 'dotenv/config';
import { developmentService } from '../services/developmentService.ts';
import { developerSubscriptionService } from '../services/developerSubscriptionService.ts';
import { getDb } from '../db.ts';
import { developments, developers, users, developmentApprovalQueue } from '../../drizzle/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';

async function verifyFastTrack() {
  console.log('Starting Trusted Developer Fast-Track Verification...');
  
  if (!process.env.DATABASE_URL) {
      require('dotenv').config();
  }

  const db = await getDb();
  if(!db) {
      console.error('Failed to connect to DB');
      process.exit(1);
  }

  // --- MANUAL MIGRATION ---
  try {
      console.log('Checking for is_trusted column...');
      // Try to select it to see if it exists
      await db.execute(sql`SELECT is_trusted FROM developers LIMIT 1`);
      console.log('Column is_trusted exists.');
  } catch (e) {
      console.log('Column is_trusted missing. Adding it now...');
      try {
          await db.execute(sql`ALTER TABLE developers ADD COLUMN is_trusted BOOLEAN NOT NULL DEFAULT 0`);
          console.log('Successfully added is_trusted column.');
      } catch (addErr) {
          console.error('Failed to add column:', addErr);
          process.exit(1);
      }
  }
  // ------------------------

  // 1. Get a developer user
  const [dev] = await db.select().from(developers).limit(1);
  if (!dev) {
    console.error('No developers found.');
    process.exit(1);
  }
  
  // Get an admin user (owner or just first user)
  const [adminUser] = await db.select().from(users).limit(1);
  if (!adminUser) {
      console.error('No users found to act as admin.');
      process.exit(1);
  }

  // Ensure Subscription
  let sub = await developerSubscriptionService.getSubscription(dev.id);
  if (!sub) {
      try {
        await developerSubscriptionService.createSubscription(dev.id);
      } catch (e) {}
  }

  console.log(`Using Developer: ${dev.name} (ID: ${dev.id})`);

  // --- PRE-CLEANUP ---
  console.log('Cleaning up existing developments...');
  const existingDevs = await developmentService.getDeveloperDevelopments(dev.id);
  for (const d of existingDevs) {
      await developmentService.deleteDevelopment(d.id, dev.id);
  }
  console.log('Cleanup complete.');

  // 2. Set Developer as TRUSTED
  console.log('\n--- Step 1: Set Developer as Trusted ---');
  await db.update(developers).set({ isTrusted: true }).where(eq(developers.id, dev.id));
  console.log('Developer marked as trusted.');

  // 3. Create Draft
  console.log('\n--- Step 2: Create Draft ---');
  const newDev = await developmentService.createDevelopment(dev.id, {
    name: "Fast Track Test " + Date.now(),
    developmentType: "residential",
    city: "Trusted City",
    province: "Trusted Province",
  });
  console.log(`Created Development: ${newDev.name} (ID: ${newDev.id})`);

  // 4. Publish (Submit for Review)
  console.log('\n--- Step 3: Submit for Review (Publish) ---');
  await developmentService.publishDevelopment(newDev.id, dev.id, true);

  console.log('SUCCESS: Development is immediately published and approved.');

  // Validate double-publish guard
  console.log('\n--- Step 3b: Test Double Publish Guard ---');
  try {
     await developmentService.publishDevelopment(newDev.id, dev.id, true);
     console.error('FAILURE: Should have thrown Already Published error');
     process.exit(1);
  } catch (e: any) {
     if (e.message.includes('already published')) {
        console.log('SUCCESS: Prevented double publish.');
     } else {
        console.error('FAILURE: Unexpected error:', e.message);
        process.exit(1);
     }
  }

  // 6. Verify Queue Entry
  const [queueEntry] = await db.select()
    .from(developmentApprovalQueue)
    .where(eq(developmentApprovalQueue.developmentId, newDev.id))
    .orderBy(desc(developmentApprovalQueue.submittedAt));
    
  if (!queueEntry || queueEntry.status !== 'approved') {
      console.error(`FAILED: Queue entry status is '${queueEntry?.status}', expected 'approved'.`);
      process.exit(1);
  }
  console.log('SUCCESS: Queue entry created correctly as approved.');

  // CLEANUP FIRST DEV to free up quota
  await developmentService.deleteDevelopment(newDev.id, dev.id);
  console.log('Cleanup: Deleted first test development.');

  // --- REGRESSION TEST: Resubmission Logic (Non-Trusted) ---
  console.log('\n--- Step 4: Regression Test (Resubmission Flow) ---');
  // 4a. Create another dev specific for this test
  const resubDev = await developmentService.createDevelopment(dev.id, {
      name: "Resubmission Test " + Date.now(),
      developmentType: "residential",
      city: "Test City", 
      province: "Test Province"
  });
  
  // 4b. Untrust developer momentarily
  await db.update(developers).set({ isTrusted: false }).where(eq(developers.id, dev.id));

  // 4c. Initial Submit
  await developmentService.publishDevelopment(resubDev.id, dev.id, false);

  // 4d. Reject
  await developmentService.rejectDevelopment(resubDev.id, adminUser.id || 0, "Fix spelling");

  // 4e. Edit (Should reset to draft)
  await developmentService.updateDevelopment(resubDev.id, dev.id, { description: "Fixed spelling" });
  const editedDev = await developmentService.getDevelopment(resubDev.id);
  if (editedDev?.approvalStatus !== 'draft') {
      console.error(`FAILED: Edit did not reset status to draft. Got: ${editedDev?.approvalStatus}`);
      process.exit(1);
  }

  // 4f. Resubmit
  await developmentService.publishDevelopment(resubDev.id, dev.id, false);

  // 4g. Verify Submission Type
  const [resubQueue] = await db.select()
    .from(developmentApprovalQueue)
    .where(eq(developmentApprovalQueue.developmentId, resubDev.id))
    .orderBy(desc(developmentApprovalQueue.submittedAt))
    .limit(1);

  if (resubQueue.submissionType !== 'update') {
      console.error(`FAILED: Resubmission type should be 'update', got '${resubQueue.submissionType}'`);
      process.exit(1);
  }
  console.log('SUCCESS: Resubmission correctly identified as "update" type.');

  // Cleanup extra dev
  await developmentService.deleteDevelopment(resubDev.id, dev.id);
  // Re-trust for final cleanup logic (though script ends)
  await db.update(developers).set({ isTrusted: true }).where(eq(developers.id, dev.id));
  // ---------------------------------------------------------

  // 7. Cleanup & Revert Trust
  console.log('\n--- Cleanup ---');
  try {
     await developmentService.deleteDevelopment(newDev.id, dev.id);
  } catch (e) {} // Already deleted
  
  await db.update(developers).set({ isTrusted: false }).where(eq(developers.id, dev.id));
  console.log('Test development deleted and developer trust reverted.');

  process.exit(0);
}

verifyFastTrack().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
