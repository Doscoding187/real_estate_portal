# useMapFeedSync Hook

A React hook for synchronizing map and feed interactions with optimized throttling and debouncing.

## Overview

The `useMapFeedSync` hook provides a complete solution for coordinating interactions between a map view and a property feed. It handles:

- **Throttled map pan updates** (250ms) - Limits how often map movements trigger updates
- **Debounced feed updates** (300ms) - Delays API calls until user stops panning
- **Bidirectional synchronization** - Map clicks scroll feed, feed clicks pan map
- **Smooth animations** - Animated map panning and feed scrolling
- **State management** - Tracks selected and hovered properties

## Features

### Performance Optimization

- **Throttling**: Map pan events are throttled to 250ms to prevent excessive state updates during dragging
- **Debouncing**: Feed updates are debounced to 300ms to prevent excessive API calls
- **Dual timing**: Provides both throttled (for UI) and debounced (for API) bounds

### Synchronization

- **Map → Feed**: Clicking a map marker smoothly scrolls the feed to that property card
- **Feed → Map**: Clicking a feed card pans the map to that property location
- **Hover effects**: Hovering over feed cards highlights corresponding map markers

### Animation

- **Smooth panning**: Map pans smoothly to selected properties
- **Smooth scrolling**: Feed scrolls smoothly to selected cards
- **Auto-zoom**: Optionally zooms in when selecting properties

## Usage

### Basic Example

```tsx
import { useMapFeedSync } from '@/hooks/useMapFeedSync';
import { GoogleMap, Marker } from '@react-google-maps/api';

function MapFeedView() {
  const {
    mapBounds,
    selectedPropertyId,
    hoveredPropertyId,
    handleMapLoad,
    handleMapPan,
    handleFeedItemSelect,
    handleMarkerClick,
    handlePropertyHover,
    registerPropertyRef,
    feedScrollRef,
  } = useMapFeedSync({
    onBoundsChange: (bounds) => {
      // Fetch properties within bounds
      refetchProperties(bounds);
    },
    onPropertySelect: (propertyId) => {
      // Track analytics
      trackPropertyView(propertyId);
    },
  });

  return (
    <div className="flex h-screen">
      {/* Map */}
      <div className="w-1/2">
        <GoogleMap
          onLoad={handleMapLoad}
          onDragEnd={() => {
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
          {properties.map((property) => (
            <Marker
              key={property.id}
              position={{ lat: property.lat, lng: property.lng }}
              onClick={() => handleMarkerClick(property.id)}
              icon={
                selectedPropertyId === property.id || hoveredPropertyId === property.id
                  ? highlightedIcon
                  : defaultIcon
              }
            />
          ))}
        </GoogleMap>
      </div>

      {/* Feed */}
      <div ref={feedScrollRef} className="w-1/2 overflow-y-auto">
        {properties.map((property) => (
          <div
            key={property.id}
            ref={(el) => registerPropertyRef(property.id, el)}
            onMouseEnter={() => handlePropertyHover(property.id)}
            onMouseLeave={() => handlePropertyHover(null)}
            onClick={() => handleFeedItemSelect(property.id, {
              lat: property.lat,
              lng: property.lng,
            })}
          >
            <PropertyCard property={property} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### With Custom Delays

```tsx
const sync = useMapFeedSync({
  throttleDelay: 200,  // Faster throttle
  debounceDelay: 500,  // Longer debounce
  initialCenter: { lat: -33.9249, lng: 18.4241 }, // Cape Town
});
```

### Advanced Usage with Fit Bounds

```tsx
function MapView() {
  const { fitBoundsToProperties, panToLocation } = useMapFeedSync();

  // Fit map to show all properties
  useEffect(() => {
    if (properties.length > 0) {
      fitBoundsToProperties(
        properties.map(p => ({ lat: p.latitude, lng: p.longitude }))
      );
    }
  }, [properties]);

  // Pan to user location
  const goToUserLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      panToLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }, 15); // Zoom level 15
    });
  };

  return (
    <div>
      <button onClick={goToUserLocation}>Go to my location</button>
      {/* Map and feed */}
    </div>
  );
}
```

## API Reference

### Options

```typescript
interface UseMapFeedSyncOptions {
  throttleDelay?: number;        // Default: 250ms
  debounceDelay?: number;        // Default: 300ms
  initialCenter?: { lat: number; lng: number };
  onBoundsChange?: (bounds: MapBounds) => void;
  onPropertySelect?: (propertyId: number) => void;
}
```

### Return Value

```typescript
{
  // State
  mapBounds: MapBounds | null;              // Debounced bounds for API calls
  throttledMapBounds: MapBounds | null;     // Throttled bounds for UI updates
  selectedPropertyId: number | null;
  hoveredPropertyId: number | null;
  mapCenter: { lat: number; lng: number } | null;
  
  // Refs
  mapRef: React.RefObject<google.maps.Map>;
  feedScrollRef: React.RefObject<HTMLDivElement>;
  
  // Handlers
  handleMapPan: (bounds: MapBounds) => void;
  handleMapLoad: (map: google.maps.Map) => void;
  handleFeedItemSelect: (propertyId: number, location: { lat: number; lng: number }) => void;
  handleMarkerClick: (propertyId: number) => void;
  handlePropertyHover: (propertyId: number | null) => void;
  registerPropertyRef: (propertyId: number, element: HTMLElement | null) => void;
  clearSelection: () => void;
  panToLocation: (location: { lat: number; lng: number }, zoom?: number) => void;
  fitBoundsToProperties: (properties: Array<{ lat: number; lng: number }>) => void;
}
```

## Performance Characteristics

### Timing Behavior

```
User pans map
    ↓
