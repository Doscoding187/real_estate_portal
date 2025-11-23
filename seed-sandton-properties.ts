import { db } from './server/db';
import { properties } from './drizzle/schema';

async function seedSandtonProperties() {
  console.log('🌱 Seeding Sandton test properties...');

  try {
    // First, update property 90001 to have a suburb
    await db.update(properties)
      .set({ 
        suburb: 'Sandton',
        latitude: '-26.1076',
        longitude: '28.0567'
      })
      .where({ id: 90001 });

    console.log('✅ Updated property 90001 with Sandton suburb');

    // Insert test properties
    const testProperties = [
      {
        id: 90002,
        title: 'Elegant Family Home in Sandton',
        description: 'Beautiful 4-bedroom house with modern finishes, spacious garden, and pool. Located in the heart of Sandton with easy access to schools and shopping centers.',
        propertyType: 'house' as const,
        listingType: 'sale' as const,
        transactionType: 'sale' as const,
        price: 5850000,
        bedrooms: 4,
        bathrooms: 3,
        area: 380,
        address: '45 Rivonia Road, Sandton',
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
        zipCode: '2196',
        latitude: '-26.1076',
        longitude: '28.0567',
        amenities: '["Pool", "Garden", "Double Garage", "Security System", "Modern Kitchen"]',
        yearBuilt: 2019,
        status: 'available' as const,
        featured: 0,
        views: 0,
        enquiries: 0,
        agentId: 1,
        ownerId: 1,
        mainImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
      },
      {
        id: 90003,
        title: 'Luxury 2-Bed Apartment - Sandton CBD',
        description: 'Stunning 2-bedroom apartment with panoramic city views. Premium finishes, open-plan living, and access to world-class amenities.',
        propertyType: 'apartment' as const,
        listingType: 'sale' as const,
        transactionType: 'sale' as const,
        price: 3200000,
        bedrooms: 2,
        bathrooms: 2,
        area: 95,
        address: 'Unit 2104, Sandton Towers',
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
        zipCode: '2196',
        latitude: '-26.1076',
        longitude: '28.0567',
        amenities: '["Gym", "Pool", "24h Security", "Parking Bay", "Balcony", "City Views"]',
        yearBuilt: 2021,
        status: 'available' as const,
        featured: 1,
        views: 0,
        enquiries: 0,
        agentId: 1,
        ownerId: 1,
        mainImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'
      },
      {
        id: 90004,
        title: 'Modern Townhouse in Secure Estate',
        description: 'Spacious 3-bedroom townhouse in gated community. Perfect for families with excellent security and amenities.',
        propertyType: 'townhouse' as const,
        listingType: 'sale' as const,
        transactionType: 'sale' as const,
        price: 4100000,
        bedrooms: 3,
        bathrooms: 2,
        area: 210,
        address: '12 Morningside Drive, Sandton',
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
        zipCode: '2196',
        latitude: '-26.1076',
        longitude: '28.0567',
        amenities: '["Security Estate", "Garden", "Single Garage", "Pet Friendly", "Clubhouse"]',
        yearBuilt: 2020,
        status: 'available' as const,
        featured: 0,
        views: 0,
        enquiries: 0,
        agentId: 2,
        ownerId: 2,
        mainImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
      },
      {
        id: 90005,
        title: 'Exclusive Sandton Villa with Pool',
        description: 'Magnificent 5-bedroom villa in prestigious Sandton neighborhood. Features include infinity pool, home cinema, and landscaped gardens.',
        propertyType: 'villa' as const,
        listingType: 'sale' as const,
        transactionType: 'sale' as const,
        price: 12500000,
        bedrooms: 5,
        bathrooms: 4,
        area: 520,
        address: '78 Katherine Street, Sandton',
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
        zipCode: '2196',
        latitude: '-26.1076',
        longitude: '28.0567',
        amenities: '["Infinity Pool", "Home Cinema", "Wine Cellar", "Staff Quarters", "Triple Garage", "Smart Home"]',
        yearBuilt: 2022,
        status: 'available' as const,
        featured: 1,
        views: 0,
        enquiries: 0,
        agentId: 1,
        ownerId: 1,
        mainImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'
      }
    ];

    await db.insert(properties).values(testProperties);

    console.log('✅ Successfully added 4 test properties in Sandton');
    console.log('\n🏠 Properties added:');
    testProperties.forEach(p => {
      console.log(`  - ${p.id}: ${p.title} (${p.propertyType}, R${p.price.toLocaleString()})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding properties:', error);
    process.exit(1);
  }
}

seedSandtonProperties();
