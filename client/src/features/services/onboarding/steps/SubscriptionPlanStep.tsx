import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type OnboardingState } from '../useOnboardingReducer';
import { formatCategoryLabel } from '@/features/services/catalog';

type SubscriptionPlanStepProps = {
  state: OnboardingState;
  onNext: () => void;
  onBack: () => void;
};

export function SubscriptionPlanStep({ state, onNext, onBack }: SubscriptionPlanStepProps) {
  const activeServices = state.services.filter(
    service => service.isActive && service.displayName.trim().length > 0,
  );
  const selectedPlaces = state.locations.filter(location => location.place?.canonicalPlaceId);
  const hasActiveService = activeServices.length > 0;
  const hasCoverage = selectedPlaces.length > 0;
  const canFinish = hasActiveService && hasCoverage;

  function finishSetup() {
    if (!canFinish) return;
    onNext();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Review your business presence</h2>
        <p className="text-sm leading-6 text-slate-600">
          Check the details you’ve added. Completing setup makes your profile ready for manual
          review; an authorised reviewer controls publication.
        </p>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f3d91]" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900">{state.companyName || 'Your business'}</h3>
              {state.headline.trim() && (
                <p className="mt-1 text-sm font-medium text-slate-700">{state.headline}</p>
              )}
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {state.bio.trim() || 'Add a short business introduction in the profile step.'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <h3 className="font-semibold text-slate-900">Services</h3>
          </div>
          {activeServices.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {activeServices.map(service => (
                <li key={service.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-slate-900">{service.displayName}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {formatCategoryLabel(service.category)}
                  </p>
                  {service.description.trim() && (
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {service.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Add at least one active service to continue.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <h3 className="font-semibold text-slate-900">Operating areas</h3>
          </div>
          {selectedPlaces.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {selectedPlaces.map((location, index) => (
                <li key={location.id}>
                  {location.isPrimary ? 'Primary area · ' : ''}
                  {location.place?.label || `Area ${index + 1}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Add at least one approved Place to continue.</p>
          )}
        </section>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">Private until reviewed</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            Your profile is not public yet. It stays private unless an authorised reviewer approves
            publication. The current founding-provider pilot is free; no plan selection or payment is
            part of this setup.
          </p>
        </div>
      </div>

      {!canFinish && (
        <p role="alert" className="text-sm text-amber-800">
          Activate at least one service and add at least one listed coverage area before finishing
          setup.
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={finishSetup} disabled={!canFinish}>
          Finish setup
        </Button>
      </div>
    </div>
  );
}
