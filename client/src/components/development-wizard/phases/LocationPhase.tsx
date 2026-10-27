import React, { useEffect, useCallback } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { trpc } from '@/lib/trpc';
import { WizardData } from '@/lib/types/wizard-workflows';

export function LocationPhase() {
  const { developmentData, setIdentity, saveWorkflowStepData } = useDevelopmentWizard();
  const canonicalPlaceId = developmentData.location.canonicalPlaceId;
  const placeResolution = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: canonicalPlaceId ?? '' },
    { enabled: Boolean(canonicalPlaceId), retry: false },
  );
  const storedSelection = developmentData.location.canonicalPlaceSelection as
    | CanonicalPlaceSelection
    | null;
  const canonicalSelection =
    storedSelection?.canonicalPlaceId === canonicalPlaceId
      ? storedSelection
      : placeResolution.data
        ? {
            canonicalPlaceId: placeResolution.data.placeId,
            label: placeResolution.data.label,
            placeType: placeResolution.data.placeType,
            scope: placeResolution.data.searchScope,
            administrativeContext: placeResolution.data.administrativeContext,
            canonicalPath: placeResolution.data.canonicalPath,
            parentPlaceId:
              placeResolution.data.cityPlaceId || placeResolution.data.provincePlaceId || null,
          }
        : null;

  // Helper to sync updates to both Legacy (UI) and Workflow (Validation) stores
  const handleUpdate = useCallback(
    (updates: Partial<typeof developmentData.location>) => {
      // 1. Update Legacy/UI Store (Immediate Feedback)
      setIdentity({
        location: {
          ...developmentData.location,
          ...updates,
        },
      });

      // 2. Update Workflow Store (Persistence & Validation)
      saveWorkflowStepData('location', updates as Partial<WizardData>);
    },
    [developmentData.location, setIdentity, saveWorkflowStepData],
  );

  const handleLocationSelect = (data: LocationData) => {
    const updates = {
      address: data.address || developmentData.location.address,
      postalCode: data.postalCode || developmentData.location.postalCode,
      latitude:
        data.latitude == null ? developmentData.location.latitude : data.latitude.toString(),
      longitude:
        data.longitude == null ? developmentData.location.longitude : data.longitude.toString(),
    };

    handleUpdate(updates);
    toast.success('Address and coordinates updated');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <MapPin className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Location & Address</h1>
          <p className="text-slate-600">Where is the development located?</p>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          {/* Map Section */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-slate-900">Pin Drop Location</Label>
            <p className="text-sm text-slate-500 mb-2">
              Drag the pin to the exact entrance of the development.
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[400px]">
              <LocationMapPicker
                initialLat={
                  developmentData.location.latitude
                    ? parseFloat(developmentData.location.latitude)
                    : undefined
                }
                initialLng={
                  developmentData.location.longitude
                    ? parseFloat(developmentData.location.longitude)
                    : undefined
                }
                onLocationSelect={handleLocationSelect}
                onGeocodingError={err => toast.error(err)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  data-field="location.latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="e.g. -26.2041"
                  value={developmentData.location.latitude || ''}
                  onChange={event => handleUpdate({ latitude: event.target.value })}
                  className="h-11 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  data-field="location.longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="e.g. 28.0473"
                  value={developmentData.location.longitude || ''}
                  onChange={event => handleUpdate({ longitude: event.target.value })}
                  className="h-11 bg-white"
                />
              </div>
              <p className="text-xs text-slate-500 md:col-span-2">
                If the map is unavailable, enter the verified entrance coordinates. The location is
                still checked when the development is saved and submitted.
              </p>
            </div>
          </div>

          <div className="grid gap-6 pt-4 border-t border-slate-100">
            <CanonicalPlaceSelector
              value={canonicalSelection}
              onChange={selection =>
                handleUpdate({
                  canonicalPlaceId: selection?.canonicalPlaceId ?? null,
                  canonicalPlaceSelection: selection,
                })
              }
              purpose="authoring"
              label="Canonical Place"
              inputId="development-canonical-place"
              hint="Choose one admitted Place. The selected Place ID determines the development’s geography."
            />

            <div className="space-y-2">
              <Label htmlFor="address">
                Street Address <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="address"
                data-field="location.address"
                placeholder="e.g. 123 Main Road"
                value={developmentData.location.address}
                onChange={e => handleUpdate({ address: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  data-field="location.postalCode"
                  placeholder="e.g. 8005"
                  value={developmentData.location.postalCode || ''}
                  onChange={e => handleUpdate({ postalCode: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <p className="text-sm text-slate-600">
              City, suburb, and locality are assigned by an administrator after reviewing the
              development site against canonical Place data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
