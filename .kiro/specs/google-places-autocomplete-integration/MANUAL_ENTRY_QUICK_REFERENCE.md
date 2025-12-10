# Manual Entry Fallback - Quick Reference

## Overview
The LocationAutocomplete component now supports manual address entry as a fallback when Google Places API is unavailable or when users prefer to enter addresses manually.

## Features

### 1. Automatic Fallback
When Google Places API fails, the component automatically switches to manual entry mode:
- API unavailable (503)
- Invalid API key (403)
- Rate limit exceeded (429)
- Network timeout
- Initialization failure

### 2. Manual Entry Mode
Users can enter addresses manually without selecting from autocomplete suggestions:
- Type any address text
- No forced selection from dropdown
- "Use this address" button appears
- Click to geocode and populate coordinates

### 3. Geocoding
Manual entries are geocoded to obtain accurate coordinates:
- Calls backend geocoding service
- Extracts address components (province, city, suburb, street)
- Populates latitude and longitude
- Updates input with formatted address

### 4. Graceful Degradation
System continues to function even if geocoding fails:
- Error message displayed
- User can still proceed
- Coordinates set to 0,0
- GPS accuracy marked as "manual"

## Usage

### Basic Usage
```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete.new';

function MyForm() {
  const [location, setLocation] = useState('');

  const handleLocationChange = (locationData) => {
    console.log('Location:', locationData);
    console.log('GPS Accuracy:', locationData.gps_accuracy); // 'accurate' or 'manual'
  };

  return (
    <LocationAutocomplete
      value={location}
      onChange={handleLocationChange}
      placeholder="Enter location..."
      allowManualEntry={true} // Enable manual entry fallback
    />
  );
}
```

### LocationData Interface
```typescript
interface LocationData {
  place_id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  address_components?: {
    province?: string;
    city?: string;
    suburb?: string;
    street_address?: string;
  };
  viewport?: {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
  };
  gps_accuracy?: 'accurate' | 'manual'; // NEW: Indicates data source
}
```

## User Flows

### Flow 1: API Available (Normal)
1. User types "Sandton"
2. Autocomplete suggestions appear
3. User selects "Sandton, Johannesburg"
4. Place details fetched
5. Form populated with accurate data
6. `gps_accuracy: 'accurate'`

### Flow 2: API Unavailable (Fallback)
1. Google Places API fails
2. Error message: "Location autocomplete temporarily unavailable. You can enter the address manually."
3. Manual mode enabled automatically
4. User types "123 Main Street, Sandton"
5. "Use this address" button appears
6. User clicks button
7. Address geocoded
8. Form populated with coordinates
9. `gps_accuracy: 'manual'`

### Flow 3: Geocoding Fails (Graceful Degradation)
1. User enters manual address
2. Clicks "Use this address"
3. Geocoding fails
4. Error message: "Could not find exact coordinates for this address. You can still proceed with manual entry."
5. User can still submit form
6. Coordinates set to 0,0
7. `gps_accuracy: 'manual'`

## Error Messages

| Scenario | Message | Action |
|----------|---------|--------|
| API Unavailable | "Location autocomplete temporarily unavailable. You can enter the address manually." | Enable manual mode |
| Invalid API Key | "API key invalid. Please enter location manually." | Enable manual mode |
| Rate Limit | "Too many requests. Please enter location manually." | Enable manual mode |
| Geocoding Failed | "Could not find exact coordinates for this address. You can still proceed with manual entry." | Allow submission |
| Network Error | "Failed to fetch suggestions. You can enter the address manually." | Enable manual mode |

## Backend API

### Endpoint
```typescript
// tRPC endpoint
location.geocodeAddress

// Input
{
  address: string; // The address to geocode
}

// Output
{
  success: boolean;
  result?: {
    placeId: string;
    formattedAddress: string;
    addressComponents: AddressComponent[];
    geometry: {
      location: { lat: number; lng: number };
      viewport?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
  };
  error?: string;
  message?: string;
}
```

### Example Call
```typescript
const response = await fetch(
  '/api/trpc/location.geocodeAddress?input=' + 
  encodeURIComponent(JSON.stringify({ address: '123 Main St, Sandton' }))
);
const data = await response.json();
```

## GPS Accuracy Field

The `gps_accuracy` field indicates the source of location data:

### 'accurate'
- Data from Google Places API
- Coordinates verified by Google
- High confidence in accuracy
- Full address components available

### 'manual'
- Data from manual entry
- Geocoded from user input
- May have lower accuracy
- Coordinates may be 0,0 if geocoding failed

### Usage in Forms
```typescript
if (locationData.gps_accuracy === 'manual') {
  // Show warning to user
  console.warn('Location entered manually - coordinates may be approximate');
  
  // Optionally require verification
  if (locationData.latitude === 0 && locationData.longitude === 0) {
    alert('Please verify the address or select from autocomplete suggestions');
  }
}
```

