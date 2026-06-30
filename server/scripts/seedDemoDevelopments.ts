import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, inArray, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  developers,
  developerBrandProfiles,
  developments,
  unitTypes,
  users,
  listings,
  listingMedia,
  properties,
  propertyImages,
} from '../../drizzle/schema';
import { assertLocalSeedSafety } from './localDemoSeed';

const DEMO_DEVELOPER_SLUG = 'local-demo-developer-seed';
const DEMO_BRAND_SLUG = 'local-demo-brand-seed';

const DEMO_SLUG_PREFIX = 'local-demo-';

interface DevelopmentSeed {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  developmentType: 'residential' | 'commercial' | 'mixed_use' | 'land';
  status: 'launching-soon' | 'selling' | 'sold-out';
  legacyStatus:
    | 'planning'
    | 'under_construction'
    | 'completed'
    | 'coming_soon'
    | 'now-selling'
    | 'launching-soon'
    | 'ready-to-move'
    | 'sold-out'
    | 'phase-completed'
    | 'new-phase-launching'
    | 'pre_launch'
    | 'ready';
  constructionPhase: 'planning' | 'under_construction' | 'completed' | 'phase_completed';
  city: string;
  suburb: string;
  province: string;
  latitude: string;
  longitude: string;
  address: string;
  priceFrom: number;
  priceTo: number;
  totalUnits: number;
  availableUnits: number;
  amenities: string[];
  features: string[];
  highlights: string[];
  developerName: string;
  isFeatured: boolean;
  isHotSelling: boolean;
  hasLowStock: boolean;
  unitTypes: Array<{
    name: string;
    bedrooms: number;
    bathrooms: string;
    unitSize: number;
    basePriceFrom: string;
    basePriceTo: string;
    totalUnits: number;
    availableUnits: number;
    structuralType:
      | 'studio'
      | 'apartment'
      | 'simplex'
      | 'duplex'
      | 'townhouse'
      | 'penthouse'
      | 'freestanding-house'
      | 'plot-and-plan';
  }>;
}

