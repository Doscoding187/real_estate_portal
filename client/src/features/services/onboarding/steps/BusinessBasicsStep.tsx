/**
 * Step 1: Business Basics
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 13.4, 13.7
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryTileGrid } from '@/components/services/CategoryTileGrid';
import { trpc } from '@/lib/trpc';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

type BusinessBasicsStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
};

export function BusinessBasicsStep({ state, dispatch, onNext }: BusinessBasicsStepProps) {
  const isPending = state.pendingStep === 1;
  const error = state.errors[1];

  const registerIdentity = trpc.servicesEngine.registerProviderIdentity.useMutation({
    onSuccess: () => {
      dispatch({ type: 'CLEAR_ERROR', step: 1 });
      dispatch({ type: 'SET_PENDING', step: null });
      onNext();
    },
    onError: (err) => {
      dispatch({ type: 'SET_ERROR', step: 1, message: err.message || 'Failed to save. Please try again.' });
      dispatch({ type: 'SET_PENDING', step: null });
    },
  });

  const canContinue = state.companyName.trim().length > 0 && !isPending;

  function handleContinue() {
    if (!canContinue) return;
    dispatch({ type: 'SET_PENDING', step: 1 });
    dispatch({ type: 'CLEAR_ERROR', step: 1 });
    registerIdentity.mutate({
      companyName: state.companyName.trim(),
      description: state.bio.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Tell us about your business</h2>
        <p className="text-sm text-slate-500">Almost there — just a few more details</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Business name <span className="text-red-500">*</span></Label>
          <Input
            id="companyName"
            value={state.companyName}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'companyName', value: e.target.value })}
            placeholder="e.g. Acme Plumbing & Electrical"
            disabled={isPending}
            aria-required="true"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Primary service category</Label>
          <CategoryTileGrid
            selected={state.primaryCategory}
            onSelect={cat => dispatch({ type: 'SET_FIELD', field: 'primaryCategory', value: cat })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Short description</Label>
          <Textarea
            id="bio"
            value={state.bio}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'bio', value: e.target.value })}
            placeholder="Briefly describe what your business does and who you serve"
            rows={3}
            disabled={isPending}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" disabled={true}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
