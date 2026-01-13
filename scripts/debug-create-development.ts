
// debug-create-development.ts
// Run this to test the createDevelopment function directly

import 'dotenv/config'; 
import { eq } from 'drizzle-orm';
import { getDb } from '../server/db-connection'; 
import { developments } from '../drizzle/schema'; 

// =========================================================================== 
// TEST DATA (From your actual submission)
// =========================================================================== 

const testData = {
  name: "Leopard's Rest Lifestyle Estate",
  slug: "leopards-rest-lifestyle-estate",
  description: "Leopard's Rest Lifestyle Estate is a secure, family-oriented community...",
  developmentType: "residential",
  status: "planning",
  address: "5085 Devil's Knuckles Street",
  city: "Alberton",
  province: "Gauteng",
  suburb: "", // EMPTY 
  locationId: "", // EMPTY 
  latitude: -26.36269269805124,
  longitude: 28.10560777940675,
  priceFrom: 1225000,
  priceTo: 1795000,
  amenities: [
    "24_hour_security",
    "access_control",
    "guard_house"
  ],
  highlights: [
    "No Transfer Dulties",
    "Close to highway",
    "Private school with the estate"
  ],
  features: [
    "cfg:res_type:freehold",
    "cfg:comm_type:security_estate_general"
  ],
  images: [
    "https://d3fz99u3go2cmn.cloudfront.net/properties/21f01546-9bd0-4f0f-a03d-6c2c9d006546/1768069450720-b56ee040-c6ca-429c-864d-79781692776a.jpg"
  ],
  marketingRole: "exclusive",
  showHouseAddress: false,
  isFeatured: false,
  isPublished: true,
};

const testMetadata = {
  ownerType: "platform" as const,
  brandProfileId: 1, // Cosmopolitan Projects
};

// =========================================================================== 
// UTILITIES
// =========================================================================== 

function toNullIfEmpty(value: any): any {
  if (value === '' || value === undefined || value === null) return null;
  return value;
}

function toNumberOrNull(value: any): number | null {
  if (value === '' || value === undefined || value === null) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function boolToInt(value: any): 0 | 1 {
  return value ? 1 : 0;
}

// =========================================================================== 
// TEST FUNCTION
// =========================================================================== 

async function testCreateDevelopment() {
  console.log('\n========================================');
  console.log('TESTING CREATE DEVELOPMENT');
  console.log('========================================\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  console.log('✅ Database connected');

  // Step 1: Check if development already exists
  console.log('\n--- Step 1: Checking for existing development ---');
  // Use explicit select to avoid confusing columns like estateSpecs
  const existing = await db
    .select({ id: developments.id })
    .from(developments)
    .where(eq(developments.slug, testData.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log('⚠️  Development already exists:', existing[0].id);
    console.log('   Deleting for clean test...');
    await db.delete(developments).where(eq(developments.id, existing[0].id));
    console.log('✅ Deleted');
  } else {
    console.log('✅ No existing development found');
  }

  // Step 2: Prepare the data
  console.log('\n--- Step 2: Preparing data ---');
  
  // OMIT estateSpecs intentionally
  const transformedData: any = {
    // Core
    developerId: 1, 
    slug: testData.slug,
    name: testData.name,
    description: toNullIfEmpty(testData.description),
    
    // Ownership
    devOwnerType: testMetadata.ownerType,
    developerBrandProfileId: toNumberOrNull(testMetadata.brandProfileId),
    marketingRole: toNullIfEmpty(testData.marketingRole),
    
    // Location
    address: toNullIfEmpty(testData.address),
    city: toNullIfEmpty(testData.city),
    province: toNullIfEmpty(testData.province),
    suburb: toNullIfEmpty(testData.suburb), 
    locationId: toNumberOrNull(testData.locationId), 
    latitude: toNumberOrNull(testData.latitude),
    longitude: toNumberOrNull(testData.longitude),
    
    // Development Details
    developmentType: testData.developmentType || 'residential',
    status: testData.status || 'pre-launch',
    
    // Pricing
    priceFrom: toNumberOrNull(testData.priceFrom),
    priceTo: toNumberOrNull(testData.priceTo),
    
    // Arrays (store as JSON)
    amenities: JSON.stringify(testData.amenities),
    highlights: JSON.stringify(testData.highlights),
    features: JSON.stringify(testData.features),
    images: JSON.stringify(testData.images),
    
    // Flags
    showHouseAddress: boolToInt(testData.showHouseAddress),
    isFeatured: boolToInt(testData.isFeatured),
    isPublished: boolToInt(testData.isPublished),
    
    // Defaults
    views: 0,
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Paranoid cleanup
  if ('estateSpecs' in transformedData) {
      delete transformedData['estateSpecs'];
  }
  
  console.log('Transformed data keys:', Object.keys(transformedData));
  
  // Step 3: Attempt insert
  console.log('\n--- Step 3: Attempting INSERT ---');
  
  try {
    const [result] = await db.insert(developments).values(transformedData);
    console.log('✅ INSERT SUCCESSFUL!');
    console.log('   New development ID:', result.insertId);
    
    // Step 4: Verify it was created
    console.log('\n--- Step 4: Verifying creation ---');
    const [created] = await db
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        images: developments.images
      })
      .from(developments)
      .where(eq(developments.id, result.insertId))
      .limit(1);
    
    if (created) {
      console.log('✅ Development verified in database:');
      console.log('   ID:', created.id);
      console.log('   Slug:', created.slug);
      console.log('   Images type:', typeof created.images);
      console.log('   Images value:', created.images?.substring(0, 50) + '...');
    }
    
    return created;
    
  } catch (error: any) {
    console.error('\n❌ INSERT FAILED');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.sql) {
      console.error('\nFailed SQL:', error.sql);
    }
    
    throw error;
  }
}

testCreateDevelopment()
  .then(() => {
    console.log('\nTEST COMPLETED SUCCESSFULLY ✅');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTEST FAILED ❌');
    console.error(error);
    process.exit(1);
  });
