# Map Preview Feature

## Overview

The Map Preview feature provides an integrated location selection experience combining Google Places Autocomplete with an interactive map preview. Users can search for locations, see them on a map, and fine-tune the exact position by dragging a marker.

## Requirements Covered

### Requirement 12.1: Small Map Preview on Place Selection
✅ **Implemented**: When a user selects a location from autocomplete, a small map preview (200px height) is displayed showing the selected location with a marker.

### Requirement 12.2: Center Map on Selected Coordinates
✅ **Implemented**: The map automatically centers on the selected location's coordinates with an appropriate zoom level (13 for preview, 15 for expanded view).

### Requirement 12.3: Expandable Map View
✅ **Implemented**: Users can click the map preview or the "Expand Map" button to open a full-screen interactive map view.

### Requirement 12.4: Draggable Marker
✅ **Implemented**: In the expanded view, users can drag the marker to adjust the exact location.

### Requirement 12.5: Reverse Geocoding on Marker Move
✅ **Implemented**: When the marker is dragged, the system performs reverse geocoding to update the address, suburb, city, and province information automatically.

## Components

### 1. MapPreview Component

**Location**: `client/src/components/location/MapPreview.tsx`

**Purpose**: Displays a map preview with a marker at the selected location. Supports both small preview mode and expanded full-screen mode.

**Props**:
```typescript
interface MapPreviewProps {
  center: {
    lat: number;
    lng: number;
  };
  onLocationChange?: (location: {
    lat: number;
    lng: number;
    address?: string;
    suburb?: string;
    city?: string;
    province?: string;
  }) => void;
  className?: string;
  showExpandButton?: boolean;
  initialExpanded?: boolean;
}
```

**Features**:
- Small preview mode (200px height)
- Expandable to full-screen modal
- Draggable marker with reverse geocoding
- Loading states during geocoding
- Error handling for geocoding failures
- Smooth transitions between modes

**Usage**:
```tsx
<MapPreview
  center={{ lat: -26.2041, lng: 28.0473 }}
  onLocationChange={(location) => {
    console.log('Location updated:', location);
  }}
  showExpandButton={true}
/>
```

### 2. LocationAutocompleteWithMap Component

**Location**: `client/src/components/location/LocationAutocompleteWithMap.tsx`

**Purpose**: Combines the LocationAutocomplete component with MapPreview to provide a complete location selection experience.

**Props**:
```typescript
interface LocationAutocompleteWithMapProps {
  value?: string;
  onValueChange: (value: string) => void;
  onLocationSelect?: (location: LocationData) => void;
  placeholder?: string;
  type?: 'province' | 'city' | 'suburb' | 'address' | 'all';
  className?: string;
  showMapPreview?: boolean;
  label?: string;
}
```

**Features**:
- Integrated autocomplete and map preview
- Automatic map display on location selection
- Coordinate updates from marker dragging
- Address field updates from reverse geocoding

**Usage**:
```tsx
<LocationAutocompleteWithMap
  value={locationValue}
  onValueChange={setLocationValue}
  onLocationSelect={(location) => {
    console.log('Selected location:', location);
  }}
  placeholder="Search for a location..."
  showMapPreview={true}
  label="Select Location"
/>
```

## User Flow

1. **Search**: User types in the location autocomplete field
2. **Select**: User selects a location from the dropdown suggestions
3. **Preview**: A small map preview appears showing the selected location
4. **Expand** (optional): User clicks the map or "Expand Map" button
5. **Adjust** (optional): User drags the marker to fine-tune the location
6. **Update**: System performs reverse geocoding and updates address fields
7. **Confirm**: User closes the expanded view, and the updated location is saved

## Technical Details

### Google Maps Integration

The feature uses `@react-google-maps/api` library with the following configuration:

```typescript
const libraries: ("places" | "geometry")[] = ['places'];

const { isLoaded, loadError } = useJsApiLoader({
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  libraries,
});
```

### Reverse Geocoding

When the marker is dragged, the system performs reverse geocoding:

```typescript
const geocoder = new google.maps.Geocoder();
const result = await geocoder.geocode({ location: { lat, lng } });

// Extract address components
const suburb = getComponent('sublocality') || getComponent('sublocality_level_1');
const city = getComponent('locality') || getComponent('administrative_area_level_2');
const province = getComponent('administrative_area_level_1');
```

### Map Options

