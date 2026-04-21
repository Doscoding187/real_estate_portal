/**
 * Step 4: Coverage Areas
 * Requirements: 10.1-10.9, 13.4, 13.7
 */

import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { SA_PROVINCES } from '@/features/services/catalog';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

const MAX_LOCATIONS = 5;

type CoverageAreasStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
};

export function CoverageAreasStep({ state, dispatch, onNext, onBack }: CoverageAreasStepProps) {
  const isPending = state.pendingStep === 4;
  const error = state.errors[4];

  const replaceLocations = trpc.servicesEngine.replaceProviderLocations.useMutation({
    onSuccess: () => {
      dispatch({ type: 'CLEAR_ERROR', step: 4 });
      dispatch({ type: 'SET_PENDING', step: null });
      onNext();
    },
    onError: (err) => {
      dispatch({ type: 'SET_ERROR', step: 4, message: err.message || 'Failed to save. Please try again.' });
      dispatch({ type: 'SET_PENDING', step: null });
    },
  });

  const hasValidRow = state.locations.some(
    l => l.city.trim().length > 0 || l.province.length > 0,
  );

  function handleContinue() {
    if (isPending || !hasValidRow) return;
    dispatch({ type: 'SET_PENDING', step: 4 });
    dispatch({ type: 'CLEAR_ERROR', step: 4 });

    const locations = state.locations.map((loc, index) => ({
      suburb: loc.suburb.trim() || undefined,
      city: loc.city.trim() || undefined,
      province: loc.province || undefined,
      radiusKm: loc.radiusKm ? Number(loc.radiusKm) : 25,
      isPrimary: index === 0,
    }));

    replaceLocations.mutate({ locations });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Where do you operate?</h2>
        <p className="text-sm text-slate-500">Define the areas you serve so we can match you with nearby leads</p>
      </div>

      <div className="space-y-3">
        {state.locations.map((loc, index) => (
          <div key={loc.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {index === 0 ? 'Primary area' : `Area ${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_LOCATION', id: loc.id })}
                disabled={isPending || state.locations.length <= 1}
                className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                aria-label={`Remove area ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`loc-suburb-${loc.id}`}>Suburb</Label>
                <Input
                  id={`loc-suburb-${loc.id}`}
                  value={loc.suburb}
                  onChange={e => dispatch({ type: 'UPDATE_LOCATION', id: loc.id, field: 'suburb', value: e.target.value })}
                  placeholder="e.g. Sandton"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`loc-city-${loc.id}`}>City</Label>
                <Input
                  id={`loc-city-${loc.id}`}
                  value={loc.city}
                  onChange={e => dispatch({ type: 'UPDATE_LOCATION', id: loc.id, field: 'city', value: e.target.value })}
                  placeholder="e.g. Johannesburg"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`loc-province-${loc.id}`}>SA Province</Label>
                <select
                  id={`loc-province-${loc.id}`}
                  value={loc.province}
                  onChange={e => dispatch({ type: 'UPDATE_LOCATION', id: loc.id, field: 'province', value: e.target.value })}
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select province</option>
                  {SA_PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`loc-radius-${loc.id}`}>Radius (km)</Label>
                <Input
                  id={`loc-radius-${loc.id}`}
                  type="number"
                  min={1}
                  max={250}
                  value={loc.radiusKm}
                  onChange={e => dispatch({ type: 'UPDATE_LOCATION', id: loc.id, field: 'radiusKm', value: e.target.value })}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch({ type: 'ADD_LOCATION' })}
          disabled={isPending || state.locations.length >= MAX_LOCATIONS}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add area
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isPending || !hasValidRow}>
          {isPending ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
