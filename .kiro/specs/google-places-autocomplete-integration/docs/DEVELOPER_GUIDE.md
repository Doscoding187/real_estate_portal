# Developer Guide: LocationAutocomplete Component

## Overview

This guide provides comprehensive documentation for developers using the `LocationAutocomplete` component in the Property Listify platform. The component provides Google Places-powered location search with South Africa bias, automatic address parsing, and seamless integration with listing/development creation flows.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Component API](#component-api)
3. [Usage Examples](#usage-examples)
4. [Advanced Features](#advanced-features)
5. [Integration Patterns](#integration-patterns)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Usage

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

function MyForm() {
  const [location, setLocation] = useState(null);

  return (
    <LocationAutocomplete
      value={location?.description || ''}
      onChange={(locationData) => {
        setLocation(locationData);
        console.log('Selected:', locationData);
      }}
      placeholder="Search for a location..."
    />
  );
}
```

### With Form Integration

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';
import { useForm } from 'react-hook-form';

function ListingForm() {
  const { register, setValue, watch } = useForm();
  const address = watch('address');

  return (
    <form>
      <LocationAutocomplete
        value={address}
        onChange={(locationData) => {
          // Auto-populate form fields
          setValue('address', locationData.formattedAddress);
          setValue('latitude', locationData.coordinates.lat);
          setValue('longitude', locationData.coordinates.lng);
          setValue('province', locationData.province);
          setValue('city', locationData.city);
          setValue('suburb', locationData.suburb);
          setValue('placeId', locationData.placeId);
        }}
        placeholder="Enter property address"
        required
      />
    </form>
  );
}
```

---

## Component API

### Props

```typescript
interface LocationAutocompleteProps {
  // Current value (controlled component)
  value: string;
  
  // Callback when location is selected
  onChange: (location: LocationData) => void;
  
  // Placeholder text
  placeholder?: string;
  
  // Whether field is required
  required?: boolean;
  
  // Show map preview on selection
  showMapPreview?: boolean;
  
  // Allow manual text entry without selection
  allowManualEntry?: boolean;
  
  // Custom CSS class
  className?: string;
  
  // Disable the input
  disabled?: boolean;
  
  // Error message to display
  error?: string;
  
  // Callback when input loses focus
  onBlur?: () => void;
}
```

### LocationData Interface

```typescript
interface LocationData {
  // Google Place ID
  placeId: string;
  
  // Full formatted address
  formattedAddress: string;
  
  // Coordinates
  coordinates: {
    lat: number;
    lng: number;
    precision: number; // Decimal places
  };
  
  // Viewport bounds (for map display)
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  
  // Address components
  province: string | null;
  city: string | null;
  suburb: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  
  // Validation
  isWithinSouthAfrica: boolean;
  gpsAccuracy: 'accurate' | 'manual';
}
```

---

## Usage Examples

### Example 1: Basic Autocomplete

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

function BasicExample() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  return (
    <div>
      <LocationAutocomplete
        value={selectedLocation?.formattedAddress || ''}
        onChange={setSelectedLocation}
        placeholder="Search for a location in South Africa"
      />
      
      {selectedLocation && (
        <div className="mt-4">
          <p><strong>Selected:</strong> {selectedLocation.formattedAddress}</p>
          <p><strong>Coordinates:</strong> {selectedLocation.coordinates.lat}, {selectedLocation.coordinates.lng}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 2: With Map Preview

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

function MapPreviewExample() {
  const [location, setLocation] = useState(null);

  return (
    <LocationAutocomplete
      value={location?.formattedAddress || ''}
      onChange={setLocation}
      placeholder="Search for a location"
      showMapPreview={true} // Enable map preview
    />
  );
}
```

### Example 3: Manual Entry Fallback

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

function ManualEntryExample() {
  const [location, setLocation] = useState(null);

  return (
    <LocationAutocomplete
      value={location?.formattedAddress || ''}
      onChange={setLocation}
      placeholder="Search or enter address manually"
      allowManualEntry={true} // Allow manual text entry
    />
  );
}
```

### Example 4: Form Validation

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';
import { useForm } from 'react-hook-form';

function ValidationExample() {
  const { register, setValue, formState: { errors } } = useForm();
  const [location, setLocation] = useState(null);

  return (
    <div>
      <LocationAutocomplete
        value={location?.formattedAddress || ''}
        onChange={(locationData) => {
          setLocation(locationData);
          setValue('location', locationData, { shouldValidate: true });
        }}
        placeholder="Property location *"
        required
        error={errors.location?.message}
      />
    </div>
  );
}
```

### Example 5: Listing Creation Integration

```tsx
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';
import { useMutation } from '@tanstack/react-query';

function ListingCreation() {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    location: null,
  });

  const createListing = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare listing data with location
    const listingData = {
      title: formData.title,
      price: formData.price,
      // Location data from autocomplete
      placeId: formData.location.placeId,
      address: formData.location.formattedAddress,
      latitude: formData.location.coordinates.lat,
      longitude: formData.location.coordinates.lng,
      province: formData.location.province,
      city: formData.location.city,
      suburb: formData.location.suburb,
    };
    
    createListing.mutate(listingData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Listing title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      
      <input
        type="number"
        placeholder="Price"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
      />
      
      <LocationAutocomplete
        value={formData.location?.formattedAddress || ''}
        onChange={(location) => setFormData({ ...formData, location })}
        placeholder="Property location"
        required
      />
      
      <button type="submit">Create Listing</button>
    </form>
  );
}
```

---

## Advanced Features

### Recent Searches

The component automatically stores and displays recent searches:

```tsx
// Recent searches are stored in localStorage
// Automatically displayed when input is focused
// Maximum 5 recent searches per user

<LocationAutocomplete
  value={value}
  onChange={onChange}
  // Recent searches are enabled by default
/>
```

### Keyboard Navigation

Full keyboard support is built-in:

- **Arrow Down**: Navigate to next suggestion
- **Arrow Up**: Navigate to previous suggestion
- **Enter**: Select highlighted suggestion
- **Escape**: Close dropdown
- **Tab**: Move to next field (closes dropdown)

### Session Token Management

Session tokens are automatically managed for billing optimization:

```typescript
// Automatic session token lifecycle:
// 1. Created when user starts typing
// 2. Used for all autocomplete requests in the session
// 3. Terminated when user selects a place
// 4. New token created for next search

// No manual management required!
```

### Caching

Responses are automatically cached to reduce API calls:

```typescript
// Cache configuration (in .env):
AUTOCOMPLETE_CACHE_TTL_SECONDS=300 // 5 minutes

// Cache key format:
// places:autocomplete:{input}:{country}

// Cache hit rate target: >60%
```

### Debouncing

Input is automatically debounced to prevent excessive API calls:

```typescript
// Debounce configuration (in .env):
AUTOCOMPLETE_DEBOUNCE_MS=300 // 300ms delay

// Reduces API calls by ~70% during typing
```

---

## Integration Patterns

### Pattern 1: Listing Creation Flow

```typescript
// Step 1: User selects location from autocomplete
const handleLocationSelect = async (locationData) => {
  // Step 2: Resolve location to database record
  const locationRecord = await fetch('/api/locations/resolve', {
    method: 'POST',
    body: JSON.stringify({
      placeId: locationData.placeId,
      address: locationData.formattedAddress,
      latitude: locationData.coordinates.lat,
      longitude: locationData.coordinates.lng,
      province: locationData.province,
      city: locationData.city,
      suburb: locationData.suburb,
    }),
  }).then(r => r.json());
  
  // Step 3: Create listing with location_id
  const listing = await fetch('/api/listings', {
    method: 'POST',
    body: JSON.stringify({
      title: 'My Listing',
      price: 1000000,
      location_id: locationRecord.id, // Foreign key reference
      // ... other listing fields
    }),
  }).then(r => r.json());
};
```

### Pattern 2: Search Integration

```typescript
// Step 1: User searches for location
const handleLocationSearch = (locationData) => {
  // Step 2: Navigate to location page with Place ID
  router.push(`/search?placeId=${locationData.placeId}&location=${locationData.suburb}`);
};

// Step 3: Filter listings by Place ID
const filteredListings = await fetch(
  `/api/listings?placeId=${placeId}`
).then(r => r.json());
```

### Pattern 3: Development Wizard

```typescript
// Multi-step wizard with location selection
function DevelopmentWizard() {
  const [step, setStep] = useState(1);
  const [developmentData, setDevelopmentData] = useState({
    name: '',
    location: null,
    units: [],
  });

  return (
    <div>
      {step === 1 && (
        <BasicDetailsStep
          data={developmentData}
          onChange={setDevelopmentData}
          onNext={() => setStep(2)}
        />
      )}
      
      {step === 2 && (
        <LocationStep
          location={developmentData.location}
          onChange={(location) => {
            setDevelopmentData({ ...developmentData, location });
            setStep(3);
          }}
        />
      )}
      
      {step === 3 && (
        <UnitsStep
          data={developmentData}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function LocationStep({ location, onChange }) {
  return (
    <div>
      <h2>Development Location</h2>
      <LocationAutocomplete
        value={location?.formattedAddress || ''}
        onChange={onChange}
        placeholder="Search for development location"
        showMapPreview={true}
        required
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Always Store Place ID

```typescript
// ✅ GOOD: Store Place ID for precise filtering
const listing = {
  placeId: locationData.placeId,
  address: locationData.formattedAddress,
  // ... other fields
};

// ❌ BAD: Only storing text fields
const listing = {
  address: locationData.formattedAddress,
  // Missing placeId!
};
```

### 2. Validate Coordinates

```typescript
// ✅ GOOD: Check if location is within South Africa
if (!locationData.isWithinSouthAfrica) {
  alert('Please select a location within South Africa');
  return;
}

// ✅ GOOD: Check coordinate precision
if (locationData.coordinates.precision < 6) {
  console.warn('Low coordinate precision');
}
```

### 3. Handle API Failures Gracefully

```typescript
// ✅ GOOD: Provide fallback for API failures
<LocationAutocomplete
  value={value}
  onChange={onChange}
  allowManualEntry={true} // Fallback to manual entry
/>

// ✅ GOOD: Show error messages
{error && (
  <p className="text-red-500">{error}</p>
)}
```

### 4. Use Controlled Components

```typescript
// ✅ GOOD: Controlled component with state
const [location, setLocation] = useState(null);

<LocationAutocomplete
  value={location?.formattedAddress || ''}
  onChange={setLocation}
/>

// ❌ BAD: Uncontrolled component
<LocationAutocomplete
  defaultValue="Sandton"
  // No onChange handler!
/>
```

### 5. Optimize for Mobile

```typescript
// ✅ GOOD: Mobile-optimized configuration
<LocationAutocomplete
  value={value}
  onChange={onChange}
  placeholder="Search location"
  // Touch targets are automatically 44px minimum
  // Keyboard is automatically dismissed on selection
/>
```

### 6. Implement Loading States

```typescript
// ✅ GOOD: Show loading state during API calls
const [isLoading, setIsLoading] = useState(false);

<LocationAutocomplete
  value={value}
  onChange={async (locationData) => {
    setIsLoading(true);
    try {
      await handleLocationSelect(locationData);
    } finally {
      setIsLoading(false);
    }
  }}
  disabled={isLoading}
/>
```

---

## Troubleshooting

### Issue: No Suggestions Appearing

**Symptoms:**
- Dropdown remains empty
- No API calls in network tab

**Solutions:**
1. Check minimum input length (3 characters required)
2. Verify API key is configured in `.env`
3. Check browser console for errors
4. Verify Google Places API is enabled

### Issue: Slow Response Times

**Symptoms:**
- Suggestions take >2 seconds to appear
- Poor user experience

**Solutions:**
1. Check network latency
2. Verify caching is working
3. Reduce debounce delay (not recommended below 200ms)
4. Check API response times in monitoring dashboard

### Issue: Incorrect Address Parsing

**Symptoms:**
- Province/city/suburb fields are empty
- Wrong values in address components

**Solutions:**
1. Check Place Details response in network tab
2. Verify address components are present
3. Use fallback values for missing components
4. Log `locationData` to inspect parsed values

### Issue: Map Preview Not Showing

**Symptoms:**
- Map preview doesn't appear after selection
- Map shows wrong location

**Solutions:**
1. Verify `showMapPreview={true}` is set
2. Check Maps JavaScript API is enabled
3. Verify coordinates are valid
4. Check browser console for map errors

---

## Next Steps

- Review [API Documentation](./API_DOCUMENTATION.md) for service methods
- Check [Location Page Architecture](./LOCATION_PAGE_ARCHITECTURE.md) for page rendering
- See [Database Schema](./DATABASE_SCHEMA.md) for data models
- Read [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) for common issues

---

## Support

For additional help:
- Check the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)
- Review [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- Contact the development team