const SEED_DEVELOPMENTS: DevelopmentSeed[] = [
  // =========================================================================
  // GAUTENG
  // =========================================================================
  {
    name: 'Sandton Ridge Residences',
    slug: 'local-demo-sandton-ridge-residences',
    description:
      'Experience luxury living at Sandton Ridge Residences, an exclusive development of premium apartments in the heart of Sandton, Johannesburg. Each residence features floor-to-ceiling windows, European-style finishes, and private balconies with panoramic city views. The development offers world-class amenities including a rooftop infinity pool, fully equipped gym, concierge services, and 24-hour security. Perfectly positioned near Sandton City, the Gautrain station, and major business hubs.',
    tagline: 'Luxury living redefined in the heart of Sandton',
    developmentType: 'residential',
    status: 'selling',
    legacyStatus: 'now-selling',
    constructionPhase: 'completed',
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
    latitude: '-26.1076',
    longitude: '28.0567',
    address: '15 Rivonia Road, Sandton, Johannesburg',
    priceFrom: 1850000,
    priceTo: 6500000,
    totalUnits: 96,
    availableUnits: 34,
    amenities: [
      'Rooftop infinity pool',
      'Fully equipped gym',
      '24-hour concierge',
      'Undercover parking',
      'Backup generator',
      'Fibre-ready',
      'Landscaped gardens',
      'Braai area',
      'Children play area',
      'Security patrol',
    ],
    features: [
      '24hr Security',
      'Backup Power',
      'Fiber Ready',
      'Smart Home Ready',
      'Underfloor Heating',
    ],
    highlights: ['Rooftop Infinity Pool', 'Panoramic City Views', 'Concierge Service', 'Gautrain Nearby'],
    developerName: 'Sandron Property Group',
    isFeatured: true,
    isHotSelling: true,
    hasLowStock: false,
    unitTypes: [
      {
        name: 'Studio Apartment',
        bedrooms: 0,
        bathrooms: '1.0',
        unitSize: 35,
        basePriceFrom: '1850000.00',
        basePriceTo: '1950000.00',
        totalUnits: 12,
        availableUnits: 4,
        structuralType: 'studio',
      },
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 50,
        basePriceFrom: '2200000.00',
        basePriceTo: '2500000.00',
        totalUnits: 24,
        availableUnits: 10,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 85,
        basePriceFrom: '3200000.00',
        basePriceTo: '3800000.00',
        totalUnits: 36,
        availableUnits: 14,
        structuralType: 'apartment',
      },
      {
        name: '3 Bedroom Penthouse',
        bedrooms: 3,
        bathrooms: '3.0',
        unitSize: 160,
        basePriceFrom: '5200000.00',
        basePriceTo: '6500000.00',
        totalUnits: 24,
        availableUnits: 6,
        structuralType: 'penthouse',
      },
    ],
  },
  {
    name: 'Midrand Urban Quarter',
    slug: 'local-demo-midrand-urban-quarter',
    description:
      'Midrand Urban Quarter is a vibrant mixed-use development designed for modern urban living. Featuring contemporary apartments above retail spaces, this development offers the ultimate convenience of live-work-play. Located adjacent to the Gautrain Midrand station, residents enjoy seamless connectivity to both Johannesburg and Pretoria. The development includes communal gardens, a rooftop social space, co-working facilities, and a dedicated pet-friendly park.',
    tagline: 'Live where the city meets the suburbs',
    developmentType: 'mixed_use',
    status: 'launching-soon',
    legacyStatus: 'under_construction',
    constructionPhase: 'under_construction',
    city: 'Johannesburg',
    suburb: 'Midrand',
    province: 'Gauteng',
    latitude: '-25.9977',
    longitude: '28.1272',
    address: '42 Old Pretoria Road, Midrand, Johannesburg',
    priceFrom: 899000,
    priceTo: 2800000,
    totalUnits: 180,
    availableUnits: 120,
    amenities: [
      'Rooftop social space',
      'Co-working facilities',
      'Pet-friendly park',
      'Retail precinct',
      'Gautrain proximity',
      'Secure parking',
      'Bicycle storage',
      'Laundry service',
      'Garden courtyard',
      'High-speed fibre',
    ],
    features: [
      'Mixed-use precinct',
      'Gautrain adjacent',
      'Pet Friendly',
      'Fiber Ready',
      'Retail on doorstep',
    ],
    highlights: ['Gautrain Station Access', 'Mixed-Use Lifestyle', 'Co-Working Spaces', 'Pet Friendly Park'],
    developerName: 'Urban Growth Developments',
    isFeatured: false,
    isHotSelling: false,
    hasLowStock: false,
    unitTypes: [
      {
        name: 'Studio Unit',
        bedrooms: 0,
        bathrooms: '1.0',
        unitSize: 30,
        basePriceFrom: '899000.00',
        basePriceTo: '950000.00',
        totalUnits: 40,
        availableUnits: 30,
        structuralType: 'studio',
      },
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 45,
        basePriceFrom: '1250000.00',
        basePriceTo: '1400000.00',
        totalUnits: 60,
        availableUnits: 45,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 75,
        basePriceFrom: '1850000.00',
        basePriceTo: '2100000.00',
        totalUnits: 50,
        availableUnits: 35,
        structuralType: 'apartment',
      },
      {
        name: '3 Bedroom Duplex',
        bedrooms: 3,
        bathrooms: '2.5',
        unitSize: 120,
        basePriceFrom: '2500000.00',
        basePriceTo: '2800000.00',
        totalUnits: 30,
        availableUnits: 10,
        structuralType: 'duplex',
      },
    ],
  },
  {
    name: 'Pretoria East Lifestyle Estate',
    slug: 'local-demo-pretoria-east-lifestyle-estate',
    description:
      'Pretoria East Lifestyle Estate offers beautifully designed townhouses in a secure, family-oriented estate setting. Each home features modern open-plan living, private gardens, and covered patios perfect for entertaining. The estate boasts a clubhouse with swimming pool, tennis courts, a children play area, and extensive greenbelts for walking and cycling. Located in the sought-after Pretoria East area close to top schools, shopping centres, and medical facilities.',
    tagline: 'Family-centric living in a secure estate setting',
    developmentType: 'residential',
    status: 'selling',
    legacyStatus: 'ready-to-move',
    constructionPhase: 'completed',
    city: 'Pretoria',
    suburb: 'Pretoria East',
    province: 'Gauteng',
    latitude: '-25.7716',
    longitude: '28.2950',
    address: '88 Solomon Mahlangu Drive, Pretoria East',
    priceFrom: 1350000,
    priceTo: 2200000,
    totalUnits: 72,
    availableUnits: 8,
    amenities: [
      'Clubhouse with pool',
      'Tennis court',
      'Children play area',
      'Walking trails',
      '24-hour security',
      'Access control',
      'Visitor parking',
      'Landscaped gardens',
      'Braai area',
      'Schools nearby',
    ],
    features: [
      'Secure Estate',
      'Clubhouse',
      'Walking Trails',
      '24hr Security',
      'Family Friendly',
    ],
    highlights: ['Top Schools Nearby', 'Clubhouse & Pool', 'Walking Trails', 'Family Estate'],
    developerName: 'Estate Living Developments',
    isFeatured: true,
    isHotSelling: true,
    hasLowStock: true,
    unitTypes: [
      {
        name: '2 Bedroom Townhouse',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 90,
        basePriceFrom: '1350000.00',
        basePriceTo: '1550000.00',
        totalUnits: 36,
        availableUnits: 4,
        structuralType: 'townhouse',
      },
      {
        name: '3 Bedroom Townhouse',
        bedrooms: 3,
        bathrooms: '2.5',
        unitSize: 130,
        basePriceFrom: '1750000.00',
        basePriceTo: '1950000.00',
        totalUnits: 24,
        availableUnits: 3,
        structuralType: 'townhouse',
      },
      {
        name: '4 Bedroom Townhouse',
        bedrooms: 4,
        bathrooms: '3.0',
        unitSize: 180,
        basePriceFrom: '2000000.00',
        basePriceTo: '2200000.00',
        totalUnits: 12,
        availableUnits: 1,
        structuralType: 'townhouse',
      },
    ],
  },
  {
    name: 'Fourways Eco Park',
    slug: 'local-demo-fourways-eco-park',
    description:
      'Fourways Eco Park is an innovative eco-conscious development featuring energy-efficient homes with solar power, rainwater harvesting, and sustainable building materials. This modern estate offers a harmonious blend of nature and contemporary living, with extensive green spaces, organic community gardens, and nature trails. Situated in the popular Fourways node with easy access to shopping centres, restaurants, and the N1 highway.',
    tagline: 'Sustainable modern living in the heart of Fourways',
    developmentType: 'residential',
    status: 'launching-soon',
    legacyStatus: 'launching-soon',
    constructionPhase: 'planning',
    city: 'Johannesburg',
    suburb: 'Fourways',
    province: 'Gauteng',
    latitude: '-26.0189',
    longitude: '28.0109',
    address: '55 William Nicol Drive, Fourways, Johannesburg',
    priceFrom: 1200000,
    priceTo: 3100000,
    totalUnits: 130,
    availableUnits: 130,
    amenities: [
      'Solar-powered homes',
      'Rainwater harvesting',
      'Organic community garden',
      'Nature trails',
      'Electric vehicle charging',
      'Bicycle network',
      'Sustainable materials',
      'Energy-efficient lighting',
      'Composting facility',
      'Green roof',
    ],
    features: [
      'Eco Friendly',
      'Solar Power',
      'Water Harvesting',
      'EV Charging',
      'Green Living',
    ],
    highlights: ['Solar Powered', 'Rainwater Harvesting', 'Organic Gardens', 'Carbon Neutral Design'],
    developerName: 'Green Living Developments SA',
    isFeatured: false,
    isHotSelling: false,
    hasLowStock: false,
    unitTypes: [
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 45,
        basePriceFrom: '1200000.00',
        basePriceTo: '1350000.00',
        totalUnits: 30,
        availableUnits: 30,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 70,
        basePriceFrom: '1650000.00',
        basePriceTo: '1900000.00',
        totalUnits: 45,
        availableUnits: 45,
        structuralType: 'apartment',
      },
      {
        name: '3 Bedroom Townhouse',
        bedrooms: 3,
        bathrooms: '2.0',
        unitSize: 120,
        basePriceFrom: '2300000.00',
        basePriceTo: '2600000.00',
        totalUnits: 35,
        availableUnits: 35,
        structuralType: 'townhouse',
      },
      {
        name: '4 Bedroom Freestanding',
        bedrooms: 4,
        bathrooms: '3.0',
        unitSize: 200,
        basePriceFrom: '2800000.00',
        basePriceTo: '3100000.00',
        totalUnits: 20,
        availableUnits: 20,
        structuralType: 'freestanding-house',
      },
    ],
  },
  // =========================================================================
  // WESTERN CAPE
  // =========================================================================
  {
    name: 'Cape Harbour Apartments',
    slug: 'local-demo-cape-harbour-apartments',
    description:
      'Cape Harbour Apartments offers unparalleled coastal living in the vibrant V&A Waterfront precinct. These luxury apartments boast spectacular views of Table Mountain and the working harbour, with floor-to-ceiling windows that frame the iconic scenery. Residents enjoy premium finishes, smart home automation, and access to a private residents lounge, gym, and pool deck. Steps from world-class dining, shopping, and the Cape Town International Convention Centre.',
    tagline: 'Coastal luxury in the heart of the Mother City',
    developmentType: 'residential',
    status: 'launching-soon',
    legacyStatus: 'launching-soon',
    constructionPhase: 'under_construction',
    city: 'Cape Town',
    suburb: 'V&A Waterfront',
    province: 'Western Cape',
    latitude: '-33.9036',
    longitude: '18.4214',
    address: '5 Dock Road, V&A Waterfront, Cape Town',
    priceFrom: 2250000,
    priceTo: 8500000,
    totalUnits: 84,
    availableUnits: 84,
    amenities: [
      'Private residents lounge',
      'Fitness centre',
      'Pool deck',
      'Smart home automation',
      'Concierge service',
      'Secure underground parking',
      'Bicycle storage',
      'Guest suite',
      'Wine cellar',
      '24-hour security',
    ],
    features: [
      'Waterfront Location',
      'Smart Home',
      'Concierge',
      'Mountain Views',
      'Undercover Parking',
    ],
    highlights: ['Table Mountain Views', 'V&A Waterfront', 'Smart Home Automation', 'Private Pool Deck'],
    developerName: 'Coastal Luxury Developments',
    isFeatured: true,
    isHotSelling: false,
    hasLowStock: false,
    unitTypes: [
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 55,
        basePriceFrom: '2250000.00',
        basePriceTo: '2800000.00',
        totalUnits: 20,
        availableUnits: 20,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 90,
        basePriceFrom: '3500000.00',
        basePriceTo: '4200000.00',
        totalUnits: 30,
        availableUnits: 30,
        structuralType: 'apartment',
      },
      {
        name: '3 Bedroom Apartment',
        bedrooms: 3,
        bathrooms: '2.5',
        unitSize: 140,
        basePriceFrom: '5200000.00',
        basePriceTo: '6000000.00',
        totalUnits: 24,
        availableUnits: 24,
        structuralType: 'apartment',
      },
      {
        name: 'Penthouse Suite',
        bedrooms: 4,
        bathrooms: '4.0',
        unitSize: 280,
        basePriceFrom: '7200000.00',
        basePriceTo: '8500000.00',
        totalUnits: 10,
        availableUnits: 10,
        structuralType: 'penthouse',
      },
    ],
  },
  {
    name: 'Stellenbosch Winelands Estate',
    slug: 'local-demo-stellenbosch-winelands-estate',
    description:
      'Set against the backdrop of the majestic Jonkershoek Mountains, Stellenbosch Winelands Estate is an exclusive residential development offering premium homes on generous plots. Each residence is architecturally designed to complement the natural beauty of the Cape Winelands, featuring wine-cellars, entertainment patios, and indigenous gardens. The estate includes a private wine tasting lounge, hiking trails, and a wellness centre. Minutes from Stellenbosch University and the towns finest wine farms and restaurants.',
    tagline: 'Premium estate living in the Cape Winelands',
    developmentType: 'residential',
    status: 'selling',
    legacyStatus: 'now-selling',
    constructionPhase: 'completed',
    city: 'Stellenbosch',
    suburb: 'Stellenbosch Central',
    province: 'Western Cape',
    latitude: '-33.9321',
    longitude: '18.8602',
    address: '20 Strand Road, Stellenbosch',
    priceFrom: 3500000,
    priceTo: 8500000,
    totalUnits: 48,
    availableUnits: 12,
    amenities: [
      'Private wine tasting lounge',
      'Hiking trails',
      'Wellness centre',
      'Estate security',
      'Indigenous gardens',
      'Mountain views',
      'Wine cellar in each home',
      'Entertainment patios',
      'Clubhouse',
      'Guest parking',
    ],
    features: [
      'Wine Estate Lifestyle',
      'Mountain Views',
      'Security Estate',
      'Wellness Centre',
      'Hiking Trails',
    ],
    highlights: ['Wine Tasting Lounge', 'Mountain Backdrop', 'Wellness Centre', 'Premium Finishes'],
    developerName: 'Winelands Property Group',
    isFeatured: true,
    isHotSelling: false,
    hasLowStock: false,
    unitTypes: [
      {
        name: '3 Bedroom Freestanding',
        bedrooms: 3,
        bathrooms: '3.0',
        unitSize: 220,
        basePriceFrom: '3500000.00',
        basePriceTo: '4500000.00',
        totalUnits: 20,
        availableUnits: 5,
        structuralType: 'freestanding-house',
      },
      {
        name: '4 Bedroom Freestanding',
        bedrooms: 4,
        bathrooms: '3.5',
        unitSize: 320,
        basePriceFrom: '5200000.00',
        basePriceTo: '6500000.00',
        totalUnits: 18,
        availableUnits: 5,
        structuralType: 'freestanding-house',
      },
      {
        name: '5 Bedroom Estate Home',
        bedrooms: 5,
        bathrooms: '4.0',
        unitSize: 450,
        basePriceFrom: '6800000.00',
        basePriceTo: '8500000.00',
        totalUnits: 10,
        availableUnits: 2,
        structuralType: 'freestanding-house',
      },
    ],
  },
  {
    name: 'Century City Urban Village',
    slug: 'local-demo-century-city-urban-village',
    description:
      'Century City Urban Village is a master-planned mixed-use development offering contemporary apartments within walking distance of Canal Walk shopping centre, the Century City Conference Centre, and the Intaka Island nature reserve. The development features a vibrant piazza with cafes and restaurants, a rooftop pool, co-working spaces, and direct access to the MyCiTi bus rapid transit system. Perfect for young professionals and families seeking urban convenience with green spaces.',
    tagline: 'Your complete urban lifestyle destination',
    developmentType: 'mixed_use',
    status: 'selling',
    legacyStatus: 'under_construction',
    constructionPhase: 'under_construction',
    city: 'Cape Town',
    suburb: 'Century City',
    province: 'Western Cape',
    latitude: '-33.8914',
    longitude: '18.5100',
    address: 'Canal Walk, Century City, Cape Town',
    priceFrom: 1750000,
    priceTo: 3800000,
    totalUnits: 156,
    availableUnits: 89,
    amenities: [
      'Rooftop pool',
      'Co-working spaces',
      'Piazza with cafes',
      'MyCiTi bus stop',
      'Intaka Island access',
      'Secure parking',
      'Bicycle storage',
      'Laundry service',
      '24-hour security',
      'Convenience store',
    ],
    features: [
      'Mixed-use precinct',
      'Canal Walk nearby',
      'MyCiTi access',
      'Rooftop Pool',
      'Secure Estate',
    ],
    highlights: ['Canal Walk Shopping', 'Rooftop Pool', 'MyCiTi Station', 'Intaka Island Nature Reserve'],
    developerName: 'Century Property Group',
    isFeatured: false,
    isHotSelling: false,
    hasLowStock: false,
    unitTypes: [
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 42,
        basePriceFrom: '1750000.00',
        basePriceTo: '1950000.00',
        totalUnits: 45,
        availableUnits: 28,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 72,
        basePriceFrom: '2350000.00',
        basePriceTo: '2800000.00',
        totalUnits: 60,
        availableUnits: 35,
        structuralType: 'apartment',
      },
      {
        name: '3 Bedroom Duplex',
        bedrooms: 3,
        bathrooms: '2.5',
        unitSize: 120,
        basePriceFrom: '3200000.00',
        basePriceTo: '3800000.00',
        totalUnits: 51,
        availableUnits: 26,
        structuralType: 'duplex',
      },
    ],
  },
  // =========================================================================
  // KWAZULU-NATAL
  // =========================================================================
  {
    name: 'Umhlanga Heights',
    slug: 'local-demo-umhlanga-heights',
    description:
      'Umhlanga Heights is a landmark residential development offering luxurious apartments with breathtaking Indian Ocean views. Each apartment features open-plan living with premium finishes, spacious balconies, and floor-to-ceiling windows that maximise the coastal light and sea breezes. The development includes a lagoon-style pool, gym, spa treatment room, and direct access to Umhlanga Main Beach via a private walkway. Situated in the heart of Umhlanga Rocks within walking distance of the famed lighthouse and Umhlanga Village restaurants.',
    tagline: 'Coastal luxury with ocean views in Umhlanga',
    developmentType: 'residential',
    status: 'selling',
    legacyStatus: 'now-selling',
    constructionPhase: 'completed',
    city: 'Umhlanga',
    suburb: 'Umhlanga Rocks',
    province: 'KwaZulu-Natal',
    latitude: '-29.7228',
    longitude: '31.0689',
    address: '12 Lighthouse Road, Umhlanga Rocks',
    priceFrom: 1650000,
    priceTo: 5200000,
    totalUnits: 78,
    availableUnits: 22,
    amenities: [
      'Lagoon-style pool',
      'Fitness centre',
      'Spa treatment room',
      'Private beach walkway',
      'Braai area',
      'Secure parking',
      'Concierge',
      'Landscaped gardens',
      'Backup water supply',
      '24-hour security',
    ],
    features: [
      'Ocean Views',
      'Beach Access',
      'Pool',
      'Spa',
      '24hr Security',
    ],
    highlights: ['Indian Ocean Views', 'Private Beach Access', 'Lagoon Pool', 'Umhlanga Village'],
    developerName: 'Coastal Heights Developments',
    isFeatured: true,
    isHotSelling: true,
    hasLowStock: false,
    unitTypes: [
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 48,
        basePriceFrom: '1650000.00',
        basePriceTo: '1950000.00',
        totalUnits: 18,
        availableUnits: 6,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 80,
        basePriceFrom: '2450000.00',
        basePriceTo: '2900000.00',
        totalUnits: 30,
        availableUnits: 10,
        structuralType: 'apartment',
      },
      {
        name: '3 Bedroom Apartment',
        bedrooms: 3,
        bathrooms: '2.5',
        unitSize: 135,
        basePriceFrom: '3600000.00',
        basePriceTo: '4200000.00',
        totalUnits: 20,
        availableUnits: 5,
        structuralType: 'apartment',
      },
      {
        name: 'Penthouse Ocean Suite',
        bedrooms: 4,
        bathrooms: '4.0',
        unitSize: 250,
        basePriceFrom: '4800000.00',
        basePriceTo: '5200000.00',
        totalUnits: 10,
        availableUnits: 1,
        structuralType: 'penthouse',
      },
    ],
  },
  {
    name: 'Ballito Bay Estate',
    slug: 'local-demo-ballito-bay-estate',
    description:
      'Ballito Bay Estate offers beautifully designed coastal townhouses in a secure estate setting, just moments from the pristine Ballito beaches. Each home is crafted for the coastal lifestyle with open-plan living, covered entertainment decks, and private gardens. The estate features a clubhouse, swimming pool, squash courts, and direct access to the Ballito promenade. Located in the heart of the Dolphin Coast with excellent schools, shopping, and medical facilities nearby.',
    tagline: 'Coastal village living on the Dolphin Coast',
    developmentType: 'residential',
    status: 'selling',
    legacyStatus: 'ready-to-move',
    constructionPhase: 'completed',
    city: 'Ballito',
    suburb: 'Ballito Central',
    province: 'KwaZulu-Natal',
    latitude: '-29.5396',
    longitude: '31.2098',
    address: '8 Ocean Drive, Ballito',
    priceFrom: 1850000,
    priceTo: 3500000,
    totalUnits: 60,
    availableUnits: 9,
    amenities: [
      'Clubhouse with pool',
      'Squash courts',
      'Beach access',
      'Entertainment deck',
      'Braai area',
      'Landscaped gardens',
      'Secure estate',
      'Visitor parking',
      'Schools nearby',
      'Shopping centre nearby',
    ],
    features: [
      'Beach Access',
      'Clubhouse',
      'Squash Courts',
      'Secure Estate',
      'Family Friendly',
    ],
    highlights: ['Ballito Beaches', 'Clubhouse & Pool', 'Squash Courts', 'Family Estate'],
    developerName: 'Dolphin Coast Properties',
    isFeatured: false,
    isHotSelling: false,
    hasLowStock: true,
    unitTypes: [
      {
        name: '2 Bedroom Townhouse',
        bedrooms: 2,
        bathrooms: '2.0',
        unitSize: 95,
        basePriceFrom: '1850000.00',
        basePriceTo: '2100000.00',
        totalUnits: 24,
        availableUnits: 4,
        structuralType: 'townhouse',
      },
      {
        name: '3 Bedroom Townhouse',
        bedrooms: 3,
        bathrooms: '2.5',
        unitSize: 145,
        basePriceFrom: '2400000.00',
        basePriceTo: '2800000.00',
        totalUnits: 24,
        availableUnits: 4,
        structuralType: 'townhouse',
      },
      {
        name: '4 Bedroom Townhouse',
        bedrooms: 4,
        bathrooms: '3.0',
        unitSize: 200,
        basePriceFrom: '3100000.00',
        basePriceTo: '3500000.00',
        totalUnits: 12,
        availableUnits: 1,
        structuralType: 'townhouse',
      },
    ],
  },
  {
    name: 'La Mercy Beach Village',
    slug: 'local-demo-la-mercy-beach-village',
    description:
      'La Mercy Beach Village is an affordable coastal residential development offering contemporary homes near the new King Shaka International Airport. This family-friendly development features a mix of apartments and townhouses with modern finishes, solar-ready roofs, and secure estate living. The development is ideally located close to the La Mercy Beach, uShaka Marine World, and the growing Umhlanga/La Mercy commercial node. Perfect for first-time buyers and young families seeking coastal living at an accessible price point.',
    tagline: 'Affordable coastal living near King Shaka Airport',
    developmentType: 'residential',
    status: 'launching-soon',
    legacyStatus: 'launching-soon',
    constructionPhase: 'under_construction',
    city: 'La Mercy',
    suburb: 'La Mercy Beach',
    province: 'KwaZulu-Natal',
    latitude: '-29.6200',
    longitude: '31.1150',
    address: '45 Beach Road, La Mercy',
    priceFrom: 950000,
    priceTo: 1800000,
    totalUnits: 110,
    availableUnits: 110,
    amenities: [
      'Clubhouse',
      'Swimming pool',
      'Children play area',
      'Braa area',
      'Estate security',
      'Solar-ready roofs',
      'Visitor parking',
      'Beach access',
      'Airport proximity',
      'Shopping centre nearby',
    ],
    features: [
      'Affordable Pricing',
      'Beach Access',
      'Solar Ready',
      'First-time Buyer',
      'Airport Proximity',
    ],
    highlights: ['Near King Shaka Airport', 'Beach Access', 'First-Time Buyer Friendly', 'Solar Ready'],
    developerName: 'Accessible Homes SA',
    isFeatured: false,
    isHotSelling: false,
    hasLowStock: false,
    unitTypes: [
      {
        name: 'Studio Apartment',
        bedrooms: 0,
        bathrooms: '1.0',
        unitSize: 28,
        basePriceFrom: '950000.00',
        basePriceTo: '1050000.00',
        totalUnits: 25,
        availableUnits: 25,
        structuralType: 'studio',
      },
      {
        name: '1 Bedroom Apartment',
        bedrooms: 1,
        bathrooms: '1.0',
        unitSize: 40,
        basePriceFrom: '1150000.00',
        basePriceTo: '1250000.00',
        totalUnits: 35,
        availableUnits: 35,
        structuralType: 'apartment',
      },
      {
        name: '2 Bedroom Townhouse',
        bedrooms: 2,
        bathrooms: '1.5',
        unitSize: 70,
        basePriceFrom: '1450000.00',
        basePriceTo: '1600000.00',
        totalUnits: 30,
        availableUnits: 30,
        structuralType: 'townhouse',
      },
      {
        name: '3 Bedroom Townhouse',
        bedrooms: 3,
        bathrooms: '2.0',
        unitSize: 105,
        basePriceFrom: '1650000.00',
        basePriceTo: '1800000.00',
        totalUnits: 20,
        availableUnits: 20,
        structuralType: 'townhouse',
      },
    ],
  },
];

