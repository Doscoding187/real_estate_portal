import { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { normalizePropertyForUI } from '@/lib/normalizers';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '600px',
};

const defaultCenter = {
  lat: -26.2041,
  lng: 28.0473, // Johannesburg
};

interface PropertyMarker {
  id: number;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  latitude: number;
  longitude: number;
  mainImage?: string;
  address: string;
  city: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

interface GooglePropertyMapProps {
  properties: PropertyMarker[];
  onBoundsChange?: (bounds: google.maps.LatLngBounds) => void;
  onPropertySelect?: (propertyId: number) => void;
  className?: string;
}

export function GooglePropertyMap({
  properties,
  onBoundsChange,
  onPropertySelect,
  className,
}: GooglePropertyMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      const bounds = new window.google.maps.LatLngBounds();
      if (properties.length > 0) {
        properties.forEach((prop) => {
          if (prop.latitude && prop.longitude) {
            bounds.extend({ lat: prop.latitude, lng: prop.longitude });
          }
        });
        map.fitBounds(bounds);
      } else {
        map.setCenter(defaultCenter);
        map.setZoom(10);
      }
      setMap(map);
    },
    [properties]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleBoundsChanged = () => {
    if (map && onBoundsChange) {
      onBoundsChange(map.getBounds()!);
    }
  };

  const handleMarkerClick = (property: PropertyMarker) => {
    setSelectedProperty(property);
    if (onPropertySelect) {
      onPropertySelect(property.id);
    }
  };

  const handleSearchInArea = () => {
    if (map && onBoundsChange) {
      onBoundsChange(map.getBounds()!);
    }
  };

  useEffect(() => {
    if (map && properties.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      properties.forEach((prop) => {
        if (prop.latitude && prop.longitude) {
          bounds.extend({ lat: prop.latitude, lng: prop.longitude });
        }
      });
      map.fitBounds(bounds);
    }
  }, [map, properties]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-slate-50 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDragEnd={handleBoundsChanged}
        onZoomChanged={handleBoundsChanged}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        <MarkerClusterer>
          {(clusterer: any) => (
            <>
              {properties.map((property) => (
                <Marker
                  key={property.id}
                  position={{ lat: property.latitude, lng: property.longitude }}
                  onClick={() => handleMarkerClick(property)}
                  clusterer={clusterer}
                />
              ))}
            </>
          )}
        </MarkerClusterer>

        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.latitude, lng: selectedProperty.longitude }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="max-w-xs">
              {selectedProperty.mainImage && (
                <img
                  src={selectedProperty.mainImage}
                  alt={selectedProperty.title}
                  className="w-full h-32 object-cover rounded-t-md mb-2"
                />
              )}
              <h3 className="font-bold text-sm mb-1">{selectedProperty.title}</h3>
              <p className="text-blue-600 font-bold text-sm mb-1">
                {new Intl.NumberFormat('en-ZA', {
                  style: 'currency',
                  currency: 'ZAR',
                  maximumFractionDigits: 0,
                }).format(selectedProperty.price)}
              </p>
              <p className="text-xs text-slate-500 mb-2">
                {selectedProperty.bedrooms} Bed • {selectedProperty.bathrooms} Bath • {selectedProperty.area} m²
              </p>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => onPropertySelect?.(selectedProperty.id)}
              >
                View Details
              </Button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
         <Button 
           variant="secondary" 
           className="shadow-md bg-white/90 hover:bg-white text-slate-800"
           onClick={handleSearchInArea}
         >
           <MapPin className="h-4 w-4 mr-2 text-blue-600" />
           Search in this area
         </Button>
      </div>
    </div>
  );
}
