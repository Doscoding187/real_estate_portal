import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Info, MapPin } from 'lucide-react';
import {
  useListingWizardStore,
  getLocationEvidenceValidationIssues,
  getLocationValidationIssues,
} from '@/hooks/useListingWizard';
import { CanonicalPlaceSelector } from '@/components/location/CanonicalPlaceSelector';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  return (
    [privateAddress.streetNumber, privateAddress.streetName].filter(Boolean).join(' ') ||
    privateAddress.farmOrHoldingName ||
    privateAddress.complexOrEstateName ||
    ''
  );
}

function hasAddressValues(value: PrivateAddress): boolean {
  return Object.values(value).some(item => typeof item === 'string' && item.trim().length > 0);
}

const LocationStep: React.FC<{ addressHint?: string }> = ({ addressHint }) => {
  const store = useListingWizardStore();
  const { location, propertyType, setLocation } = store;
  const currentLocation = location || EMPTY_LOCATION;
  const [mapUnavailable, setMapUnavailable] = useState(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [providerMessage, setProviderMessage] = useState('');
  const [manualError, setManualError] = useState('');

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
  const resolvedArea = [
    currentLocation.canonicalPlace?.label,
    currentLocation.canonicalPlace?.administrativeContext,
  ]
    .filter(Boolean)
    .join(', ');
  const hasResolvedLocation = Boolean(
    resolvedStreet || resolvedRuralContext || resolvedArea || currentLocation.province,
  );
  const confirmationPrerequisiteIssues = useMemo(
    () => getLocationEvidenceValidationIssues({ propertyType, location }),
    [location, propertyType],
  );
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

  const updateAddress = (field: AddressField, value: string) => {
    const nextPrivateAddress: PrivateAddress = {
      ...(currentLocation.privateAddress || {}),
      [field]: value,
    };
    if (!value.trim()) delete nextPrivateAddress[field];
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

  const confirmManualLocation = async () => {
    const nextLocation = withLocationDefaults({
      locationConfirmationState: 'confirmed',
      coordinateSource:
        currentLocation.latitude != null && currentLocation.longitude != null
          ? currentLocation.coordinateSource || 'manual_confirmed'
          : 'manual_confirmed',
    });
    const issues = getLocationValidationIssues({ propertyType, location: nextLocation });
    if (issues.length > 0) {
      setManualError(issues[0]);
      return;
    }

    setManualError('');
    setLocation(nextLocation);
  };

  const handleProviderLocation = async (selected: any) => {
    const addressComponents = selected.addressComponents || [];
    const component = (type: string) =>
      addressComponents.find((item: any) => item.types.includes(type))?.long_name || '';
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
      postalCode: selected.postalCode || component('postal_code') || '',
      // Provider enrichment preserves the explicit approved Place choice.
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

    setProviderMessage('Map details added. Review and confirm them for your selected location.');
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          Step 6 · Required to publish
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Where is the property?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Start with an approved location, then confirm the street-level property location. Map search
          is optional and never required for manual authoring.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-[var(--primary)]" />
            Enter the property location
          </CardTitle>
          <CardDescription>
            Choose an approved suburb, locality, city or town, then add the private property
            address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentLocation.canonicalLocationRefusal && (
            <Alert>
              <AlertDescription>
                Your saved location is unavailable. Choose an approved replacement.
              </AlertDescription>
            </Alert>
          )}
          <CanonicalPlaceSelector
            value={currentLocation.canonicalPlace ?? null}
            onChange={canonicalPlace => {
              setLocation(
                resetLocationEvidence({
                  canonicalPlace,
                  canonicalLocationRefusal: null,
                  provinceId: null,
                  cityId: null,
                  suburbId: null,
                  city: '',
                  province: '',
                  suburb: '',
                }),
              );
              setManualError('');
            }}
          />

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
                value={
                  currentLocation.privateAddress?.buildingName ||
                  currentLocation.privateAddress?.complexOrEstateName ||
                  ''
                }
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
                value={
                  currentLocation.privateAddress?.postalCode || currentLocation.postalCode || ''
                }
                onChange={event => updateAddress('postalCode', event.target.value)}
                placeholder="Optional postal code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[color:color-mix(in_oklab,var(--primary)_18%,white)]">
        <CardHeader>
          <CardTitle className="text-lg">Review &amp; confirm</CardTitle>
          <CardDescription>
            Check the resolved area and street-level details before continuing. Coordinates are
            helpful, but not required when the manual location is valid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            data-testid="resolved-location-summary"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            {hasResolvedLocation ? (
              <>
                {(resolvedStreet || resolvedRuralContext) && (
                  <p className="font-semibold text-slate-900">
                    {resolvedStreet || resolvedRuralContext}
                  </p>
                )}
                {resolvedArea && <p className="text-sm text-slate-700">{resolvedArea}</p>}
                {currentLocation.province && (
                  <p className="text-sm text-slate-600">{currentLocation.province}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Complete the property location details above, then confirm the result here.
              </p>
            )}
            {currentLocation.latitude != null && currentLocation.longitude != null && (
              <Badge className="mt-3" variant="secondary">
                Coordinates captured
              </Badge>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Confirm this location</p>
            <p className="mt-1">
              {isConfirmed
                ? 'The current address and discovery area are confirmed.'
                : 'Confirm the current address and discovery area before continuing.'}
            </p>
            <Button
              type="button"
              className="mt-3 bg-[var(--primary)] hover:bg-[color:color-mix(in_oklab,var(--primary)_86%,black)]"
              onClick={confirmManualLocation}
              disabled={confirmationPrerequisiteIssues.length > 0}
            >
              {isConfirmed ? 'Reconfirm location' : 'Confirm location'}
            </Button>
            {!isConfirmed && confirmationPrerequisiteIssues.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Complete the required location details above to unlock confirmation.
              </p>
            )}
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
                <span className="block font-medium text-slate-900">
                  Street location — Recommended
                </span>
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

      <details
        data-testid="optional-map-search"
        className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-colors open:border-slate-300"
      >
        <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset sm:px-6 [&::-webkit-details-marker]:hidden">
          <div className="mt-0.5 rounded-xl bg-blue-50 p-2.5 text-[var(--primary)]">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-800">Use map search</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Optional: search an address or move a pin to update the private address and coordinates.
              Your selected location stays the same; review and confirm the updated details.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:inline">
              Optional
            </span>
            <ChevronDown
              className="h-5 w-5 text-slate-400 transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-5 py-5 sm:px-6 sm:pb-6">
          {providerMessage && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>{providerMessage}</AlertDescription>
            </Alert>
          )}
          {!mapUnavailable ? (
            <LocationMapPicker
              initialLat={currentLocation.latitude ?? undefined}
              initialLng={currentLocation.longitude ?? undefined}
              searchQuery={[
                currentLocation.privateAddress?.streetNumber,
                currentLocation.privateAddress?.streetName,
                currentLocation.canonicalPlace?.label,
                currentLocation.canonicalPlace?.administrativeContext,
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                Map search isn&apos;t available right now.
              </p>
              <p className="mt-1">You can continue by entering the property location manually.</p>
            </div>
          )}
        </div>
      </details>

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