interface ListingSeed {
  title: string;
  slug: string;
  description: string;
  action: 'sell' | 'rent' | 'auction';
  propertyType: 'apartment' | 'house' | 'farm' | 'land' | 'commercial' | 'shared_living';
  askingPrice: string;
  monthlyRent: string;
  city: string;
  suburb: string;
  province: string;
  latitude: string;
  longitude: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  unitSizeM2: number;
  erfSizeM2: number;
  amenities: string[];
  propertyDetails?: Record<string, unknown>;
  isFeatured: boolean;
  imageKey: string;
}

const SEED_LISTINGS: ListingSeed[] = [
  // GAUTENG - Sell listings
  {
    title: 'Modern 2-Bed Apartment in Sandton CBD',
    slug: 'local-demo-modern-2bed-sandton',
    description: 'Stunning modern apartment in the heart of Sandton with direct access to Sandton City mall and the Gautrain station. Features include an open-plan kitchen with Caesarstone countertops, built-in appliances, a spacious living area flowing onto a balcony, and a main bedroom with en-suite bathroom. The complex offers 24-hour security, a swimming pool, and gym facilities.',
    action: 'sell',
    propertyType: 'apartment',
    askingPrice: '2450000.00',
    monthlyRent: '0.00',
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
    latitude: '-26.1076',
    longitude: '28.0567',
    address: '45 Rivonia Road, Sandton, Johannesburg',
    bedrooms: 2,
    bathrooms: 2,
    unitSizeM2: 82,
    erfSizeM2: 0,
    amenities: ['Swimming pool', 'Gym', '24hr Security', 'Undercover parking', 'Fibre ready'],
    propertyDetails: {
      levies: 2100,
      leviesHoaOperatingCosts: 2100,
      ratesAndTaxes: 980,
      ratesTaxes: 980,
      electricitySupply: 'prepaid',
      prepaidElectricity: true,
      waterSupply: 'municipal',
      parkingType: 'covered',
      parkingCount: 1,
      parkingBays: 1,
      ownershipType: 'sectional_title',
      internetAccess: 'fibre',
      fibreReady: true,
      security: '24hr_security',
      securityLevel: '24hr_security',
      securityFeatures: ['Access Control', 'CCTV', 'Security Gate'],
      petFriendly: false,
      flooring: 'tiled',
      flooringType: 'tiled',
      additionalRooms: ['Balcony', 'Open-plan kitchen'],
      amenitiesFeatures: ['Swimming pool', 'Gym', 'Undercover parking', 'Fibre ready'],
      propertyHighlights: ['Close to Gautrain', 'Prepaid electricity', 'Fibre ready'],
    },
    isFeatured: true,
    imageKey: 'sandton',
  },
  {
    title: 'Spacious Family Home in Morningside',
    slug: 'local-demo-family-home-morningside',
    description: 'Beautifully maintained family home in prestigious Morningside offering 4 bedrooms, a dedicated study, and a flatlet ideal for guests or domestic staff. The property features a large garden with sparkling pool, covered patio with braai area, and a triple garage. Modern finishes throughout include an imported Italian kitchen, gas fireplace, and solar backup system.',
    action: 'sell',
    propertyType: 'house',
    askingPrice: '5800000.00',
    monthlyRent: '0.00',
    city: 'Johannesburg',
    suburb: 'Morningside',
    province: 'Gauteng',
    latitude: '-26.0994',
    longitude: '28.0583',
    address: '12 Ballyclare Drive, Morningside, Sandton',
    bedrooms: 4,
    bathrooms: 3,
    unitSizeM2: 350,
    erfSizeM2: 1200,
    amenities: ['Pool', 'Solar backup', 'Staff quarters', 'Triple garage', 'Garden', 'Braai area'],
    propertyDetails: {
      ratesAndTaxes: 1850,
      ratesTaxes: 1850,
      electricitySupply: 'municipal_billing',
      waterSupply: 'municipal',
      powerBackup: 'solar',
      parkingType: 'garage',
      parkingCount: 3,
      parkingBays: 3,
      ownershipType: 'freehold',
      internetAccess: 'fibre',
      fibreReady: true,
      security: 'alarm',
      securityLevel: 'alarm',
      securityFeatures: ['Alarm', 'Electric Fence', 'Automated Gate'],
      petFriendly: true,
      flooring: 'tiled',
      flooringType: 'tiled',
      additionalRooms: ['Scullery', 'Study', 'Covered patio', 'Staff quarters'],
      amenitiesFeatures: ['Pool', 'Solar backup', 'Triple garage', 'Garden'],
      propertyHighlights: ['Large erf', 'Pet friendly', 'Solar backup'],
    },
    isFeatured: true,
    imageKey: 'sandton',
  },
  {
    title: 'Luxury Penthouse with Panoramic Views',
    slug: 'local-demo-penthouse-sandton',
    description: 'Exclusive penthouse on the 22nd floor with 360-degree views of the Sandton skyline and Magaliesberg mountains. Three spacious bedrooms all en-suite, a private study, and an entertainers lounge with a bar. The kitchen features Gaggenau appliances, marble finishes, and a scullery. Two undercover parking bays and a private storage locker included.',
    action: 'sell',
    propertyType: 'apartment',
    askingPrice: '7800000.00',
    monthlyRent: '0.00',
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
    latitude: '-26.1052',
    longitude: '28.0531',
    address: '101 West Street, Sandton, Johannesburg',
    bedrooms: 3,
    bathrooms: 3,
    unitSizeM2: 220,
    erfSizeM2: 0,
    amenities: ['Concierge', 'Wine cellar', 'Private gym', 'Pool', '24hr Security', 'Backup power'],
    isFeatured: false,
    imageKey: 'sandton',
  },
  {
    title: 'Affordable Starter Apartment in Midrand',
    slug: 'local-demo-starter-midrand',
    description: 'Perfect first home or investment property in a well-maintained complex near the Gautrain Midrand station. This one-bedroom apartment offers a tiled open-plan living and kitchen area, a full bathroom, and a covered balcony. Complex features include a communal pool, braai area, and secure parking.',
    action: 'sell',
    propertyType: 'apartment',
    askingPrice: '899000.00',
    monthlyRent: '0.00',
    city: 'Johannesburg',
    suburb: 'Midrand',
    province: 'Gauteng',
    latitude: '-25.9977',
    longitude: '28.1272',
    address: '8 New Road, Midrand, Johannesburg',
    bedrooms: 1,
    bathrooms: 1,
    unitSizeM2: 42,
    erfSizeM2: 0,
    amenities: ['Swimming pool', 'Secure parking', 'Braai area', 'Gautrain nearby'],
    isFeatured: false,
    imageKey: 'midrand',
  },
  {
    title: 'Charming 3-Bed Townhouse in Fourways',
    slug: 'local-demo-townhouse-fourways',
    description: 'Well-priced townhouse in quiet security complex in sought-after Fourways. Open-plan living with modern kitchen, private garden, and covered patio. Main bedroom is en-suite with built-in cupboards. Close to Fourways Mall, excellent schools, and main routes. Pets allowed by approval.',
    action: 'sell',
    propertyType: 'house',
    askingPrice: '1650000.00',
    monthlyRent: '0.00',
    city: 'Johannesburg',
    suburb: 'Fourways',
    province: 'Gauteng',
    latitude: '-26.0189',
    longitude: '28.0109',
    address: '23 Cedar Road, Fourways, Johannesburg',
    bedrooms: 3,
    bathrooms: 2,
    unitSizeM2: 130,
    erfSizeM2: 250,
    amenities: ['Pet friendly', 'Garden', 'Secure complex', 'Pool', 'Visitor parking'],
    propertyDetails: {
      propertySubType: 'townhouse',
      structuralType: 'townhouse',
      levies: 1450,
      leviesHoaOperatingCosts: 1450,
      ratesAndTaxes: 1250,
      ratesTaxes: 1250,
      electricitySupply: 'prepaid',
      prepaidElectricity: true,
      waterSupply: 'municipal',
      parkingType: 'garage',
      parkingCount: 1,
      parkingBays: 1,
      ownershipType: 'sectional_title',
      internetAccess: 'fibre',
      fibreReady: true,
      security: 'estate_security',
      securityLevel: 'estate_security',
      securityFeatures: ['Access Control', 'Perimeter Wall'],
      petFriendly: true,
      flooring: 'tiled',
      flooringType: 'tiled',
      additionalRooms: ['Private garden', 'Patio'],
      amenitiesFeatures: ['Pet friendly', 'Garden', 'Secure complex', 'Pool'],
      propertyHighlights: ['Secure complex', 'Private garden', 'Pet friendly'],
    },
    isFeatured: false,
    imageKey: 'fourways',
  },
  // WESTERN CAPE - Sell & Rent
  {
    title: 'Seaside Apartment in Sea Point',
    slug: 'local-demo-seaside-sea-point',
    description: 'Beautifully renovated two-bedroom apartment with stunning sea views in prestigious Sea Point. The apartment features a modern open-plan kitchen with SMEG appliances, a spacious lounge with stacker doors opening to a balcony overlooking the ocean. Includes one undercover parking bay and a communal pool. Walking distance to the Sea Point promenade and restaurants.',
    action: 'sell',
    propertyType: 'apartment',
    askingPrice: '3750000.00',
    monthlyRent: '0.00',
    city: 'Cape Town',
    suburb: 'Sea Point',
    province: 'Western Cape',
    latitude: '-33.9167',
    longitude: '18.3833',
    address: '15 Beach Road, Sea Point, Cape Town',
    bedrooms: 2,
    bathrooms: 2,
    unitSizeM2: 90,
    erfSizeM2: 0,
    amenities: ['Sea views', 'Pool', 'Undercover parking', 'Walk-in closet', 'Balcony'],
    isFeatured: true,
    imageKey: 'cape_town',
  },
  {
    title: 'Luxury Home in Constantia Valley',
    slug: 'local-demo-luxury-constantia',
    description: 'Magnificent Cape Dutch-style home nestled in the prestigious Constantia Valley wine region. This 5-bedroom residence boasts a grand entrance hall, formal lounge, dining room, and a gourmet kitchen. The master wing includes a dressing room, en-suite bathroom, and private terrace. Extensive gardens feature a heated pool, tennis court, and sweeping mountain views.',
    action: 'sell',
    propertyType: 'house',
    askingPrice: '12500000.00',
    monthlyRent: '0.00',
    city: 'Cape Town',
    suburb: 'Constantia',
    province: 'Western Cape',
    latitude: '-34.0425',
    longitude: '18.4170',
    address: '42 Constantia Main Road, Constantia, Cape Town',
    bedrooms: 5,
    bathrooms: 5,
    unitSizeM2: 600,
    erfSizeM2: 3500,
    amenities: ['Heated pool', 'Tennis court', 'Wine cellar', 'Staff quarters', 'Mountain views', 'Irrigation'],
    isFeatured: true,
    imageKey: 'stellenbosch',
  },
  {
    title: 'Prime Retail Space in Century City',
    slug: 'local-demo-retail-century-city',
    description: 'Exceptional retail opportunity in the high-traffic Century City precinct. This 150sqm ground-floor space features a glass frontage, open-plan layout, storeroom, and private ablutions. Located directly opposite Canal Walk with high visibility. Suitable for retail, restaurant, or office use.',
    action: 'rent',
    propertyType: 'commercial',
    askingPrice: '0.00',
    monthlyRent: '45000.00',
    city: 'Cape Town',
    suburb: 'Century City',
    province: 'Western Cape',
    latitude: '-33.8914',
    longitude: '18.5100',
    address: 'Canal Walk Shopping Centre, Century City, Cape Town',
    bedrooms: 0,
    bathrooms: 1,
    unitSizeM2: 150,
    erfSizeM2: 0,
    amenities: ['High visibility', 'Air conditioning', 'Security', 'Loading bay', 'Ample parking'],
    isFeatured: false,
    imageKey: 'century_city',
  },
  {
    title: 'Trendy Studio in Cape Town City Bowl',
    slug: 'local-demo-studio-city-bowl',
    description: 'Chic studio apartment in a trendy building in the Cape Town City Bowl. Perfect for a young professional or student with proximity to the V&A Waterfront, Company Gardens, and Kloof Street restaurants. The unit comes fully furnished with a mezzanine sleeping area, modern bathroom, and compact kitchenette.',
    action: 'rent',
    propertyType: 'apartment',
    askingPrice: '0.00',
    monthlyRent: '9500.00',
    city: 'Cape Town',
    suburb: 'City Bowl',
    province: 'Western Cape',
    latitude: '-33.9234',
    longitude: '18.4231',
    address: '7 Kloof Street, Gardens, Cape Town',
    bedrooms: 0,
    bathrooms: 1,
    unitSizeM2: 32,
    erfSizeM2: 0,
    amenities: ['Furnished', 'City views', 'Security building', 'Walking distance to V&A', 'Fibre'],
    isFeatured: false,
    imageKey: 'cape_town',
  },
  // KWAZULU-NATAL
  {
    title: 'Beachfront Apartment in Umhlanga',
    slug: 'local-demo-beachfront-umhlanga',
    description: 'Stunning beachfront apartment with direct access to Umhlanga Main Beach. Features two spacious bedrooms with sea views, a modern open-plan kitchen and living area, and a large balcony perfect for sundowners. The complex offers a communal pool, braai area, and dedicated parking. Walking distance to the Umhlanga Village restaurants and the iconic lighthouse.',
    action: 'sell',
    propertyType: 'apartment',
    askingPrice: '3250000.00',
    monthlyRent: '0.00',
    city: 'Umhlanga',
    suburb: 'Umhlanga Rocks',
    province: 'KwaZulu-Natal',
    latitude: '-29.7228',
    longitude: '31.0689',
    address: '8 Lagoon Drive, Umhlanga Rocks',
    bedrooms: 2,
    bathrooms: 2,
    unitSizeM2: 95,
    erfSizeM2: 0,
    amenities: ['Beach access', 'Pool', 'Braai area', 'Sea views', 'Undercover parking'],
    isFeatured: true,
    imageKey: 'umhlanga',
  },
  {
    title: 'Family Home in Ballito Estate',
    slug: 'local-demo-family-ballito',
    description: 'Beautiful family home in a sought-after Ballito security estate. The home features 4 bedrooms, a large open-plan kitchen and family room, separate formal lounge and dining room. Sliding doors open to a covered patio, private garden, and pool. The estate offers a clubhouse, tennis courts, and 24-hour security.',
    action: 'sell',
    propertyType: 'house',
    askingPrice: '4200000.00',
    monthlyRent: '0.00',
    city: 'Ballito',
    suburb: 'Ballito Central',
    province: 'KwaZulu-Natal',
    latitude: '-29.5396',
    longitude: '31.2098',
    address: '25 Dolphin Crescent, Ballito',
    bedrooms: 4,
    bathrooms: 3,
    unitSizeM2: 280,
    erfSizeM2: 600,
    amenities: ['Clubhouse', 'Pool', 'Tennis court', 'Garden', 'Solar backup', 'Staff quarters'],
    isFeatured: true,
    imageKey: 'ballito',
  },
  {
    title: 'Holiday Rental - La Mercy Beach Cottage',
    slug: 'local-demo-holiday-la-mercy',
    description: 'Charming beach cottage perfect for holidays or as a weekend getaway. Two bedrooms, one bathroom, open-plan kitchen and living area with original hardwood floors. Large wraparound veranda with outdoor dining. Walking distance to the beach and close to King Shaka International Airport.',
    action: 'rent',
    propertyType: 'house',
    askingPrice: '0.00',
    monthlyRent: '12000.00',
    city: 'La Mercy',
    suburb: 'La Mercy Beach',
    province: 'KwaZulu-Natal',
    latitude: '-29.6200',
    longitude: '31.1150',
    address: '12 Beach Road, La Mercy',
    bedrooms: 2,
    bathrooms: 1,
    unitSizeM2: 85,
    erfSizeM2: 400,
    amenities: ['Beach access', 'Veranda', 'Garden', 'Pet friendly', 'Airport proximity'],
    isFeatured: false,
    imageKey: 'la_mercy',
  },
  // Auction listing
  {
    title: 'Prime Development Land - Sandton',
    slug: 'local-demo-land-sandton-auction',
    description: 'Rare opportunity to acquire prime development land in the heart of Sandton. This 2,500sqm vacant stand is zoned for mixed-use development with approved building plans for a 12-storey residential and retail building. All services are on site. To be sold via public auction.',
    action: 'auction',
    propertyType: 'land',
    askingPrice: '8500000.00',
    monthlyRent: '0.00',
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
    latitude: '-26.1064',
    longitude: '28.0519',
    address: '33 Katherine Street, Sandton, Johannesburg',
    bedrooms: 0,
    bathrooms: 0,
    unitSizeM2: 0,
    erfSizeM2: 2500,
    amenities: ['Mixed-use zoning', 'Approved plans', 'All services', 'Corner stand'],
    isFeatured: false,
    imageKey: 'sandton',
  },
];

