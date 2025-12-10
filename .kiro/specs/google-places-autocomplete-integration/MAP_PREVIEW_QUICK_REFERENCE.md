# Map Preview Feature - Quick Reference

## Quick Start

### 1. Basic Map Preview

```tsx
import { MapPreview } from '@/components/location/MapPreview';

<MapPreview
  center={{ lat: -26.2041, lng: 28.0473 }}
  onLocationChange={(location) => console.log(location)}
  showExpandButton={true}
/>
```

### 2. With Autocomplete

```tsx
import { LocationAutocompleteWithMap } from '@/components/location/LocationAutocompleteWithMap';

<LocationAutocompleteWithMap
  value={value}
  onValueChange={setValue}
  onLocationSelect={(loc) => console.log(loc)}
  showMapPreview={true}
/>
```

## Component Props

### MapPreview

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `center` | `{lat: number, lng: number}` | ✅ | Map center coordinates |
| `onLocationChange` | `function` | ❌ | Callback when location changes |
| `className` | `string` | ❌ | Additional CSS classes |
| `showExpandButton` | `boolean` | ❌ | Show expand button (default: true) |
| `initialExpanded` | `boolean` | ❌ | Start in expanded mode (default: false) |

### LocationAutocompleteWithMap

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string` | ✅ | Current input value |
| `onValueChange` | `function` | ✅ | Input change handler |
| `onLocationSelect` | `function` | ❌ | Location selection handler |
| `placeholder` | `string` | ❌ | Input placeholder |
| `type` | `'province' \| 'city' \| 'suburb' \| 'all'` | ❌ | Location type filter |
| `showMapPreview` | `boolean` | ❌ | Show map preview (default: true) |
| `label` | `string` | ❌ | Input label |

## Location Data Structure

```typescript
interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}
```

## Common Use Cases

### In a Form

```tsx
function MyForm() {
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);

  return (
    <LocationAutocompleteWithMap
      value={location}
      onValueChange={setLocation}
      onLocationSelect={(loc) => {
        setCoords({ lat: loc.latitude, lng: loc.longitude });
      }}
      label="Location"
    />
  );
}
```

### Read-Only Display

```tsx
<MapPreview
  center={{ lat: property.lat, lng: property.lng }}
  showExpandButton={true}
/>
```

### With Custom Styling

```tsx
<MapPreview
  center={center}
  className="rounded-xl shadow-lg"
  onLocationChange={handleChange}
/>
```

## Features

### Preview Mode
- 200px height
- Zoom level 13
- No interactions
- Hover to show expand button

### Expanded Mode
- 600px height
- Zoom level 15
- Draggable marker
- Reverse geocoding
- Close button

## Events

### onLocationChange

Triggered when:
- Marker is dragged
- Reverse geocoding completes

Returns:
```typescript
{
  lat: number,
  lng: number,
  address?: string,
  suburb?: string,
  city?: string,
  province?: string
}
```

### onLocationSelect

Triggered when:
- User selects from autocomplete

Returns:
```typescript
{
  name: string,
  latitude: number,
  longitude: number,
  suburb?: string,
  city?: string,
  province?: string,
  postalCode?: string
}
```

## Styling

### Custom Classes

```tsx
<MapPreview
  className="border-2 border-blue-500 rounded-lg"
  center={center}
/>
```

### Tailwind Classes

```tsx
<LocationAutocompleteWithMap
  className="w-full max-w-2xl mx-auto"
  value={value}
  onValueChange={setValue}
/>
```

## Error Handling

### Map Load Error

```tsx
<MapPreview
  center={center}
  // Shows error message if map fails to load
/>
```

### Geocoding Error

```tsx
<MapPreview
  center={center}
  onLocationChange={(loc) => {
    if (!loc.address) {
      console.error('Geocoding failed');
    }
  }}
/>
```

## Performance Tips

1. **Lazy Load**: Map loads only when needed
2. **Debounce**: Geocoding is debounced
3. **Cleanup**: Components clean up on unmount
4. **Caching**: Map instances are cached

## Troubleshooting

### Map Not Loading

**Problem**: Infinite loading spinner

**Solution**: Check `VITE_GOOGLE_MAPS_API_KEY` in `.env`

### Marker Not Draggable

**Problem**: Can't drag marker

**Solution**: Only draggable in expanded mode

### Geocoding Fails

**Problem**: Address doesn't update

**Solution**: Enable Geocoding API in Google Cloud Console

## Demo

Visit `/map-preview-demo` to see the feature in action.

## Files

- `client/src/components/location/MapPreview.tsx`
- `client/src/components/location/LocationAutocompleteWithMap.tsx`
- `client/src/pages/MapPreviewDemo.tsx`
- `client/src/components/location/MAP_PREVIEW_README.md`

## Requirements

- ✅ Requirement 12.1: Small map preview
- ✅ Requirement 12.2: Center on coordinates
- ✅ Requirement 12.3: Expandable view
- ✅ Requirement 12.4: Draggable marker
- ✅ Requirement 12.5: Reverse geocoding

## API Usage

- Maps JavaScript API: $7 per 1,000 loads
- Geocoding API: $5 per 1,000 requests
- Total: ~$12 per 1,000 location selections

## Browser Support

✅ Chrome | ✅ Firefox | ✅ Safari | ✅ Edge | ✅ Mobile

## Next Steps

1. Integrate into listing wizard
2. Add to development wizard
3. Use in location pages
4. Add to search results

## Support

For detailed documentation, see:
- `MAP_PREVIEW_README.md`
- `TASK_16_COMPLETE.md`
