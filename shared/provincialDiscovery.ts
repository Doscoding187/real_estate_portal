import { parseCanonicalLocationId } from './locationAuthority';
import { sanitizeBuySearchFilters, type BuySearchFilters } from './buySearchContract';

export const PROVINCIAL_JOURNEY_IDS = [
  'buy',
  'rent',
  'developments',
  'explore',
  'land',
  'commercial',
  'shared_living',
] as const;
export type ProvincialJourneyId = (typeof PROVINCIAL_JOURNEY_IDS)[number];

export const PROVINCIAL_JOURNEY_STATES = ['active', 'unavailable'] as const;
export type ProvincialJourneyState = (typeof PROVINCIAL_JOURNEY_STATES)[number];

export interface ProvincialJourneyConfig {
  id: ProvincialJourneyId;
  label: string;
  shortLabel: string;
  description: string;
  ctaLabel: string;
  state: ProvincialJourneyState;
  unavailableReason?: string;
}

export interface ProvincialMarketConfig {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  areaSlugs: readonly string[];
}

export interface ProvincialNeedConfig {
  id: string;
  label: string;
  description: string;
  journey: ProvincialJourneyId;
  propertyType?: string;
  state: ProvincialJourneyState;
}

export interface ProvincialConfig {
  slug: string;
  name: string;
  code: string;
  shortProposition: string;
  heroKicker: string;
  heroFallbackImage: string;
  supportedJourneys: readonly ProvincialJourneyConfig[];
  majorMarkets: readonly ProvincialMarketConfig[];
  featuredNeeds: readonly ProvincialNeedConfig[];
  seo: {
    heading: string;
    summary: string;
    faqs: readonly { question: string; answer: string }[];
  };
  modules: {
    marketSnapshot: boolean;
    inventoryPreview: boolean;
    developmentPreview: boolean;
  };
}

const BUY_JOURNEY: ProvincialJourneyConfig = {
  id: 'buy',
  label: 'Buy',
  shortLabel: 'Homes for sale',
  description: 'Compare live homes and apartments across Gauteng.',
  ctaLabel: 'See homes for sale',
  state: 'active',
};

const RENT_JOURNEY: ProvincialJourneyConfig = {
  id: 'rent',
  label: 'Rent',
  shortLabel: 'Places to rent',
  description: 'Find a rental in the area and price range that fits.',
  ctaLabel: 'Find rentals',
  state: 'active',
};

const DEVELOPMENTS_JOURNEY: ProvincialJourneyConfig = {
  id: 'developments',
  label: 'Developments',
  shortLabel: 'New developments',
  description: 'Explore new-build opportunities and approved development stock.',
  ctaLabel: 'Explore developments',
  state: 'active',
};

const EXPLORE_JOURNEY: ProvincialJourneyConfig = {
  id: 'explore',
  label: 'Explore areas',
  shortLabel: 'Area discovery',
  description: 'Start with a place and let the geography resolve for you.',
  ctaLabel: 'Explore areas',
  state: 'active',
};

const COMING_SOON_JOURNEY = (id: ProvincialJourneyId, label: string, reason: string) => ({
  id,
  label,
  shortLabel: label,
  description: reason,
  ctaLabel: label,
  state: 'unavailable' as const,
  unavailableReason: reason,
});