const DEMO_DEVELOPER_IMAGES: Record<string, Array<{ url: string }>> = {
  sandton: [
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80' },
  ],
  midrand: [
    { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80' },
  ],
  pretoria: [
    { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80' },
  ],
  fourways: [
    { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80' },
  ],
  cape_town: [
    { url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80' },
  ],
  stellenbosch: [
    { url: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80' },
  ],
  century_city: [
    { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
  ],
  umhlanga: [
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80' },
  ],
  ballito: [
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80' },
  ],
  la_mercy: [
    { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80' },
    { url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80' },
  ],
};

const UNSPLASH_IMAGES: Record<string, string[]> = {
  sandton: [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80',
  ],
  midrand: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  ],
  pretoria: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  ],
  fourways: [
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80',
  ],
  cape_town: [
    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  ],
  stellenbosch: [
    'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  ],
  century_city: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  umhlanga: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
  ],
  ballito: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  ],
  la_mercy: [
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
  ],
};

function pickImages(key: string): string[] {
  return UNSPLASH_IMAGES[key] || UNSPLASH_IMAGES.sandton;
}

async function ensureDemoDeveloper(db: ReturnType<typeof drizzle>) {
  const existing = await db
    .select({ id: developers.id })
    .from(developers)
    .where(eq(developers.slug, DEMO_DEVELOPER_SLUG))
    .limit(1);

  if (existing.length > 0) {
    return Number(existing[0].id);
  }

  const adminUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'super_admin'))
    .limit(1);

  const adminId = adminUser.length > 0 ? Number(adminUser[0].id) : 1;

  const [result] = await db
    .insert(developers)
    .values({
      name: '[LOCAL DEMO] Seeded Developer',
      slug: DEMO_DEVELOPER_SLUG,
      description: 'Local demo only. Do not use, export, sync, or deploy this record to production.',
      email: 'demo-developer@listify.local',
      phone: '+27000000000',
      city: 'Johannesburg',
      province: 'Gauteng',
      category: 'residential',
      isVerified: 1,
      userId: adminId,
      status: 'approved',
      approvedBy: adminId,
      approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      completedProjects: 0,
      currentProjects: 0,
      upcomingProjects: 0,
      establishedYear: 2024,
      isTrusted: 1,
    } as any);

  const id = Number((result as any).insertId);
  console.log(`  Created demo developer (id=${id})`);
  return id;
}

async function ensureDemoBrandProfile(
  db: ReturnType<typeof drizzle>,
  developerId: number,
  adminId: number,
) {
  const existing = await db
    .select({ id: developerBrandProfiles.id })
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.slug, DEMO_BRAND_SLUG))
    .limit(1);

  if (existing.length > 0) {
    return Number(existing[0].id);
  }

  const [result] = await db
    .insert(developerBrandProfiles)
    .values({
      brandName: '[LOCAL DEMO] Seeded Brand',
      slug: DEMO_BRAND_SLUG,
      about: 'Local demo only. Do not use, export, sync, or deploy this record to production.',
      headOfficeLocation: 'Johannesburg',
      operatingProvinces: JSON.stringify(['Gauteng', 'Western Cape', 'KwaZulu-Natal']),
      propertyFocus: JSON.stringify(['Residential', 'Mixed-use', 'Luxury']),
      websiteUrl: 'http://localhost:5173',
      publicContactEmail: 'demo-brand@listify.local',
      brandTier: 'regional',
      profileType: 'verified_partner',
      isSubscriber: 1,
      isClaimable: 0,
      isVisible: 1,
      isContactVerified: 1,
      ownerType: 'platform',
      createdBy: adminId,
      identityType: 'developer',
      seedBatchId: 'local-demo-developments',
      linkedDeveloperAccountId: developerId,
    } as any);

  const id = Number((result as any).insertId);
  console.log(`  Created demo brand profile (id=${id})`);
  return id;
}

const DEMO_IMAGE_KEYS: Record<string, string> = {
  'local-demo-sandton': 'sandton',
  'local-demo-midrand': 'midrand',
  'local-demo-pretoria': 'pretoria',
  'local-demo-fourways': 'fourways',
  'local-demo-cape': 'cape_town',
  'local-demo-stellenbosch': 'stellenbosch',
  'local-demo-century': 'century_city',
  'local-demo-umhlanga': 'umhlanga',
  'local-demo-ballito': 'ballito',
  'local-demo-la': 'la_mercy',
  'local-demo-modern': 'sandton',
  'local-demo-family': 'sandton',
  'local-demo-penthouse': 'sandton',
  'local-demo-starter': 'midrand',
  'local-demo-townhouse': 'fourways',
  'local-demo-seaside': 'cape_town',
  'local-demo-luxury': 'stellenbosch',
  'local-demo-retail': 'century_city',
  'local-demo-studio': 'cape_town',
  'local-demo-beachfront': 'umhlanga',
  'local-demo-holiday': 'la_mercy',
  'local-demo-prime': 'sandton',
};

function lookupImages(slug: string): { devImages: Array<{ url: string }>; listingImages: string[] } {
  const prefix = slug.split('-').slice(0, slug.startsWith('local-demo-') ? 3 : 1).join('-');
  const key = DEMO_IMAGE_KEYS[prefix] || 'sandton';
  return {
    devImages: DEMO_DEVELOPER_IMAGES[key] || DEMO_DEVELOPER_IMAGES.sandton,
    listingImages: UNSPLASH_IMAGES[key] || UNSPLASH_IMAGES.sandton,
  };
}

async function upsertDevelopment(
  db: ReturnType<typeof drizzle>,
  dev: DevelopmentSeed,
  developerId: number,
  brandProfileId: number,
): Promise<number> {
  const existing = await db
    .select({ id: developments.id })
    .from(developments)
    .where(eq(developments.slug, dev.slug))
    .limit(1);

  const { devImages } = lookupImages(dev.slug);

  const values = {
    developerId,
    name: `[LOCAL DEMO] ${dev.name}`,
    slug: dev.slug,
    description: dev.description,
    developmentType: dev.developmentType,
    status: dev.status,
    legacyStatus: dev.legacyStatus,
    constructionPhase: dev.constructionPhase,
    city: dev.city,
    suburb: dev.suburb,
    province: dev.province,
    latitude: dev.latitude,
    longitude: dev.longitude,
    address: dev.address,
    priceFrom: dev.priceFrom,
    priceTo: dev.priceTo,
    totalUnits: dev.totalUnits,
    availableUnits: dev.availableUnits,
    amenities: dev.amenities.join(', '),
    images: JSON.stringify(devImages),
    features: JSON.stringify(dev.features),
    highlights: JSON.stringify(dev.highlights),
    tagline: dev.tagline,
    isFeatured: dev.isFeatured ? 1 : 0,
    isHotSelling: dev.isHotSelling ? 1 : 0,
    isPublished: 1,
    publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    approvalStatus: 'approved' as const,
    readinessScore: dev.status === 'selling' ? 95 : dev.status === 'launching-soon' ? 60 : 100,
    developerBrandProfileId: brandProfileId,
    devOwnerType: 'platform' as const,
    propertyTypes: JSON.stringify(
      Array.from(new Set(dev.unitTypes.map((u) => u.structuralType))),
    ),
    nature: 'new' as const,
    transactionType: 'for_sale' as const,
  };

  if (existing.length > 0) {
    const id = Number(existing[0].id);
    await db.update(developments).set(values).where(eq(developments.id, id));
    console.log(`  Updated: ${dev.name} (id=${id})`);
    return id;
  }

  const [result] = await db.insert(developments).values(values as any);
  const id = Number((result as any).insertId);
  console.log(`  Created: ${dev.name} (id=${id})`);
  return id;
}

async function upsertUnitTypes(
  db: ReturnType<typeof drizzle>,
  developmentId: number,
  unitTypeDefs: DevelopmentSeed['unitTypes'],
) {
  await db
    .delete(unitTypes)
    .where(
      and(
        eq(unitTypes.developmentId, developmentId),
        eq(unitTypes.isActive, 1),
      ),
    );

  for (const ut of unitTypeDefs) {
    await db
      .insert(unitTypes)
      .values({
        id: nanoid(),
        developmentId,
        name: ut.name,
        bedrooms: ut.bedrooms,
        bathrooms: ut.bathrooms,
        unitSize: ut.unitSize,
        basePriceFrom: ut.basePriceFrom,
        basePriceTo: ut.basePriceTo,
        totalUnits: ut.totalUnits,
        availableUnits: ut.availableUnits,
        structuralType: ut.structuralType,
        isActive: 1,
        displayOrder: unitTypeDefs.indexOf(ut),
      });
  }
  console.log(`  Seeded ${unitTypeDefs.length} unit types for development ${developmentId}`);
}

async function deleteDemoDevelopments(db: ReturnType<typeof drizzle>) {
  const devSlugs = SEED_DEVELOPMENTS.map((d) => d.slug);
  const devIds = (
    await db
      .select({ id: developments.id })
      .from(developments)
      .where(inArray(developments.slug, devSlugs as string[]))
  )
    .map((r) => Number(r.id))
    .filter(Boolean);

  if (devIds.length > 0) {
    await db.delete(unitTypes).where(inArray(unitTypes.developmentId, devIds));
    await db.delete(developments).where(inArray(developments.id, devIds));
    console.log(`  Deleted ${devIds.length} demo developments`);
  }

  const listingSlugs = SEED_LISTINGS.map((l) => l.slug);
  const listingIds = (
    await db
      .select({ id: listings.id })
      .from(listings)
      .where(inArray(listings.slug, listingSlugs as string[]))
  )
    .map((r) => Number(r.id))
    .filter(Boolean);

  if (listingIds.length > 0) {
    await db.delete(listingMedia).where(inArray(listingMedia.listingId, listingIds));
    await db.delete(listings).where(inArray(listings.id, listingIds));
    console.log(`  Deleted ${listingIds.length} demo listings`);
  }

  await db
    .delete(developerBrandProfiles)
    .where(eq(developerBrandProfiles.slug, DEMO_BRAND_SLUG));
  await db
    .delete(developers)
    .where(eq(developers.slug, DEMO_DEVELOPER_SLUG));
  await db
    .delete(users)
    .where(eq(users.email, DEMO_LISTING_OWNER_EMAIL as any));
}

const DEMO_LISTING_OWNER_EMAIL = 'demo-owner@listify.local';

async function ensureDemoListingOwner(db: ReturnType<typeof drizzle>) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_LISTING_OWNER_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    return Number(existing[0].id);
  }

  const adminUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'super_admin'))
    .limit(1);

  const adminId = adminUser.length > 0 ? Number(adminUser[0].id) : 1;

  const [result] = await db
    .insert(users)
    .values({
      openId: `local-demo-${DEMO_LISTING_OWNER_EMAIL}`,
      email: DEMO_LISTING_OWNER_EMAIL,
      name: '[LOCAL DEMO] Demo Property Owner',
      firstName: 'Demo',
      lastName: 'Owner',
      phone: '+27000000001',
      loginMethod: 'email',
      emailVerified: 1,
      role: 'visitor',
      isSubaccount: 0,
      lastSignedIn: new Date().toISOString().slice(0, 19).replace('T', ' '),
      onboardingComplete: 1,
      onboardingStep: 0,
      subscriptionTier: 'professional',
      subscriptionStatus: 'active',
    } as any);

  const id = Number((result as any).insertId);
  console.log(`  Created demo listing owner (id=${id})`);
  return id;
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  apartment: 'apartment',
  house: 'house',
  villa: 'villa',
  plot: 'plot',
  commercial: 'commercial',
  townhouse: 'townhouse',
  cluster_home: 'cluster_home',
  farm: 'farm',
  shared_living: 'shared_living',
};

