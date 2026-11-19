import React, { useCallback } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { WizardData } from '@/lib/types/wizard-workflows';
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
      Currently recorded: <b>{latest.placeName}</b>. Choosing a suburb below records a new one.
    </p>
  );
}

/**
 * Location: street address (required, the server needs it), postal code, an
 * optional map pin, and the suburb shown to buyers. The suburb is picked here
 * only when a platform operator builds a curated listing; it is recorded as the
 * accepted site Place assignment once the development is saved (see
 * wizardLocationCostsAmenities.ts). A developer's suburb is assigned by a
 * reviewer.
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

  const suburbValue: CanonicalPlaceSelection | null = location.suburbPlaceId
    ? {
        canonicalPlaceId: String(location.suburbPlaceId),
        label: String(location.suburbLabel ?? ''),
        placeType: 'suburb',
        scope: 'suburb' as any,
        administrativeContext: null,
      }
    : null;

  const pickSuburb = (selection: CanonicalPlaceSelection | null) =>
    handleUpdate({
      suburbPlaceId: selection?.canonicalPlaceId ?? undefined,
      suburbLabel: selection?.label ?? undefined,
    });

  const latitude = location.latitude ? parseFloat(location.latitude) : undefined;
  const longitude = location.longitude ? parseFloat(location.longitude) : undefined;

  return (
    <div className={cn(t.card, 'flex flex-col gap-6')}>
      <p className="text-sm text-slate-600">Buyers see the suburb, not the street address.</p>

      <div>
        <label htmlFor="address" className={t.sectionLabel}>
          Street address <span className="font-normal text-red-700">(required)</span>
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
        label="Suburb shown to buyers"
        hint={
          isCurated
            ? 'The suburb decides which search results the development appears in. It is recorded when the development is saved.'
            : 'A platform reviewer assigns the suburb after checking the site. Public search uses only that reviewed suburb.'
        }
      >
        {isCurated ? (
          <>
            <CanonicalPlaceSelector
              value={suburbValue}
              onChange={pickSuburb}
              label="Search for the suburb"
              inputId="suburb-picker"
              placeholder="Start typing, e.g. North Riding"
              compact
            />
            {editingId ? <CurrentSuburb developmentId={editingId} /> : null}
          </>
        ) : (
          <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            A reviewer assigns the suburb. You do not need to choose one.
          </p>
        )}
      </WizardSection>

      <WizardSection
        label="Map pin (optional)"
        hint="Search the address, then drag the pin to the entrance. Helps the reviewer place the development."
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
          If the map is unavailable you can type the entrance coordinates. Enter both or neither.
        </p>
      </WizardSection>
    </div>
  );
}
