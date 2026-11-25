import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';
import { WizardData } from '@/lib/types/wizard-workflows';
import {
  isInformalSettlementName,
  pinDistanceWarning,
} from '@/lib/wizardLocationCostsAmenities';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
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
 * Location: street address (unless "No street address yet"), the suburb (part of
 * the official address, chosen from OUR canonical geography), postal code and the
 * map pin (required to publish). For a curated listing the chosen suburb is
 * recorded as the accepted site Place assignment on publish; for a developer a
 * reviewer confirms it.
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

  // The suburb is chosen from our canonical geography (suburb-level, published and
  // searchable places only, informal settlements excluded). Never from Google.
  const suburbId = location.suburbPlaceId ? String(location.suburbPlaceId) : '';
  const suburbText = String(location.suburbLabel ?? '');
  const suburbValue = useMemo<CanonicalPlaceSelection | null>(
    () =>
      suburbId
        ? {
            canonicalPlaceId: suburbId,
            label: suburbText,
            placeType: 'suburb',
            scope: 'locality' as any,
            administrativeContext: null,
          }
        : null,
    [suburbId, suburbText],
  );
  // Clearing sends null: the store ignores undefined, so undefined would leave the old suburb.
  const pickSuburb = (selection: CanonicalPlaceSelection | null) =>
    handleUpdate({
      suburbPlaceId: selection?.canonicalPlaceId ?? null,
      suburbLabel: selection?.label ?? null,
    });

  // A suburb saved by an earlier version may be an informal settlement. It is not
  // accepted: clear it and ask for a real choice.
  const [staleCleared, setStaleCleared] = useState(false);
  // Remounting the picker also clears the text the user sees for the dropped suburb.
  const [pickerKey, setPickerKey] = useState(0);
  useEffect(() => {
    if (suburbId && isInformalSettlementName(suburbText)) {
      handleUpdate({ suburbPlaceId: null, suburbLabel: null });
      setStaleCleared(true);
      setPickerKey(key => key + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suburbId, suburbText]);

  // Safety net: warn (never block) when the pin is far from the chosen suburb's centre.
  const pinLat = Number(String(location.latitude ?? '').trim() || Number.NaN);
  const pinLng = Number(String(location.longitude ?? '').trim() || Number.NaN);
  const pin = Number.isFinite(pinLat) && Number.isFinite(pinLng) ? { lat: pinLat, lng: pinLng } : null;
  const centreQuery = trpc.placeAuthority.getPlaceCentre.useQuery(
    { placeId: String(location.suburbPlaceId ?? '') },
    { enabled: Boolean(location.suburbPlaceId), retry: false },
  );
  const farWarning = location.suburbPlaceId
    ? pinDistanceWarning(pin, centreQuery.data, String(location.suburbLabel ?? ''))
    : null;

  const noStreet = location.noOfficialStreet === true;
  const latitude = location.latitude ? parseFloat(location.latitude) : undefined;
  const longitude = location.longitude ? parseFloat(location.longitude) : undefined;

  return (
    <div className={cn(t.card, 'flex flex-col gap-6')}>
      <p className="text-sm text-slate-600">
        Buyers see the suburb in search; the street address shows on the development page for
        directions.
      </p>

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

      <div>
        <span className={t.sectionLabel}>
          Suburb (part of the official address){' '}
          <span className="font-normal text-red-700">(required)</span>
        </span>
        <CanonicalPlaceSelector
          key={pickerKey}
          value={suburbValue}
          onChange={pickSuburb}
          label="Suburb"
          inputId="suburb-picker"
          placeholder="Start typing, e.g. North Riding"
          compact
          clearable
          optionFilter={option =>
            option.searchScope === 'locality' &&
            !isInformalSettlementName(option.preferredPublicLabel) &&
            !isInformalSettlementName(option.canonicalPath) &&
            !isInformalSettlementName(option.matchedName)
          }
        />
        <FieldError
          message={
            errorFor('suburbPlaceId') ??
            (staleCleared && !suburbId ? 'Choose the suburb from the list' : undefined)
          }
        />
        <p className={t.hint}>
          {isCurated
            ? 'Recorded for search when you publish.'
            : 'A reviewer confirms the suburb.'}
        </p>
        {isCurated && editingId ? <CurrentSuburb developmentId={editingId} /> : null}
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
        hint="Buyers use it for directions. Search the address and the pin fills in; or drag the pin, or type the coordinates for new land."
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
        {farWarning ? (
          <p
            role="status"
            data-testid="pin-far-warning"
            className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {farWarning}
          </p>
        ) : null}
      </WizardSection>
    </div>
  );
}