function buildListingPropertyDetails(listing: ListingSeed) {
  return {
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    unitSizeM2: listing.unitSizeM2,
    erfSizeM2: listing.erfSizeM2,
    amenities: listing.amenities,
    ...(listing.propertyDetails || {}),
  };
}

async function upsertListing(
  db: ReturnType<typeof drizzle>,
  listing: ListingSeed,
  ownerId: number,
): Promise<{ listingId: number; propertyId: number | null }> {
  const existing = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.slug, listing.slug as any))
    .limit(1);

  const priceValue = Number(listing.askingPrice) || Number(listing.monthlyRent) || 1000000;
  const formattedPrice = priceValue.toFixed(2);
  const detailData = buildListingPropertyDetails(listing);

  const propertyDetails = JSON.stringify(detailData);

  const values = {
    ownerId,
    action: listing.action,
    propertyType: listing.propertyType,
    title: `[LOCAL DEMO] ${listing.title}`,
    slug: listing.slug,
    description: listing.description,
    askingPrice: listing.action === 'sell' || listing.action === 'auction' ? formattedPrice : null,
    monthlyRent: listing.action === 'rent' ? formattedPrice : null,
    address: listing.address,
    latitude: listing.latitude,
    longitude: listing.longitude,
    city: listing.city,
    suburb: listing.suburb,
    province: listing.province,
    status: 'published',
    approvalStatus: 'approved',
    publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    featured: listing.isFeatured ? 1 : 0,
    readinessScore: 100,
    qualityScore: 85,
    autoPublished: 1,
    propertyDetails,
  };

  let listingId: number;

  if (existing.length > 0) {
    listingId = Number(existing[0].id);
    await db.update(listings).set(values as any).where(eq(listings.id, listingId));
    console.log(`  Updated listing: ${listing.title} (id=${listingId})`);
  } else {
    const [result] = await db.insert(listings).values(values as any);
    listingId = Number((result as any).insertId);
    console.log(`  Created listing: ${listing.title} (id=${listingId})`);
  }

  // Also upsert into properties table so home feed finds it
  const propertyId = await upsertProperty(db, listing, listingId, ownerId);

  return { listingId, propertyId };
}

