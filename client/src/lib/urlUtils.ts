/**
 * URL Utilities for SEO-friendly property search URLs
 * 
 * Converts between filter objects and URL-friendly slugs
 * Example: { listingType: 'sale', propertyType: 'house', city: 'Johannesburg' }
 *       -> /properties/for-sale/houses/johannesburg
 */

// Slug mappings for listing types
export const listingTypeToSlug: Record<string, string> = {
  sale: 'for-sale',
  rent: 'to-rent',
  rent_to_buy: 'rent-to-buy',
  auction: 'auction',
};

export const slugToListingType: Record<string, string> = {
  'for-sale': 'sale',
  'to-rent': 'rent',
  'rent-to-buy': 'rent_to_buy',
  'auction': 'auction',
};

// Slug mappings for property types (singular to plural for URLs)
export const propertyTypeToSlug: Record<string, string> = {
  apartment: 'apartments',
  house: 'houses',
  townhouse: 'townhouses',
  villa: 'villas',
  plot: 'plots',
  land: 'land',
  commercial: 'commercial',
  farm: 'farms',
  cluster_home: 'cluster-homes',
  shared_living: 'shared-living',
  office: 'offices',
  retail: 'retail',
  industrial: 'industrial',
  warehouse: 'warehouses',
};

export const slugToPropertyType: Record<string, string> = {
  'apartments': 'apartment',
  'houses': 'house',
  'townhouses': 'townhouse',
  'villas': 'villa',
  'plots': 'plot',
  'land': 'land',
  'commercial': 'commercial',
  'farms': 'farm',
  'cluster-homes': 'cluster_home',
  'shared-living': 'shared_living',
  'offices': 'office',
  'retail': 'retail',
  'industrial': 'industrial',
  'warehouses': 'warehouse',
};

// Convert text to URL-safe slug
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Convert slug back to display name
export function unslugify(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Search filters type
export interface SearchFilters {
  listingType?: 'sale' | 'rent' | 'rent_to_buy' | 'auction';
  propertyType?: string;
  city?: string;
  suburb?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  amenities?: string[];
  furnished?: boolean;
  // Additional filters stored in query params
  [key: string]: any;
}

// Import shared location utils
import { CITY_PROVINCE_MAP } from './locationUtils';

// Generate SEO-friendly URL from filters
// Generate SEO-friendly URL from filters
export function generatePropertyUrl(filters: SearchFilters): string {
  // Determine root based on listing type (Transaction First)
  const isRent = filters.listingType === 'rent';
  const root = isRent ? '/property-to-rent' : '/property-for-sale';
  
  // If we have a city, we MUST include province for canonical structure
  if (filters.city) {
    const citySlug = slugify(filters.city);
    // Lookup province from map or use provided province
    const provinceSlug = filters.province 
      ? slugify(filters.province) 
      : (CITY_PROVINCE_MAP[citySlug] || null);

    if (provinceSlug) {
       const parts: string[] = [root, provinceSlug, citySlug];
       
       if (filters.suburb) {
         parts.push(slugify(filters.suburb));
       }

       // Add pre-defined filter segments if applicable (future proofing)
       // For now, standard filters go to query params to ensure noindex
       // unless we explicitly create "Filtered SRPs" in the future.

       // Add query params for everything else
       const queryParams = new URLSearchParams();

       // We don't need listingType in query param if it's in the root
       if (filters.propertyType) queryParams.set('propertyType', filters.propertyType); // Or could be part of path in future
       
       if (filters.minPrice) queryParams.set('minPrice', filters.minPrice.toString());
       if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice.toString());
       if (filters.minBedrooms) queryParams.set('minBedrooms', filters.minBedrooms.toString());
       if (filters.maxBedrooms) queryParams.set('maxBedrooms', filters.maxBedrooms.toString());
       if (filters.minBathrooms) queryParams.set('minBathrooms', filters.minBathrooms.toString());
       if (filters.maxBathrooms) queryParams.set('maxBathrooms', filters.maxBathrooms.toString());
       if (filters.minArea) queryParams.set('minArea', filters.minArea.toString());
       if (filters.maxArea) queryParams.set('maxArea', filters.maxArea.toString());
       if (filters.furnished) queryParams.set('furnished', 'true');
       if (filters.amenities?.length) queryParams.set('amenities', filters.amenities.join(','));

        const queryString = queryParams.toString();
        return parts.join('/') + (queryString ? `?${queryString}` : '');
    }
  }

  // Fallback for Province-only or Unknown Location
  if (filters.province) {
      return `${root}/${slugify(filters.province)}`;
  }

  // Fallback for Generic Search (Root)
  // If only Property Type is selected: /property-for-sale?type=house
  const queryParams = new URLSearchParams();
  if (filters.propertyType) queryParams.set('propertyType', filters.propertyType);
  
  // Add other filters
  if (filters.minPrice) queryParams.set('minPrice', filters.minPrice.toString());
  // ... (copy rest of filters)
  if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice.toString());
  if (filters.minBedrooms) queryParams.set('minBedrooms', filters.minBedrooms.toString());
  if (filters.amenities?.length) queryParams.set('amenities', filters.amenities.join(','));

  const queryString = queryParams.toString();
  return root + (queryString ? `?${queryString}` : '');
}

