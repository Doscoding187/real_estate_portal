
import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { developmentService } from '../services/developmentService';
import { developments, developmentApprovalQueue, users, developers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

import { developerSubscriptionService } from '../services/developerSubscriptionService';

async function verifyFlow() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  try {
    console.log('🚀 Starting Development Flow Verification');

    // 1. Setup: Get a developer (User)
    let [devUser] = await db.query.users.findMany({
        where: eq(users.role, 'property_developer'),
        limit: 1
    });
    
    // Create developer user if missing
    if (!devUser) {
        console.log('👤 Creating Test Developer User...');
        const devId = await db.insert(users).values({
            name: 'Test Developer',
            email: `test-dev-${Date.now()}@example.com`,
            role: 'property_developer',
            openId: `test-dev-${Date.now()}`,
            loginMethod: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: 1,
            isSubaccount: 0
        }).then(res => res[0].insertId);
        
        [devUser] = await db.query.users.findMany({ where: eq(users.id, devId as number), limit: 1 });
    }
    console.log(`👤 Using User: ${devUser.email} (${devUser.id})`);

    // 1b. Get/Create Developer Profile
    let developer = await db.query.developers.findFirst({
        where: eq(developers.userId, devUser.id)
    });

    if (!developer) {
        console.log('🏗️ Creating Developer Profile...');
        const devProfileId = await db.insert(developers).values({
            userId: devUser.id,
            name: devUser.name || 'Test Dev Co',
            email: devUser.email,
            isVerified: 0,
            status: 'approved', // Auto-approve profile for test
            isTrusted: false
        }).then(res => res[0].insertId);
        
        developer = await db.query.developers.findFirst({ where: eq(developers.id, devProfileId as number) });
    }
    console.log(`🏗️ Using Developer Profile ID: ${developer.id}`);

    // 1c. Ensure Subscription
    const sub = await developerSubscriptionService.getSubscription(developer.id);
    if (!sub) {
        console.log('💳 Creating Subscription...');
        await developerSubscriptionService.createSubscription(developer.id);
    }

    // Admin setup
    let [admin] = await db.query.users.findMany({
       where: eq(users.role, 'super_admin'),
       limit: 1
    });

    if (!admin) {
        console.log('👮 Creating Test Admin...');
        const adminId = await db.insert(users).values({
            name: 'Test Admin',
            email: `test-admin-${Date.now()}@example.com`,
            role: 'super_admin',
            openId: `test-admin-${Date.now()}`,
            loginMethod: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: 1,
            isSubaccount: 0
        }).then(res => res[0].insertId);

        [admin] = await db.query.users.findMany({ where: eq(users.id, adminId as number), limit: 1 });
    }
    console.log(`👮 Using Admin: ${admin.email} (${admin.id})`);

    // 2. Create Development
    console.log('\n📝 Creating Development (Planning/Draft)...');
    const newDev = await developmentService.createDevelopment(developer.id, {
        name: `E2E Test Dev ${Date.now()}`,
        developmentType: 'residential',
        city: 'Cape Town',
        province: 'Western Cape',
        address: '123 Test St',
        description: 'A test development for E2E flow verification'
    });
    console.log(`✅ Created Development ID: ${newDev.id} | Status: ${newDev.approvalStatus}`);

    // Verify initial state
    if (newDev.approvalStatus !== 'draft' && newDev.approvalStatus !== 'planning') { // Service defaults to 'planning'
         console.warn(`⚠️ Warning: Initial status is ${newDev.approvalStatus}, expected 'planning'`);
    }

    // 3. Publish Development (Submit for Review)
    console.log('\n📤 Publishing Development (Submitting)...');
    // Note: developmentService.publishDevelopment is the service method.
    // The router would check permissions, but here we call service directly.
    const publishedDev = await developmentService.publishDevelopment(newDev.id, developer.id, false); // false = not trusted (invokes review)
    console.log(`✅ Published. New Status: ${publishedDev.approvalStatus}`);

    // Verify Pending State
    if (publishedDev.approvalStatus !== 'pending') {
        console.error(`❌ Expected status 'pending', got '${publishedDev.approvalStatus}'`);
    }
    
    // Verify Queue Entry
    const queueEntry = await db.query.developmentApprovalQueue.findFirst({
        where: eq(developmentApprovalQueue.developmentId, newDev.id),
        orderBy: (queue, { desc }) => [desc(queue.submittedAt)]
    });

    if (queueEntry && queueEntry.status === 'pending') {
        console.log(`✅ Queue Entry created: ID ${queueEntry.id} | Status: ${queueEntry.status}`);
    } else {
        console.error('❌ Queue Entry NOT found or incorrect status');
    }

    // 4. Admin Approve
    console.log('\n✅ Admin Approving Development...');
    const approvedDev = await developmentService.approveDevelopment(newDev.id, admin.id, { 'compliance_checked': true });
    console.log(`✅ Approved. Final Status: ${approvedDev.approvalStatus} | Published: ${approvedDev.isPublished}`);

    // Verify Final State
    if (approvedDev.approvalStatus !== 'approved' || approvedDev.isPublished !== 1) {
         console.error('❌ Verification FAILED: Development is not fully approved/published.');
    } else {
         console.log('🎉 Verification SUCCESS: Development is approved and published.');
    }

    // cleanup (optional, maybe keep for manual inspection)
    // await developmentService.deleteDevelopment(newDev.id, developer.id);

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyFlow();