async function upsertProperty(
  db: ReturnType<typeof drizzle>,
  listing: ListingSeed,
  sourceListingId: number,
  ownerId: number,
): Promise<number> {
  const priceValue = Number(listing.askingPrice) || Number(listing.monthlyRent) || 1000000;
  const areaValue = Math.floor(Number(listing.unitSizeM2) || Number(listing.erfSizeM2) || 100);
  const detailData = buildListingPropertyDetails(listing);

  const propertyType = PROPERTY_TYPE_MAP[listing.propertyType] || 'apartment';
  const listingType = listing.action === 'rent' ? 'rent' : listing.action === 'auction' ? 'auction' : 'sale';

  const existing = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.sourceListingId, sourceListingId))
    .limit(1);

  const propValues = {
    title: `[LOCAL DEMO] ${listing.title}`,
    description: listing.description,
    propertyType: propertyType as any,
    listingType: listingType as any,
    transactionType: listingType as any,
    price: priceValue,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    area: areaValue,
    address: listing.address,
    city: listing.city,
    province: listing.province,
    latitude: listing.latitude,
    longitude: listing.longitude,
    status: 'published' as any,
    featured: listing.isFeatured ? 1 : 0,
    views: 0,
    enquiries: 0,
    ownerId,
    sourceListingId,
    amenities: listing.amenities.join(', '),
    propertySettings: JSON.stringify(detailData),
    levies: Number(detailData.levies) || Number(detailData.leviesHoaOperatingCosts) || null,
    ratesAndTaxes: Number(detailData.ratesAndTaxes) || Number(detailData.ratesTaxes) || null,
  };

  if (existing.length > 0) {
    const id = Number(existing[0].id);
    await db.update(properties).set(propValues as any).where(eq(properties.id, id));
    return id;
  }

  const [result] = await db.insert(properties).values(propValues as any);
  const id = Number((result as any).insertId);
  console.log(`  Created property record: ${listing.title} (propertyId=${id})`);
  return id;
}

