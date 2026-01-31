/**
 * Brand Emulator Demo Script
 *
 * Demonstrates the brand seeding emulator functionality.
 * This script shows how super admins can seed believable inventory
 * under platform-owned brands and clean it up safely.
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/trpc';

// Create TRPC client
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      // You'll need to add authentication headers here
      // headers: { authorization: `Bearer ${token}` }
    }),
  ],
});

// Demo data for platform-owned brands
const PLATFORM_BRANDS = [
  {
    brandName: 'Cosmo Police Developments',
    identityType: 'developer' as const,
    brandTier: 'regional' as const,
    description: 'Premium residential developments in Gauteng',
    sampleDevelopments: [
      {
        name: 'Cosmo City Heights',
        developmentType: 'residential' as const,
        location: {
          address: '123 Extension 5, Cosmo City',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '1733',
        },
        unitTypes: [
          {
            name: 'Studio Apartment',
            bedrooms: 0,
            bathrooms: 1,
            unitSize: 35,
            basePriceFrom: 450000,
            parkingType: 'open' as const,
            parkingBays: 1,
            totalUnits: 20,
            availableUnits: 8,
          },
          {
            name: '2 Bedroom Unit',
            bedrooms: 2,
            bathrooms: 1,
            unitSize: 65,
            basePriceFrom: 850000,
            parkingType: 'covered' as const,
            parkingBays: 1,
            totalUnits: 15,
            availableUnits: 3,
          },
        ],
      },
    ],
  },
  {
    brandName: 'Central Developments SA',
    identityType: 'developer' as const,
    brandTier: 'national' as const,
    description: 'Commercial and mixed-use properties nationwide',
    sampleProperties: [
      {
        title: 'Modern Office Space - Sandton',
        propertyType: 'commercial' as const,
        listingType: 'sale' as const,
        askingPrice: 12500000,
        location: {
          address: '45 Rivonia Road, Sandton',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2128',
        },
        propertyDetails: {
          bedrooms: 0,
          bathrooms: 4,
          erfSizeM2: 850,
          parkingType: 'covered' as const,
          parkingBays: 12,
          amenities: ['24/7 Security', 'Boardroom', 'Kitchen', 'Fiber Internet'],
          propertyHighlights: ['Prime Location', 'Modern Finishes', 'Ample Parking'],
        },
        mediaUrls: [
          'https://example.com/office-1.jpg',
          'https://example.com/office-2.jpg',
          'https://example.com/office-3.jpg',
        ],
      },
    ],
  },
  {
    brandName: 'REMAX Franchise Cape Town',
    identityType: 'marketing_agency' as const,
    brandTier: 'boutique' as const,
    description: 'Real estate marketing and property sales',
    sampleLeads: [
      {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+27 83 123 4567',
        message: 'Interested in 3 bedroom family home in Southern Suburbs',
        leadType: 'property_inquiry' as const,
        budget: 2500000,
        preferredContact: 'email' as const,
        source: 'Website Contact Form',
      },
    ],
  },
];

class BrandEmulatorDemo {
  private brandProfileIds: number[] = [];

  /**
   * Step 1: Create platform-owned brand profiles
   */
  async createPlatformBrands() {
    console.log('🏗️  Creating platform-owned brand profiles...');

    for (const brand of PLATFORM_BRANDS) {
      try {
        const result = await client.brandProfile.adminCreateBrandProfile.mutate({
          brandName: brand.brandName,
          about: brand.description,
          identityType: brand.identityType,
          brandTier: brand.brandTier,
          ownerType: 'platform',
          isVisible: true,
          isContactVerified: true,
          operatingProvinces: ['Gauteng', 'Western Cape', 'KwaZulu-Natal'],
          propertyFocus: ['residential', 'commercial'],
        });

        this.brandProfileIds.push(result.id);
        console.log(`✅ Created brand: ${brand.brandName} (ID: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to create brand ${brand.brandName}:`, error);
      }
    }

    console.log(`✅ Created ${this.brandProfileIds.length} platform brands\n`);
  }

  /**
   * Step 2: Get available platform brands for emulator
   */
  async listAvailableBrands() {
    console.log('📋 Listing available platform brands...');

    try {
      const brands = await client.brandEmulator.listAvailableBrands.query({
        limit: 50,
      });

      console.log(`✅ Found ${brands.length} available platform brands:`);
      brands.forEach(brand => {
        console.log(`   - ${brand.brandName} (ID: ${brand.brandProfileId}) - ${brand.brandTier}`);
      });

      return brands;
    } catch (error) {
      console.error('❌ Failed to list brands:', error);
      return [];
    }
  }

  /**
   * Step 3: Seed developments under brands
   */
  async seedDevelopments() {
    console.log('🏢 Seeding developments under platform brands...');

    const brands = await this.listAvailableBrands();
    const cosmoBrand = brands.find(b => b.brandName.includes('Cosmo Police'));

    if (!cosmoBrand) {
      console.error('❌ Cosmo Police brand not found');
      return;
    }

    const cosmoData = PLATFORM_BRANDS.find(b => b.brandName.includes('Cosmo Police'));
    if (!cosmoData?.sampleDevelopments) return;

    for (const dev of cosmoData.sampleDevelopments) {
      try {
        const result = await client.brandEmulator.seedDevelopment.mutate({
          brandProfileId: cosmoBrand.brandProfileId,
          developmentData: {
            ...dev,
            slug: dev.name.toLowerCase().replace(/\s+/g, '-'),
            description: `Premium ${dev.developmentType} development by ${cosmoBrand.brandName}`,
            status: 'published',
            transactionType: 'for_sale',
            amenities: ['Security', 'Parking', 'Gym', 'Pool'],
            completionDate: '2024-12-31',
            marketingDescription: `Experience luxury living at ${dev.name}`,
          },
        });

        console.log(`✅ Seeded development: ${dev.name} (${result.totalEntities} entities)`);
      } catch (error) {
        console.error(`❌ Failed to seed development ${dev.name}:`, error);
      }
    }

    console.log('✅ Development seeding complete\n');
  }

  /**
   * Step 4: Seed properties under brands
   */
  async seedProperties() {
    console.log('🏠 Seeding properties under platform brands...');

    const brands = await this.listAvailableBrands();
    const centralBrand = brands.find(b => b.brandName.includes('Central Developments'));

    if (!centralBrand) {
      console.error('❌ Central Developments brand not found');
      return;
    }

    const centralData = PLATFORM_BRANDS.find(b => b.brandName.includes('Central Developments'));
    if (!centralData?.sampleProperties) return;

    for (const prop of centralData.sampleProperties) {
      try {
        const result = await client.brandEmulator.seedProperty.mutate({
          brandProfileId: centralBrand.brandProfileId,
          propertyData: {
            ...prop,
            description: `Premium ${prop.propertyType} in ${prop.location.city}`,
          },
        });

        console.log(`✅ Seeded property: ${prop.title} (${result.totalEntities} entities)`);
      } catch (error) {
        console.error(`❌ Failed to seed property ${prop.title}:`, error);
      }
    }

    console.log('✅ Property seeding complete\n');
  }

  /**
   * Step 5: Generate leads for brands
   */
  async generateLeads() {
    console.log('📧 Generating leads for platform brands...');

    const brands = await this.listAvailableBrands();
    const remaxBrand = brands.find(b => b.brandName.includes('REMAX'));

    if (!remaxBrand) {
      console.error('❌ REMAX brand not found');
      return;
    }

    const remaxData = PLATFORM_BRANDS.find(b => b.brandName.includes('REMAX'));
    if (!remaxData?.sampleLeads) return;

    for (const lead of remaxData.sampleLeads) {
      try {
        const result = await client.brandEmulator.generateLead.mutate({
          brandProfileId: remaxBrand.brandProfileId,
          leadData: {
            ...lead,
            utmSource: 'brand_emulator_demo',
            utmMedium: 'script',
            utmCampaign: 'demo_seeding',
          },
        });

        console.log(`✅ Generated lead: ${lead.name} for ${remaxBrand.brandName}`);
      } catch (error) {
        console.error(`❌ Failed to generate lead for ${lead.name}:`, error);
      }
    }

    console.log('✅ Lead generation complete\n');
  }

  /**
   * Step 6: View brand entities
   */
  async viewBrandEntities() {
    console.log('👀 Viewing brand entities...');

    const brands = await this.listAvailableBrands();

    for (const brand of brands) {
      try {
        const entities = await client.brandEmulator.getBrandEntities.query({
          brandProfileId: brand.brandProfileId,
        });

        console.log(`\n📊 ${brand.brandName} (ID: ${brand.brandProfileId}):`);
        console.log(`   Developments: ${entities.developments.length}`);
        console.log(`   Properties: ${entities.properties.length}`);
        console.log(`   Leads: ${entities.leads.length}`);
        console.log(`   Total Entities: ${entities.totalEntities}`);
      } catch (error) {
        console.error(`❌ Failed to get entities for ${brand.brandName}:`, error);
      }
    }

    console.log('\n✅ Brand entity viewing complete\n');
  }

  /**
   * Step 7: Cleanup all demo data
   */
  async cleanupDemoData() {
    console.log('🧹 Cleaning up demo data...');

    const brands = await this.listAvailableBrands();

    for (const brand of brands) {
      try {
        console.log(`🗑️  Cleaning up ${brand.brandName}...`);

        const result = await client.brandEmulator.cleanupBrandEntities.mutate({
          brandProfileId: brand.brandProfileId,
          confirm: true,
        });

        console.log(`✅ Cleaned up ${brand.brandName}:`, result.deletedCounts);
      } catch (error) {
        console.error(`❌ Failed to cleanup ${brand.brandName}:`, error);
      }
    }

    console.log('✅ Demo data cleanup complete\n');
  }

  /**
   * Run the complete demo workflow
   */
  async runDemo() {
    console.log('🚀 Starting Brand Emulator Demo Workflow\n');

    try {
      await this.createPlatformBrands();
      await this.listAvailableBrands();
      await this.seedDevelopments();
      await this.seedProperties();
      await this.generateLeads();
      await this.viewBrandEntities();

      console.log('🎉 Demo workflow complete! Review the seeded content above.');
      console.log('⚠️  Run cleanup() when ready to remove all demo data.\n');
    } catch (error) {
      console.error('❌ Demo workflow failed:', error);
    }
  }

  /**
   * Cleanup method to remove all demo data
   */
  async cleanup() {
    console.log('🧹 Starting cleanup...\n');
    await this.cleanupDemoData();
    console.log('✅ All demo data removed successfully!');
  }
}

// Export for use in scripts or tests
export { BrandEmulatorDemo, PLATFORM_BRANDS };

// Run demo if this file is executed directly
if (require.main === module) {
  const demo = new BrandEmulatorDemo();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--cleanup')) {
    demo.cleanup();
  } else {
    demo.runDemo();
  }
}
