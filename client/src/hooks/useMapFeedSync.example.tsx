/**
 * Example usage of useMapFeedSync hook
 *
 * This file demonstrates how to integrate the useMapFeedSync hook
 * with Google Maps and a property feed.
 *
 * NOTE: This is an example file for documentation purposes.
 * It may not compile without additional setup.
 */

import React from 'react';
import { useMapFeedSync } from './useMapFeedSync';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PropertyCard } from '@/components/explore-discovery/cards/PropertyCard';

interface Property {
  id: number;
  title: string;
  price: number;
  latitude: number;
  longitude: number;
  imageUrl: string;
  beds?: number;
  baths?: number;
  size?: number;
}

export function MapFeedExample() {
  // Initialize the sync hook
  const {
    mapBounds,
    throttledMapBounds,
    selectedPropertyId,
    hoveredPropertyId,
    mapRef,
    feedScrollRef,
    handleMapLoad,
    handleMapPan,
    handleFeedItemSelect,
    handleMarkerClick,
    handlePropertyHover,
    registerPropertyRef,
    fitBoundsToProperties,
  } = useMapFeedSync({
    onBoundsChange: bounds => {
      console.log('Fetching properties for bounds:', bounds);
    },
    onPropertySelect: propertyId => {
      console.log('Property selected:', propertyId);
    },
  });

  // Fetch properties based on debounced map bounds
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', mapBounds],
    queryFn: async () => {
      if (!mapBounds) return [];

      // Simulate API call
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds: mapBounds }),
      });

      return response.json();
    },
    enabled: !!mapBounds,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fit bounds when properties load
  React.useEffect(() => {
    if (properties.length > 0) {
      fitBoundsToProperties(
        properties.map((p: Property) => ({ lat: p.latitude, lng: p.longitude })),
      );
    }
  }, [properties, fitBoundsToProperties]);

  return (
    <div className="flex h-screen">
      {/* Map View */}
      <div className="w-1/2 relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={{ lat: -26.2041, lng: 28.0473 }}
          zoom={10}
          onLoad={handleMapLoad}
          onDragEnd={() => {
            // Extract bounds and update
            const map = mapRef.current;
            if (map) {
              const bounds = map.getBounds();
              if (bounds) {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();

                handleMapPan({
                  north: ne.lat(),
                  south: sw.lat(),
                  east: ne.lng(),
                  west: sw.lng(),
                });
              }
            }
          }}
          onZoomChanged={() => {
            // Also update on zoom
            const map = mapRef.current;
            if (map) {
              const bounds = map.getBounds();
              if (bounds) {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();

                handleMapPan({
                  north: ne.lat(),
                  south: sw.lat(),
                  east: ne.lng(),
                  west: sw.lng(),
                });
              }
            }
          }}
        >
          {properties.map(property => (
            <Marker
              key={property.id}
              position={{ lat: property.latitude, lng: property.longitude }}
              onClick={() => handleMarkerClick(property.id)}
              icon={
                selectedPropertyId === property.id || hoveredPropertyId === property.id
                  ? {
                      url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(40, 40),
                      anchor: new google.maps.Point(20, 20),
                    }
                  : undefined
              }
            />
          ))}
        </GoogleMap>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}
      </div>

      {/* Feed View */}
      <div ref={feedScrollRef} className="w-1/2 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {properties.map((property: Property) => (
          <div
            key={property.id}
            ref={el => registerPropertyRef(property.id, el)}
            className={`transition-all ${
              selectedPropertyId === property.id ? 'ring-2 ring-blue-500 rounded-2xl' : ''
            }`}
            onMouseEnter={() => handlePropertyHover(property.id)}
            onMouseLeave={() => handlePropertyHover(null)}
            onClick={() =>
              handleFeedItemSelect(property.id, {
                lat: property.latitude,
                lng: property.longitude,
              })
            }
          >
            <PropertyCard property={property as any} onClick={() => {}} onSave={() => {}} />
          </div>
        ))}

        {properties.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-600">No properties found in this area</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example with custom delays
 */
export function MapFeedWithCustomDelays() {
  const sync = useMapFeedSync({
    throttleDelay: 200, // Faster throttle for more responsive UI
    debounceDelay: 500, // Longer debounce to reduce API calls
    initialCenter: { lat: -33.9249, lng: 18.4241 }, // Cape Town
  });

  // ... rest of implementation
}

/**
 * Example with analytics tracking
 */
export function MapFeedWithAnalytics() {
  // Assume analytics is available globally or imported
  const analytics = (window as any).analytics || { track: () => {} };

  const sync = useMapFeedSync({
    onBoundsChange: bounds => {
      // Track map movement
      analytics.track('map_bounds_changed', { bounds });
    },
    onPropertySelect: propertyId => {
      // Track property views
      analytics.track('property_viewed', { propertyId });
    },
  });

  // ... rest of implementation
}

/**
 * Example with search in area button
 */
export function MapFeedWithSearchButton() {
  const queryClient = useQueryClient();

  const {
    mapBounds,
    handleMapPan,
    // ... other hooks
  } = useMapFeedSync();

  const handleSearchInArea = () => {
    // Force refetch with current bounds
    if (mapBounds) {
      queryClient.invalidateQueries(['properties', mapBounds]);
    }
  };

  return (
    <div className="relative">
      {/* Map */}
      <GoogleMap>{/* ... markers */}</GoogleMap>

      {/* Search in area button */}
      <button
        onClick={handleSearchInArea}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 
                   px-4 py-2 bg-white shadow-lg rounded-full"
      >
        Search this area
      </button>
    </div>
  );
}
