// Shared mapping for popular South African cities to provinces
// This helps frontend components construct hierarchical URLs without needing a full DB lookup for known entities
// In a production app, this would ideally be dynamic or fetched from a global config

export const CITY_PROVINCE_MAP: Record<string, string> = {
  'johannesburg': 'gauteng',
  'cape-town': 'western-cape',
  'durban': 'kwazulu-natal',
  'pretoria': 'gauteng',
  'sandton': 'gauteng',
  'randburg': 'gauteng',
  'centurion': 'gauteng',
  'midrand': 'gauteng',
  'roodepoort': 'gauteng',
  'kempton-park': 'gauteng',
  'benoni': 'gauteng',
  'boksburg': 'gauteng',
  'alberton': 'gauteng',
  'edenvale': 'gauteng',
  'germiston': 'gauteng',
  'springs': 'gauteng',
  'brakpan': 'gauteng',
  'krugersdorp': 'gauteng',
  'stellenbosch': 'western-cape',
  'somerset-west': 'western-cape',
  'paarl': 'western-cape',
  'george': 'western-cape',
  'knysna': 'western-cape',
  'mossel-bay': 'western-cape',
  'hermanus': 'western-cape',
  'bellville': 'western-cape',
  'durbanville': 'western-cape',
  'ballito': 'kwazulu-natal',
  'umhlanga': 'kwazulu-natal',
  'pietermaritzburg': 'kwazulu-natal',
  'richards-bay': 'kwazulu-natal',
  'bloemfontein': 'free-state',
  'port-elizabeth': 'eastern-cape',
  'gqeberha': 'eastern-cape',
  'east-london': 'eastern-cape',
  'polokwane': 'limpopo',
  'nelspruit': 'mpumalanga',
  'mbombela': 'mpumalanga',
  'rustenburg': 'north-west',
  'kimberley': 'northern-cape',
  'mahikeng': 'north-west',
  'witbank': 'mpumalanga',
  'emalahleni': 'mpumalanga',
  'potchefstroom': 'north-west'
};

export const PROVINCE_SLUGS = [
  'gauteng',
  'western-cape',
  'kwazulu-natal',
  'eastern-cape',
  'free-state',
  'limpopo',
  'mpumalanga',
  'north-west',
  'northern-cape'
];

// Province name variants for fuzzy matching (handles user input variations)
export const PROVINCE_NAME_VARIANTS: Record<string, string> = {
  'gauteng': 'gauteng',
  'western cape': 'western-cape',
  'western-cape': 'western-cape',
  'kwazulu-natal': 'kwazulu-natal',
  'kwazulu natal': 'kwazulu-natal',
  'kzn': 'kwazulu-natal',
  'eastern cape': 'eastern-cape',
  'eastern-cape': 'eastern-cape',
  'free state': 'free-state',
  'free-state': 'free-state',
  'limpopo': 'limpopo',
  'mpumalanga': 'mpumalanga',
  'north west': 'north-west',
  'north-west': 'north-west',
  'northern cape': 'northern-cape',
  'northern-cape': 'northern-cape'
};

/**
 * Check if a search string matches a province.
 * Returns the canonical province slug if match, null otherwise.
 */
export function isProvinceSearch(searchText: string): string | null {
  if (!searchText) return null;
  const normalized = searchText.toLowerCase().trim();
  
  // Direct match against variants
  if (PROVINCE_NAME_VARIANTS[normalized]) {
    return PROVINCE_NAME_VARIANTS[normalized];
  }
  
  // Check if normalized slug is in PROVINCE_SLUGS
  const slug = normalized.replace(/\s+/g, '-');
  if (PROVINCE_SLUGS.includes(slug)) {
    return slug;
  }
  
  return null;
}

/**
 * Normalize any location string to a consistent slug format.
 * This is the SINGLE SOURCE OF TRUTH for key normalization.
 * All lookups into CITY_PROVINCE_MAP must use this.
 */
export function normalizeLocationKey(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Get the province slug for a given city name.
 * Handles both slugified and unslugified inputs via normalization.
 * 
 * @param cityName - City name in any format (e.g., "Cape Town", "cape-town", "CAPE TOWN")
 * @returns Province slug (e.g., "western-cape") or null if not found
 */
export function getProvinceForCity(cityName: string): string | null {
  const slug = normalizeLocationKey(cityName);
  return CITY_PROVINCE_MAP[slug] ?? null;
}

/**
 * Helper to get property URL
 */
export const getCityUrl = (cityName: string) => {
  const slug = normalizeLocationKey(cityName);
  const province = CITY_PROVINCE_MAP[slug] || 'properties'; // Fallback if unknown
  return `/${province}/${slug}`;
};

export const getSuburbUrl = (cityName: string, suburbName: string) => {
  const citySlug = normalizeLocationKey(cityName);
  const suburbSlug = normalizeLocationKey(suburbName);
  const province = CITY_PROVINCE_MAP[citySlug] || 'properties';
  return `/${province}/${citySlug}/${suburbSlug}`;
};

