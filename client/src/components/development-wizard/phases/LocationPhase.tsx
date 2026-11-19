import React, { useCallback, useEffect, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';
import { WizardData } from '@/lib/types/wizard-workflows';
import { derivedLocationText } from '@/lib/wizardLocationCostsAmenities';
import { cn } from '@/lib/utils';
import { wizardTokens as t } from '../../wizard/ui/wizardTokens';
import { WizardSection } from '../../wizard/ui/WizardUi';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-xs text-red-700">
      {message}
    </p>
  );
}

/** The suburb already recorded for a saved development (curated edit mode). */
function CurrentSuburb({ developmentId }: { developmentId: number }) {
  const query = trpc.admin.adminGetDevelopmentPlaceAssignmentContext.useQuery(
    { developmentId },
    { retry: false },
  );
  const current = (query.data?.assignments ?? []).filter(
    (a: any) => a.reviewState === 'accepted' && a.assignmentKind === 'site',
  );
  const latest = current[current.length - 1] as { placeName?: string | null } | undefined;
  if (!latest?.placeName) return null;
  return (
    <p className="mt-2 text-xs text-slate-700" data-testid="current-suburb">
      Currently recorded: <b>{latest.placeName}</b>.
    </p>
  );
}

/**
 * Location: street address and the map pin, both required (the server's
 * readiness check needs both). The suburb buyers see is DERIVED from the pin
 * (placeAuthority.locateByPoint) and shown read-only; it is never hand-picked.
 * For a curated listing the derived Place is recorded as the accepted site Place
 * assignment once the development is saved; a developer's suburb is assigned by
 * a reviewer (the derived one is only a suggestion).
 */
