
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcryptjs';

dotenv.config();

async function seed() {
  console.log('🌱 Starting fresh seed...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing from environment');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    // ========================================================================
    // 0. Cleanup (Optional but safer)
    // ========================================================================
    console.log('🧹 Cleaning up old data...');
    // Disable FK checks to allow truncation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    await db.delete(schema.unitTypes);
    await db.delete(schema.developmentPhases);
    await db.delete(schema.developments);
    await db.delete(schema.developerSubscriptions);
    await db.delete(schema.developers);
    await db.delete(schema.agencies);
    await db.delete(schema.users);
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✨ cleanup complete');

    // ========================================================================
    // 1. Create Users & Profiles
    // ========================================================================
    console.log('👤 Creating accounts...');

    // --- Common Password ---
    const passwordHash = await bcrypt.hash('password123', 10);

    // --- Admin Account ---
    const [adminUser] = await db.insert(schema.users).values({
      name: 'System Admin',
      email: 'admin@test.local',
      role: 'super_admin',
      openId: 'admin-test-id',
      loginMethod: 'email',
      passwordHash,
      emailVerified: 1,
      isSubaccount: 0,
    } as any);
    console.log('✅ Admin created: admin@test.local');

    // --- Developer Account ---
    const [devUser] = await db.insert(schema.users).values({
      name: 'Test Developer',
      email: 'developer@test.local',
      role: 'property_developer',
      openId: 'developer-test-id',
      loginMethod: 'email',
      passwordHash,
      emailVerified: 1,
      isSubaccount: 0,
    } as any);
    const devUserId = Number(devUser.insertId);

    // Create Developer Profile
    const [devProfile] = await db.insert(schema.developers).values({
      userId: devUserId,
      name: 'Acme Developments',
      slug: 'acme-developments',
      description: 'Building the future, today.',
      email: 'contact@acme.local',
      phone: '0105551234',
      status: 'approved',
      isVerified: 1,
      city: 'Sandton',
      province: 'Gauteng'
    } as any);
    const developerId = Number(devProfile.insertId);
    
    // Create Developer Subscription (Free Trial)
    await db.insert(schema.developerSubscriptions).values({
        developerId: developerId,
        tier: 'free_trial',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), // 30 days from now
        currentPeriodStart: new Date().toISOString().slice(0, 19).replace('T', ' '),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    } as any);

    console.log('✅ Developer created: developer@test.local (Acme Developments)');

    // --- Agency Account ---
    const [agencyUser] = await db.insert(schema.users).values({
      name: 'Test Agency',
      email: 'agency@test.local',
      role: 'agency_admin',
      openId: 'agency-test-id',
      loginMethod: 'email',
      passwordHash,
      emailVerified: 1,
      isSubaccount: 0,
    } as any);
    const agencyUserId = Number(agencyUser.insertId);

    // Create Agency Profile
    const [agencyProfile] = await db.insert(schema.agencies).values({
      name: 'Prestige Properties',
      slug: 'prestige-properties',
      email: 'info@prestige.local',
      status: 'active',
      isVerified: 1,
      subscriptionStatus: 'active',
      city: 'Cape Town',
      province: 'Western Cape'
    } as any);
    const agencyId = Number(agencyProfile.insertId);

    // Link User to Agency
    await db.update(schema.users)
      .set({ agencyId: agencyId } as any)
      .where(eq(schema.users.id, agencyUserId));

    console.log('✅ Agency created: agency@test.local (Prestige Properties)');

    // ========================================================================
    // 2. Create Developments
    // ========================================================================
    console.log('🏗️  Creating developments...');

    // Common location defaults
    const locationDefaults = {
      city: 'Sandton',
      province: 'Gauteng',
      suburb: 'Morningside',
      latitude: '-26.1076',
      longitude: '28.0567'
    };

    // --- 2a. Simple Development (Minimal Fields) ---
    const [simpleDev] = await db.insert(schema.developments).values({
      developerId: developerId,
      name: 'The Minimalist',
      slug: 'the-minimalist',
      description: 'A simple, affordable living space.',
      developmentType: 'residential',
      status: 'launching-soon',
      ...locationDefaults,
      totalUnits: 20,
      availableUnits: 20,
      priceFrom: 950000,
      isPublished: 1,
      publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      views: 0,
      isFeatured: 0,
      gpsAccuracy: 'approximate'
    } as any);
    const simpleDevId = Number(simpleDev.insertId);
    
    // Simple: 1 Unit Type
    await db.insert(schema.unitTypes).values({
        id: nanoid(),
        developmentId: simpleDevId,
        name: 'Studio A',
        bedrooms: 0,
        bathrooms: "1.0",
        priceFrom: "950000.00",
        basePriceFrom: "950000.00",
        totalUnits: 20,
        availableUnits: 20,
        unitType: 'studio'
    } as any);

    // --- 2b. Complex Development (Rich Fields, Phases, Multiple Unit Types) ---
    const [complexDev] = await db.insert(schema.developments).values({
      developerId: developerId,
      name: 'Skyline Heights',
      slug: 'skyline-heights',
      tagline: 'Reach for the stars',
      subtitle: 'Luxury apartments in the heart of Sandton',
      description: 'Experience luxury living with panoramic views, concierge service, and world-class amenities.',
      developmentType: 'mixed_use',
      status: 'selling',
      ...locationDefaults,
      address: '123 Rivonia Road',
      totalUnits: 150,
      availableUnits: 85,
      priceFrom: 1500000,
      priceTo: 8500000,
      amenities: ['pool', 'gym', 'concierge', 'spa', 'parking'],
      features: ['24hr Security', 'Backup Power', 'Fiber Ready'],
      highlights: ['Rooftop Bar', 'Private Cinema', 'infinity Pool'],
      isPublished: 1,
      publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      views: 1250,
      isFeatured: 1,
      isHotSelling: 1,
      gpsAccuracy: 'accurate'
    } as any);
    const complexDevId = Number(complexDev.insertId);

    // Complex: Phases
    const [phase1] = await db.insert(schema.developmentPhases).values({
        developmentId: complexDevId,
        name: 'Phase 1 - The Tower',
        phaseNumber: 1,
        status: 'selling',
        totalUnits: 100,
        availableUnits: 35
    } as any);
    
    // Complex: Unit Types (linked to development, phases referenced if needed in units, but unitTypes are usually global to dev)
    // Creating 3 unit types
    await db.insert(schema.unitTypes).values({
        id: nanoid(),
        developmentId: complexDevId,
        name: '1 Bed Executive',
        bedrooms: 1,
        bathrooms: "1.0",
        priceFrom: "1500000.00",
        basePriceFrom: "1500000.00",
        unitSize: 45,
        totalUnits: 50,
        availableUnits: 10,
        unitType: '1bed'
    } as any);

    await db.insert(schema.unitTypes).values({
        id: nanoid(),
        developmentId: complexDevId,
        name: '2 Bed Family',
        bedrooms: 2,
        bathrooms: "2.0",
        priceFrom: "2500000.00",
        basePriceFrom: "2500000.00",
        unitSize: 85,
        totalUnits: 80,
        availableUnits: 65,
        unitType: '2bed'
    } as any);

    await db.insert(schema.unitTypes).values({
        id: nanoid(),
        developmentId: complexDevId,
        name: 'Penthouse Suite',
        bedrooms: 3,
        bathrooms: "3.5",
        priceFrom: "8500000.00",
        basePriceFrom: "8500000.00",
        unitSize: 220,
        totalUnits: 20,
        availableUnits: 10,
        unitType: 'penthouse',
        features: JSON.stringify(['Private Lift', 'Jacuzzi', 'Wraparound Balcony'])
    } as any);

    // --- 2c. Edge Case Development (Sold Out, Missing Optional Data) ---
    const [edgeDev] = await db.insert(schema.developments).values({
      developerId: developerId,
      name: 'Ghost Estate',
      slug: 'ghost-estate',
      // Missing description, tagline, subtitle
      developmentType: 'estate',
      status: 'sold-out', // Sold out status
      city: 'Somewhere',
      province: 'Limpopo', // Different province
      totalUnits: 50,
      availableUnits: 0, // Zero availability
      priceFrom: 500000,
      isPublished: 1, // Created but maybe archived? Or just sold out.
      publishedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), // Published a year ago
      views: 5,
      isFeatured: 0,
      gpsAccuracy: 'approximate'
    } as any);
    const edgeDevId = Number(edgeDev.insertId);

    // Edge: 1 Unit Type (Sold Out)
    await db.insert(schema.unitTypes).values({
        id: nanoid(),
        developmentId: edgeDevId,
        name: 'Standard Plot',
        bedrooms: 0,
        bathrooms: "0.0",
        priceFrom: "500000.00",
        basePriceFrom: "500000.00",
        totalUnits: 50,
        availableUnits: 0,
        unitType: 'house',
        structuralType: 'plot-and-plan'
    } as any);
    
    // --- 2d. Draft Development (Unpublished) ---
    await db.insert(schema.developments).values({
        developerId: developerId,
        name: 'Secret Project X',
        slug: 'secret-project-x',
        developmentType: 'residential',
        status: 'launching-soon',
        city: 'Sandton',
        province: 'Gauteng',
        isPublished: 0, // Not published
        approvalStatus: 'draft',
        isFeatured: 0,
        views: 0,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    } as any);

    console.log('✅ Developments created: Minimalist, Skyline Heights, Ghost Estate, Secret Project X');

    console.log('=============================================');
    console.log('🎉 Seed Complete! You can now log in with:');
    console.log('   Admin:     admin@test.local');
    console.log('   Developer: developer@test.local');
    console.log('   Agency:    agency@test.local');
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
