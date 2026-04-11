import type { SearchFilters } from '@/lib/urlUtils';

export interface SavedSearchDeliveryPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

export const DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES: SavedSearchDeliveryPreferences = {
  emailEnabled: true,
  inAppEnabled: true,
};

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
  frequency: 'never' | 'instant' | 'daily' | 'weekly' = 'weekly',
  deliveryPreferences: SavedSearchDeliveryPreferences = DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES,
): string {
  const sourceLabel = getSavedSearchSourceLabel(filters).toLowerCase();
  const locationLabel = getLocationLabel(filters);
  const deliveryLabel = getSavedSearchDeliveryLabel(deliveryPreferences).toLowerCase();

  if (!deliveryPreferences.emailEnabled && !deliveryPreferences.inAppEnabled) {
    return `This search is saved for ${sourceLabel} in ${locationLabel}, with delivery paused.`;
  }

  if (frequency === 'never') {
    return `This search is saved for ${sourceLabel} in ${locationLabel}, with notifications turned off.`;
  }

  if (frequency === 'instant') {
    return `You'll get instant ${deliveryLabel} updates for ${sourceLabel} in ${locationLabel}.`;
  }

  return `You'll get ${frequency} ${deliveryLabel} updates for ${sourceLabel} in ${locationLabel}.`;
}

export function getSavedSearchDeliveryLabel(
  deliveryPreferences: SavedSearchDeliveryPreferences = DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES,
): string {
  if (deliveryPreferences.emailEnabled && deliveryPreferences.inAppEnabled) {
    return 'Email + in-app';
  }
  if (deliveryPreferences.emailEnabled) {
    return 'Email';
  }
  if (deliveryPreferences.inAppEnabled) {
    return 'In-app';
  }
  return 'No alerts';
}
