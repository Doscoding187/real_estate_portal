/**
 * MapPreview Component
 * 
 * Requirements: 12.1-12.5
 * - 12.1: Display small map preview on place selection
 * - 12.2: Center map on selected coordinates with appropriate zoom
 * - 12.3: Expand to larger interactive map on click
 * - 12.4: Allow marker position adjustment by dragging
 * - 12.5: Update coordinates and perform reverse geocoding when marker is moved
 * 
 * Features:
 * - Small preview mode (200px height)
 * - Expandable to full-screen mode
 * - Draggable marker with reverse geocoding
 * - Loading states
 * - Error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, MapPin, Maximize2, Minimize2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const libraries: ("places" | "geometry")[] = ['places'];

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

const smallMapStyle = {
  width: '100%',
  height: '200px',
};

const expandedMapStyle = {
  width: '100%',
  height: '600px',
};

const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
};

export function MapPreview({
  center,
  onLocationChange,
  className = '',
  showExpandButton = true,
  initialExpanded = false,
}: MapPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [markerPosition, setMarkerPosition] = useState(center);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Update marker position when center prop changes
  useEffect(() => {
    setMarkerPosition(center);
  }, [center]);

  const performReverseGeocoding = useCallback(
    async (lat: number, lng: number) => {
      if (!onLocationChange) return;

      setIsGeocoding(true);
      setGeocodingError(null);

      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });

        if (result.results[0]) {
          const addressComponents = result.results[0].address_components || [];

          const getComponent = (type: string): string | undefined => {
            const component = addressComponents.find((c) => c.types.includes(type));
            return component?.long_name;
          };

          const suburb =
            getComponent('sublocality') ||
            getComponent('sublocality_level_1') ||
            getComponent('neighborhood');
          const city = getComponent('locality') || getComponent('administrative_area_level_2');
          const province = getComponent('administrative_area_level_1');

          onLocationChange({
            lat,
            lng,
            address: result.results[0].formatted_address,
            suburb: suburb || undefined,
            city: city || undefined,
            province: province || undefined,
          });
        } else {
          setGeocodingError('No address found for this location');
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setGeocodingError('Failed to retrieve address');
      } finally {
        setIsGeocoding(false);
      }
    },
    [onLocationChange]
  );

  const handleMarkerDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setMarkerPosition({ lat, lng });
      await performReverseGeocoding(lat, lng);
    },
    [performReverseGeocoding]
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (loadError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          Unable to load map. Please check your internet connection.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-slate-600">Loading map preview...</p>
        </div>
      </Card>
    );
  }

  // Expanded modal view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Adjust Location</h3>
              </div>
              <div className="flex items-center gap-2">
                {isGeocoding && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating address...</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Map */}
            <GoogleMap
              mapContainerStyle={expandedMapStyle}
              center={markerPosition}
              zoom={15}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={defaultMapOptions}
            >
              <Marker
                position={markerPosition}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
              />
            </GoogleMap>

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <Alert className="bg-white/95 backdrop-blur-sm">
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Drag the marker to adjust the location. The address will update automatically.
                </AlertDescription>
              </Alert>
            </div>

            {/* Error message */}
            {geocodingError && (
              <div className="absolute top-20 left-4 right-4 z-10">
                <Alert variant="destructive" className="bg-white/95 backdrop-blur-sm">
                  <AlertDescription>{geocodingError}</AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Small preview view
  return (
    <Card className={`overflow-hidden relative ${className}`}>
      <GoogleMap
        mapContainerStyle={smallMapStyle}
        center={markerPosition}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          ...defaultMapOptions,
          zoomControl: false,
          scaleControl: false,
          gestureHandling: 'none', // Disable interactions in preview mode
        }}
      >
        <Marker position={markerPosition} />
      </GoogleMap>

      {/* Expand button overlay */}
      {showExpandButton && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer group">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleExpanded}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Expand Map
          </Button>
        </div>
      )}

      {/* Click to expand hint */}
      {showExpandButton && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          onClick={toggleExpanded}
        >
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              Click to expand and adjust location
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
