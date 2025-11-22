import 'dotenv/config';
import { getDb, approveListing, searchProperties } from '../server/db';
import { listings, listingMedia } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('Creating test house listing with yard data...\n');

  // House property details with both building size AND yard size
  const propertyDetails = {
    bedrooms: 4,
    bathrooms: 2,
    houseAreaM2: 180,      // Building size: 180 m²
    erfSizeM2: 500,        // Yard/plot size: 500 m²
    parkingSpaces: 2,
    garageSpaces: 2,
    flooringType: 'tiles',
    roofType: 'metal',
    ownershipType: 'freehold',
    propertySettings: 'freehold',
    waterHeating: 'solar_geyser',
    electricitySource: 'municipal',
    waterSupply: 'municipal',
    amenities: ['garden', 'pool', 'braai_area', 'parking_bay'],
    additionalRooms: ['study', 'laundry_room'],
    petFriendly: true,
    securityLevel: 'electric_fence'
  };

  // Insert the listing
  await db.insert(listings).values({
    ownerId: 1, // User/owner ID
    title: '4 Bedroom Family House with Large Garden',
    description: 'Beautiful family home with spacious living areas, modern kitchen, and a large garden perfect for children and pets. Features include a swimming pool, braai area, and secure parking.',
    propertyType: 'house',
    action: 'sell',
    status: 'pending_review',
    approvalStatus: 'pending',
    slug: '4-bedroom-family-house-large-garden',
    propertyDetails: JSON.stringify(propertyDetails),
    address: '123 Oak Avenue, Brooklyn, Pretoria',
    latitude: '-25.7682',
    longitude: '28.2293',
    city: 'Pretoria',
    suburb: 'Brooklyn',
    province: 'Gauteng',
    postalCode: '0181',
    pricing: JSON.stringify({
      askingPrice: 3500000,
      priceNegotiable: true
    }),
    contactDetails: JSON.stringify({
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+27821234567',
      preferredContact: 'phone'
    })
  });

  // Get the newly created listing
  const [newListing] = await db
    .select()
    .from(listings)
    .orderBy(desc(listings.createdAt))
    .limit(1);

  console.log('✅ Created listing:', newListing.id);
  console.log('   Title:', newListing.title);
  console.log('   Property Type:', newListing.propertyType);

  // Add a sample image
  await db.insert(listingMedia).values({
    listingId: newListing.id,
    mediaType: 'image',
    originalUrl: '/placeholder-house.jpg',
    isPrimary: true,
    displayOrder: 0
  });

  console.log('✅ Added sample image\n');

  // Approve the listing to transfer it to properties table
  console.log('Approving listing to transfer to properties table...');
  
  try {
    await approveListing(newListing.id, 1); // reviewedBy: 1 (admin)
    console.log('✅ Listing approved successfully!');
    
    // Verify the property was created
    const allProperties = await searchProperties({});
    const houseProperty = allProperties.find((p: any) => p.title === '4 Bedroom Family House with Large Garden');
    
    if (houseProperty) {
      console.log('   Property ID:', houseProperty.id);
      console.log('\n📋 Expected Display:');
      console.log('   - Property Type Badge: "House"');
      console.log('   - Size 180 m²');
      console.log('   - 4 Bed');
      console.log('   - 2 Bath');
      console.log('   - Yard 500 m²');
      console.log('\n🌐 View at: http://localhost:3000/properties');
    } else {
      console.log('⚠️  Property not found in search results. It may still be created but not returned in search.');
    }
  } catch (error) {
    console.error('❌ Failed to approve listing:', error);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
