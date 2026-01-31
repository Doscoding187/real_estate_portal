/**
 * Seed Platform Brands Script
 *
 * Creates platform-owned brand profiles with developments for demonstration purposes.
 * These are placeholder brands like "Cosmo Police", "Central Developments", "Remax", etc.
 */

import {
  platformBrandSeedingService,
  PlatformBrandSeed,
  DevelopmentSeed,
} from '../server/services/platformBrandSeedingService';
import * as dotenv from 'dotenv';

dotenv.config();

// Define platform-owned brands with realistic South African data
const platformBrands: PlatformBrandSeed[] = [
  {
    brandName: 'Cosmo Police',
    slug: 'cosmo-police',
    brandTier: 'national',
    identityType: 'developer',
    about:
      'Leading residential developer in Cosmo City and surrounding areas, specializing in affordable housing and family-friendly communities.',
    foundedYear: 2008,
    headOfficeLocation: 'Cosmo City, Johannesburg',
    operatingProvinces: ['Gauteng', 'North West'],
    propertyFocus: ['residential', 'affordable-housing', 'townhouses'],
    websiteUrl: 'https://cosmopolice.co.za',
    publicContactEmail: 'info@cosmopolice.co.za',
    logoUrl: 'https://via.placeholder.com/150/1e40af/ffffff?text=CP',
  },
  {
    brandName: 'Central Developments',
    slug: 'central-developments',
    brandTier: 'regional',
    identityType: 'developer',
    about:
      'Premium mixed-use developments in major South African city centers, combining residential, commercial, and retail spaces.',
    foundedYear: 2012,
    headOfficeLocation: 'Sandton, Johannesburg',
    operatingProvinces: ['Gauteng', 'Western Cape', 'KwaZulu-Natal'],
    propertyFocus: ['mixed-use', 'luxury-apartments', 'commercial'],
    websiteUrl: 'https://centraldevelopments.co.za',
    publicContactEmail: 'contact@centraldevelopments.co.za',
    logoUrl: 'https://via.placeholder.com/150/059669/ffffff?text=CD',
  },
  {
    brandName: 'REMAX Premium Properties',
    slug: 'remax-premium',
    brandTier: 'national',
    identityType: 'marketing_agency',
    about:
      'Part of the global REMAX network, specializing in premium residential properties and luxury estates across South Africa.',
    foundedYear: 2010,
    headOfficeLocation: 'Cape Town',
    operatingProvinces: ['Western Cape', 'Gauteng', 'KwaZulu-Natal'],
    propertyFocus: ['luxury-homes', 'estates', 'residential'],
    websiteUrl: 'https://remaxpremium.co.za',
    publicContactEmail: 'premium@remax.co.za',
    logoUrl: 'https://via.placeholder.com/150/dc2626/ffffff?text=RP',
  },
  {
    brandName: 'Urban Capital Investments',
    slug: 'urban-capital',
    brandTier: 'national',
    identityType: 'hybrid',
    about:
      'Real estate investment and development company focused on urban regeneration and high-yield residential properties.',
    foundedYear: 2015,
    headOfficeLocation: 'Melrose Arch, Johannesburg',
    operatingProvinces: ['Gauteng', 'Western Cape'],
    propertyFocus: ['apartments', 'student-housing', 'investments'],
    websiteUrl: 'https://urbancapital.co.za',
    publicContactEmail: 'invest@urbancapital.co.za',
    logoUrl: 'https://via.placeholder.com/150/7c3aed/ffffff?text=UC',
  },
  {
    brandName: 'Coastal Lifestyle Properties',
    slug: 'coastal-lifestyle',
    brandTier: 'regional',
    identityType: 'developer',
    about:
      'Specializing in coastal and holiday developments along the beautiful South African coastline, from Cape Town to Durban.',
    foundedYear: 2009,
    headOfficeLocation: 'Jeffreys Bay',
    operatingProvinces: ['Western Cape', 'Eastern Cape', 'KwaZulu-Natal'],
    propertyFocus: ['holiday-homes', 'coastal', 'residential'],
    websiteUrl: 'https://coastallifestyle.co.za',
    publicContactEmail: 'info@coastallifestyle.co.za',
    logoUrl: 'https://via.placeholder.com/150/0ea5e9/ffffff?text=CL',
  },
];

