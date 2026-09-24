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
  function finishSetup() {
    onNext();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Finish your directory profile</h2>
        <p className="text-sm leading-6 text-slate-600">
          Services V1 does not sell plans or promise paid placement. Complete your details and the
          profile will remain private until the platform team reviews it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <ShieldCheck className="h-5 w-5 text-[#0f3d91]" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Private by default</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Your profile stays out of the public directory until manual review is complete.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Clear service details</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Consumers see the services and coverage you choose to publish.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            {state.companyName || 'Your business'}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Primary service:{' '}
            {state.primaryCategory ? formatCategoryLabel(state.primaryCategory) : 'Not selected'}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={finishSetup}>Finish setup</Button>
      </div>
    </div>
  );
}
