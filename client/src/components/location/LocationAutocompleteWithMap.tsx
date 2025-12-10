/**
 * LocationAutocompleteWithMap Component
 * 
 * Combines LocationAutocomplete with MapPreview to provide:
 * - Google Places autocomplete
 * - Map preview on selection
 * - Draggable marker for fine-tuning
 * 
 * Requirements: 1.1-1.5, 12.1-12.5
 */

import { useState, useCallback } from 'react';
import { LocationAutocomplete } from './LocationAutocomplete';
import { MapPreview } from './MapPreview';
import { Label } from '@/components/ui/label';

interface LocationOption {
  id: number;
  name: string;
  type: 'province' | 'city' | 'suburb';
  latitude?: string;
  longitude?: string;
  provinceName?: string;
  cityName?: string;
  postalCode?: string;
  isMetro?: number;
}

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

export function LocationAutocompleteWithMap({
  value = '',
  onValueChange,
  onLocationSelect,
  placeholder = 'Enter location...',
  type = 'all',
  className,
  showMapPreview = true,
  label = 'Location',
}: LocationAutocompleteWithMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const handleLocationSelect = useCallback(
    (location: LocationOption) => {
      const lat = location.latitude ? parseFloat(location.latitude) : 0;
      const lng = location.longitude ? parseFloat(location.longitude) : 0;

      const locationData: LocationData = {
        name: location.name,
        latitude: lat,
        longitude: lng,
        suburb: location.type === 'suburb' ? location.name : undefined,
        city: location.cityName || (location.type === 'city' ? location.name : undefined),
        province: location.provinceName || (location.type === 'province' ? location.name : undefined),
        postalCode: location.postalCode,
      };

      setSelectedLocation(locationData);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    },
    [onLocationSelect]
  );

  const handleMapLocationChange = useCallback(
    (mapLocation: {
      lat: number;
      lng: number;
      address?: string;
      suburb?: string;
      city?: string;
      province?: string;
    }) => {
      if (!selectedLocation) return;

      const updatedLocation: LocationData = {
        ...selectedLocation,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        address: mapLocation.address,
        suburb: mapLocation.suburb || selectedLocation.suburb,
        city: mapLocation.city || selectedLocation.city,
        province: mapLocation.province || selectedLocation.province,
      };

      setSelectedLocation(updatedLocation);

      if (onLocationSelect) {
        onLocationSelect(updatedLocation);
      }
    },
    [selectedLocation, onLocationSelect]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <LocationAutocomplete
          value={value}
          onValueChange={onValueChange}
          onLocationSelect={handleLocationSelect}
          placeholder={placeholder}
          type={type}
        />
      </div>

      {showMapPreview && selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
        <div className="space-y-2">
          <Label className="text-sm text-slate-600">
            Map Preview - Click to expand and adjust location
          </Label>
          <MapPreview
            center={{
              lat: selectedLocation.latitude,
              lng: selectedLocation.longitude,
            }}
            onLocationChange={handleMapLocationChange}
            showExpandButton={true}
          />
          {selectedLocation.address && (
            <p className="text-sm text-slate-600 mt-2">
              <span className="font-medium">Selected:</span> {selectedLocation.address}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
