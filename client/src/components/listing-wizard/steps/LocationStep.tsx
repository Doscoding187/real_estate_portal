/**
 * Step 5: Location Picker with Map
 * Implements Google Maps integration with pin drop and reverse geocoding
 * Uses the same LocationMapPicker as the development wizard
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { LocationMapPicker, LocationData } from '@/components/location/LocationMapPicker';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type AddressPrediction = {
  placeId: string;
  description: string;
};

const LocationStep: React.FC<{ addressHint?: string }> = ({ addressHint }) => {
  const { location, setLocation } = useListingWizardStore();
  const [manualOverride, setManualOverride] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [addressSearch, setAddressSearch] = useState(location?.address || '');
  const [addressPredictions, setAddressPredictions] = useState<AddressPrediction[]>([]);
  const [isFetchingPredictions, setIsFetchingPredictions] = useState(false);
  const resolveLocationMutation = trpc.location.resolveForAuthoring.useMutation();

  useEffect(() => {
    setAddressSearch(location?.address || addressHint || '');
  }, [addressHint, location?.address]);

  const extractAddressParts = useCallback((addressComponents: google.maps.GeocoderAddressComponent[]) => {
    const getComponent = (type: string): string | undefined => {
      const component = addressComponents.find(c => c.types.includes(type));
      return component?.long_name;
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const streetAddress = [streetNumber, route].filter(Boolean).join(' ').trim();

    return {
      address: streetAddress || undefined,
      suburb: getComponent('sublocality') || getComponent('sublocality_level_1') || undefined,
      city: getComponent('locality') || getComponent('administrative_area_level_2') || undefined,
      province: getComponent('administrative_area_level_1') || undefined,
      postalCode: getComponent('postal_code') || undefined,
    };
  }, []);

  const applyConfirmedLocation = useCallback(
    (nextLocation: any) => {
      setLocation(nextLocation);
      void resolveLocationMutation
        .mutateAsync(nextLocation)
        .then(resolved => {
          setLocation({
            ...nextLocation,
            provinceId: resolved.provinceId,
            cityId: resolved.cityId,
            suburbId: resolved.suburbId,
            privateAddress: resolved.privateAddress,
            coordinateSource: resolved.coordinateSource,
            locationConfirmationState: resolved.locationConfirmationState,
            publicLocationPrecision: resolved.publicLocationPrecision,
          });
        })
        .catch(() => {
          // The server repeats resolution at create/update. A provider outage
          // must not erase a valid manually confirmed map selection.
        });
    },
    [resolveLocationMutation, setLocation],
  );

  const handleLocationSelect = useCallback(
    (locationData: LocationData) => {
      applyConfirmedLocation({
        address: locationData.address || locationData.formattedAddress || '',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: locationData.city || location?.city || '',
        suburb: locationData.suburb || location?.suburb || '',
        province: locationData.province || location?.province || '',
        postalCode: locationData.postalCode || location?.postalCode || '',
        placeId: (locationData as any).placeId || (location as any)?.placeId || '',
        coordinateSource: locationData.coordinateSource || 'map',
        locationConfirmationState: 'confirmed',
        publicLocationPrecision: location?.publicLocationPrecision || 'approximate',
        addressComponents: (locationData as any).addressComponents || [],
      });
      setAddressSearch(locationData.address || locationData.formattedAddress || '');
      setAddressPredictions([]);
      setManualOverride(false);
      setGeocodingError(null);
      toast.success('Location synced from map selection');
    },
    [applyConfirmedLocation, location],
  );

  const handleGeocodingError = useCallback((error: string) => {
    setGeocodingError(error);
  }, []);

  const handleManualEdit = useCallback(() => {
    setManualOverride(prev => {
      if (!prev) {
        toast.info('Manual mode enabled. Confirm the pin again after changing the address.');
      }
      return true;
    });
  }, []);

  const fetchAddressPredictions = useCallback((query: string) => {
    if (!query || query.trim().length < 3 || !window.google?.maps?.places) {
      setAddressPredictions([]);
      return;
    }

    setIsFetchingPredictions(true);
    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query.trim(),
        componentRestrictions: { country: 'za' },
        types: ['address'],
      },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          Array.isArray(predictions)
        ) {
          setAddressPredictions(
            predictions.slice(0, 6).map(prediction => ({
              placeId: prediction.place_id,
              description: prediction.description,
            })),
          );
        } else {
          setAddressPredictions([]);
        }
        setIsFetchingPredictions(false);
      },
    );
  }, []);

  const handleAddressSuggestionSelect = useCallback(
    (prediction: AddressPrediction) => {
      if (!window.google?.maps?.places) {
        return;
      }

      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      placesService.getDetails(
        {
          placeId: prediction.placeId,
          fields: ['geometry', 'formatted_address', 'address_components', 'place_id'],
        },
        (place, status) => {
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !place?.geometry?.location ||
            !place.address_components
          ) {
            toast.error('Could not load selected address details. Please try another suggestion.');
            return;
          }

          const latitude = place.geometry.location.lat();
          const longitude = place.geometry.location.lng();
          const parts = extractAddressParts(place.address_components);

          applyConfirmedLocation({
            address: parts.address || place.formatted_address || prediction.description,
            latitude,
            longitude,
            city: parts.city || location?.city || '',
            suburb: parts.suburb || location?.suburb || '',
            province: parts.province || location?.province || '',
            postalCode: parts.postalCode || location?.postalCode || '',
            placeId: place.place_id || prediction.placeId,
            coordinateSource: 'autocomplete',
            locationConfirmationState: 'confirmed',
            publicLocationPrecision: location?.publicLocationPrecision || 'approximate',
            addressComponents: place.address_components.map(component => ({
              long_name: component.long_name,
              short_name: component.short_name,
              types: component.types,
            })),
          });

          setAddressSearch(parts.address || place.formatted_address || prediction.description);
          setAddressPredictions([]);
          setManualOverride(false);
          setGeocodingError(null);
          toast.success('Address selected and pin moved to match the location.');
        },
      );
    },
    [applyConfirmedLocation, extractAddressParts, location],
  );

  // Handle manual address field changes
  const handleAddressChange = (field: string, value: string) => {
    handleManualEdit();
    if (field === 'address') {
      setAddressSearch(value);
      fetchAddressPredictions(value);
    }
    if (location) {
      const newLocation = {
        ...location,
        [field]: value,
        coordinateSource: null,
        locationConfirmationState: 'needs_confirmation' as const,
      };
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
        coordinateSource: null,
        locationConfirmationState: 'needs_confirmation' as const,
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
            Search an address, enter the area manually, or drop a pin. The map confirms the physical
            location; a street address is optional for farms, smallholdings and new sites.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <Label>What should prospects see?</Label>
            <p className="mt-1 text-sm text-slate-600">
              We keep the exact pin private by default and show the surrounding area instead.
            </p>
          </div>
          <RadioGroup
            value={location?.publicLocationPrecision || 'approximate'}
            onValueChange={value =>
              setLocation({
                ...(location || {
                  address: '',
                  latitude: 0,
                  longitude: 0,
                  city: '',
                  province: '',
                }),
                publicLocationPrecision: value as 'approximate' | 'exact',
              })
            }
            className="grid gap-3 md:grid-cols-2"
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3">
              <RadioGroupItem value="approximate" id="public-location-approximate" className="mt-1" />
              <span>
                <span className="block text-sm font-medium">Approximate location</span>
                <span className="block text-xs text-slate-500">Show the area, not the exact property location.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3">
              <RadioGroupItem value="exact" id="public-location-exact" className="mt-1" />
              <span>
                <span className="block text-sm font-medium">Exact location</span>
                <span className="block text-xs text-slate-500">Allow the exact address and pin to appear publicly.</span>
              </span>
            </label>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address">
              Street Address{' '}
              {!manualOverride && (
                <span className="text-xs text-slate-500">(Auto-filled from map)</span>
              )}
            </Label>
            <Input
              id="address"
              placeholder="Enter street address or use map"
              value={addressSearch}
              onChange={e => handleAddressChange('address', e.target.value)}
              className="mt-1"
            />
            {(isFetchingPredictions || addressPredictions.length > 0) && (
              <div className="mt-2 rounded-md border bg-white shadow-sm">
                {isFetchingPredictions && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching nearby addresses...</span>
                  </div>
                )}
                {!isFetchingPredictions &&
                  addressPredictions.map(prediction => (
                    <button
                      key={prediction.placeId}
                      type="button"
                      onClick={() => handleAddressSuggestionSelect(prediction)}
                      className="block w-full border-b px-3 py-2 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
                    >
                      {prediction.description}
                    </button>
                  ))}
              </div>
            )}
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