async function upsertListingMedia(
  db: ReturnType<typeof drizzle>,
  listingId: number,
  propertyId: number | null,
  imageKey: string,
) {
  const images = UNSPLASH_IMAGES[imageKey] || UNSPLASH_IMAGES.sandton;
  const existing = await db
    .select({ id: listingMedia.id })
    .from(listingMedia)
    .where(eq(listingMedia.listingId, listingId))
    .limit(1);

  if (existing.length > 0) return;

  for (let i = 0; i < images.length; i++) {
    await db
      .insert(listingMedia)
      .values({
        listingId,
        mediaType: 'image',
        originalUrl: images[i],
        displayOrder: i,
        isPrimary: i === 0 ? 1 : 0,
        processingStatus: 'completed',
      } as any);

    if (propertyId) {
      await db
        .insert(propertyImages)
        .values({
          propertyId,
          imageUrl: images[i],
          isPrimary: i === 0 ? 1 : 0,
          displayOrder: i,
        } as any);
    }
  }
}

async function seedDemoListings(db: ReturnType<typeof drizzle>) {
  console.log('\nSeeding demo property listings...\n');

  const ownerId = await ensureDemoListingOwner(db);

  for (const listing of SEED_LISTINGS) {
    const { listingId, propertyId } = await upsertListing(db, listing, ownerId);
    await upsertListingMedia(db, listingId, propertyId, listing.imageKey);
  }

  console.log(`\nSeeded ${SEED_LISTINGS.length} demo property listings successfully.`);
}

