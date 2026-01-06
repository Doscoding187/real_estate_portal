
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1600&auto=format&fit=crop', // Modern House Exterior
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1600&auto=format&fit=crop', // Living Room
  'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?q=80&w=1600&auto=format&fit=crop', // Kitchen
  'https://images.unsplash.com/photo-1595246140625-573b715d1128?q=80&w=1600&auto=format&fit=crop', // Bedroom
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1600&auto=format&fit=crop'  // Bathroom
];

async function seedMockListing() {
  console.log('🌱 Starting mock listing seed...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing from environment');
    process.exit(1);
  }

  // Create connection
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    // 1. Get or Create User (Owner)
    // We'll try to find the standard owner/admin first
    let ownerId: number;
    const existingUsers = await db.select().from(schema.users).limit(1);
    
    if (existingUsers.length > 0) {
      ownerId = existingUsers[0].id;
      console.log(`✅ Using existing user ID: ${ownerId}`);
    } else {
      // Create valid user
      const [result] = await db.insert(schema.users).values({
        name: 'Mock Agent',
        email: 'mock@example.com',
        role: 'agent',
        openId: 'mock-agent-openid-123',
        loginMethod: 'email',
        emailVerified: 1
      } as any); // Type cast if needed depending on strict schema types
      ownerId = Number(result.insertId);
      console.log(`✅ Created new user ID: ${ownerId}`);
    }

    // 2. Prepare Property Data
    const propertySettings = {
      ownershipType: "freehold",
      powerBackup: "solar_inverter",
      securityFeatures: ["electric_fencing", "alarm_system", "cctv"],
      waterSupply: "borehole",
      internetAccess: "fibre",
      flooring: "tiles_and_laminate",
      parkingType: "double_garage",
      petFriendly: "yes",
      electricitySupply: "prepaid"
    };

    const amenities = ["pool", "garden", "security", "wifi", "parking", "gym"];

    console.log('📝 Inserting property...');
    const [propResult] = await db.insert(schema.properties).values({
      title: "Luxurious 4-Bedroom Modern Family Home",
      description: `Experience the epitome of modern luxury living in this stunning 4-bedroom family home. 
      
      Boasting a spacious open-plan layout, this property features a state-of-the-art kitchen with granite tops, a sun-drenched living area that opens out onto a covered patio, and a sparkling swimming pool perfect for entertaining.
      
      The master suite is a true sanctuary with a walk-in closet and a spa-like en-suite bathroom. Three additional bedrooms provide ample space for family or a home office.
      
      Situated in a secure and sought-after neighborhood, this home offers peace of mind with top-tier security features including electric fencing and CCTV.
      
      Don't miss the opportunity to make this dream home yours!`,
      propertyType: "house",
      listingType: "sale",
      transactionType: "sale",
      price: 4500000, // R 4.5M
      bedrooms: 4,
      bathrooms: 3,
      area: 450, // 450 sqm
      address: "123 Mockingbird Lane, Sandton",
      city: "Sandton",
      province: "Gauteng",
      amenities: JSON.stringify(amenities),
      features: JSON.stringify(amenities), // Using same for simplicity
      propertySettings: JSON.stringify(propertySettings),
      status: "available",
      featured: 1,
      views: 0,
      enquiries: 0,
      ownerId: ownerId,
      mainImage: MOCK_IMAGES[0],
      isPublished: 1,
      publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    } as any);

    const propertyId = Number(propResult.insertId);
    console.log(`✅ Property created with ID: ${propertyId}`);

    // 3. Insert Images
    console.log('📸 Inserting images...');
    for (let i = 0; i < MOCK_IMAGES.length; i++) {
        await db.insert(schema.propertyImages).values({
            propertyId: propertyId,
            imageUrl: MOCK_IMAGES[i],
            isPrimary: i === 0 ? 1 : 0,
            displayOrder: i
        });
    }

    console.log('=============================================');
    console.log('🎉 Mock Listing Created Successfully!');
    console.log(`🆔 Property ID: ${propertyId}`);
    console.log(`🌐 Views/Link: /property/${propertyId}`);
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Error seeding mock listing:', error);
  } finally {
    await connection.end();
  }
}

seedMockListing();