/**
 * Generates the canonical URL for the current page state.
 * This should return the "clean" URL without tracking params or transient state.
 */
export function generateCanonicalUrl(filters: SearchFilters): string {
    // Re-use generatePropertyUrl but ensure we strip non-canonical params manually if needed?
    // generatePropertyUrl above puts standard filters in query params.
    // BUT the requirement is: "Any URL with query parameters... NoIndex".
    // So the CANONICAL url should NOT have query params.
    
    // So distinct from generatePropertyUrl, this should return the base path level.
    
    const isRent = filters.listingType === 'rent';
    const root = isRent ? '/property-to-rent' : '/property-for-sale';
    
    if (filters.city) {
        const citySlug = slugify(filters.city);
        const provinceSlug = filters.province 
          ? slugify(filters.province) 
          : (CITY_PROVINCE_MAP[citySlug] || null);
          
        if (provinceSlug) {
            let path = `${root}/${provinceSlug}/${citySlug}`;
            if (filters.suburb) {
                path += `/${slugify(filters.suburb)}`;
            }
            // TODO: If we implement pre-defined filter slugs (e.g. /3-bedroom-houses), append them here.
            return `https://propertylistify.com${path}`;
        }
    }
    
    if (filters.province) {
         return `https://propertylistify.com${root}/${slugify(filters.province)}`;
    }
    
    return `https://propertylistify.com${root}`;
}

// Parse URL params back to filters
export interface ParsedUrlParams {
  listingType?: string;
  propertyType?: string;
  location?: string; // city or suburb
  suburb?: string;
}

export function parsePropertyUrl(params: ParsedUrlParams, searchParams?: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};

  // Parse listing type from slug
  if (params.listingType) {
    const listingType = slugToListingType[params.listingType];
    if (listingType) {
      filters.listingType = listingType as SearchFilters['listingType'];
    }
  }

  // Parse property type from slug
  if (params.propertyType) {
    const propertyType = slugToPropertyType[params.propertyType];
    if (propertyType) {
      filters.propertyType = propertyType;
    }
  }

  // Parse location (city)
  if (params.location) {
    filters.city = unslugify(params.location);
  }

  // Parse suburb
  if (params.suburb) {
    filters.suburb = unslugify(params.suburb);
  }

  // Parse query params
  if (searchParams) {
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minBedrooms = searchParams.get('minBedrooms');
    const maxBedrooms = searchParams.get('maxBedrooms');
    const minBathrooms = searchParams.get('minBathrooms');
    const maxBathrooms = searchParams.get('maxBathrooms');
    const minArea = searchParams.get('minArea');
    const maxArea = searchParams.get('maxArea');
    const furnished = searchParams.get('furnished');
    const amenities = searchParams.get('amenities');

    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);
    if (minBedrooms) filters.minBedrooms = parseInt(minBedrooms);
    if (maxBedrooms) filters.maxBedrooms = parseInt(maxBedrooms);
    if (minBathrooms) filters.minBathrooms = parseInt(minBathrooms);
    if (maxBathrooms) filters.maxBathrooms = parseInt(maxBathrooms);
    if (minArea) filters.minArea = parseInt(minArea);
    if (maxArea) filters.maxArea = parseInt(maxArea);
    if (furnished === 'true') filters.furnished = true;
    if (amenities) filters.amenities = amenities.split(',');
  }

  return filters;
}

