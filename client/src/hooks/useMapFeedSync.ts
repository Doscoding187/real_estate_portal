import { useState, useCallback, useRef, useEffect } from 'react';
import { useThrottle } from './useThrottle';
import { useDebounce } from './useDebounce';

/**
 * Map bounds interface matching Google Maps LatLngBounds
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Map/Feed synchronization state
 */
export interface MapFeedSyncState {
  mapBounds: MapBounds | null;
  selectedPropertyId: number | null;
  hoveredPropertyId: number | null;
  mapCenter: { lat: number; lng: number } | null;
}

/**
 * Options for useMapFeedSync hook
 */
export interface UseMapFeedSyncOptions {
  /**
   * Throttle delay for map pan updates (default: 250ms)
   */
  throttleDelay?: number;
  
  /**
   * Debounce delay for feed updates (default: 300ms)
   */
  debounceDelay?: number;
  
  /**
   * Initial map center
   */
  initialCenter?: { lat: number; lng: number };
  
  /**
   * Callback when map bounds change (after debounce)
   */
  onBoundsChange?: (bounds: MapBounds) => void;
  
  /**
   * Callback when property is selected
   */
  onPropertySelect?: (propertyId: number) => void;
}

/**
 * Hook for synchronizing map and feed interactions with throttling and debouncing
 * 
 * Features:
 * - Throttled map pan updates (250ms default)
 * - Debounced feed updates (300ms default)
 * - Selected property state management
 * - Map center animation logic
 * - Feed scroll-to-item logic
 * 
 * @param options - Configuration options
 * @returns Map/feed sync state and handlers
 * 
 * @example
 * ```tsx
 * const {
 *   mapBounds,
 *   selectedPropertyId,
 *   handleMapPan,
 *   handleFeedItemSelect,
 *   handleMarkerClick,
 * } = useMapFeedSync({
 *   onBoundsChange: (bounds) => refetchProperties(bounds),
 *   onPropertySelect: (id) => trackPropertyView(id),
 * });
 * ```
 */
export function useMapFeedSync(options: UseMapFeedSyncOptions = {}) {
  const {
    throttleDelay = 250,
    debounceDelay = 300,
    initialCenter = { lat: -26.2041, lng: 28.0473 }, // Johannesburg
    onBoundsChange,
    onPropertySelect,
  } = options;

  // Core state
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(initialCenter);

  // Refs for map and feed elements
  const mapRef = useRef<google.maps.Map | null>(null);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const propertyRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Throttle map bounds updates (250ms)
  const throttledMapBounds = useThrottle(mapBounds, throttleDelay);

  // Debounce feed updates (300ms)
  const debouncedMapBounds = useDebounce(throttledMapBounds, debounceDelay);

  /**
   * Handle map pan - updates map bounds with throttling
   * This is called frequently during map dragging
   */
  const handleMapPan = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  /**
   * Handle map load - store map reference
   */
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Get initial bounds
    const bounds = map.getBounds();
    if (bounds) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      setMapBounds({
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });
    }
  }, []);

  /**
   * Handle feed item selection - centers map on property
   * Includes smooth animation to property location
   */
  const handleFeedItemSelect = useCallback((propertyId: number, location: { lat: number; lng: number }) => {
    setSelectedPropertyId(propertyId);
    
    // Animate map to property location
    if (mapRef.current) {
      mapRef.current.panTo(location);
      
      // Optionally zoom in slightly
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom && currentZoom < 15) {
        mapRef.current.setZoom(15);
      }
    }
    
    // Update map center for state tracking
    setMapCenter(location);
    
    // Trigger callback
    onPropertySelect?.(propertyId);
  }, [onPropertySelect]);

  /**
   * Handle map marker click - scrolls feed to property card
   * Includes smooth scroll animation
   */
  const handleMarkerClick = useCallback((propertyId: number) => {
    setSelectedPropertyId(propertyId);
    
    // Scroll feed to property card
    const propertyElement = propertyRefs.current.get(propertyId);
    if (propertyElement && feedScrollRef.current) {
      propertyElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
    
    // Trigger callback
    onPropertySelect?.(propertyId);
  }, [onPropertySelect]);

  /**
   * Handle property hover - highlights map marker
   */
  const handlePropertyHover = useCallback((propertyId: number | null) => {
    setHoveredPropertyId(propertyId);
  }, []);

  /**
   * Register property element for scroll-to functionality
   */
  const registerPropertyRef = useCallback((propertyId: number, element: HTMLElement | null) => {
    if (element) {
      propertyRefs.current.set(propertyId, element);
    } else {
      propertyRefs.current.delete(propertyId);
    }
  }, []);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedPropertyId(null);
  }, []);

  /**
   * Pan map to specific location with animation
   */
  const panToLocation = useCallback((location: { lat: number; lng: number }, zoom?: number) => {
    if (mapRef.current) {
      mapRef.current.panTo(location);
      
      if (zoom !== undefined) {
        mapRef.current.setZoom(zoom);
      }
    }
    
    setMapCenter(location);
  }, []);

  /**
   * Fit map bounds to show all properties
   */
  const fitBoundsToProperties = useCallback((properties: Array<{ lat: number; lng: number }>) => {
    if (!mapRef.current || properties.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    properties.forEach(property => {
      bounds.extend({ lat: property.lat, lng: property.lng });
    });

    mapRef.current.fitBounds(bounds);
    
    // Update state with new bounds
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    setMapBounds({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    });
  }, []);

  // Effect: Trigger bounds change callback when debounced bounds update
  useEffect(() => {
    if (debouncedMapBounds && onBoundsChange) {
      onBoundsChange(debouncedMapBounds);
    }
  }, [debouncedMapBounds, onBoundsChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      propertyRefs.current.clear();
    };
  }, []);

  return {
    // State
    mapBounds: debouncedMapBounds, // Debounced for API calls
    throttledMapBounds, // Throttled for UI updates
    selectedPropertyId,
    hoveredPropertyId,
    mapCenter,
    
    // Refs
    mapRef,
    feedScrollRef,
    
    // Handlers
    handleMapPan,
    handleMapLoad,
    handleFeedItemSelect,
    handleMarkerClick,
    handlePropertyHover,
    registerPropertyRef,
    clearSelection,
    panToLocation,
    fitBoundsToProperties,
  };
}
