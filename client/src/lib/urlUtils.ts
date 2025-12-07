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
export function generatePropertyUrl(filters: SearchFilters): string {
  // If we have a city, we should try to use the hierarchical structure
  // /:province/:city or /:province/:city/:suburb
  if (filters.city) {
    const citySlug = slugify(filters.city);
    // If province is explicitly provided, use it, otherwise lookup
    const provinceSlug = filters.province 
      ? slugify(filters.province) 
      : (CITY_PROVINCE_MAP[citySlug] || 'properties'); // Fallback to 'properties' as "province" if unknown? No, that breaks hierarchy. 
      // Actually if unknown, maybe we shouldn't use hierarchy? 
      // But user wants "new urls". Let's assume most cities are mapped or fallback to a generic search.
      // If province is unknown, /properties/city-slug might collide with other routes?
      // Wouter routes: /:province/:city
      // If 'properties' is the first segment, it goes to SearchResults.
      // So falling back to '/properties?city=...' is safer for unknown cities.
    
    // Check if we found a province or have one
    const province = CITY_PROVINCE_MAP[citySlug] || (filters.province ? slugify(filters.province) : null);

    if (province) {
       const parts: string[] = ['', province, citySlug];
       
       if (filters.suburb) {
         parts.push(slugify(filters.suburb));
       }

       // Add query params for everything else
       const queryParams = new URLSearchParams();

       if (filters.listingType) queryParams.set('listingType', filters.listingType);
       if (filters.propertyType) queryParams.set('propertyType', filters.propertyType);
       
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

  // Fallback to legacy path building for non-location specific or unknown location searches
  const parts: string[] = ['/properties'];

  // Add listing type
  if (filters.listingType) {
    const slug = listingTypeToSlug[filters.listingType];
    if (slug) parts.push(slug);
  }

  // Add property type
  if (filters.propertyType) {
    const slug = propertyTypeToSlug[filters.propertyType];
    if (slug) parts.push(slug);
  }

  // Add city (if we are here, it means we didn't find a province map, so use query param or legacy path if desired)
  // But strictly new URLs should be /properties?city=... if not hierarchical
  // Let's keep existing behavior for /properties/... pathing if no city found matches map
  if (filters.city) {
    // parts.push(slugify(filters.city)); // Legacy behavior
    // If we want to be safe, stick to query params for unknown cities
  }

  // Build base URL
  let url = parts.join('/');

  // Add remaining filters as query params
  const queryParams = new URLSearchParams();
  
  // Ensure city/suburb are passed if they weren't used in path
  if (filters.city) queryParams.set('city', filters.city);
  if (filters.suburb) queryParams.set('suburb', filters.suburb);
  
  if (filters.listingType && !parts.includes(listingTypeToSlug[filters.listingType] || '')) queryParams.set('listingType', filters.listingType); // Redundant if in path?
  
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
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
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

  let currentPath = '/properties';

  // Listing type
  if (filters.listingType) {
    const slug = listingTypeToSlug[filters.listingType];
    if (slug) {
      currentPath += `/${slug}`;
      breadcrumbs.push({
        label: filters.listingType === 'sale' ? 'For Sale' : 'To Rent',
        href: currentPath,
      });
    }
  }

  // Property type
  if (filters.propertyType) {
    const slug = propertyTypeToSlug[filters.propertyType];
    if (slug) {
      currentPath += `/${slug}`;
      breadcrumbs.push({
        label: unslugify(slug),
        href: currentPath,
      });
    }
  }

  // City
  if (filters.city) {
    currentPath += `/${slugify(filters.city)}`;
    breadcrumbs.push({
      label: filters.city,
      href: currentPath,
    });
  }

  // Suburb
  if (filters.suburb) {
    currentPath += `/${slugify(filters.suburb)}`;
    breadcrumbs.push({
      label: filters.suburb,
      href: currentPath,
    });
  }

  return breadcrumbs;
}
