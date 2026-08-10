import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, MapPin } from 'lucide-react';
import { useListingWizardStore, getLocationValidationIssues } from '@/hooks/useListingWizard';
import { trpc } from '@/lib/trpc';
import type { LocationData } from '../../../../../shared/listing-types';
import type { PrivateAddress } from '../../../../../shared/location-contract';
import {
  publicLocationPolicyToStoredPrecision,
  type PublicLocationPolicy,
} from '../../../../../shared/location-contract';
import { LocationMapPicker } from '@/components/location/LocationMapPicker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type HierarchyItem = { id: number; name: string; code?: string; postalCode?: string };
type AddressField =
  | 'streetName'
  | 'streetNumber'
  | 'buildingName'
  | 'complexOrEstateName'
  | 'unitNumber'
  | 'postalCode'
  | 'farmOrHoldingName'
  | 'portionReference';

const EMPTY_LOCATION: LocationData = {
  address: '',
  latitude: null,
  longitude: null,
  city: '',
  suburb: '',
  province: '',
  postalCode: '',
  privateAddress: null,
  coordinateSource: null,
  locationConfirmationState: 'needs_confirmation',
  publicLocationPrecision: 'approximate',
};

function addressFromPrivate(privateAddress: PrivateAddress | null | undefined): string {
  if (!privateAddress) return '';
  return [privateAddress.streetNumber, privateAddress.streetName]
    .filter(Boolean)
    .join(' ')
    || privateAddress.farmOrHoldingName
    || privateAddress.complexOrEstateName
    || '';
}

function hasAddressValues(value: PrivateAddress): boolean {
  return Object.values(value).some(item => typeof item === 'string' && item.trim().length > 0);
}

