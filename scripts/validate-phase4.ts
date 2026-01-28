
import 'dotenv/config';
import { developmentService } from '../server/services/developmentService';
import { getDb } from '../server/db-connection';
import { eq } from 'drizzle-orm';
import { developments, developers } from '../drizzle/schema';

// Mock Data for "Full" Development
const VALIDATION_PAYLOAD = {
  name: `Phase 4 Validate ${Date.now()}`,
  developmentType: 'residential' as const,
  description: 'Integration Test Description',
  // New Fields
  ownershipType: 'sectional-title',
  structuralType: 'apartment',
  floors: 'double-storey',
  // Standard Fields
  tagline: 'Luxury Living',
  websiteUrl: 'https://example.com',
  shortCode: `PH4-${Math.floor(Math.random() * 1000)}`,
  priceFrom: 1000000,
  priceTo: 2000000,
  depositRequired: 50000,
  vatIncluded: true,
  transferCostsIncluded: true,
  status: 'launching-soon', // specific enum
  approvalStatus: 'draft',
  city: 'Sandton',
  province: 'Gauteng',
  address: '123 Test St'
};

async function runValidation() {
  console.log('🚀 Starting Phase 4 Validation...');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  try {
    // ---------------------------------------------------------
    // 1. DRAFT VALIDATION
    // ---------------------------------------------------------
    console.log('\nTesting 1: Draft Creation (Persistence)...');
    
    // We need a valid developer ID. For test, we'll try to find one or use a placeholder.
    // In strict mode, we might need to insert one if empty.
    let developerId: number; 
    
    const [existingDev] = await db.select().from(developers).limit(1);
    
    if (existingDev) {
      console.log(`ℹ️ Using existing Developer ID: ${existingDev.id}`);
      developerId = existingDev.id;
    } else {
      console.log('ℹ️ No developers found. Creating test developer...');
      // Minimal insert for foreign key
      const [result] = await db.insert(developers).values({
        name: 'Integration Test Dev',
        slug: `test-dev-${Date.now()}`,
        status: 'active',
        isVerified: true
      });
      developerId = result.insertId;
      console.log(`✅ Created Test Developer ID: ${developerId}`);
    }
    
    // Create Draft
    console.log('Sending Payload Keys:', Object.keys(VALIDATION_PAYLOAD)); // DEBUG
    const draft = await developmentService.createDevelopment(developerId, VALIDATION_PAYLOAD);
    console.log(`✅ Draft Created: ID ${draft.id} (${draft.slug})`);

    // Verify Persistence immediately via DB check
    const [persisted] = await db.select().from(developments).where(eq(developments.id, draft.id));
    
    if (!persisted) throw new Error('Persisted record not found!');
    
    const errors: string[] = [];
    // Check estateSpecs for the new fields
    // Check estateSpecs for transferCostsIncluded
    let specs = persisted.estateSpecs as any || {};
    if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch {}
    }
    
    // Check Columns
    if (persisted.ownershipType !== VALIDATION_PAYLOAD.ownershipType) errors.push(`Mismatch: ownershipType (${persisted.ownershipType})`);
    if (persisted.floors !== VALIDATION_PAYLOAD.floors) errors.push(`Mismatch: floors (${persisted.floors})`);
    if (persisted.structuralType !== VALIDATION_PAYLOAD.structuralType) errors.push(`Mismatch: structuralType (${persisted.structuralType})`);

    // Check JSON fields
    if (specs.transferCostsIncluded !== true) errors.push(`Mismatch: transferCostsIncluded (${specs.transferCostsIncluded})`);

    if (errors.length > 0) {
      console.error('❌ Persistence Mismatches:', errors);
    } else {
      console.log('✅ Persistence Verified: All fields match.');
    }

    // ---------------------------------------------------------
    // 2. RESUME VALIDATION (Hydration)
    // ---------------------------------------------------------
    console.log('\nTesting 2: Resume (Hydration)...');
    const hydrated = await developmentService.getDevelopmentWithPhases(draft.id);
    
    if (!hydrated || !hydrated.id) {
       console.error('Hydration failed: returned', hydrated);
       throw new Error('Hydration returned null or missing ID');
    }

    if (hydrated.id !== draft.id) throw new Error('Hydration ID mismatch');
    console.log('✅ Hydration Verified: Service returned complete object.');

    // Verify Unit Types and Phases are present as arrays
    if (!Array.isArray(hydrated.unitTypes)) throw new Error('Hydration missing unitTypes array');
    if (!Array.isArray(hydrated.phases)) throw new Error('Hydration missing phases array');


    // ---------------------------------------------------------
    // 3. ADMIN VALIDATION (Workflow)
    // ---------------------------------------------------------
    console.log('\nTesting 3: Admin Approval...');
    
    // Admin ID 1 (System)
    await developmentService.approveDevelopment(draft.id, 1);
    
    const [approved] = await db.select().from(developments).where(eq(developments.id, draft.id));
    
    if (!approved || !approved.isPublished) throw new Error('Development not published after approval');
    if (approved.status !== 'selling' && approved.status !== 'launching-soon') throw new Error(`Status mismatch: Expected 'selling' or 'launching-soon', got '${approved.status}'`);
    if (approved.approvalStatus !== 'approved') throw new Error(`ApprovalStatus mismatch: Expected 'approved', got '${approved.approvalStatus}'`);

    console.log('✅ Admin Approval Verified: Development is live.');

    console.log('\n🎉 Phase 4 Validation COMPLETE: Success.');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Validation Failed:', error.message || error);
    if (error.details) console.error('Details:', error.details);
    process.exit(1);
  }
}

runValidation();