## Configuration

### Props
```typescript
interface LocationAutocompleteProps {
  value: string;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  required?: boolean;
  showMapPreview?: boolean;
  allowManualEntry?: boolean; // Enable/disable manual entry fallback
  className?: string;
}
```

### Environment Variables
```env
GOOGLE_PLACES_API_KEY=your_api_key_here
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA
AUTOCOMPLETE_DEBOUNCE_MS=300
AUTOCOMPLETE_CACHE_TTL_SECONDS=300
```

## Best Practices

### 1. Always Enable Manual Entry
```tsx
<LocationAutocomplete
  allowManualEntry={true} // Always enable for resilience
  // ... other props
/>
```

### 2. Validate GPS Accuracy
```typescript
const handleLocationChange = (locationData: LocationData) => {
  if (locationData.gps_accuracy === 'manual') {
    // Show warning or require confirmation
    setShowAccuracyWarning(true);
  }
  
  if (locationData.latitude === 0 && locationData.longitude === 0) {
    // Geocoding failed - may need manual coordinate entry
    setRequiresCoordinateVerification(true);
  }
};
```

### 3. Provide Clear Feedback
```tsx
{location.gps_accuracy === 'manual' && (
  <div className="text-yellow-600 text-sm mt-2">
    ⚠️ Location entered manually. Coordinates may be approximate.
  </div>
)}
```

### 4. Handle Zero Coordinates
```typescript
const isValidLocation = (location: LocationData) => {
  return location.latitude !== 0 || location.longitude !== 0;
};

if (!isValidLocation(locationData)) {
  // Prompt user to verify or re-enter
  alert('Unable to determine exact coordinates. Please verify the address.');
}
```

## Testing

### Manual Testing Checklist
- [ ] Test with valid address (should geocode successfully)
- [ ] Test with invalid address (should show error but allow submission)
- [ ] Test with API disabled (should enable manual mode automatically)
- [ ] Test with rate limit exceeded (should enable manual mode)
- [ ] Test "Use this address" button functionality
- [ ] Verify `gps_accuracy` field is set correctly
- [ ] Verify error messages are user-friendly
- [ ] Test on mobile devices (touch targets)

### Unit Test Example
```typescript
describe('LocationAutocomplete - Manual Entry', () => {
  it('should enable manual mode when API fails', async () => {
    // Mock API failure
    mockGooglePlacesAPI.mockRejectedValue(new Error('API unavailable'));
    
    const { getByPlaceholderText, getByText } = render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        allowManualEntry={true}
      />
    );
    
    // Verify manual mode is enabled
    expect(getByText(/enter the address manually/i)).toBeInTheDocument();
  });

  it('should geocode manual entry successfully', async () => {
    const mockGeocodeResult = {
      success: true,
      result: {
        placeId: 'test-place-id',
        formattedAddress: '123 Main St, Sandton',
        geometry: { location: { lat: -26.1076, lng: 28.0567 } },
        addressComponents: [],
      },
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { data: mockGeocodeResult } }),
    });
    
    const { getByPlaceholderText, getByText } = render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        allowManualEntry={true}
      />
    );
    
    // Enter manual address
    const input = getByPlaceholderText(/search for a location/i);
    fireEvent.change(input, { target: { value: '123 Main St, Sandton' } });
    
    // Click "Use this address"
    const button = getByText(/use this address/i);
    fireEvent.click(button);
    
    // Wait for geocoding
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          gps_accuracy: 'manual',
          latitude: -26.1076,
          longitude: 28.0567,
        })
      );
    });
  });
});
```

## Troubleshooting

### Issue: Manual mode not enabling
**Solution**: Check `allowManualEntry` prop is set to `true`

### Issue: Geocoding always fails
**Solution**: Verify Google Places API key is configured correctly in environment variables

### Issue: "Use this address" button not appearing
**Solution**: Ensure `isManualMode` is true and input has text

### Issue: Coordinates are 0,0
**Solution**: This is expected when geocoding fails. User can still proceed with manual entry.

### Issue: Error messages not displaying
**Solution**: Check browser console for errors. Verify error state is being set correctly.

## Related Documentation

- [Task 17 Implementation Complete](./TASK_17_MANUAL_ENTRY_COMPLETE.md)
- [Google Places Service](../../server/services/googlePlacesService.ts)
- [Location Router](../../server/locationRouter.ts)
- [Requirements Document](./requirements.md) - Requirements 7.1-7.5, 11.1-11.5

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API key configuration
3. Test with different addresses
4. Check network tab for API calls
5. Review error messages in UI
