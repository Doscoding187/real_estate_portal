/**
 * LeadRequestFlow Component
 *
 * A three-step conversational lead request flow that guides consumers through:
 * Step 1: Service category selection (CategoryTileGrid)
 * Step 2: Location inputs (Suburb, City, Province)
 * Step 3: Description textarea
 *
 * Internal fields `intentStage` and `sourceSurface` are hardcoded and never
 * exposed in the UI.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 14.2
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { WizardProgressIndicator } from '@/components/services/WizardProgressIndicator';
import { CategoryTileGrid } from '@/components/services/CategoryTileGrid';
import {
  SA_PROVINCES,
  type IntentStage,
  type ServiceCategory,
  type SourceSurface,
} from '@/features/services/catalog';

export type LeadWizardSubmit = {
  category: ServiceCategory;
  intentStage: IntentStage;
  sourceSurface: SourceSurface;
  notes: string;
  province?: string;
  city?: string;
  suburb?: string;
  propertyId?: number;
  listingId?: number;
  developmentId?: number;
};

export type LeadRequestFlowProps = {
  defaultCategory: ServiceCategory;
  defaultLocation?: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (payload: LeadWizardSubmit) => void;
};

type FlowState = {
  step: 1 | 2 | 3;
  category: ServiceCategory;
  suburb: string;
  city: string;
  province: string;
  notes: string;
};

const TOTAL_STEPS = 3;

const STEP_ENCOURAGING_COPY: Record<number, string> = {
  1: 'Choose the service that best fits your needs.',
  2: 'Help us find providers near you.',
  3: 'The more detail you share, the better your matches.',
};

/**
 * Three-step lead request flow component.
 * Hardcodes intentStage: 'general' and sourceSurface: 'directory' — never exposed in UI.
 */
export function LeadRequestFlow({
  defaultCategory,
  defaultLocation = '',
  submitting = false,
  error,
  onSubmit,
}: LeadRequestFlowProps) {
  // Parse defaultLocation into suburb/city/province if provided
  const parsedLocation = (() => {
    const parts = defaultLocation
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    return {
      suburb: parts[0] ?? '',
      city: parts[1] ?? '',
      province: parts[2] ?? '',
    };
  })();

  const [state, setState] = useState<FlowState>({
    step: 1,
    category: defaultCategory,
    suburb: parsedLocation.suburb,
    city: parsedLocation.city,
    province: parsedLocation.province,
    notes: '',
  });

  function setField<K extends keyof FlowState>(field: K, value: FlowState[K]) {
    setState(prev => ({ ...prev, [field]: value }));
  }

  function goNext() {
    if (state.step < TOTAL_STEPS) {
      setState(prev => ({ ...prev, step: (prev.step + 1) as 1 | 2 | 3 }));
    }
  }

  function goBack() {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: (prev.step - 1) as 1 | 2 | 3 }));
    }
  }

  function handleSubmit() {
    onSubmit({
      category: state.category,
      // Hardcoded — never exposed in UI (Requirements 4.4, 4.5)
      intentStage: 'general',
      sourceSurface: 'directory',
      notes: state.notes.trim(),
      suburb: state.suburb || undefined,
      city: state.city || undefined,
      province: state.province || undefined,
    });
  }

  const canContinueStep1 = state.category !== null;

  return (
    <Card className="overflow-hidden border-[#0f3d91]/10 bg-white/90 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)]">
      <CardContent className="space-y-6 p-6 md:p-8">
        {/* Progress indicator — shown on every step */}
        <WizardProgressIndicator
          currentStep={state.step}
          totalSteps={TOTAL_STEPS}
          encouragingCopy={STEP_ENCOURAGING_COPY[state.step]}
        />

        {/* Step content — aria-live="polite" for accessibility */}
        <div aria-live="polite" className="rounded-[1.75rem] border border-slate-100 bg-[linear-gradient(180deg,_#ffffff,_#faf7f0)] p-5 md:p-6">
          {/* Step 1: Category selection */}
          {state.step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  Step 1
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  What service do you need?
                </h2>
                <p className="text-sm text-slate-600">
                  Start by choosing the category that best matches the work.
                </p>
              </div>
              <CategoryTileGrid
                selected={state.category}
                onSelect={cat => setField('category', cat)}
              />
            </div>
          )}

          {/* Step 2: Location inputs */}
          {state.step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  Step 2
                </p>
                <h2 className="text-lg font-semibold text-slate-900">Where are you located?</h2>
                <p className="text-sm text-slate-600">
                  Providers use this to confirm coverage and travel range.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="lead-suburb"
                    className="text-sm font-medium text-slate-700"
                  >
                    Suburb
                  </label>
                  <Input
                    id="lead-suburb"
                    value={state.suburb}
                    onChange={e => setField('suburb', e.target.value)}
                    placeholder="e.g. Sandton"
                    autoComplete="address-level3"
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="lead-city"
                    className="text-sm font-medium text-slate-700"
                  >
                    City
                  </label>
                  <Input
                    id="lead-city"
                    value={state.city}
                    onChange={e => setField('city', e.target.value)}
                    placeholder="e.g. Johannesburg"
                    autoComplete="address-level2"
                    className="border-slate-200 bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="lead-province"
                  className="text-sm font-medium text-slate-700"
                >
                  Province
                </label>
                <select
                  id="lead-province"
                  value={state.province}
                  onChange={e => setField('province', e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d91] focus-visible:ring-offset-2"
                >
                  <option value="">Select a province</option>
                  {SA_PROVINCES.map(prov => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Description */}
          {state.step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  Step 3
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Describe your project
                </h2>
              </div>
              <p className="text-sm text-slate-600">
                Describe the project clearly so providers can judge fit faster.
              </p>
              <Textarea
                value={state.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Describe what you need — the more detail, the better your matches"
                rows={5}
                className="resize-none border-slate-200 bg-white"
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 md:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-900">Short flow</p>
            <p className="mt-1">Three steps only, so you reach matching faster.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Location aware</p>
            <p className="mt-1">Your area helps us narrow to relevant providers.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">More detail, better fit</p>
            <p className="mt-1">Clear notes improve provider quality and response speed.</p>
          </div>
        </div>

        {/* Inline error — shown above submit button on step 3 */}
        {state.step === 3 && error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={state.step === 1 || submitting}
            onClick={goBack}
            className="rounded-full"
          >
            Back
          </Button>

          {state.step < TOTAL_STEPS ? (
            <Button
              type="button"
              disabled={state.step === 1 ? !canContinueStep1 : false}
              onClick={goNext}
              className="rounded-full bg-[#0f3d91] hover:bg-[#0a2e6e]"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-full bg-[#0f3d91] hover:bg-[#0a2e6e]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                'Submit request'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
