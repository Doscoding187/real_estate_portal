import { useState, useCallback, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  MarkerClusterer,
} from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { withRentalPeriod } from '@/lib/rentPresentation';
import type { SearchCardIdentity } from '@shared/types';
import { AlertCircle, List, Loader2, MapPin } from 'lucide-react';

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
  listingSource?: 'manual' | 'development';
  /**
   * Canonical server-resolved supply identity. It is optional only because the
   * minimal property-location map never opens a listing preview.
   */
  identity?: SearchCardIdentity;
  primaryBadge?: string;
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
  onRecoveryViewChange?: (view: 'list') => void;
  className?: string;
  minimal?: boolean;
}

const libraries: 'places'[] = ['places'];

const identityRoleLabels: Record<SearchCardIdentity['role'], string> = {
  agent: 'Agent',
  agency: 'Agency',
  developer: 'Developer',
  platform: 'Property Listify managed',
  private: 'Private seller',
};

const getPropertyFacts = (property: PropertyMarker): string[] =>
  [
    typeof property.bedrooms === 'number' && property.bedrooms > 0
      ? `${property.bedrooms} Bed`
      : null,
    typeof property.bathrooms === 'number' && property.bathrooms > 0
      ? `${property.bathrooms} Bath`
      : null,
    typeof property.area === 'number' && property.area > 0 ? `${property.area} m²` : null,
  ].filter((fact): fact is string => Boolean(fact));

export function GooglePropertyMap({
  properties,
  onBoundsChange,
  onPropertySelect,
  onRecoveryViewChange,
  className,
  minimal = false,
}: GooglePropertyMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);
  const selectedPropertyFacts = selectedProperty ? getPropertyFacts(selectedProperty) : [];

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (properties.length === 1 && properties[0].latitude && properties[0].longitude) {
        map.setCenter({ lat: properties[0].latitude, lng: properties[0].longitude });
        map.setZoom(15);
      } else if (properties.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        let hasValidBounds = false;
        properties.forEach(prop => {
          if (prop.latitude && prop.longitude) {
            bounds.extend({ lat: prop.latitude, lng: prop.longitude });
            hasValidBounds = true;
          }
        });
        if (hasValidBounds) {
          map.fitBounds(bounds);
        }
      } else {
        map.setCenter(defaultCenter);
        map.setZoom(10);
      }
      setMap(map);
    },
    [properties],
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (property: PropertyMarker) => {
    if (minimal) return;
    setSelectedProperty(property);
  };

  const handleSearchInArea = () => {
    if (map && onBoundsChange) {
      onBoundsChange(map.getBounds()!);
    }
  };

  useEffect(() => {
    if (map) {
      if (properties.length === 1 && properties[0].latitude && properties[0].longitude) {
        map.setCenter({ lat: properties[0].latitude, lng: properties[0].longitude });
        map.setZoom(15);
      } else if (properties.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        let hasValidBounds = false;
        properties.forEach(prop => {
          if (prop.latitude && prop.longitude) {
            bounds.extend({ lat: prop.latitude, lng: prop.longitude });
            hasValidBounds = true;
          }
        });
        if (hasValidBounds) {
          map.fitBounds(bounds);
        }
      }
    }
  }, [map, properties]);

  if (loadError) {
    return (
      <div
        className={`flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-6 text-center ${className ?? ''}`}
        role="alert"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">Map temporarily unavailable</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">
          {minimal
            ? 'The property location could not be displayed. Please try again later.'
            : 'Your search results are still available. Continue in List view while the map reconnects.'}
        </p>
        {!minimal && onRecoveryViewChange ? (
          <div className="mt-5 flex justify-center">
            <Button onClick={() => onRecoveryViewChange('list')}>
              <List className="mr-2 h-4 w-4" aria-hidden="true" />
              View List
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-slate-50 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200 ${className ?? ''}`}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: !minimal,
          zoomControl: !minimal,
          gestureHandling: minimal ? 'none' : 'cooperative',
          disableDefaultUI: minimal,
        }}
      >
        <MarkerClusterer>
          {clusterer => (
            <>
              {properties.map(property => (
                <Marker
                  key={property.id}
                  position={{ lat: property.latitude, lng: property.longitude }}
                  onClick={() => handleMarkerClick(property)}
                  clusterer={!minimal ? clusterer : undefined}
                />
              ))}
            </>
          )}
        </MarkerClusterer>

        {selectedProperty && !minimal && (
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
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedProperty.primaryBadge ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {selectedProperty.primaryBadge}
                  </span>
                ) : null}
              </div>
              {selectedProperty.identity ? (
                <div className="mb-2 border-l-2 border-slate-200 pl-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {identityRoleLabels[selectedProperty.identity.role]}
                  </p>
                  <p className="text-xs font-medium text-slate-800">
                    {selectedProperty.identity.name}
                  </p>
                  {selectedProperty.identity.organizationName &&
                  selectedProperty.identity.organizationName !== selectedProperty.identity.name ? (
                    <p className="text-[11px] text-slate-500">
                      {selectedProperty.identity.organizationName}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-blue-600 font-bold text-sm mb-1">
                {selectedProperty.listingSource === 'development' ? 'From ' : ''}
                {withRentalPeriod(
                  new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                    maximumFractionDigits: 0,
                  }).format(selectedProperty.price),
                  selectedProperty.listingType,
                )}
              </p>
              {selectedPropertyFacts.length > 0 ? (
                <p className="mb-2 text-xs text-slate-500">{selectedPropertyFacts.join(' • ')}</p>
              ) : null}
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

      {!minimal && (
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
      )}
    </div>
  );
}
