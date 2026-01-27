/**
 * URL Utilities for SEO-friendly property search URLs
 *
 * Converts between filter objects and URL-friendly slugs
 * Example: { listingType: 'sale', propertyType: 'house', city: 'Johannesburg' }
 *       -> /houses-for-sale/johannesburg/gauteng/123
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
  auction: 'auction',
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
  apartments: 'apartment',
  houses: 'house',
  townhouses: 'townhouse',
  villas: 'villa',
  plots: 'plot',
  land: 'land',
  commercial: 'commercial',
  farms: 'farm',
  'cluster-homes': 'cluster_home',
  'shared-living': 'shared_living',
  offices: 'office',
  retail: 'retail',
  industrial: 'industrial',
  warehouses: 'warehouse',
};

// Convert text to URL-safe slug
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Convert slug back to display name
export function unslugify(slug: string): string {
  if (!slug) return '';
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
  locationId?: string; // Added to support P24 ID
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
  locations?: {
    slug: string;
    type: 'province' | 'city' | 'suburb';
    citySlug?: string;
    provinceSlug?: string;
    id?: string; // locationId for this location
  }[];
  // Additional filters stored in query params
  [key: string]: any;
}

// Import shared location utils
import { CITY_PROVINCE_MAP } from './locationUtils';
import { generateIntentUrl, SearchIntent } from './searchIntent';

// Helper to bridge SearchFilters -> SearchIntent for URL generation
function filtersToIntent(filters: SearchFilters): SearchIntent {
  return {
    transactionType: filters.listingType === 'rent' ? 'to-rent' : 'for-sale', // default
    geography: {
      level: filters.suburb
        ? 'locality'
        : filters.city
          ? 'city'
          : filters.province
            ? 'province'
            : 'country',
      province: filters.province,
      city: filters.city,
      suburb: filters.suburb,
      locationId: filters.locationId,
    },
    filters: filters, // Pass full filters as query params source
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
  };
}

// Generate SEO-friendly URL from filters
export function generatePropertyUrl(filters: SearchFilters): string {
  // Use the single source of truth: searchIntent.ts
  const intent = filtersToIntent(filters);
  return generateIntentUrl(intent);
}

/**
 * Generates the canonical URL for the current page state.
 * This should return the "clean" URL without tracking params or transient state.
 */
export function generateCanonicalUrl(filters: SearchFilters): string {
  const intent = filtersToIntent(filters);

  // Canonical URL should be clean, maybe stripped of some filters?
  // P24 uses clean path + query params.
  // Spec says: "Any URL with query parameters... NoIndex" implied?
  // Canonical usually means the "main" URL for this content.
  // If filtering by price, canonical might be the base search URL or the filtered one depending on strategy.
  // P24 canonical tags on search pages usually point to the version without sort orders etc., but keep vital filters.
  // For now, let's return the intent URL exactly as it represents the resource.

  return `https://propertylistify.com${generateIntentUrl(intent)}`;
}

// Parse URL params back to filters
export interface ParsedUrlParams {
  listingType?: string;
  propertyType?: string;
  location?: string; // city or suburb
  suburb?: string;
}

export function parsePropertyUrl(
  params: ParsedUrlParams,
  searchParams?: URLSearchParams,
): SearchFilters {
  // This function is less critical now as we rely on resolveSearchIntent
  // But strictly for backward compatibility or simple parsing:
  const filters: SearchFilters = {};
  // ... (keep existing logic if needed, but we mostly use resolveSearchIntent now)
  // Just simplified return for now as heavy lifting is in searchIntent
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

  return (
    parts.join(' ') +
    '. View photos, prices, and features. Contact agents directly on Property Listify.'
  );
}

// Generate breadcrumb items
export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function generateBreadcrumbs(filters: SearchFilters): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  // Breadcrumbs: Property for Sale > Province > City > Suburb
  // But URL structure is Inverted or specific.
  // We must generate HREF for each crumb using GeneratePropertyUrl (which calls generateIntentUrl).

  const isRent = filters.listingType === 'rent';
  const rootLabel = isRent ? 'For Rent' : 'For Sale';
  // Root URL: /property-for-sale
  const rootHref = generatePropertyUrl({ listingType: filters.listingType });

  breadcrumbs.push({
    label: rootLabel,
    href: rootHref,
  });

  // Province
  if (filters.province) {
    const provinceHref = generatePropertyUrl({
      listingType: filters.listingType,
      province: filters.province,
      // No locationId for province usually, or maybe we have one?
      // If we don't have it, logic relies on fallback or slug lookup if intent supports it.
      // P24 Province pages have IDs too: /property-for-sale/gauteng/1
    });

    breadcrumbs.push({
      label: filters.province,
      href: provinceHref,
    });

    // City (Only if Province exists)
    if (filters.city) {
      const cityHref = generatePropertyUrl({
        listingType: filters.listingType,
        province: filters.province,
        city: filters.city,
      });

      breadcrumbs.push({
        label: filters.city,
        href: cityHref,
      });

      // Suburb (Only if City exists)
      if (filters.suburb) {
        const suburbHref = generatePropertyUrl({
          listingType: filters.listingType,
          province: filters.province,
          city: filters.city,
          suburb: filters.suburb,
          locationId: filters.locationId, // Pass specific ID for the leaf node
        });

        breadcrumbs.push({
          label: filters.suburb,
          href: suburbHref,
        });
      }
    }
  }

  return breadcrumbs;
}