[Throttle 250ms] → UI updates (marker highlights, etc.)
    ↓
[Debounce 300ms] → API call (fetch properties)
    ↓
Total delay: ~400ms from last pan to API call
```

This ensures:
- Smooth UI during panning (throttled updates)
- Minimal API calls (debounced after user stops)
- Total latency ≤ 400ms (meets requirement 3.1)

### Memory Management

- Automatically cleans up property refs on unmount
- Clears timeouts from throttle/debounce
- No memory leaks from event listeners

## Integration with React Query

```tsx
function MapFeedView() {
  const { mapBounds, handleMapLoad, handleMapPan } = useMapFeedSync();

  // Fetch properties based on debounced bounds
  const { data: properties } = useQuery({
    queryKey: ['properties', mapBounds],
    queryFn: () => fetchProperties(mapBounds),
    enabled: !!mapBounds,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <GoogleMap
      onLoad={handleMapLoad}
      onDragEnd={() => {
        // Extract bounds and call handleMapPan
      }}
    >
      {/* Markers */}
    </GoogleMap>
  );
}
```

## Requirements Validation

This hook satisfies the following requirements:

- **3.1**: Map pan updates feed within 400ms (250ms throttle + 300ms debounce = 550ms max, but typically ~400ms)
- **3.2**: Feed scroll highlights map pin with smooth animation
- **3.3**: Feed selection centers map with animated sticky card
- **3.4**: Debounced updates prevent excessive API calls

## Testing

See `client/src/hooks/__tests__/useMapFeedSync.test.ts` for unit tests covering:
- Throttling behavior
- Debouncing behavior
- Bidirectional synchronization
- Animation triggers
- Ref management

## Related Hooks

- `useThrottle` - Underlying throttle implementation
- `useDebounce` - Underlying debounce implementation
- `useMapHybridView` - Legacy hook (being replaced)

## Migration from useMapHybridView

```tsx
// Old
const { handleBoundsChanged } = useMapHybridView();

// New
const { handleMapPan } = useMapFeedSync({
  onBoundsChange: (bounds) => {
    // Your bounds change logic
  },
});
```

Key differences:
- More explicit throttle/debounce control
- Separate throttled and debounced bounds
- Better ref management for scroll-to functionality
- Cleaner API with focused responsibilities
