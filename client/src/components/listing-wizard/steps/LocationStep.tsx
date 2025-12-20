/**
 * Step 5: Location Picker with Map
 * Implements Google Maps integration with pin drop and reverse geocoding
 * Uses the same LocationMapPicker as the development wizard
 */

import React, { useState, useCallback } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertTriangle, Info } from 'lucide-react';
import { LocationMapPicker, LocationData } from '@/components/location/LocationMapPicker';
import { toast } from 'sonner';

const LocationStep: React.FC = () => {
  const { location, setLocation } = useListingWizardStore();
  const [manualOverride, setManualOverride] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const handleLocationSelect = useCallback(
    (locationData: LocationData) => {
      if (!manualOverride) {
        setLocation({
          address: locationData.address || locationData.formattedAddress || '',
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          city: locationData.city || location?.city || '',
          suburb: locationData.suburb || location?.suburb || '',
          province: locationData.province || location?.province || '',
          postalCode: locationData.postalCode || location?.postalCode || '',
        });

        setGeocodingError(null);
        toast.success('Address populated from map location');
      }
    },
    [manualOverride, setLocation, location]
  );

  const handleGeocodingError = useCallback((error: string) => {
    setGeocodingError(error);
  }, []);

  const handleManualEdit = useCallback(() => {
    setManualOverride(true);
    toast.info('Manual mode enabled. Move the pin to update address again.');
  }, []);

  // Handle manual address input changes
  const handleAddressChange = (field: string, value: string) => {
    handleManualEdit();
    if (location) {
      const newLocation = { ...location, [field]: value };
      setLocation(newLocation);
    } else {
      // Initialize location object if it doesn't exist
      const newLocation = {
        address: '',
        latitude: 0,
        longitude: 0,
        city: '',
        province: '',
        [field]: value,
      } as any;
      setLocation(newLocation);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Property Location</h3>
      </div>

      {/* Interactive Map with Search Box */}
      <div className="space-y-4">
        <LocationMapPicker
          initialLat={location?.latitude || -26.2041}
          initialLng={location?.longitude || 28.0473}
          onLocationSelect={handleLocationSelect}
          onGeocodingError={handleGeocodingError}
        />
        
        {geocodingError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{geocodingError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Manual address input fields */}
      <div className="space-y-4">
        <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Address fields are auto-populated when you select a location. You can edit them manually if needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="address">
              Street Address {!manualOverride && <span className="text-xs text-slate-500">(Auto-filled from map)</span>}
            </Label>
            <Input
              id="address"
              placeholder="Enter street address or use map"
              value={location?.address || ''}
              onChange={e => handleAddressChange('address', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="suburb">Suburb</Label>
            <Input
              id="suburb"
              placeholder="e.g., Sandton"
              value={location?.suburb || ''}
              onChange={e => handleAddressChange('suburb', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="e.g., Johannesburg"
              value={location?.city || ''}
              onChange={e => handleAddressChange('city', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="province">Province *</Label>
            <Input
              id="province"
              placeholder="e.g., Gauteng"
              value={location?.province || ''}
              onChange={e => handleAddressChange('province', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="e.g., 2196"
              value={location?.postalCode || ''}
              onChange={e => handleAddressChange('postalCode', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LocationStep;
