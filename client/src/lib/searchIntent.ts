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

  // ============================================================
  // PRIORITY: Query params ALWAYS win for SRP routing
  // This ensures /property-for-sale?city=alberton works correctly
  // ============================================================
  
  const queryProvince = searchParams.get('province');
  const queryCity = searchParams.get('city');
  const querySuburb = searchParams.get('suburb');
  
  if (querySuburb) {
    geography.level = 'locality';
    geography.suburb = querySuburb.toLowerCase();
  }
  
  if (queryCity) {
    if (!geography.suburb) geography.level = 'city';
    geography.city = queryCity.toLowerCase();
  }
  
  if (queryProvince) {
    if (!geography.city && !geography.suburb) geography.level = 'province';
    geography.province = queryProvince.toLowerCase();
  }

  // Fallback to path params if no query params for geography
  // This handles SEO page routes like /property-for-sale/gauteng
  if (!geography.province && !geography.city && !geography.suburb) {
    if (pathParams.locationId) {
      geography.locationId = pathParams.locationId;
    }
    
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
      if (!geography.city && !geography.suburb && !geography.province) {
        if (PROVINCE_SLUGS.includes(pathParams.slug.toLowerCase())) {
          geography.level = 'province';
          geography.province = pathParams.slug.toLowerCase();
        } else {
          geography.level = 'city';
          geography.city = pathParams.slug.toLowerCase();
        }
      }
      geography.slug = pathParams.slug;
    }
  }

  // 3. Extract Filters (Query Params)
  // We explicitly exclude geography keys from filters to avoid duplication
  const filters: Record<string, any> = {};
  
  // Explicitly handle array parameters
  const locations = searchParams.getAll('locations') || searchParams.getAll('locations[]');
  if (locations && locations.length > 0) {
    filters.locations = locations;
  }

  searchParams.forEach((value, key) => {
    // Skip geography keys - they're handled above
    if (key === 'province' || key === 'city' || key === 'suburb') return;
    // Skip array keys handled explicitly
    if (key === 'locations' || key === 'locations[]') return;
    
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
 * 
 * CRITICAL ROUTING RULE (2025 Architecture):
 * - Province searches → Path-based SEO URLs (/property-for-sale/gauteng)
 * - City/Suburb searches → Query-based SRP URLs (/property-for-sale?city=alberton)
 * 
 * This ensures:
 * - SEO pages are for discovery (provinces only)
 * - SRP pages fulfill user intent (cities/suburbs with listings)
 */
export function generateIntentUrl(intent: SearchIntent): string {
  const { transactionType, geography, filters } = intent;
  
  // 1. Determine base path
  let basePath = transactionType === 'to-rent' ? '/property-to-rent' : '/property-for-sale';
  
  if (transactionType === 'developments') {
    basePath = '/new-developments';
  }

  // 2. Build query params from filters
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    // Skip internal keys that shouldn't appear in URL
    if (key === 'listingType') return;
    if (!value) return;
    
    if (Array.isArray(value)) {
      value.forEach(v => queryParams.append(key, String(v)));
    } else {
      queryParams.set(key, String(value));
    }
  });

  // ============================================================
  // CRITICAL: City/Suburb searches MUST use query-based URLs
  // Path-based URLs are ONLY for province-level SEO pages
  // ============================================================
  
  if (geography.suburb) {
    // Suburb search → Query-based SRP
    queryParams.set('suburb', geography.suburb);
    if (geography.city) queryParams.set('city', geography.city);
    if (geography.province) queryParams.set('province', geography.province);
    
    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }
  
  if (geography.city) {
    // City search → Query-based SRP
    queryParams.set('city', geography.city);
    if (geography.province) queryParams.set('province', geography.province);
    
    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }
  
  // Province-only search → Path-based SEO page
  if (geography.province && geography.level === 'province') {
    const queryString = queryParams.toString();
    return `${basePath}/${geography.province}${queryString ? `?${queryString}` : ''}`;
  }
  
  // Country-level / no geography → Base transaction root
  const queryString = queryParams.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
}

