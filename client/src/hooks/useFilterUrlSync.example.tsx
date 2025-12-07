/**
 * Example usage of useFilterUrlSync hook
 * 
 * These examples demonstrate how to use the URL sync hook
 * in various Explore page scenarios.
 */

import { useFilterUrlSync } from './useFilterUrlSync';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Example 1: Basic Usage in Explore Page
// ============================================================================

export function ExploreHomeExample() {
  // Enable URL sync - that's all you need!
  useFilterUrlSync();
  
  // Access filters from store
  const filters = useExploreFiltersStore();
  
  return (
    <div className="explore-home">
      <h1>Explore Properties</h1>
      <p>Active filters: {filters.getFilterCount()}</p>
      
      {/* Your page content */}
    </div>
  );
}

// ============================================================================
// Example 2: With API Integration
// ============================================================================

export function ExploreWithAPIExample() {
  useFilterUrlSync();
  
  const filters = useExploreFiltersStore();
  
  // Filters automatically included in query key
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.propertyType) params.set('type', filters.propertyType);
      if (filters.priceMin) params.set('minPrice', filters.priceMin.toString());
      if (filters.priceMax) params.set('maxPrice', filters.priceMax.toString());
      if (filters.bedrooms) params.set('beds', filters.bedrooms.toString());
      if (filters.bathrooms) params.set('baths', filters.bathrooms.toString());
      
      const response = await fetch(`/api/properties?${params}`);
      return response.json();
    },
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Properties ({properties?.length || 0})</h2>
      {properties?.map((property: any) => (
        <div key={property.id}>{property.title}</div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 3: With Filter Panel
// ============================================================================

export function ExploreWithFiltersExample() {
  useFilterUrlSync();
  
  const {
    propertyType,
    bedrooms,
    bathrooms,
    setPropertyType,
    setBedrooms,
    setBathrooms,
    clearFilters,
    getFilterCount,
  } = useExploreFiltersStore();
  
  const filterCount = getFilterCount();
  
  return (
    <div className="explore-page">
      <aside className="filter-panel">
        <div className="filter-header">
          <h3>Filters</h3>
          {filterCount > 0 && (
            <button onClick={clearFilters} className="clear-btn">
              Clear ({filterCount})
            </button>
          )}
        </div>
        
        <div className="filter-group">
          <label>Property Type</label>
          <select
            value={propertyType || ''}
            onChange={(e) => setPropertyType(e.target.value || null)}
          >
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="development">Development</option>
            <option value="land">Land</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Bedrooms</label>
          <input
            type="number"
            value={bedrooms || ''}
            onChange={(e) => setBedrooms(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Any"
          />
        </div>
        
        <div className="filter-group">
          <label>Bathrooms</label>
          <input
            type="number"
            value={bathrooms || ''}
            onChange={(e) => setBathrooms(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Any"
          />
        </div>
      </aside>
      
      <main className="property-feed">
        {/* Property list */}
      </main>
    </div>
  );
}

// ============================================================================
// Example 4: Share Button with Current Filters
// ============================================================================

export function ShareFilteredViewExample() {
  useFilterUrlSync();
  
  const handleShare = () => {
    // URL is already synced, just copy it
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copied! Share this URL to show these exact filters.');
  };
  
  return (
    <div>
      <button onClick={handleShare} className="share-btn">
        📋 Share Filtered View
      </button>
    </div>
  );
}

// ============================================================================
// Example 5: Deep Link Handler
// ============================================================================

export function DeepLinkExample() {
  useFilterUrlSync();
  
  const filters = useExploreFiltersStore();
  
  // Check if user came from a deep link with filters
  const hasFiltersFromUrl = filters.getFilterCount() > 0;
  
  return (
    <div>
      {hasFiltersFromUrl && (
        <div className="deep-link-notice">
          <p>Showing results based on shared filters</p>
          <button onClick={() => filters.clearFilters()}>
            View all properties
          </button>
        </div>
      )}
      
      {/* Rest of page */}
    </div>
  );
}

// ============================================================================
// Example 6: Multiple Explore Pages with Consistent Sync
// ============================================================================

// ExploreHome.tsx
export function ExploreHome() {
  useFilterUrlSync();
  const filters = useExploreFiltersStore();
  
  return (
    <div>
      <h1>Explore Home</h1>
      {/* Content */}
    </div>
  );
}

// ExploreFeed.tsx
export function ExploreFeed() {
  useFilterUrlSync();
  const filters = useExploreFiltersStore();
  
  return (
    <div>
      <h1>Explore Feed</h1>
      {/* Content */}
    </div>
  );
}

// ExploreMap.tsx
export function ExploreMap() {
  useFilterUrlSync();
  const filters = useExploreFiltersStore();
  
  return (
    <div>
      <h1>Explore Map</h1>
      {/* Content */}
    </div>
  );
}

// ExploreShorts.tsx
export function ExploreShorts() {
  useFilterUrlSync();
  const filters = useExploreFiltersStore();
  
  return (
    <div>
      <h1>Explore Shorts</h1>
      {/* Content */}
    </div>
  );
}

// ============================================================================
// Example 7: Filter Badge with URL Awareness
// ============================================================================

export function FilterBadgeWithUrlExample() {
  useFilterUrlSync();
  
  const getFilterCount = useExploreFiltersStore(state => state.getFilterCount);
  const count = getFilterCount();
  
  if (count === 0) return null;
  
  return (
    <div className="filter-badge">
      <span>{count} active {count === 1 ? 'filter' : 'filters'}</span>
      <button
        onClick={() => {
          // Clearing filters will also clear URL params
          useExploreFiltersStore.getState().clearFilters();
        }}
        className="badge-clear"
      >
        ×
      </button>
    </div>
  );
}

// ============================================================================
// Example 8: Programmatic Navigation with Filters
// ============================================================================

export function NavigateWithFiltersExample() {
  const navigate = (path: string) => {
    // URL params are automatically preserved when navigating
    // between Explore pages because they all use useFilterUrlSync
    window.location.href = path;
  };
  
  return (
    <nav className="explore-nav">
      <button onClick={() => navigate('/explore')}>Home</button>
      <button onClick={() => navigate('/explore/feed')}>Feed</button>
      <button onClick={() => navigate('/explore/map')}>Map</button>
      <button onClick={() => navigate('/explore/shorts')}>Shorts</button>
    </nav>
  );
}

// ============================================================================
// Example 9: Reset Filters Button
// ============================================================================

export function ResetFiltersExample() {
  useFilterUrlSync();
  
  const { clearFilters, getFilterCount } = useExploreFiltersStore();
  const hasFilters = getFilterCount() > 0;
  
  if (!hasFilters) return null;
  
  return (
    <button
      onClick={clearFilters}
      className="reset-filters-btn"
    >
      Reset All Filters
    </button>
  );
}

// ============================================================================
// Example 10: Filter Preset Links
// ============================================================================

export function FilterPresetsExample() {
  useFilterUrlSync();
  
  const applyPreset = (preset: 'luxury' | 'affordable' | 'family') => {
    const { setPropertyType, setPriceRange, setBedrooms } = useExploreFiltersStore.getState();
    
    switch (preset) {
      case 'luxury':
        setPropertyType('residential');
        setPriceRange(1000000, null);
        setBedrooms(4);
        break;
      case 'affordable':
        setPropertyType('residential');
        setPriceRange(null, 500000);
        setBedrooms(2);
        break;
      case 'family':
        setPropertyType('residential');
        setBedrooms(3);
        break;
    }
  };
  
  return (
    <div className="filter-presets">
      <h3>Quick Filters</h3>
      <button onClick={() => applyPreset('luxury')}>Luxury Homes</button>
      <button onClick={() => applyPreset('affordable')}>Affordable</button>
      <button onClick={() => applyPreset('family')}>Family Homes</button>
    </div>
  );
}