export const PROVINCIAL_CONFIGS = {
  gauteng: {
    slug: 'gauteng',
    name: 'Gauteng',
    code: 'GP',
    shortProposition:
      'A faster way into the right place, property and next move across the province of gold.',
    heroKicker: 'The province of gold · Johannesburg to Pretoria',
    heroFallbackImage:
      'https://images.unsplash.com/photo-1577931767667-0c58e744d081?auto=format&fit=crop&w=2200&q=85',
    supportedJourneys: [
      BUY_JOURNEY,
      RENT_JOURNEY,
      DEVELOPMENTS_JOURNEY,
      EXPLORE_JOURNEY,
      COMING_SOON_JOURNEY(
        'land',
        'Land & plots',
        'Land inventory is not yet a bounded public journey.',
      ),
      COMING_SOON_JOURNEY(
        'commercial',
        'Commercial',
        'Commercial inventory is not yet a bounded public journey.',
      ),
    ],
    majorMarkets: [
      {
        slug: 'johannesburg',
        name: 'Johannesburg',
        eyebrow: 'The northern arc',
        description: 'Urban nodes, established suburbs and a wide range of live stock.',
        areaSlugs: ['sandton', 'rosebank', 'randburg', 'fourways'],
      },
      {
        slug: 'pretoria',
        name: 'Pretoria',
        eyebrow: 'The capital corridor',
        description: 'Family neighbourhoods, secure estates and connected commuter routes.',
        areaSlugs: ['centurion', 'waterkloof', 'menlyn', 'hatfield'],
      },
    ],
    featuredNeeds: [
      {
        id: 'starter-buy',
        label: 'Start with a home to buy',
        description: 'Use the live Buy journey to compare homes, apartments and townhouses.',
        journey: 'buy',
        state: 'active',
      },
      {
        id: 'rental-search',
        label: 'Find a rental that fits',
        description: 'Go straight to rentals and refine by area, type and budget.',
        journey: 'rent',
        state: 'active',
      },
      {
        id: 'new-build',
        label: 'See what is being built',
        description: 'Browse new developments where public development inventory is available.',
        journey: 'developments',
        state: 'active',
      },
      {
        id: 'area-first',
        label: 'Choose a place first',
        description: 'Search for a city, suburb or supported area without a forced hierarchy.',
        journey: 'explore',
        state: 'active',
      },
      {
        id: 'land',
        label: 'Land & plots',
        description: 'This journey will open when a bounded public destination is ready.',
        journey: 'land',
        state: 'unavailable',
      },
    ],
    seo: {
      heading: 'Property discovery in Gauteng',
      summary:
        'Gauteng brings together Johannesburg, Pretoria and the country’s most connected urban property markets. Use the provincial hub to choose a journey, refine directly to a supported location and continue into live public inventory.',
      faqs: [
        {
          question: 'Can I search a suburb without choosing a city first?',
          answer:
            'Yes. Choose a canonical city, suburb or area suggestion in the location field. The platform resolves its province and hierarchy before handing you into the selected journey.',
        },
        {
          question: 'Are the numbers on this page concluded sale prices?',
          answer:
            'No. Inventory totals describe public active listings returned by the live search authority. Pricing statistics are shown only when a defensible public sample is available.',
        },
        {
          question: 'Why are some journeys not active yet?',
          answer:
            'Only journeys with a safe, bounded destination are active. Unavailable paths stay visible only when the explanation helps set an honest expectation.',
        },
      ],
    },
    modules: { marketSnapshot: true, inventoryPreview: true, developmentPreview: true },
  },
  'western-cape': {
    slug: 'western-cape',
    name: 'Western Cape',
    code: 'WC',
    shortProposition:
      'A province-wide starting point for Cape Town, Winelands and coastal markets.',
    heroKicker: 'The southern gateway · Cape Town and beyond',
    heroFallbackImage:
      'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=2200&q=85',
    supportedJourneys: [BUY_JOURNEY, RENT_JOURNEY, DEVELOPMENTS_JOURNEY, EXPLORE_JOURNEY],
    majorMarkets: [
      {
        slug: 'cape-town',
        name: 'Cape Town',
        eyebrow: 'The Cape metro',
        description: 'A broad urban market spanning city, peninsula and northern suburbs.',
        areaSlugs: ['sea-point', 'claremont', 'milnerton'],
      },
      {
        slug: 'stellenbosch',
        name: 'Stellenbosch',
        eyebrow: 'The Winelands',
        description: 'A smaller market with a distinct town-and-estate character.',
        areaSlugs: [],
      },
    ],
    featuredNeeds: [
      {
        id: 'western-buy',
        label: 'Buy in the Western Cape',
        description: 'Continue into the canonical public Buy journey.',
        journey: 'buy',
        state: 'active',
      },
    ],
    seo: {
      heading: 'Property discovery in the Western Cape',
      summary:
        'The same provincial contract can support a metro-led coastal market without changing the Gauteng page contract.',
      faqs: [],
    },
    modules: { marketSnapshot: true, inventoryPreview: true, developmentPreview: true },
  },
  'northern-cape': {
    slug: 'northern-cape',
    name: 'Northern Cape',
    code: 'NC',
    shortProposition:
      'A lighter-inventory province where honest availability matters more than filler.',
    heroKicker: 'A measured start · Discover what is actually available',
    heroFallbackImage:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=85',
    supportedJourneys: [BUY_JOURNEY, EXPLORE_JOURNEY],
    majorMarkets: [
      {
        slug: 'kimberley',
        name: 'Kimberley',
        eyebrow: 'The provincial centre',
        description: 'A focused market card that can remain useful even with a small sample.',
        areaSlugs: [],
      },
    ],
    featuredNeeds: [
      {
        id: 'northern-buy',
        label: 'Check live homes for sale',
        description: 'See the current public inventory before narrowing further.',
        journey: 'buy',
        state: 'active',
      },
    ],
    seo: {
      heading: 'Property discovery in the Northern Cape',
      summary:
        'Lower-inventory provinces can use the same contract with sparse states and without invented market figures.',
      faqs: [],
    },
    modules: { marketSnapshot: false, inventoryPreview: true, developmentPreview: false },
  },
} satisfies Record<string, ProvincialConfig>;

