/**
 * Step 3: Services Offered
 * Requirements: 9.1–9.9, 13.4, 13.7
 */

import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { SERVICE_CATEGORIES } from '@/features/services/catalog';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

const MAX_SERVICES = 10;

type ServicesOfferedStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
};

export function ServicesOfferedStep({ state, dispatch, onNext, onBack }: ServicesOfferedStepProps) {
  const isPending = state.pendingStep === 3;
  const error = state.errors[3];

  const replaceServices = trpc.servicesEngine.replaceProviderServices.useMutation({
    onSuccess: () => {
      dispatch({ type: 'CLEAR_ERROR', step: 3 });
      dispatch({ type: 'SET_PENDING', step: null });
      onNext();
    },
    onError: (err) => {
      dispatch({ type: 'SET_ERROR', step: 3, message: err.message || 'Failed to save. Please try again.' });
      dispatch({ type: 'SET_PENDING', step: null });
    },
  });

  const hasValidRow = state.services.some(s => s.displayName.trim().length > 0);

  function handleContinue() {
    if (isPending || !hasValidRow) return;

    // Validate maxPrice >= minPrice
    for (const svc of state.services) {
      const min = Number(svc.minPrice);
      const max = Number(svc.maxPrice);
      if (svc.minPrice && svc.maxPrice && max < min) {
        dispatch({ type: 'SET_ERROR', step: 3, message: `Max price must be ≥ min price for "${svc.displayName || 'a service'}".` });
        return;
      }
    }

    dispatch({ type: 'SET_PENDING', step: 3 });
    dispatch({ type: 'CLEAR_ERROR', step: 3 });

    const services = state.services
      .filter(s => s.displayName.trim().length > 0)
      .map(s => ({
        category: s.category,
        code: s.displayName.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 80),
        displayName: s.displayName.trim(),
        minPrice: s.minPrice ? Number(s.minPrice) : undefined,
        maxPrice: s.maxPrice ? Number(s.maxPrice) : undefined,
        currency: 'ZAR',
        isActive: true,
      }));

    replaceServices.mutate({ services });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">What services do you offer?</h2>
        <p className="text-sm text-slate-500">Add the services you provide and set your pricing in ZAR</p>
      </div>

      <div className="space-y-3">
        {state.services.map((svc, index) => (
          <div key={svc.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service {index + 1}
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_SERVICE', id: svc.id })}
                disabled={isPending || state.services.length <= 1}
                className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                aria-label={`Remove service ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`svc-name-${svc.id}`}>Service name</Label>
                <Input
                  id={`svc-name-${svc.id}`}
                  value={svc.displayName}
                  onChange={e => dispatch({ type: 'UPDATE_SERVICE', id: svc.id, field: 'displayName', value: e.target.value })}
                  placeholder="e.g. Geyser replacement"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`svc-cat-${svc.id}`}>Category</Label>
                <select
                  id={`svc-cat-${svc.id}`}
                  value={svc.category}
                  onChange={e => dispatch({ type: 'UPDATE_SERVICE', id: svc.id, field: 'category', value: e.target.value })}
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`svc-min-${svc.id}`}>R Min price</Label>
                  <Input
                    id={`svc-min-${svc.id}`}
                    type="number"
                    min={0}
                    value={svc.minPrice}
                    onChange={e => dispatch({ type: 'UPDATE_SERVICE', id: svc.id, field: 'minPrice', value: e.target.value })}
                    placeholder="0"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`svc-max-${svc.id}`}>R Max price</Label>
                  <Input
                    id={`svc-max-${svc.id}`}
                    type="number"
                    min={0}
                    value={svc.maxPrice}
                    onChange={e => dispatch({ type: 'UPDATE_SERVICE', id: svc.id, field: 'maxPrice', value: e.target.value })}
                    placeholder="0"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch({ type: 'ADD_SERVICE' })}
          disabled={isPending || state.services.length >= MAX_SERVICES}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add service
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
          {isPending ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