**Preview Mode**:
- Height: 200px
- Zoom: 13
- Gesture handling: none (no interactions)
- Controls: minimal

**Expanded Mode**:
- Height: 600px
- Zoom: 15
- Gesture handling: enabled
- Controls: zoom, scale, street view

## Demo Page

**Location**: `client/src/pages/MapPreviewDemo.tsx`
**Route**: `/map-preview-demo`

The demo page showcases the complete functionality:
- Location autocomplete
- Map preview display
- Expandable map view
- Marker dragging
- Reverse geocoding
- Location data display

## Integration Examples

### In Listing Creation Form

```tsx
import { LocationAutocompleteWithMap } from '@/components/location/LocationAutocompleteWithMap';

function ListingForm() {
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);

  return (
    <form>
      <LocationAutocompleteWithMap
        value={location}
        onValueChange={setLocation}
        onLocationSelect={(loc) => {
          setCoordinates({ lat: loc.latitude, lng: loc.longitude });
          // Update other form fields
        }}
        label="Property Location"
        showMapPreview={true}
      />
    </form>
  );
}
```

### Standalone Map Preview

```tsx
import { MapPreview } from '@/components/location/MapPreview';

function PropertyDetails({ property }) {
  return (
    <div>
      <h2>Property Location</h2>
      <MapPreview
        center={{
          lat: property.latitude,
          lng: property.longitude,
        }}
        showExpandButton={true}
      />
    </div>
  );
}
```

## Error Handling

The components handle various error scenarios:

1. **Map Load Error**: Displays a friendly error message if Google Maps fails to load
2. **Geocoding Error**: Shows an error alert if reverse geocoding fails
3. **Missing API Key**: Falls back to error state if API key is not configured
4. **Network Issues**: Displays loading states and retry options

## Performance Considerations

- **Lazy Loading**: Google Maps API is loaded only when needed
- **Debouncing**: Geocoding requests are debounced to avoid excessive API calls
- **Caching**: Map instances are cached to improve performance
- **Gesture Handling**: Disabled in preview mode to prevent accidental interactions

## Accessibility

- Keyboard navigation support
- ARIA labels for interactive elements
- Focus management in modal view
- Screen reader announcements for loading states

## Browser Compatibility

- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Edge: ✅ Full support
- Mobile browsers: ✅ Touch-optimized

## Future Enhancements

- [ ] Add search within map view
- [ ] Support for drawing custom boundaries
- [ ] Street view integration
- [ ] Nearby points of interest
- [ ] Distance measurement tools
- [ ] Multiple marker support
- [ ] Custom marker icons
- [ ] Map style customization

## Testing

To test the feature:

1. Navigate to `/map-preview-demo`
2. Search for a location (e.g., "Sandton, Johannesburg")
3. Select a location from the dropdown
4. Verify the map preview appears
5. Click to expand the map
6. Drag the marker to a new position
7. Verify the address updates automatically
8. Close the expanded view
9. Check that the location data is correct

## Troubleshooting

### Map Not Loading

**Issue**: Map shows loading spinner indefinitely
**Solution**: Check that `VITE_GOOGLE_MAPS_API_KEY` is set in `.env` file

### Reverse Geocoding Fails

**Issue**: Address doesn't update when marker is dragged
**Solution**: Ensure Google Places API is enabled in Google Cloud Console

### Marker Not Draggable

**Issue**: Cannot drag marker in expanded view
**Solution**: Verify that `draggable={true}` prop is set on Marker component

## API Usage

The feature uses the following Google Maps APIs:
- **Maps JavaScript API**: For map rendering
- **Geocoding API**: For reverse geocoding
- **Places API**: For autocomplete (via LocationAutocomplete)

Estimated costs (based on Google Maps pricing):
- Map loads: $7 per 1,000 loads
- Geocoding: $5 per 1,000 requests
- Places Autocomplete: $2.83 per 1,000 requests

## Dependencies

```json
{
  "@react-google-maps/api": "^2.19.2",
  "lucide-react": "^0.263.1"
}
```

## Environment Variables

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Related Components

- `LocationAutocomplete`: Basic location search without map
- `InteractiveMap`: Full-featured map for location pages
- `LocationMapPicker`: Alternative map picker with search
- `GooglePlacesAutocomplete`: Google Places integration

## Support

For issues or questions:
1. Check the demo page at `/map-preview-demo`
2. Review the component source code
3. Check Google Maps API console for errors
4. Verify API key permissions and quotas
