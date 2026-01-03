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
  locationId?: string; // Numeric ID from P24 pattern
  slug?: string; // For development specific pages or as fallback
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
 * @param pathParams - The parameters from the route (e.g., /:action/:suburb/:city/:province/:locationId)
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
  if (path.includes('property-to-rent') || path.includes('to-rent')) {
    transactionType = 'to-rent';
  } else if (path.includes('new-developments') || path.includes('developments')) {
    transactionType = 'developments';
  }

  // 2. Determine Geography (Sacred & Hierarchical)
  const geography: GeographyIntent = {
    level: 'country', // Default
  };

  // Check for locationId (most specific)
  if (pathParams.locationId) {
    geography.locationId = pathParams.locationId;
  }

  // Hierarchy Resolution:
  // The router handles the matching, so we just trust the params provided.
  // P24 Pattern: /.../[suburb]/[city]/[province]/[id]
  
  if (pathParams.province) {
    geography.level = 'province';
    geography.province = pathParams.province.toLowerCase();
  }

  if (pathParams.city) {
    geography.level = 'city';
    geography.city = pathParams.city.toLowerCase();
  }

  if (pathParams.suburb) {
    geography.level = 'locality';
    geography.suburb = pathParams.suburb.toLowerCase();
  }

  // Handle Legacy "Slug" or Development specific routes if needed
  if (pathParams.slug) {
      // This might be a shortcut route or a development slug
      // If we haven't determined level yet, maybe use this?
      if (!geography.city && !geography.suburb && !geography.province) {
         // Could be a province shortcut or city shortcut
          if (PROVINCE_SLUGS.includes(pathParams.slug.toLowerCase())) {
              geography.level = 'province';
              geography.province = pathParams.slug.toLowerCase();
          } else {
               // Treat as city shortcut
               geography.level = 'city';
               geography.city = pathParams.slug.toLowerCase();
          }
      }
      geography.slug = pathParams.slug;
  }

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
 * Implementation follows Property24 pattern:
 * /[action]/[suburb]/[city]/[province]/[locationId]
 */
export function generateIntentUrl(intent: SearchIntent): string {
  const { transactionType, geography, filters } = intent;
  
  // 1. Base Path based on Transaction
  // User spec: /[action]-for-sale/
  // Map transaction type to action prefix
  let actionPrefix = 'property'; // Default
  
  // If explicitly requesting 'houses', use it.
  if (filters.propertyType && typeof filters.propertyType === 'string') {
      const pType = filters.propertyType.toLowerCase();
      // Simple mapping assuming the filter value is singular (house -> houses)
      if (pType === 'house') actionPrefix = 'houses';
      else if (pType === 'apartment') actionPrefix = 'apartments';
      else if (pType === 'townhouse') actionPrefix = 'townhouses';
      else if (pType === 'farm') actionPrefix = 'farms';
      else if (pType === 'vacant land' || pType === 'land') actionPrefix = 'vacant-land';
      else if (pType === 'commercial property' || pType === 'commercial') actionPrefix = 'commercial-property';
      else if (pType === 'industrial property' || pType === 'industrial') actionPrefix = 'industrial-property';
      else actionPrefix = 'property'; 
  }

  let basePath = `/${actionPrefix}-for-sale`;
  
  if (transactionType === 'to-rent') {
      basePath = `/${actionPrefix}-to-rent`;
  }
  
  if (transactionType === 'developments') {
      // Spec: /new-developments-for-sale
      // Also check if action prefix applies here? "New Developments" is usually the prefix itself.
      // User Spec: /new-developments-for-sale/sandton/gauteng/109?dpt=4
      basePath = '/new-developments-for-sale';
  }

  let geoPath = '';
  
  // Construct path: [suburb]/[city]/[province]/[locationId]
  
  const parts: string[] = [];
  
  // P24 works like:
  // Suburb Page: /houses-for-sale/sky-city/alberton/gauteng/17552
  // City Page: /houses-for-sale/sandton/gauteng/109
  // Province Page: /houses-for-sale/gauteng/1
  
  if (geography.suburb) parts.push(geography.suburb);
  if (geography.city) parts.push(geography.city);
  if (geography.province) parts.push(geography.province);
  if (geography.locationId) parts.push(geography.locationId);

  // Join parts with /
  if (parts.length > 0) {
      geoPath = '/' + parts.join('/');
  }

  // 2. Query String from Filters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    // inner logic to filter out defaults
    if (key === 'listingType') return; 
    if (key === 'propertyType') return; // Consumed in action prefix
    if (!value) return;
    
    queryParams.set(key, String(value));
  });

  const queryString = queryParams.toString();
  return `${basePath}${geoPath}${queryString ? `?${queryString}` : ''}`;
}