async function deleteDemoListings(db: ReturnType<typeof drizzle>) {
  const slugs = SEED_LISTINGS.map((l) => l.slug);
  const toDelete = (
    await db
      .select({ id: listings.id })
      .from(listings)
      .where(inArray(listings.slug, slugs as string[]))
  )
    .map((r) => Number(r.id))
    .filter(Boolean);

  if (toDelete.length > 0) {
    const propsToDelete = (
      await db
        .select({ id: properties.id })
        .from(properties)
        .where(inArray(properties.sourceListingId, toDelete))
    )
      .map((r) => Number(r.id))
      .filter(Boolean);
    if (propsToDelete.length > 0) {
      await db.delete(propertyImages).where(inArray(propertyImages.propertyId, propsToDelete));
      await db.delete(properties).where(inArray(properties.id, propsToDelete));
      console.log(`  Deleted ${propsToDelete.length} associated property records`);
    }
    await db.delete(listingMedia).where(inArray(listingMedia.listingId, toDelete));
    await db.delete(listings).where(inArray(listings.id, toDelete));
    console.log(`  Deleted ${toDelete.length} demo listings`);
  }

  await db
    .delete(users)
    .where(eq(users.email, DEMO_LISTING_OWNER_EMAIL as any));
}

async function main() {
  const args = process.argv.slice(2);
  const isReset = args.includes('--reset') || args.includes('reset');

  dotenv.config({
    path: path.resolve(process.cwd(), '.env.local'),
    override: false,
  });

  assertLocalSeedSafety(process.env, { target: 'local' });

  const parsed = new URL(process.env.DATABASE_URL!);
  const connection = await mysql.createConnection({
    uri: parsed.toString(),
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(connection, { mode: 'default' });

  try {
    if (isReset) {
      console.log('\nResetting demo developments...');
      await deleteDemoDevelopments(db);
      console.log('Demo developments reset complete.\n');
      return;
    }

    console.log('\nSeeding demo developments...\n');

    const developerId = await ensureDemoDeveloper(db);
    const adminUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);
    const adminId = adminUser.length > 0 ? Number(adminUser[0].id) : 1;
    const brandProfileId = await ensureDemoBrandProfile(db, developerId, adminId);

    for (const dev of SEED_DEVELOPMENTS) {
      const developmentId = await upsertDevelopment(db, dev, developerId, brandProfileId);
      await upsertUnitTypes(db, developmentId, dev.unitTypes);
    }

    await seedDemoListings(db);

    console.log(`\nSeeded ${SEED_DEVELOPMENTS.length} demo developments and ${SEED_LISTINGS.length} demo listings successfully.`);
    console.log('Use pnpm seed:developments:reset or pnpm db:seed:developments:reset to remove them.\n');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/seedDemoDevelopments.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