// Parse legacy query params (for backward compatibility)
export function parseLegacyQueryParams(searchParams: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};

  // Legacy param mappings
  const listingType = searchParams.get('listingType');
  const propertyType = searchParams.get('propertyType') || searchParams.get('type');
  const city = searchParams.get('city') || searchParams.get('search');
  const suburb = searchParams.get('suburb');

  if (listingType) filters.listingType = listingType as SearchFilters['listingType'];
  if (propertyType) filters.propertyType = propertyType;
  if (city) filters.city = city;
  if (suburb) filters.suburb = suburb;

  // Parse numeric filters
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const minBedrooms = searchParams.get('minBedrooms');

  if (minPrice) filters.minPrice = parseInt(minPrice);
  if (maxPrice) filters.maxPrice = parseInt(maxPrice);
  if (minBedrooms) filters.minBedrooms = parseInt(minBedrooms);

  return filters;
}

// Generate page title for SEO
export function generatePageTitle(filters: SearchFilters): string {
  const parts: string[] = [];

  // Property type
  if (filters.propertyType) {
    const slug = propertyTypeToSlug[filters.propertyType];
    parts.push(unslugify(slug || filters.propertyType));
  } else {
    parts.push('Properties');
  }

  // Listing type
  if (filters.listingType === 'sale') {
    parts.push('for Sale');
  } else if (filters.listingType === 'rent') {
    parts.push('to Rent');
  }

  // Location
  if (filters.suburb && filters.city) {
    parts.push(`in ${filters.suburb}, ${filters.city}`);
  } else if (filters.city) {
    parts.push(`in ${filters.city}`);
  }

  return parts.join(' ') + ' | Property Listify';
}

// Generate meta description for SEO
export function generateMetaDescription(filters: SearchFilters, resultCount?: number): string {
  const parts: string[] = [];

  if (resultCount !== undefined) {
    parts.push(`Browse ${resultCount}`);
  } else {
    parts.push('Find');
  }

  // Property type
  if (filters.propertyType) {
    const slug = propertyTypeToSlug[filters.propertyType];
    parts.push(unslugify(slug || filters.propertyType).toLowerCase());
  } else {
    parts.push('properties');
  }

  // Listing type
  if (filters.listingType === 'sale') {
    parts.push('for sale');
  } else if (filters.listingType === 'rent') {
    parts.push('to rent');
  }

  // Location
  if (filters.city) {
    parts.push(`in ${filters.city}`);
    if (filters.suburb) {
      parts[parts.length - 1] = `in ${filters.suburb}, ${filters.city}`;
    }
  }

  return parts.join(' ') + '. View photos, prices, and features. Contact agents directly on Property Listify.';
}

// Generate breadcrumb items
export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function generateBreadcrumbs(filters: SearchFilters): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
  ];

  // Determine Root (Transaction Type)
  const isRent = filters.listingType === 'rent';
  // Default to 'For Sale' if not specified, or respect 'To Rent'
  const rootLabel = isRent ? 'For Rent' : 'For Sale';
  const rootPath = isRent ? '/property-to-rent' : '/property-for-sale';
  
  breadcrumbs.push({
    label: rootLabel,
    href: rootPath
  });

  // Province
  if (filters.province) {
    const provinceSlug = slugify(filters.province);
    const provincePath = `${rootPath}/${provinceSlug}`;
    breadcrumbs.push({
      label: filters.province,
      href: provincePath
    });

    // City (Only if Province exists)
    if (filters.city) {
      const citySlug = slugify(filters.city);
      const cityPath = `${provincePath}/${citySlug}`;
      breadcrumbs.push({
        label: filters.city,
        href: cityPath
      });

      // Suburb (Only if City exists)
      if (filters.suburb) {
        const suburbSlug = slugify(filters.suburb);
        const suburbPath = `${cityPath}/${suburbSlug}`;
        breadcrumbs.push({
          label: filters.suburb,
          href: suburbPath
        });
      }
    }
  }

  return breadcrumbs;
}
