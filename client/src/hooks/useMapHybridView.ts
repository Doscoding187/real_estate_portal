import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface PropertyMapItem {
  id: number;
  title: string;
  price: number;
  priceMax?: number;
  latitude: number;
  longitude: number;
  imageUrl: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  size?: number;
  location: string;
  isSponsored?: boolean;
}

export interface MapViewport {
  center: { lat: number; lng: number };
  zoom: number;
  bounds?: google.maps.LatLngBounds;
}

interface UseMapHybridViewOptions {
  categoryId?: number;
  filters?: Record<string, any>;
  initialViewport?: MapViewport;
}

export function useMapHybridView(options: UseMapHybridViewOptions = {}) {
  const [viewport, setViewport] = useState<MapViewport>(
    options.initialViewport || {
      center: { lat: -26.2041, lng: 28.0473 }, // Johannesburg
      zoom: 10,
    }
  );
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);
  const [properties, setProperties] = useState<PropertyMapItem[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const boundsChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch properties within map bounds
  const { data: propertiesData, isLoading, refetch } = useQuery({
    queryKey: ['mapProperties', viewport.bounds, options.categoryId, options.filters],
    queryFn: async () => {
      if (!viewport.bounds) return [];

      const ne = viewport.bounds.getNorthEast();
      const sw = viewport.bounds.getSouthWest();

      const response = await apiClient.exploreApi.getFeed.query({
        categoryId: options.categoryId,
        filters: {
          ...options.filters,
          bounds: {
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
          },
        },
        limit: 100,
      });

      return response.content
        .filter((item: any) => item.contentType === 'property' && item.locationLat && item.locationLng)
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          price: item.priceMin || item.price,
          priceMax: item.priceMax,
          latitude: item.locationLat,
          longitude: item.locationLng,
          imageUrl: item.thumbnailUrl || item.imageUrl,
          propertyType: item.propertyType || 'Property',
          beds: item.beds,
          baths: item.baths,
          size: item.size,
          location: item.location || `${item.city}, ${item.province}`,
          isSponsored: item.isSponsored,
        }));
    },
    enabled: !!viewport.bounds,
  });

  // Update properties when data changes
  useEffect(() => {
    if (propertiesData) {
      setProperties(propertiesData);
    }
  }, [propertiesData]);

  // Handle map load
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Set initial bounds
    const bounds = map.getBounds();
    if (bounds) {
      setViewport(prev => ({ ...prev, bounds }));
    }
  }, []);

  // Handle map bounds change (debounced)
  const handleBoundsChanged = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing timeout
    if (boundsChangeTimeoutRef.current) {
      clearTimeout(boundsChangeTimeoutRef.current);
    }

    // Debounce bounds change
    boundsChangeTimeoutRef.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      const bounds = map.getBounds();
      const center = map.getCenter();
      const zoom = map.getZoom();

      if (bounds && center && zoom) {
        setViewport({
          center: { lat: center.lat(), lng: center.lng() },
          zoom,
          bounds,
        });
      }
    }, 500); // 500ms debounce
  }, []);

  // Handle property selection from map
  const handlePropertySelect = useCallback((propertyId: number) => {
    setSelectedPropertyId(propertyId);
    
    // Find property and scroll card into view
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      // Emit event for card feed to scroll to this property
      window.dispatchEvent(new CustomEvent('scrollToProperty', { detail: { propertyId } }));
    }
  }, [properties]);

  // Handle property highlight from card scroll
  const handlePropertyHighlight = useCallback((propertyId: number | null) => {
    setHighlightedPropertyId(propertyId);
    
    // Pan map to property if highlighted
    if (propertyId && mapRef.current) {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        mapRef.current.panTo({ lat: property.latitude, lng: property.longitude });
      }
    }
  }, [properties]);

  // Search in current area
  const searchInArea = useCallback(() => {
    refetch();
  }, [refetch]);

  // Fit bounds to show all properties
  const fitBounds = useCallback(() => {
    if (!mapRef.current || properties.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    properties.forEach(property => {
      bounds.extend({ lat: property.latitude, lng: property.longitude });
    });

    mapRef.current.fitBounds(bounds);
  }, [properties]);

  // Pan to specific property
  const panToProperty = useCallback((propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    if (property && mapRef.current) {
      mapRef.current.panTo({ lat: property.latitude, lng: property.longitude });
      mapRef.current.setZoom(15);
      setSelectedPropertyId(propertyId);
    }
  }, [properties]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }
    };
  }, []);

  return {
    properties,
    viewport,
    selectedPropertyId,
    highlightedPropertyId,
    isLoading,
    mapRef,
    handleMapLoad,
    handleBoundsChanged,
    handlePropertySelect,
    handlePropertyHighlight,
    searchInArea,
    fitBounds,
    panToProperty,
  };
}
