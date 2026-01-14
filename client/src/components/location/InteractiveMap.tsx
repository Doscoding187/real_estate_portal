/**
 * InteractiveMap Component for Location Pages
 * 
 * Displays a Google Maps view centered on a location with markers for properties
 * Supports viewport bounds from Google Places API
 */

import { useState, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface InteractiveMapProps {
  center: {
    lat: number;
    lng: number;
  };
  viewport?: {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
  };
  properties?: Array<{
    id: number;
    latitude: number;
    longitude: number;
    title: string;
    price: number;
  }>;
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: false,
  fullscreenControl: true,
};

const libraries: ("places")[] = ['places'];

export function InteractiveMap({ 
  center, 
  viewport, 
  properties = [],
  className = ''
}: InteractiveMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // If viewport bounds are provided, fit the map to those bounds
    if (viewport) {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(viewport.sw_lat, viewport.sw_lng),
        new google.maps.LatLng(viewport.ne_lat, viewport.ne_lng)
      );
      map.fitBounds(bounds);
    }
  }, [viewport]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center text-center">
          <MapPin className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-600">Unable to load map</p>
          <p className="text-sm text-slate-400 mt-2">Please check your internet connection</p>
        </div>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-slate-600">Loading map...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={viewport ? undefined : 12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={defaultMapOptions}
      >
        {/* Center marker for the location */}
        <Marker
          position={center}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          }}
        />

        {/* Property markers */}
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={{
              lat: property.latitude,
              lng: property.longitude,
            }}
            onClick={() => setSelectedProperty(property.id)}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 5 L35 35 L5 35 Z" fill="${selectedProperty === property.id ? '#ef4444' : '#10b981'}" stroke="white" stroke-width="2"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 35),
            }}
          />
        ))}
      </GoogleMap>
    </Card>
  );
}
