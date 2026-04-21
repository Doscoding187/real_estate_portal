/**
 * Step 5: Subscription Plan Selection
 * Requirements: 11.1-11.6
 */

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

const SUBSCRIPTION_PLANS = [
  {
    tier: 'directory' as const,
    name: 'Directory',
    price: 'Free',
    description: 'Basic listing in the service directory.',
    features: ['Listed in directory', 'Consumer can view profile', 'Manual lead routing'],
    recommended: false,
    badge: 'Free trial',
  },
  {
    tier: 'directory_explore' as const,
    name: 'Directory + Explore',
    price: 'R299 / month',
    description: 'Directory listing plus visibility in the Explore feed.',
    features: ['Everything in Directory', 'Explore feed visibility', 'Automated lead matching'],
    recommended: true,
    badge: 'Recommended',
  },
  {
    tier: 'ecosystem_pro' as const,
    name: 'Ecosystem Pro',
    price: 'Contact us',
    description: 'Full ecosystem access with priority matching.',
    features: ['Everything in Directory + Explore', 'Priority Match placement', 'Dedicated account support'],
    recommended: false,
    badge: 'Premium',
  },
] as const;

type SubscriptionPlanStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
};

export function SubscriptionPlanStep({ state, dispatch, onNext, onBack }: SubscriptionPlanStepProps) {
  const selectedPlan = state.selectedPlan ?? 'directory_explore';

  function handleGoLive() {
    dispatch({ type: 'SET_FIELD', field: 'selectedPlan', value: selectedPlan });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Choose your plan</h2>
        <p className="text-sm text-slate-500">You can upgrade or change your plan at any time</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SUBSCRIPTION_PLANS.map(plan => {
          const isSelected = selectedPlan === plan.tier;
          return (
            <button
              key={plan.tier}
              type="button"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'selectedPlan', value: plan.tier })}
              className={[
                'relative rounded-xl border-2 p-5 text-left transition-all',
                isSelected
                  ? 'border-slate-900 bg-slate-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-400',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {plan.badge && (
                <span className={[
                  'absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  plan.recommended
                    ? 'bg-emerald-600 text-white'
                    : plan.tier === 'directory'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-amber-500 text-white',
                ].join(' ')}>
                  {plan.badge}
                </span>
              )}

              <div className="mt-2 space-y-1">
                <p className="font-semibold text-slate-900">{plan.name}</p>
                <p className="text-lg font-bold text-slate-900">{plan.price}</p>
                <p className="text-xs text-slate-500">{plan.description}</p>
              </div>

              <ul className="mt-4 space-y-1.5">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleGoLive}>
          Go live
        </Button>
      </div>
    </div>
  );
}
