/**
 * URL Utilities for SEO-friendly property search URLs
 *
 * Builds the current transactional search URLs from explicit Place identity.
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

export function buildPropertyUrl(id: string | number, title?: string | null): string {
  const slug = slugify(String(title || ''));
  return slug ? `/property/${id}-${slug}` : `/property/${id}`;
}

// Search filters type
export interface SearchFilters {
  canonicalPlaceId?: string;
  listingType?: 'sale' | 'rent' | 'rent_to_buy' | 'auction';
  listingSource?: 'manual' | 'development';
  propertyType?: string;
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
  [key: string]: unknown;
}

const RETIRED_GEOGRAPHY_FILTER_KEYS = [
  'province',
  'city',
  'suburb',
  'location',
  'slug',
  'locationId',
  'factualLocationId',
  'locationIds',
  'locations',
  'canonicalPlaceIds',
  'searchAreaId',
  'searchAreaIds',
] as const;

import { generateIntentUrl, SearchIntent, type TransactionType } from './searchIntent';
import { toAbsoluteUrl } from './seo/structuredData';
import { normalizeTransactionalResultState } from '../../../shared/transactionalSearchState';

// Helper to bridge SearchFilters -> SearchIntent for URL generation
function filtersToIntent(filters: SearchFilters): SearchIntent {
  const transactionType: TransactionType | null =
    filters.listingType === 'rent' ? 'to-rent' : filters.listingType === 'sale' ? 'for-sale' : null;

  return {
    transactionType,
    geography: {
      level: filters.canonicalPlaceId ? 'canonical_place' : 'country',
      ...(filters.canonicalPlaceId ? { canonicalPlaceId: filters.canonicalPlaceId } : {}),
    },
    filters: filters, // Pass full filters as query params source
    resultState: normalizeTransactionalResultState({
      sort: filters.sort as any,
      page: filters.page as any,
    }),
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
  };
}

// Generate SEO-friendly URL from filters
export function generatePropertyUrl(filters: SearchFilters): string {
  if (
    RETIRED_GEOGRAPHY_FILTER_KEYS.some(key => {
      const value = filters[key];
      return value !== undefined && value !== null && value !== '';
    })
  ) {
    return '/';
  }

  const journey =
    filters.listingType === 'rent' ? 'rent' : filters.listingType === 'sale' ? 'buy' : undefined;

  if (filters.canonicalPlaceId && journey) {
    return generateIntentUrl(filtersToIntent(filters));
  }

  // Use the single source of truth: searchIntent.ts
  const intent = filtersToIntent(filters);
  return generateIntentUrl(intent);
}

/**
 * Generates the canonical URL for the current page state.
 * This should return the "clean" URL without tracking params or transient state.
 */
export function generateCanonicalUrl(filters: SearchFilters): string {
  // Canonical URL should be clean, maybe stripped of some filters?
  // P24 uses clean path + query params.
  // Spec says: "Any URL with query parameters... NoIndex" implied?
  // Canonical usually means the "main" URL for this content.
  // If filtering by price, canonical might be the base search URL or the filtered one depending on strategy.
  // P24 canonical tags on search pages usually point to the version without sort orders etc., but keep vital filters.
  // For now, let's return the intent URL exactly as it represents the resource.

  return toAbsoluteUrl(generatePropertyUrl(filters));
}

// Generate page title for SEO. Place labels are supplied by the resolved Place response.
export function generatePageTitle(filters: SearchFilters, placeLabel?: string | null): string {
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

  if (placeLabel) parts.push(`in ${placeLabel}`);

  return parts.join(' ') + ' | Property Listify';
}

// Generate meta description for SEO
export function generateMetaDescription(
  filters: SearchFilters,
  resultCount?: number,
  placeLabel?: string | null,
): string {
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

  if (placeLabel) parts.push(`in ${placeLabel}`);

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

export function generateBreadcrumbs(
  filters: SearchFilters,
  placeLabel?: string | null,
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  const isRent = filters.listingType === 'rent';
  const hasTransaction = filters.listingType === 'rent' || filters.listingType === 'sale';
  const rootLabel = isRent ? 'For Rent' : hasTransaction ? 'For Sale' : 'Explore';
  const rootHref = hasTransaction ? generatePropertyUrl({ listingType: filters.listingType }) : '/';

  breadcrumbs.push({
    label: rootLabel,
    href: rootHref,
  });

  if (filters.canonicalPlaceId && placeLabel) {
    breadcrumbs.push({ label: placeLabel, href: generatePropertyUrl(filters) });
  }

  return breadcrumbs;
}
