
export interface MarketIntelligenceEntry {
  slug: string;
  name: string;
  province: string;
  level: "city" | "suburb";
  parentSlug?: string; // for suburbs
  avgSale: number;
  avgRent?: number;
  sentimentBase: number; // 3.5 – 4.8
  tier: "luxury" | "upper" | "mid" | "entry";
}

export const MARKET_INTELLIGENCE: MarketIntelligenceEntry[] = [
  // --- GAUTENG CITIES ---
  {
    slug: "johannesburg",
    name: "Johannesburg",
    province: "gauteng",
    level: "city",
    avgSale: 2800000,
    sentimentBase: 4.1,
    tier: "upper",
  },
  {
    slug: "pretoria",
    name: "Pretoria",
    province: "gauteng",
    level: "city",
    avgSale: 2400000,
    sentimentBase: 4.0,
    tier: "upper",
  },
  {
    slug: "sandton", // Listing Sandton as a City-level entity for navigation ease, though effectively a major metro area
    name: "Sandton",
    province: "gauteng",
    level: "city", 
    avgSale: 4600000,
    avgRent: 32000,
    sentimentBase: 4.6,
    tier: "luxury",
  },
  {
    slug: "midrand",
    name: "Midrand",
    province: "gauteng",
    level: "city",
    avgSale: 1800000,
    sentimentBase: 4.2,
    tier: "mid",
  },
  {
    slug: "centurion",
    name: "Centurion",
    province: "gauteng",
    level: "city",
    avgSale: 1950000,
    sentimentBase: 4.3,
    tier: "mid",
  },

  // --- GAUTENG SUBURBS ---
  {
    slug: "sandton", // Also handled as suburb context if resolved under JHB
    name: "Sandton",
    province: "gauteng",
    level: "suburb",
    parentSlug: "johannesburg",
    avgSale: 4600000,
    avgRent: 32000,
    sentimentBase: 4.6,
    tier: "luxury",
  },
  {
    slug: "hyde-park",
    name: "Hyde Park",
    province: "gauteng",
    level: "suburb",
    parentSlug: "sandton", // Or Johannesburg depending on URL structure
    avgSale: 8500000,
    avgRent: 45000,
    sentimentBase: 4.8,
    tier: "luxury",
  },
  {
    slug: "bryanston",
    name: "Bryanston",
    province: "gauteng",
    level: "suburb",
    parentSlug: "sandton",
    avgSale: 3900000,
    avgRent: 25000,
    sentimentBase: 4.5,
    tier: "upper",
  },
  {
    slug: "waterkloof",
    name: "Waterkloof",
    province: "gauteng",
    level: "suburb",
    parentSlug: "pretoria",
    avgSale: 3850000,
    avgRent: 22000,
    sentimentBase: 4.7,
    tier: "luxury",
  },

  // --- WESTERN CAPE CITIES ---
  {
    slug: "cape-town",
    name: "Cape Town",
    province: "western-cape",
    level: "city",
    avgSale: 5200000,
    avgRent: 35000,
    sentimentBase: 4.9,
    tier: "luxury",
  },
  {
    slug: "stellenbosch",
    name: "Stellenbosch",
    province: "western-cape",
    level: "city",
    avgSale: 3800000,
    sentimentBase: 4.7,
    tier: "upper",
  },
  {
    slug: "somerset-west",
    name: "Somerset West",
    province: "western-cape",
    level: "city",
    avgSale: 3200000,
    sentimentBase: 4.5,
    tier: "upper",
  },

  // --- WESTERN CAPE SUBURBS ---
  {
    slug: "camps-bay",
    name: "Camps Bay",
    province: "western-cape",
    level: "suburb",
    parentSlug: "cape-town",
    avgSale: 12500000,
    avgRent: 55000,
    sentimentBase: 4.9,
    tier: "luxury",
  },
  {
    slug: "clifton",
    name: "Clifton",
    province: "western-cape",
    level: "suburb",
    parentSlug: "cape-town",
    avgSale: 22000000,
    avgRent: 85000,
    sentimentBase: 4.9,
    tier: "luxury",
  },
  {
    slug: "sea-point",
    name: "Sea Point",
    province: "western-cape",
    level: "suburb",
    parentSlug: "cape-town",
    avgSale: 4500000,
    avgRent: 28000,
    sentimentBase: 4.6,
    tier: "upper",
  },

  // --- KZN ---
  {
    slug: "durban",
    name: "Durban",
    province: "kwazulu-natal",
    level: "city",
    avgSale: 1500000,
    sentimentBase: 4.0,
    tier: "mid",
  },
  {
    slug: "umhlanga",
    name: "Umhlanga",
    province: "kwazulu-natal",
    level: "city", // Treated as city often
    avgSale: 3600000,
    avgRent: 22000,
    sentimentBase: 4.6,
    tier: "upper",
  },
  {
    slug: "ballito",
    name: "Ballito",
    province: "kwazulu-natal",
    level: "city",
    avgSale: 3200000,
    sentimentBase: 4.5,
    tier: "upper",
  }
];
