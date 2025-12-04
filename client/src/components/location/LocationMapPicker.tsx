import { useCallback, useRef, useState } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const libraries: ("places" | "geometry")[] = ['places'];

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
  latitude: number;
  longitude: number;
  address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  formattedAddress?: string;
}

interface LocationMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (location: LocationData) => void;
  onGeocodingError?: (error: string) => void;
}

export function LocationMapPicker({
  initialLat,
  initialLng,
  onLocationSelect,
  onGeocodingError,
}: LocationMapPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const parseGeocodingResult = useCallback(
    (result: google.maps.GeocoderResult | google.maps.places.PlaceResult, lat: number, lng: number): LocationData => {
      const addressComponents = result.address_components || [];

      const getComponent = (type: string): string | undefined => {
        const component = addressComponents.find((c) => c.types.includes(type));
        return component?.long_name;
      };

      // Extract address components
      const streetNumber = getComponent('street_number');
      const route = getComponent('route');
      const suburb = getComponent('sublocality') || getComponent('sublocality_level_1');
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
      };
    },
    []
  );

  const performGeocoding = useCallback(
    async (lat: number, lng: number) => {
      setIsGeocoding(true);

      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });

        if (result.results[0]) {
          const locationData = parseGeocodingResult(result.results[0], lat, lng);
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
    [onLocationSelect, onGeocodingError, parseGeocodingResult]
  );

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setMarkerPosition({ lat, lng });
      await performGeocoding(lat, lng);
    },
    [performGeocoding]
  );

  const handleMarkerDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setMarkerPosition({ lat, lng });
      await performGeocoding(lat, lng);
    },
    [performGeocoding]
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

      const locationData = parseGeocodingResult(place, lat, lng);
      onLocationSelect(locationData);
    }
  }, [onLocationSelect, parseGeocodingResult]);

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load Google Maps. Please check your API key configuration.</AlertDescription>
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
    <div className="space-y-4">
      <div className="relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={markerPosition || defaultCenter}
          zoom={markerPosition ? 15 : 6}
          onClick={handleMapClick}
          onLoad={(map) => {
            mapRef.current = map;
          }}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
          }}
        >
          {markerPosition && <Marker position={markerPosition} draggable={true} onDragEnd={handleMarkerDragEnd} />}

          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete;
            }}
            onPlaceChanged={handlePlaceSelect}
          >
            <input
              type="text"
              placeholder="Search for a location..."
              className="absolute bottom-4 left-4 w-80 px-4 py-2 rounded-lg shadow-lg border border-gray-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </Autocomplete>
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
          Click on the map or search for a location to drop a pin at your show house. The address fields will be
          automatically populated. You can drag the pin to adjust the location.
        </p>
      </div>
    </div>
  );
}