export function getProvincialConfig(slug: string): ProvincialConfig | undefined {
  return PROVINCIAL_CONFIGS[
    String(slug || '')
      .trim()
      .toLowerCase() as keyof typeof PROVINCIAL_CONFIGS
  ];
}

export function validateProvincialConfig(config: ProvincialConfig): string[] {
  const errors: string[] = [];
  if (!config.slug || !config.name || !config.code) errors.push('province identity is incomplete');
  if (!config.shortProposition) errors.push('short proposition is required');
  if (config.supportedJourneys.length === 0) errors.push('at least one journey is required');
  if (config.majorMarkets.some(market => !market.slug || !market.name)) {
    errors.push('major markets require a slug and name');
  }
  if (config.featuredNeeds.some(need => !need.id || !need.label || !need.description)) {
    errors.push('featured needs require an id, label and description');
  }
  if (
    config.modules.inventoryPreview &&
    !config.supportedJourneys.some(journey => journey.id === 'buy')
  ) {
    errors.push('inventory preview requires a Buy journey');
  }
  return errors;
}

export interface ProvincialLocationQueryState {
  journey?: ProvincialJourneyId;
  unsupportedJourney?: string;
  locationId?: string;
  locationLevel?: 'province' | 'city' | 'suburb';
  provinceSlug?: string;
  citySlug?: string;
  suburbSlug?: string;
  filters: BuySearchFilters & {
    maxPrice?: number;
    maxBedrooms?: number;
    maxBathrooms?: number;
  };
  invalidLocationIdentity?: boolean;
}

function positiveNumber(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function readJourney(
  searchParams: URLSearchParams,
): { journey?: ProvincialJourneyId; unsupportedJourney?: string } | undefined {
  const raw = String(searchParams.get('journey') || searchParams.get('intent') || '')
    .trim()
    .toLowerCase();
  if (!raw) return undefined;

  const aliases: Record<string, ProvincialJourneyId> = {
    buy: 'buy',
    sale: 'buy',
    'for-sale': 'buy',
    rent: 'rent',
    rental: 'rent',
    'to-rent': 'rent',
    developments: 'developments',
    development: 'developments',
    explore: 'explore',
    areas: 'explore',
  };
  const journey = aliases[raw];
  return journey ? { journey } : { unsupportedJourney: raw };
}

export function resolveProvincialQueryState(
  searchParams: URLSearchParams,
): ProvincialLocationQueryState {
  const journeyState = readJourney(searchParams) || {};
  const provinceSlug =
    String(searchParams.get('province') || '')
      .trim()
      .toLowerCase() || undefined;
  const citySlug =
    String(searchParams.get('city') || '')
      .trim()
      .toLowerCase() || undefined;
  const suburbSlug =
    String(searchParams.get('suburb') || '')
      .trim()
      .toLowerCase() || undefined;
  const locationId = String(searchParams.get('locationId') || '').trim() || undefined;
  const parsedLocationId = parseCanonicalLocationId(locationId);
  const requestedLevel = suburbSlug
    ? 'suburb'
    : citySlug
      ? 'city'
      : parsedLocationId?.level || 'province';

  const filters = sanitizeBuySearchFilters({
    propertyType: searchParams.get('propertyType') || undefined,
    listingSource: searchParams.get('listingSource') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    minBedrooms: searchParams.get('minBedrooms') || undefined,
    minBathrooms: searchParams.get('minBathrooms') || undefined,
  });

  const rawMinPrice = positiveNumber(searchParams.get('minPrice'));
  const rawMaxPrice = positiveNumber(searchParams.get('maxPrice'));
  const validPriceRange =
    rawMinPrice === undefined || rawMaxPrice === undefined || rawMinPrice <= rawMaxPrice;
  const maxPrice = validPriceRange ? rawMaxPrice : undefined;
  const maxBedrooms = positiveNumber(searchParams.get('maxBedrooms'));
  const maxBathrooms = positiveNumber(searchParams.get('maxBathrooms'));

  return {
    ...journeyState,
    locationId,
    locationLevel: parsedLocationId?.level,
    provinceSlug,
    citySlug,
    suburbSlug,
    filters: {
      ...filters,
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(maxBedrooms !== undefined ? { maxBedrooms } : {}),
      ...(maxBathrooms !== undefined ? { maxBathrooms } : {}),
    },
    invalidLocationIdentity: Boolean(
      locationId && (!parsedLocationId || parsedLocationId.level !== requestedLevel),
    ),
  };
}
