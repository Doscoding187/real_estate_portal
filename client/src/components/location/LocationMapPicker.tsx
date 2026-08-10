import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Info, Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const libraries: ('places' | 'geometry')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

// Default center: South Africa
const defaultCenter = {
  lat: -26.2041,
  lng: 28.0473,
};

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  formattedAddress?: string;
  placeId?: string;
  coordinateSource?: 'autocomplete' | 'map';
  addressComponents?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface LocationMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  searchQuery?: string;
  onLocationSelect: (location: LocationData) => void;
  onGeocodingError?: (error: string) => void;
}

export function LocationMapPicker({
  initialLat,
  initialLng,
  searchQuery,
  onLocationSelect,
  onGeocodingError,
}: LocationMapPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (loadError) {
      onGeocodingError?.('Google Maps is not available right now. You can enter the location manually.');
    }
  }, [loadError, onGeocodingError]);

  const parseGeocodingResult = useCallback(
    (
      result: google.maps.GeocoderResult | google.maps.places.PlaceResult,
      lat: number,
      lng: number,
      coordinateSource: 'autocomplete' | 'map',
    ): LocationData => {
      const addressComponents = result.address_components || [];

      const getComponent = (type: string): string | undefined => {
        const component = addressComponents.find(c => c.types.includes(type));
        return component?.long_name;
      };

      // Extract address components
      const streetNumber = getComponent('street_number');
      const route = getComponent('route');
      const suburb =
        getComponent('sublocality') ||
        getComponent('sublocality_level_1') ||
        getComponent('neighborhood') ||
        getComponent('administrative_area_level_3');
      const city = getComponent('locality') || getComponent('administrative_area_level_2');
      const province = getComponent('administrative_area_level_1');
      const postalCode = getComponent('postal_code');

      // Build street address
      const address = [streetNumber, route].filter(Boolean).join(' ');

      return {
        latitude: lat,
        longitude: lng,
        address: address || undefined,
        suburb: suburb || undefined,
        city: city || undefined,
        province: province || undefined,
        postalCode: postalCode || undefined,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        coordinateSource,
        addressComponents: addressComponents.map(component => ({
          long_name: component.long_name,
          short_name: component.short_name,
          types: component.types,
        })),
      };
    },
    [],
  );

  useEffect(() => {
    if (
      typeof initialLat === 'number' &&
      Number.isFinite(initialLat) &&
      typeof initialLng === 'number' &&
      Number.isFinite(initialLng)
    ) {
      const nextPosition = { lat: initialLat, lng: initialLng };
      setMarkerPosition(nextPosition);
      if (mapRef.current) {
        mapRef.current.panTo(nextPosition);
        mapRef.current.setZoom(15);
      }
    } else {
      setMarkerPosition(null);
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    const query = searchQuery?.trim();
    if (!isLoaded || !query) return;

    const timeout = window.setTimeout(async () => {
      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({
          address: query,
          componentRestrictions: { country: 'ZA' },
        });
        const location = result.results[0]?.geometry?.location;
        if (!location) return;

        const nextPosition = { lat: location.lat(), lng: location.lng() };
        setMarkerPosition(nextPosition);
        mapRef.current?.panTo(nextPosition);
        mapRef.current?.setZoom(15);
      } catch {
        // Manual authoring remains valid when provider enrichment is unavailable.
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [isLoaded, searchQuery]);

  const performGeocoding = useCallback(
    async (lat: number, lng: number, coordinateSource: 'autocomplete' | 'map' = 'map') => {
      setIsGeocoding(true);

      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });

        if (result.results[0]) {
          const locationData = parseGeocodingResult(result.results[0], lat, lng, coordinateSource);
          onLocationSelect(locationData);
        } else {
          onGeocodingError?.('No address found for this location');
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        onGeocodingError?.('Failed to retrieve address. Please enter manually.');
      } finally {
        setIsGeocoding(false);
      }
    },
    [onLocationSelect, onGeocodingError, parseGeocodingResult],
  );

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setMarkerPosition({ lat, lng });
      await performGeocoding(lat, lng, 'map');
    },
    [performGeocoding],
  );

  const handleMarkerDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setMarkerPosition({ lat, lng });
      await performGeocoding(lat, lng, 'map');
    },
    [performGeocoding],
  );

  const handlePlaceSelect = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setMarkerPosition({ lat, lng });
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(15);

      const locationData = parseGeocodingResult(place, lat, lng, 'autocomplete');
      onLocationSelect(locationData);
    }
  }, [onLocationSelect, parseGeocodingResult]);

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load Google Maps. Please check your API key configuration.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-100 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-blue-600"
        />
        <Autocomplete
          onLoad={autocomplete => {
            autocompleteRef.current = autocomplete;
          }}
          onPlaceChanged={handlePlaceSelect}
          options={{
            fields: ['geometry', 'address_components', 'formatted_address', 'place_id'],
            componentRestrictions: { country: 'za' },
          }}
        >
          <input
            id="location-provider-search"
            type="text"
            aria-label="Search an address, street or place"
            placeholder="Search an address, street or place..."
            className="h-14 w-full rounded-xl border-2 border-blue-200 bg-white px-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </Autocomplete>
      </div>

      <div className="relative overflow-hidden rounded-lg">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={markerPosition || defaultCenter}
          zoom={markerPosition ? 15 : 6}
          onClick={handleMapClick}
          onLoad={map => {
            mapRef.current = map;
          }}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
            restriction: {
              latLngBounds: {
                north: -22.0,
                south: -35.0,
                west: 16.0,
                east: 33.0,
              },
              strictBounds: false,
            },
          }}
        >
          {markerPosition && (
            <Marker position={markerPosition} draggable={true} onDragEnd={handleMarkerDragEnd} />
          )}
        </GoogleMap>

        {isGeocoding && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
            <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Retrieving address...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Search for the address or move the pin to the property. The synchronized details below
          will update when the location is confidently resolved.
        </p>
      </div>
    </div>
  );
}
