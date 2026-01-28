import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

/**
 * Hook to synchronize filter state with URL query parameters
 *
 * Features:
 * - Bidirectional sync: Store ↔ URL
 * - Updates URL without page reload (replaceState)
 * - Reads URL params on mount and syncs to store
 * - Prevents infinite loops with ref tracking
 *
 * Usage:
 * ```tsx
 * function ExplorePage() {
 *   useFilterUrlSync(); // Just call it once at the top level
 *   // Rest of component...
 * }
 * ```
 *
 * Requirements: 4.2, 11.7
 */
export function useFilterUrlSync() {
  const [location] = useLocation();
  const filters = useExploreFiltersStore();
  const isInitialMount = useRef(true);
  const lastUrlUpdate = useRef<string>('');

  // Sync URL to filters on mount (only once)
  useEffect(() => {
    if (!isInitialMount.current) return;

    const params = new URLSearchParams(window.location.search);

    const type = params.get('type');
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const beds = params.get('beds');
    const baths = params.get('baths');
    const category = params.get('category');
    const loc = params.get('location');

    // Only update if there are params to sync
    if (type || minPrice || maxPrice || beds || baths || category || loc) {
      if (type) filters.setPropertyType(type);
      if (minPrice || maxPrice) {
        filters.setPriceRange(
          minPrice ? parseInt(minPrice, 10) : null,
          maxPrice ? parseInt(maxPrice, 10) : null,
        );
      }
      if (beds) filters.setBedrooms(parseInt(beds, 10));
      if (baths) filters.setBathrooms(parseInt(baths, 10));
      if (category) filters.setCategoryId(parseInt(category, 10));
      if (loc) filters.setLocation(loc);
    }

    isInitialMount.current = false;
  }, []); // Only run on mount

  // Sync filters to URL whenever filters change
  useEffect(() => {
    // Skip on initial mount (handled above)
    if (isInitialMount.current) return;

    const params = new URLSearchParams();

    // Add non-null filters to URL params
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.priceMin !== null) params.set('minPrice', filters.priceMin.toString());
    if (filters.priceMax !== null) params.set('maxPrice', filters.priceMax.toString());
    if (filters.bedrooms !== null) params.set('beds', filters.bedrooms.toString());
    if (filters.bathrooms !== null) params.set('baths', filters.bathrooms.toString());
    if (filters.categoryId !== null) params.set('category', filters.categoryId.toString());
    if (filters.location) params.set('location', filters.location);

    const queryString = params.toString();
    const basePath = location.split('?')[0];
    const newUrl = queryString ? `${basePath}?${queryString}` : basePath;

    // Only update if URL actually changed (prevent infinite loops)
    if (
      newUrl !== lastUrlUpdate.current &&
      newUrl !== window.location.pathname + window.location.search
    ) {
      lastUrlUpdate.current = newUrl;
      window.history.replaceState({}, '', newUrl);
    }
  }, [
    filters.propertyType,
    filters.priceMin,
    filters.priceMax,
    filters.bedrooms,
    filters.bathrooms,
    filters.categoryId,
    filters.location,
    location,
  ]);
}