const LocationStep: React.FC<{ addressHint?: string }> = ({ addressHint }) => {
  const store = useListingWizardStore();
  const { location, propertyType, setLocation } = store;
  const currentLocation = location || EMPTY_LOCATION;
  const [mapUnavailable, setMapUnavailable] = useState(
    !import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  );
  const [providerMessage, setProviderMessage] = useState('');
  const [manualError, setManualError] = useState('');

  const provincesQuery = trpc.location.getLocationHierarchy.useQuery({ depth: 'province' });
  const citiesQuery = trpc.location.getLocationHierarchy.useQuery(
    { depth: 'city', provinceId: currentLocation.provinceId ?? undefined },
    { enabled: Boolean(currentLocation.provinceId) },
  );
  const suburbsQuery = trpc.location.getLocationHierarchy.useQuery(
    { depth: 'suburb', cityId: currentLocation.cityId ?? undefined },
    { enabled: Boolean(currentLocation.cityId) },
  );
  const resolveLocation = trpc.location.resolveForAuthoring.useMutation();

  const provinces = (provincesQuery.data || []) as HierarchyItem[];
  const cities = (citiesQuery.data || []) as HierarchyItem[];
  const suburbs = (suburbsQuery.data || []) as HierarchyItem[];
  const isFarm = propertyType === 'farm';
  const isConfirmed = currentLocation.locationConfirmationState === 'confirmed';
  const resolvedStreet = [
    currentLocation.privateAddress?.streetNumber,
    currentLocation.privateAddress?.streetName,
  ]
    .filter(Boolean)
    .join(' ');
  const resolvedRuralContext = [
    currentLocation.privateAddress?.farmOrHoldingName,
    currentLocation.privateAddress?.portionReference,
  ]
    .filter(Boolean)
    .join(' · ');
  const resolvedArea = [currentLocation.suburb, currentLocation.city].filter(Boolean).join(', ');
  const hasResolvedLocation = Boolean(resolvedStreet || resolvedRuralContext || resolvedArea || currentLocation.province);
  const validationIssues = useMemo(
    () => getLocationValidationIssues({ propertyType, location }),
    [location, propertyType],
  );

  const withLocationDefaults = (updates: Partial<LocationData>): LocationData => ({
    ...EMPTY_LOCATION,
    ...currentLocation,
    ...updates,
  });

  const resetLocationEvidence = (updates: Partial<LocationData>): LocationData =>
    withLocationDefaults({
      ...updates,
      latitude: null,
      longitude: null,
      placeId: undefined,
      providerLocationPlaceId: undefined,
      coordinateSource: null,
      locationConfirmationState: 'needs_confirmation',
    });

  const updateHierarchy = (
    level: 'province' | 'city' | 'suburb',
    idValue: string,
  ) => {
    const id = Number(idValue);
    if (!Number.isInteger(id) || id <= 0) return;

    if (level === 'province') {
      const selected = provinces.find(item => item.id === id);
      setLocation(
        resetLocationEvidence({
          provinceId: id,
          province: selected?.name || '',
          cityId: null,
          city: '',
          suburbId: null,
          suburb: '',
        }),
      );
      return;
    }

    if (level === 'city') {
      const selected = cities.find(item => item.id === id);
      setLocation(
        resetLocationEvidence({
          cityId: id,
          city: selected?.name || '',
          suburbId: null,
          suburb: '',
        }),
      );
      return;
    }

    const selected = suburbs.find(item => item.id === id);
    setLocation(
      resetLocationEvidence({
        suburbId: id,
        suburb: selected?.name || '',
        postalCode: currentLocation.postalCode || selected?.postalCode || '',
      }),
    );
  };

  const updateAddress = (field: AddressField, value: string) => {
    const nextPrivateAddress: PrivateAddress = {
      ...(currentLocation.privateAddress || {}),
      [field]: value,
    };
    const privateAddress = hasAddressValues(nextPrivateAddress) ? nextPrivateAddress : null;
    setLocation(
      withLocationDefaults({
        address: addressFromPrivate(privateAddress),
        latitude: null,
        longitude: null,
        postalCode: field === 'postalCode' ? value : currentLocation.postalCode,
        privateAddress,
        coordinateSource: null,
        locationConfirmationState: 'needs_confirmation',
        placeId: undefined,
        providerLocationPlaceId: undefined,
      }),
    );
    setManualError('');
  };

  const applyResolvedLocation = (resolved: any, base: LocationData) => {
    const coordinatePair = resolved.coordinatePair;
    setLocation({
      ...base,
      provinceId: resolved.provinceId ?? base.provinceId ?? null,
      cityId: resolved.cityId ?? base.cityId ?? null,
      suburbId: resolved.suburbId ?? base.suburbId ?? null,
      province: resolved.province ?? base.province,
      city: resolved.city ?? base.city,
      suburb: resolved.suburb ?? base.suburb,
      privateAddress: resolved.privateAddress ?? base.privateAddress ?? null,
      address: addressFromPrivate(resolved.privateAddress ?? base.privateAddress) || base.address,
      latitude: coordinatePair?.latitude ?? null,
      longitude: coordinatePair?.longitude ?? null,
      coordinateSource: resolved.coordinateSource ?? null,
      locationConfirmationState: resolved.locationConfirmationState,
      publicLocationPrecision: resolved.publicLocationPrecision || 'approximate',
      providerLocationPlaceId: resolved.providerLocationPlaceId || base.providerLocationPlaceId,
    });
  };

  const refreshResolvedSuburb = async (resolved: any) => {
    if (resolved.suburbId && !suburbs.some(item => item.id === resolved.suburbId)) {
      await suburbsQuery.refetch();
    }
  };

  const confirmManualLocation = async () => {
    const nextLocation = withLocationDefaults({
      locationConfirmationState: 'confirmed',
      coordinateSource:
        currentLocation.latitude != null && currentLocation.longitude != null
          ? currentLocation.coordinateSource || 'manual_confirmed'
          : 'manual_confirmed',
      providerLocationPlaceId: undefined,
      placeId: undefined,
    });
    const issues = getLocationValidationIssues({ propertyType, location: nextLocation });
    if (issues.length > 0) {
      setManualError(issues[0]);
      return;
    }

    setManualError('');
    try {
      const resolved = await resolveLocation.mutateAsync({
        ...nextLocation,
        propertyType: propertyType || null,
        providerLocationPlaceId: null,
        provider: null,
      });
      applyResolvedLocation(resolved, nextLocation);
    } catch (error) {
      setManualError(error instanceof Error ? error.message : 'We could not confirm this location.');
    }
  };

  const handleProviderLocation = async (selected: any) => {
    const addressComponents = selected.addressComponents || [];
    const component = (type: string) =>
      addressComponents.find((item: any) => item.types.includes(type))?.long_name || '';
    const resolvedSuburb =
      selected.suburb ||
      component('sublocality') ||
      component('sublocality_level_1') ||
      component('neighborhood') ||
      component('administrative_area_level_3');
    const resolvedCity =
      selected.city || component('locality') || component('administrative_area_level_2');
    const resolvedProvince = selected.province || component('administrative_area_level_1');
    const streetName = component('route');
    const privateAddress: PrivateAddress = {
      ...(component('street_number') ? { streetNumber: component('street_number') } : {}),
      ...(streetName ? { streetName } : {}),
      ...(component('premise') ? { buildingName: component('premise') } : {}),
      ...(component('subpremise') ? { unitNumber: component('subpremise') } : {}),
      ...(component('postal_code') ? { postalCode: component('postal_code') } : {}),
    };
    const nextLocation = withLocationDefaults({
      address: addressFromPrivate(privateAddress) || selected.address || '',
      latitude: selected.latitude ?? null,
      longitude: selected.longitude ?? null,
      city: resolvedCity,
      suburb: resolvedSuburb,
      province: resolvedProvince,
      postalCode: selected.postalCode || component('postal_code') || '',
      // A deliberate provider result or pin is the newest location evidence.
      // Clear prior discovery IDs so stale manual selections cannot win.
      provinceId: null,
      cityId: null,
      suburbId: null,
      placeId: selected.placeId,
      providerLocationPlaceId: selected.placeId,
      provider: 'google',
      privateAddress,
      coordinateSource: selected.coordinateSource || 'autocomplete',
      locationConfirmationState: 'needs_confirmation',
      addressComponents,
    });

    setProviderMessage('');
    setManualError('');
    setLocation(nextLocation);

    try {
      const resolved = await resolveLocation.mutateAsync({
        ...nextLocation,
        propertyType: propertyType || null,
      });
      applyResolvedLocation(resolved, nextLocation);
      await refreshResolvedSuburb(resolved);
    } catch (error) {
      setProviderMessage(error instanceof Error ? error.message : 'We could not resolve that place.');
    }
  };

  const setPublicPolicy = (policy: PublicLocationPolicy) => {
    setLocation(
      withLocationDefaults({
        publicLocationPrecision: publicLocationPolicyToStoredPrecision(policy),
      }),
    );
  };

  return (
    <div className="space-y-6" data-testid="location-step">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-blue-600">Step 6</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Where is the property?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Choose the canonical area, then confirm the street-level property location. A map can
          enrich the listing, but it is not required for manual authoring.
        </p>
      </div>

      {(mapUnavailable || providerMessage) && (
        <Alert variant={providerMessage && !mapUnavailable ? 'default' : 'destructive'}>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {providerMessage ||
              'Map search is not available right now. You can still enter the property location manually.'}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-blue-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            Find the property
          </CardTitle>
          <CardDescription>
            Search an address, street or place, or move the pin to the property. The details below
            will stay synchronized with the latest location action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mapUnavailable ? (
            <LocationMapPicker
              initialLat={currentLocation.latitude ?? undefined}
              initialLng={currentLocation.longitude ?? undefined}
              searchQuery={[
                currentLocation.privateAddress?.streetNumber,
                currentLocation.privateAddress?.streetName,
                currentLocation.suburb,
                currentLocation.city,
                currentLocation.province,
              ]
                .filter(Boolean)
                .join(', ')}
              onLocationSelect={handleProviderLocation}
              onGeocodingError={message => {
                setProviderMessage(message);
                if (/load|api key|maps/i.test(message)) setMapUnavailable(true);
              }}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Map search isn&apos;t available right now.</p>
              <p className="mt-1">You can still enter the property location details below.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location found</CardTitle>
          <CardDescription>
            Review the location resolved from the search or pin before confirming it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            data-testid="resolved-location-summary"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            {hasResolvedLocation ? (
              <>
                {(resolvedStreet || resolvedRuralContext) && (
                  <p className="font-semibold text-slate-900">{resolvedStreet || resolvedRuralContext}</p>
                )}
                {resolvedArea && <p className="text-sm text-slate-700">{resolvedArea}</p>}
                {currentLocation.province && (
                  <p className="text-sm text-slate-600">{currentLocation.province}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Choose a location above or complete the property details below.
              </p>
            )}
            {currentLocation.latitude != null && currentLocation.longitude != null && (
              <Badge className="mt-3" variant="secondary">
                Coordinates captured
              </Badge>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Confirm this location</p>
            <p className="mt-1">
              {isConfirmed
                ? 'The current address and discovery area are confirmed.'
                : 'Confirm the current address and discovery area before continuing.'}
            </p>
            <Button
              type="button"
              className="mt-3"
              onClick={confirmManualLocation}
              disabled={resolveLocation.isPending}
            >
              {resolveLocation.isPending ? 'Confirming…' : isConfirmed ? 'Reconfirm location' : 'Confirm location'}
            </Button>
            {manualError && (
              <p className="mt-2 flex items-center gap-2 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4" />
                {manualError}
              </p>
            )}
            {isConfirmed && !manualError && (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Ready to continue. Coordinates are optional when the location is valid.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property location details</CardTitle>
          <CardDescription>
            These details use Property Listify geography IDs and stay synchronized with the map.
            You can edit them manually if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location-province">Province</Label>
              <Select
                value={currentLocation.provinceId ? String(currentLocation.provinceId) : ''}
                onValueChange={value => updateHierarchy('province', value)}
              >
                <SelectTrigger id="location-province" className="w-full">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provincesQuery.isPending ? (
                    <SelectItem value="__loading" disabled>
                      Loading provinces…
                    </SelectItem>
                  ) : provincesQuery.isError || provinces.length === 0 ? (
                    <SelectItem value="__unavailable" disabled>
                      We couldn&apos;t load locations. Try again.
                    </SelectItem>
                  ) : (
                    provinces.map(item => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {provincesQuery.isPending && (
                <p className="text-xs text-slate-500" role="status">
                  Loading provinces…
                </p>
              )}
              {(provincesQuery.isError || (!provincesQuery.isPending && provinces.length === 0)) && (
                <p className="text-xs text-red-600" role="alert">
                  We couldn&apos;t load locations. Try again.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-city">City / town</Label>
              <Select
                value={currentLocation.cityId ? String(currentLocation.cityId) : ''}
                onValueChange={value => updateHierarchy('city', value)}
                disabled={!currentLocation.provinceId}
              >
                <SelectTrigger id="location-city" className="w-full">
                  <SelectValue placeholder="Select city or town" />
                </SelectTrigger>
                <SelectContent>
                  {citiesQuery.isPending ? (
                    <SelectItem value="__loading" disabled>
                      Loading cities…
                    </SelectItem>
                  ) : citiesQuery.isError || cities.length === 0 ? (
                    <SelectItem value="__unavailable" disabled>
                      No cities available
                    </SelectItem>
                  ) : (
                    cities.map(item => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {currentLocation.provinceId && citiesQuery.isPending && (
                <p className="text-xs text-slate-500" role="status">
                  Loading cities…
                </p>
              )}
              {currentLocation.provinceId && (citiesQuery.isError || (!citiesQuery.isPending && cities.length === 0)) && (
                <p className="text-xs text-red-600" role="alert">
                  We couldn&apos;t load locations. Try again.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-suburb">Suburb / locality {isFarm ? '(optional)' : ''}</Label>
              <Select
                value={currentLocation.suburbId ? String(currentLocation.suburbId) : ''}
                onValueChange={value => updateHierarchy('suburb', value)}
                disabled={!currentLocation.cityId}
              >
                <SelectTrigger id="location-suburb" className="w-full">
                  <SelectValue placeholder={isFarm ? 'Select if applicable' : 'Select suburb or locality'} />
                </SelectTrigger>
                <SelectContent>
                  {suburbsQuery.isPending ? (
                    <SelectItem value="__loading" disabled>
                      Loading suburbs…
                    </SelectItem>
                  ) : suburbsQuery.isError || suburbs.length === 0 ? (
                    <SelectItem value="__unavailable" disabled>
                      No suburbs available
                    </SelectItem>
                  ) : (
                    suburbs.map(item => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {currentLocation.cityId && suburbsQuery.isPending && (
                <p className="text-xs text-slate-500" role="status">
                  Loading suburbs…
                </p>
              )}
              {currentLocation.cityId && (suburbsQuery.isError || (!suburbsQuery.isPending && suburbs.length === 0)) && (
                <p className="text-xs text-red-600" role="alert">
                  We couldn&apos;t load locations. Try again.
                </p>
              )}
            </div>
          </div>

          {isFarm ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-farm-name">Farm / holding name</Label>
                <Input
                  id="location-farm-name"
                  value={currentLocation.privateAddress?.farmOrHoldingName || ''}
                  onChange={event => updateAddress('farmOrHoldingName', event.target.value)}
                  placeholder="e.g. Riverside Smallholding"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-portion">Portion / rural reference</Label>
                <Input
                  id="location-portion"
                  value={currentLocation.privateAddress?.portionReference || ''}
                  onChange={event => updateAddress('portionReference', event.target.value)}
                  placeholder="Optional portion or route reference"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="space-y-2">
                <Label htmlFor="location-street-number">
                  Street number <span className="font-normal text-slate-500">(optional)</span>
                </Label>
                <Input
                  id="location-street-number"
                  value={currentLocation.privateAddress?.streetNumber || ''}
                  onChange={event => updateAddress('streetNumber', event.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-street-name">
                  Street name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="location-street-name"
                  value={currentLocation.privateAddress?.streetName || ''}
                  onChange={event => updateAddress('streetName', event.target.value)}
                  placeholder={addressHint || 'e.g. Katherine Street'}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location-building">
                Building / complex <span className="font-normal text-slate-500">(optional)</span>
              </Label>
              <Input
                id="location-building"
                value={currentLocation.privateAddress?.buildingName || currentLocation.privateAddress?.complexOrEstateName || ''}
                onChange={event => updateAddress('buildingName', event.target.value)}
                placeholder="Optional building or estate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-unit">
                Unit number <span className="font-normal text-slate-500">(optional)</span>
              </Label>
              <Input
                id="location-unit"
                value={currentLocation.privateAddress?.unitNumber || ''}
                onChange={event => updateAddress('unitNumber', event.target.value)}
                placeholder="Optional unit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-postal">
                Postal code <span className="font-normal text-slate-500">(optional)</span>
              </Label>
              <Input
                id="location-postal"
                value={currentLocation.privateAddress?.postalCode || currentLocation.postalCode || ''}
                onChange={event => updateAddress('postalCode', event.target.value)}
                placeholder="Optional postal code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What should prospects see?</CardTitle>
          <CardDescription>
            Property Listify keeps the complete location private. Street location is recommended;
            the full address is an explicit opt-in. Unit numbers remain private in this version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={currentLocation.publicLocationPrecision === 'exact' ? 'full_address' : 'street'}
            onValueChange={value => setPublicPolicy(value as PublicLocationPolicy)}
            className="grid gap-3 md:grid-cols-2"
          >
            <label className="flex cursor-pointer gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50">
              <RadioGroupItem value="street" id="public-location-street" className="mt-1" />
              <span>
                <span className="block font-medium text-slate-900">Street location — Recommended</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Show the street and area, but hide the house number, unit and exact private point.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50">
              <RadioGroupItem value="full_address" id="public-location-full" className="mt-1" />
              <span>
                <span className="block font-medium text-slate-900">Full address</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Show the street number and street, while the unit number remains private.
                </span>
              </span>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {validationIssues.length > 0 && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Complete Location before continuing:</span>{' '}
            {validationIssues.join(' ')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LocationStep;
