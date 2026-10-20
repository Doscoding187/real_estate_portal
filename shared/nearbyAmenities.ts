export const NEARBY_AMENITY_CATEGORIES = [
  'education',
  'healthcare',
  'shopping',
  'transport',
  'lifestyle',
] as const;

export type NearbyAmenityCategory = (typeof NEARBY_AMENITY_CATEGORIES)[number];

export type NearbyAmenityCategoryConfig = {
  id: NearbyAmenityCategory;
  label: string;
  googleTypes: readonly string[];
  minimumRating: number;
  minimumReviewCount: number;
  allowUnrated: boolean;
  maxResults: number;
};

export const NEARBY_AMENITY_CATEGORY_CONFIG: readonly NearbyAmenityCategoryConfig[] = [
  {
    id: 'education',
    label: 'Education',
    googleTypes: ['school', 'university'],
    minimumRating: 4,
    minimumReviewCount: 20,
    allowUnrated: false,
    maxResults: 6,
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    googleTypes: ['hospital', 'pharmacy'],
    minimumRating: 4,
    minimumReviewCount: 20,
    allowUnrated: false,
    maxResults: 6,
  },
  {
    id: 'shopping',
    label: 'Shopping',
    googleTypes: ['shopping_mall', 'supermarket'],
    minimumRating: 4,
    minimumReviewCount: 20,
    allowUnrated: false,
    maxResults: 5,
  },
  {
    id: 'transport',
    label: 'Transport',
    googleTypes: ['transit_station', 'train_station'],
    minimumRating: 3.5,
    minimumReviewCount: 10,
    allowUnrated: true,
    maxResults: 5,
  },
  {
    id: 'lifestyle',
    label: 'Parks & leisure',
    googleTypes: ['park', 'museum', 'movie_theater'],
    minimumRating: 4,
    minimumReviewCount: 20,
    allowUnrated: true,
    maxResults: 5,
  },
];

export const NEARBY_AMENITY_EXCLUDED_GOOGLE_TYPES = [
  'atm',
  'bank',
  'bar',
  'car_repair',
  'car_wash',
  'casino',
  'convenience_store',
  'finance',
  'gas_station',
  'insurance_agency',
  'laundry',
  'liquor_store',
  'lodging',
  'night_club',
  'real_estate_agency',
  'travel_agency',
] as const;

const EXCLUDED_NAME_PATTERN =
  /\b(spaza|tuck[\s-]?shop|bottle store|liquor store|shebeen|tavern|cash machine|car wash|panel beater|scrapyard)\b/i;

export const NEARBY_AMENITY_MIN_RADIUS_METRES = 500;
export const NEARBY_AMENITY_MAX_RADIUS_METRES = 20000;
export const NEARBY_AMENITY_DEFAULT_RADIUS_METRES = 5000;
export const NEARBY_AMENITY_DEFAULT_LIMIT = 30;
export const NEARBY_AMENITY_MAX_LIMIT = 60;

export type NearbyAmenityCandidate = {
  name: string;
  rating?: number | null;
  userRatingsTotal?: number | null;
  types?: readonly string[];
};

export type NearbyAmenity = {
  id: string;
  placeId: string;
  name: string;
  category: NearbyAmenityCategory;
  googleType: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
  distanceValue: number;
  rating: number | null;
  userRatingsTotal: number | null;
};

export function isNearbyAmenityCategory(value: string): value is NearbyAmenityCategory {
  return (NEARBY_AMENITY_CATEGORIES as readonly string[]).includes(value);
}

export function getNearbyAmenityCategoryConfig(
  category: NearbyAmenityCategory,
): NearbyAmenityCategoryConfig {
  const config = NEARBY_AMENITY_CATEGORY_CONFIG.find(item => item.id === category);
  if (!config) throw new Error(`Unknown nearby amenity category: ${category}`);
  return config;
}

export function isExcludedNearbyAmenity(candidate: NearbyAmenityCandidate): boolean {
  const excludedTypes = new Set<string>(NEARBY_AMENITY_EXCLUDED_GOOGLE_TYPES);
  if ((candidate.types || []).some(type => excludedTypes.has(type))) return true;
  return EXCLUDED_NAME_PATTERN.test(candidate.name);
}

export function passesNearbyAmenityQualityGate(
  candidate: NearbyAmenityCandidate,
  config: NearbyAmenityCategoryConfig,
): boolean {
  if (isExcludedNearbyAmenity(candidate)) return false;
  const rating = typeof candidate.rating === 'number' ? candidate.rating : null;
  const reviewCount =
    typeof candidate.userRatingsTotal === 'number' ? candidate.userRatingsTotal : null;
  if (rating === null) return config.allowUnrated;
  if (rating < config.minimumRating) return false;
  if (reviewCount === null) return config.allowUnrated;
  return reviewCount >= config.minimumReviewCount;
}

function categoryOrder(category: NearbyAmenityCategory) {
  return NEARBY_AMENITY_CATEGORIES.indexOf(category);
}

export function rankNearbyAmenities(
  amenities: NearbyAmenity[],
  limit = NEARBY_AMENITY_DEFAULT_LIMIT,
): NearbyAmenity[] {
  const seen = new Set<string>();
  const unique = amenities.filter(amenity => {
    if (seen.has(amenity.placeId)) return false;
    seen.add(amenity.placeId);
    return true;
  });

  const capped: NearbyAmenity[] = [];
  for (const category of NEARBY_AMENITY_CATEGORIES) {
    const config = getNearbyAmenityCategoryConfig(category);
    const rows = unique
      .filter(amenity => amenity.category === category)
      .sort((left, right) => left.distanceValue - right.distanceValue)
      .slice(0, config.maxResults);
    capped.push(...rows);
  }

  return capped
    .sort(
      (left, right) =>
        categoryOrder(left.category) - categoryOrder(right.category) ||
        left.distanceValue - right.distanceValue,
    )
    .slice(0, Math.min(limit, NEARBY_AMENITY_MAX_LIMIT));
}