// Define developments for each brand
const developmentsByBrand = {
  'cosmo-police': [
    {
      name: 'Cosmo City Gardens',
      slug: 'cosmo-city-gardens',
      description:
        'Affordable family-friendly housing complex in the heart of Cosmo City with excellent amenities and easy access to public transport.',
      tagline: 'Your Gateway to Affordable Living',
      subtitle: 'Perfect for First-Time Homebuyers',
      developmentType: 'residential' as const,
      status: 'selling' as const,
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Cosmo City',
      latitude: '-26.0433',
      longitude: '27.8744',
      totalUnits: 120,
      availableUnits: 45,
      priceFrom: 450000,
      priceTo: 850000,
      amenities: ['community-center', 'playground', 'park', 'security', 'shopping-nearby'],
      features: ['solar-geysers', 'pre-paid-electricity', 'water-saving', 'fiber-ready'],
      highlights: ['Affordable Pricing', 'No Transfer Duty', 'Government Subsidies Available'],
      unitTypes: [
        {
          name: 'Studio Starter',
          bedrooms: 0,
          bathrooms: '1.0',
          priceFrom: '450000.00',
          unitSize: 28,
          totalUnits: 40,
          availableUnits: 15,
          unitType: 'studio' as const,
        },
        {
          name: 'Two Bedroom Family',
          bedrooms: 2,
          bathrooms: '1.0',
          priceFrom: '680000.00',
          unitSize: 56,
          totalUnits: 60,
          availableUnits: 20,
          unitType: '2bed' as const,
        },
        {
          name: 'Three Bedroom Plus',
          bedrooms: 3,
          bathrooms: '2.0',
          priceFrom: '850000.00',
          unitSize: 78,
          totalUnits: 20,
          availableUnits: 10,
          unitType: '3bed' as const,
        },
      ],
    },
  ],
  'central-developments': [
    {
      name: 'Sandton Central Towers',
      slug: 'sandton-central-towers',
      description:
        'Luxury mixed-use development in the heart of Sandton, featuring premium apartments, office spaces, and high-end retail.',
      tagline: "Live, Work, Play in Africa's Richest Square Mile",
      subtitle: 'Ultra-Luxury Urban Living',
      developmentType: 'mixed_use' as const,
      status: 'selling' as const,
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandown',
      address: '135 Rivonia Road, Sandown',
      latitude: '-26.1076',
      longitude: '28.0567',
      totalUnits: 200,
      availableUnits: 85,
      priceFrom: 2500000,
      priceTo: 15000000,
      amenities: ['rooftop-pool', 'gym', 'spa', 'concierge', 'restaurant', 'cinema', 'parking'],
      features: [
        'smart-home',
        'backup-power',
        'high-speed-lifts',
        '24hr-security',
        'climate-control',
      ],
      highlights: ['Prime Sandton Location', 'Walk to Gautrain', 'Brand New Development'],
      unitTypes: [
        {
          name: 'Executive 1 Bedroom',
          bedrooms: 1,
          bathrooms: '1.0',
          priceFrom: '2500000.00',
          unitSize: 65,
          totalUnits: 80,
          availableUnits: 30,
          unitType: '1bed' as const,
        },
        {
          name: 'Premium 2 Bedroom',
          bedrooms: 2,
          bathrooms: '2.0',
          priceFrom: '4200000.00',
          unitSize: 95,
          totalUnits: 80,
          availableUnits: 35,
          unitType: '2bed' as const,
        },
        {
          name: 'Penthouse Collection',
          bedrooms: 3,
          bathrooms: '3.5',
          priceFrom: '15000000.00',
          unitSize: 320,
          totalUnits: 40,
          availableUnits: 20,
          unitType: 'penthouse' as const,
          features: ['private-lift', 'rooftop-terrace', 'jacuzzi', 'panoramic-views'],
        },
      ],
      phases: [
        {
          name: 'Phase 1 - Residential Tower',
          phaseNumber: 1,
          status: 'selling' as const,
          totalUnits: 100,
          availableUnits: 40,
        },
        {
          name: 'Phase 2 - Commercial Wing',
          phaseNumber: 2,
          status: 'launching-soon' as const,
          totalUnits: 100,
          availableUnits: 45,
        },
      ],
    },
  ],
  'remax-premium': [
    {
      name: 'V&A Waterfront Marina Residences',
      slug: 'va-waterfront-marina',
      description:
        'Exclusive waterfront apartments with breathtaking views of Table Mountain and the Atlantic Ocean, located in the prestigious V&A Waterfront.',
      tagline: 'Where Luxury Meets the Ocean',
      subtitle: 'Premium Coastal Living',
      developmentType: 'residential' as const,
      status: 'selling' as const,
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'V&A Waterfront',
      address: 'Marina Village, V&A Waterfront',
      latitude: '-33.9069',
      longitude: '18.4182',
      totalUnits: 60,
      availableUnits: 12,
      priceFrom: 8500000,
      priceTo: 25000000,
      amenities: ['marina-access', 'gym', 'spa', '24hr-concierge', 'security', 'parking'],
      features: ['ocean-views', 'smart-home', 'climate-control', 'backup-power'],
      highlights: ['Uninterrupted Ocean Views', 'Private Marina Access', 'World-Class Dining'],
      unitTypes: [
        {
          name: 'Marina View Apartment',
          bedrooms: 2,
          bathrooms: '2.0',
          priceFrom: '8500000.00',
          unitSize: 120,
          totalUnits: 30,
          availableUnits: 6,
          unitType: 'apartment' as const,
        },
        {
          name: 'Penthouse Suite',
          bedrooms: 3,
          bathrooms: '3.5',
          priceFrom: '25000000.00',
          unitSize: 280,
          totalUnits: 30,
          availableUnits: 6,
          unitType: 'penthouse' as const,
          features: ['private-roof-terrace', 'jacuzzi', 'outdoor-kitchen', '360-views'],
        },
      ],
    },
  ],
  'urban-capital': [
    {
      name: 'Braamfontein Student Hub',
      slug: 'braamfontein-student-hub',
      description:
        "Modern student accommodation within walking distance of Wits University and University of Johannesburg, designed for today's students.",
      tagline: 'Live Smart, Study Better',
      subtitle: 'Premium Student Living',
      developmentType: 'residential' as const,
      status: 'selling' as const,
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Braamfontein',
      address: '71 Jorissen Street, Braamfontein',
      latitude: '-26.1934',
      longitude: '28.0345',
      totalUnits: 150,
      availableUnits: 30,
      priceFrom: 680000,
      priceTo: 1200000,
      amenities: ['study-lounges', 'gym', 'wifi', 'laundry', 'security', 'parking'],
      features: ['furnished-rooms', 'high-speed-internet', 'security-app', 'smart-lockers'],
      highlights: ['2 Minutes to Wits Campus', 'High Rental Yield', 'Fully Furnished'],
      unitTypes: [
        {
          name: 'Studio Unit',
          bedrooms: 0,
          bathrooms: '1.0',
          priceFrom: '680000.00',
          unitSize: 25,
          totalUnits: 90,
          availableUnits: 18,
          unitType: 'studio' as const,
        },
        {
          name: 'Two Bedroom Sharing',
          bedrooms: 2,
          bathrooms: '1.0',
          priceFrom: '1200000.00',
          unitSize: 45,
          totalUnits: 60,
          availableUnits: 12,
          unitType: '2bed' as const,
        },
      ],
    },
  ],
  'coastal-lifestyle': [
    {
      name: 'Jeffreys Bay Beach Club',
      slug: 'jeffreys-bay-beach-club',
      description:
        'Stunning beachfront development offering the perfect blend of holiday relaxation and investment potential in the surfing capital of South Africa.',
      tagline: 'Your Coastal Paradise Awaits',
      subtitle: 'Beachfront Living at its Best',
      developmentType: 'residential' as const,
      status: 'selling' as const,
      city: 'Jeffreys Bay',
      province: 'Eastern Cape',
      suburb: 'Jeffreys Bay',
      address: 'Da Gama Road, Jeffreys Bay',
      latitude: '-34.0342',
      longitude: '24.9185',
      totalUnits: 80,
      availableUnits: 25,
      priceFrom: 1250000,
      priceTo: 3800000,
      amenities: ['beach-access', 'pool', 'braai-areas', 'security', 'parking'],
      features: ['sea-views', 'outdoor-showers', 'surf-storage', 'private-gardens'],
      highlights: ['Direct Beach Access', 'World-Class Surfing', 'High Rental Potential'],
      unitTypes: [
        {
          name: 'Beach Studio',
          bedrooms: 0,
          bathrooms: '1.0',
          priceFrom: '1250000.00',
          unitSize: 35,
          totalUnits: 30,
          availableUnits: 10,
          unitType: 'studio' as const,
        },
        {
          name: 'Ocean View 2 Bedroom',
          bedrooms: 2,
          bathrooms: '2.0',
          priceFrom: '2800000.00',
          unitSize: 85,
          totalUnits: 35,
          availableUnits: 10,
          unitType: '2bed' as const,
        },
        {
          name: 'Luxury Beach House',
          bedrooms: 3,
          bathrooms: '2.5',
          priceFrom: '3800000.00',
          unitSize: 150,
          totalUnits: 15,
          availableUnits: 5,
          unitType: 'house' as const,
          features: ['private-pool', 'sea-view-deck', 'outdoor-kitchen', 'double-garage'],
        },
      ],
    },
  ],
};

