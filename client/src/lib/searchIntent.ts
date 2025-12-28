import { PROVINCE_SLUGS } from './locationUtils';

/**
 * CORE PHILOSOPHY:
 * - Search captures intent, not keywords.
 * - Geography is sacred and hierarchical.
 * - Filters refine — they never redefine geography silently.
 */

export type TransactionType = 'for-sale' | 'to-rent' | 'developments';
export type GeographyLevel = 'province' | 'city' | 'locality' | 'development' | 'country';

export interface GeographyIntent {
  level: GeographyLevel;
  province?: string;
  city?: string;
  suburb?: string; // "locality" in the spec, but we use suburb in the codebase usually
  slug?: string; // For development specific pages
}

export interface SearchDefaults {
  propertyCategory: string; // e.g. 'residential'
  sort: string; // e.g. 'relevance'
}

export interface SearchIntent {
  transactionType: TransactionType;
  geography: GeographyIntent;
  filters: Record<string, any>; // The query params refing the search
  defaults: SearchDefaults;
}

/**
 * Resolves the search intent from the URL parameters and query string.
 * This is the SINGLE SOURCE OF TRUTH for converting URL state to UI state.
 * 
 * @param pathParams - The parameters from the route (e.g., /property-for-sale/:province/:city)
 * @param searchParams - The query string parameters (e.g., ?price_min=1000)
 * @returns A structured SearchIntent object
 */
export function resolveSearchIntent(
  path: string, 
  pathParams: Record<string, string | undefined>,
  searchParams: URLSearchParams
): SearchIntent {
  
  // 1. Determine Transaction Type
  let transactionType: TransactionType = 'for-sale'; // Default
  if (path.includes('property-to-rent')) {
    transactionType = 'to-rent';
  } else if (path.includes('new-developments') || path.includes('developments')) {
    transactionType = 'developments';
  }

  // 2. Determine Geography (Sacred & Hierarchical)
  const geography: GeographyIntent = {
    level: 'country', // Default
  };

  if (pathParams.province) {
    geography.level = 'province';
    geography.province = pathParams.province.toLowerCase();
  }

  if (pathParams.city) {
    geography.level = 'city';
    geography.city = pathParams.city.toLowerCase();
    // Assuming if city is present, province must be inferred or present.
    // In our routes, we usually have /:province/:city.
    // If we only have city (shortcut), we might need to look it up, 
    // but here we trust the path params provided by the router which should have resolved specific routes.
  }

  if (pathParams.suburb) {
    geography.level = 'locality';
    geography.suburb = pathParams.suburb.toLowerCase();
  }

  // Handle Legacy "Slug" or Development specific routes if needed in future
  
  // 3. Extract Filters (Query Params)
  // We explicitly exclude geography from filters to avoid synchronization wars.
  const filters: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    // Skip known legacy params if they conflict, but generally we want to trust query params for *refinement*
    filters[key] = value;
  });
  
  // Ensure listingType matches transactionType (Synchronization)
  filters.listingType = transactionType === 'to-rent' ? 'rent' : 'sale';

  return {
    transactionType,
    geography,
    filters,
    defaults: {
      propertyCategory: 'residential',
      sort: 'relevance'
    }
  };
}

/**
 * Reconstructs the canonical URL from a SearchIntent object.
 * This ensures "One intent = one canonical URL".
 */
export function generateIntentUrl(intent: SearchIntent): string {
  const { transactionType, geography, filters } = intent;
  
  // 1. Base Path based on Transaction & Geography
  let basePath = '/property-for-sale';
  if (transactionType === 'to-rent') basePath = '/property-to-rent';
  if (transactionType === 'developments') basePath = '/new-developments';

  let geoPath = '';
  if (geography.province) {
    geoPath += `/${geography.province}`;
    if (geography.city) {
      geoPath += `/${geography.city}`;
      if (geography.suburb) {
        geoPath += `/${geography.suburb}`;
      }
    }
  }

  // 2. Query String from Filters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    // inner logic to filter out defaults, e.g. don't put listingType=sale in URL if we comprise it in the path
    if (key === 'listingType') return; 
    if (value) queryParams.set(key, String(value));
  });

  const queryString = queryParams.toString();
  return `${basePath}${geoPath}${queryString ? `?${queryString}` : ''}`;
}