export function LocationPhase() {
  const store = useDevelopmentWizard() as any;
  const { developmentData, setIdentity, saveWorkflowStepData, stepErrors, currentStepId } = store;
  const { user } = useAuth();
  const { context: publisherContext } = usePublisherContext();
  const isCurated =
    user?.role === 'super_admin' && typeof publisherContext?.cataloguePublisherId === 'number';
  const editingId = store.editingId as number | undefined;

  const location = (store.getWizardData?.().location ?? developmentData.location) as Record<
    string,
    any
  >;

  const errors = (currentStepId && stepErrors?.[currentStepId]) || [];
  const errorFor = (field: string): string | undefined =>
    errors.find((e: any) => e?.field === field)?.message;

  // Sync updates to both the legacy (UI) store and the workflow (validation) store.
  const handleUpdate = useCallback(
    (updates: Record<string, any>) => {
      setIdentity({ location: { ...developmentData.location, ...updates } } as any);
      saveWorkflowStepData('location', updates as Partial<WizardData>);
    },
    [developmentData.location, setIdentity, saveWorkflowStepData],
  );

  const handleLocationSelect = (data: LocationData) => {
    handleUpdate({
      address: data.address || location.address,
      postalCode: data.postalCode || location.postalCode,
      latitude: data.latitude == null ? location.latitude : data.latitude.toString(),
      longitude: data.longitude == null ? location.longitude : data.longitude.toString(),
    });
    toast.success('Address and coordinates updated');
  };

  // Derive the suburb from the pin (debounced while typing coordinates).
  const lat = Number(String(location.latitude ?? '').trim() || Number.NaN);
  const lng = Number(String(location.longitude ?? '').trim() || Number.NaN);
  const pinValid =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    pinValid ? { lat, lng } : null,
  );
  useEffect(() => {
    const timer = setTimeout(() => setPin(pinValid ? { lat, lng } : null), 400);
    return () => clearTimeout(timer);
  }, [pinValid, lat, lng]);
  const lookup = trpc.placeAuthority.locateByPoint.useQuery(pin ?? { lat: 0, lng: 0 }, {
    enabled: pin !== null,
    retry: false,
  });
  const derived = pin && lookup.data ? lookup.data : null;
  const settled = pin === null || (!lookup.isLoading && !lookup.isFetching);

  // Keep the derived suburb in the wizard data (cleared when the pin has no match).
  const derivedId = derived?.placeId ?? undefined;
  useEffect(() => {
    if (!settled) return;
    if ((location.suburbPlaceId ?? undefined) === derivedId) return;
    handleUpdate({
      suburbPlaceId: derivedId,
      suburbLabel: derived?.suburb ?? undefined,
      suburbCity: derived?.city ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, derivedId]);

  const noStreet = location.noOfficialStreet === true;
  const latitude = location.latitude ? parseFloat(location.latitude) : undefined;
  const longitude = location.longitude ? parseFloat(location.longitude) : undefined;

  return (
    <div className={cn(t.card, 'flex flex-col gap-6')}>
      <p className="text-sm text-slate-600">Buyers see the suburb, not the street address.</p>

      <div>
        <label htmlFor="address" className={t.sectionLabel}>
          Street address{' '}
          {noStreet ? (
            <span className="font-normal text-slate-600">(optional)</span>
          ) : (
            <span className="font-normal text-red-700">(required)</span>
          )}
        </label>
        <input
          id="address"
          data-field="location.address"
          className={t.input}
          placeholder="e.g. 499 Boundary Road, Kya Sand"
          value={location.address ?? ''}
          aria-invalid={Boolean(errorFor('address'))}
          onChange={e => handleUpdate({ address: e.target.value })}
        />
        <FieldError message={errorFor('address')} />
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-slate-800">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={noStreet}
            onChange={e => handleUpdate({ noOfficialStreet: e.target.checked })}
          />
          No street address yet (new development: drop the pin instead)
        </label>
      </div>

      <div className="max-w-[280px]">
        <label htmlFor="postalCode" className={t.sectionLabel}>
          Postal code
        </label>
        <input
          id="postalCode"
          data-field="location.postalCode"
          className={t.input}
          placeholder="e.g. 2169"
          value={location.postalCode ?? ''}
          onChange={e => handleUpdate({ postalCode: e.target.value })}
        />
      </div>

      <WizardSection
        label="Drop the pin at the entrance or show house (required)"
        hint="Buyers use it for directions. Search the address and the pin fills in; or drag the pin, or type the coordinates for new land. The suburb buyers see is worked out from the pin."
      >
        <div className="h-[320px] overflow-hidden rounded-lg border border-slate-200">
          <LocationMapPicker
            initialLat={latitude}
            initialLng={longitude}
            onLocationSelect={handleLocationSelect}
            onGeocodingError={err => toast.error(err)}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className={t.sectionLabel}>
              Latitude
            </label>
            <input
              id="latitude"
              data-field="location.latitude"
              type="number"
              inputMode="decimal"
              step="any"
              min="-90"
              max="90"
              className={t.input}
              placeholder="from the map pin, e.g. -26.0412"
              value={location.latitude ?? ''}
              onChange={e => handleUpdate({ latitude: e.target.value })}
            />
            <FieldError message={errorFor('latitude')} />
          </div>
          <div>
            <label htmlFor="longitude" className={t.sectionLabel}>
              Longitude
            </label>
            <input
              id="longitude"
              data-field="location.longitude"
              type="number"
              inputMode="decimal"
              step="any"
              min="-180"
              max="180"
              className={t.input}
              placeholder="from the map pin, e.g. 27.9561"
              value={location.longitude ?? ''}
              onChange={e => handleUpdate({ longitude: e.target.value })}
            />
            <FieldError message={errorFor('longitude')} />
          </div>
        </div>
        <p className={t.hint}>
          If the map is unavailable, type the entrance latitude and longitude.
        </p>
        <p
          data-testid="derived-location"
          className={cn(
            'mt-4 rounded-md border p-3 text-sm',
            derived ? 'border-green-200 bg-green-50 text-green-900' : 'border-slate-200 bg-slate-50 text-slate-700',
          )}
        >
          {pin === null
            ? 'Drop the pin or enter coordinates to see the location buyers will see.'
            : !settled
              ? 'Finding the suburb…'
              : derivedLocationText(derived)}
        </p>
        {isCurated ? (
          <>
            <p className={t.hint}>When you publish, this suburb is recorded for search.</p>
            {editingId ? <CurrentSuburb developmentId={editingId} /> : null}
          </>
        ) : (
          <p className={t.hint}>A reviewer confirms the suburb after checking the site.</p>
        )}
      </WizardSection>
    </div>
  );
}