async function seedPlatformBrands() {
  console.log('🌱 Starting platform brand seeding...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing from environment');
    process.exit(1);
  }

  try {
    // First clean up existing platform brands
    console.log('🧹 Cleaning up existing platform brands...');
    await platformBrandSeedingService.cleanupPlatformBrands();

    // Seed each platform brand and its developments
    for (const brandData of platformBrands) {
      console.log(`\n🏢 Seeding brand: ${brandData.brandName}`);

      // Create the brand
      const brandId = await platformBrandSeedingService.seedPlatformBrand(brandData);

      // Get developments for this brand
      const developments = developmentsByBrand[brandData.slug as keyof typeof developmentsByBrand];
      if (developments) {
        console.log(
          `🏗️  Seeding ${developments.length} developments for ${brandData.brandName}...`,
        );
        await platformBrandSeedingService.seedDevelopmentsForBrand(brandId, developments);
      }
    }

    console.log('\n✅ Platform brand seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created ${platformBrands.length} platform-owned brands`);
    console.log(
      '- Total developments created: ' + Object.values(developmentsByBrand).flat().length,
    );
    console.log('- These brands are now available for emulator mode');
  } catch (error) {
    console.error('❌ Error seeding platform brands:', error);
    process.exit(1);
  }
}

// Run the seeding
if (require.main === module) {
  seedPlatformBrands();
}

export { seedPlatformBrands };
