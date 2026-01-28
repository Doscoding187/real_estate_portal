import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SearchFilters, propertyTypeToSlug, unslugify } from '@/lib/urlUtils';

interface ActiveFilterChipsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearAll?: () => void;
}

// Format price for display
function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `R${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `R${(price / 1000).toFixed(0)}K`;
  }
  return `R${price}`;
}

// Get display label for a filter
function getFilterLabel(key: string, value: any): string | null {
  switch (key) {
    case 'listingType':
      return value === 'sale' ? 'For Sale' : value === 'rent' ? 'To Rent' : null;
    case 'propertyType':
      const slug = propertyTypeToSlug[value];
      return slug ? unslugify(slug) : value;
    case 'city':
      return value;
    case 'suburb':
      return value;
    case 'minPrice':
      return `Min: ${formatPrice(value)}`;
    case 'maxPrice':
      return `Max: ${formatPrice(value)}`;
    case 'minBedrooms':
      return `${value}+ Beds`;
    case 'maxBedrooms':
      return `Up to ${value} Beds`;
    case 'minBathrooms':
      return `${value}+ Baths`;
    case 'furnished':
      return value ? 'Furnished' : null;
    case 'amenities':
      return Array.isArray(value) ? `${value.length} Amenities` : null;
    default:
      return null;
  }
}

export function ActiveFilterChips({ filters, onRemoveFilter, onClearAll }: ActiveFilterChipsProps) {
  // Only show removable filters (not listing type and property type which are in URL)
  const removableFilters = Object.entries(filters).filter(([key, value]) => {
    // Skip undefined/null values
    if (value === undefined || value === null) return false;
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) return false;
    // Skip false booleans
    if (typeof value === 'boolean' && !value) return false;
    // Include these filter types
    return [
      'minPrice',
      'maxPrice',
      'minBedrooms',
      'maxBedrooms',
      'minBathrooms',
      'maxBathrooms',
      'furnished',
      'amenities',
    ].includes(key);
  });

  if (removableFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {removableFilters.map(([key, value]) => {
        const label = getFilterLabel(key, value);
        if (!label) return null;

        return (
          <Badge
            key={key}
            variant="secondary"
            className="pl-3 pr-1.5 py-1 flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          >
            <span className="text-xs font-medium">{label}</span>
            <button
              onClick={() => onRemoveFilter(key as keyof SearchFilters)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}

      {removableFilters.length > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive underline-offset-4 hover:underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
