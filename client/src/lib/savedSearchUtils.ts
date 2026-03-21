import type { SearchFilters } from '@/lib/urlUtils';

function titleize(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getLocationLabel(filters: Partial<SearchFilters>): string {
  if (filters.suburb && filters.city) {
    return `${titleize(String(filters.suburb))}, ${titleize(filters.city)}`;
  }
  if (filters.city) return titleize(filters.city);
  if (filters.province) return titleize(filters.province);
  return 'South Africa';
}

function getPropertyDescriptor(filters: Partial<SearchFilters>): string {
  const bedrooms =
    filters.minBedrooms !== undefined
      ? `${filters.minBedrooms}${filters.maxBedrooms && filters.maxBedrooms !== filters.minBedrooms ? `-${filters.maxBedrooms}` : '+'} Bed`
      : '';
  const propertyType = filters.propertyType ? titleize(filters.propertyType) : 'Properties';

  return [bedrooms, propertyType].filter(Boolean).join(' ').trim() || 'Properties';
}

export function getSavedSearchSourceLabel(filters: Partial<SearchFilters>): string {
  if (filters.listingSource === 'manual') return 'Property Listings';
  if (filters.listingSource === 'development') return 'New Developments';
  return 'All Results';
}

export function getSavedSearchSuggestedName(filters: Partial<SearchFilters>): string {
  const sourceLabel = getSavedSearchSourceLabel(filters);
  const descriptor = getPropertyDescriptor(filters);
  const locationLabel = getLocationLabel(filters);

  return `${sourceLabel}: ${descriptor} in ${locationLabel}`;
}

export function getSavedSearchNotificationDescription(
  filters: Partial<SearchFilters>,
  frequency: 'never' | 'daily' | 'weekly' = 'weekly',
): string {
  const sourceLabel = getSavedSearchSourceLabel(filters).toLowerCase();
  const locationLabel = getLocationLabel(filters);

  if (frequency === 'never') {
    return `This search is saved for ${sourceLabel} in ${locationLabel}, with notifications turned off.`;
  }

  return `You'll get ${frequency} updates for ${sourceLabel} in ${locationLabel}.`;
}
