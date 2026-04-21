/**
 * ProviderOnboardingWizard
 *
 * Renders the multi-step onboarding wizard for new service providers, or the
 * existing profile editing form (ProProfilePage) for providers who have already
 * completed onboarding.
 *
 * Requirements: 7.1, 12.5, 13.1–13.7
 */

import { lazy, Suspense } from 'react';
import { WizardProgressIndicator } from '@/components/services/WizardProgressIndicator';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';
import { useOnboardingReducer } from './useOnboardingReducer';
import { BusinessBasicsStep } from './steps/BusinessBasicsStep';
import { ProfileDetailsStep } from './steps/ProfileDetailsStep';
import { ServicesOfferedStep } from './steps/ServicesOfferedStep';
import { CoverageAreasStep } from './steps/CoverageAreasStep';
import { SubscriptionPlanStep } from './steps/SubscriptionPlanStep';
import { CompletionScreen } from './steps/CompletionScreen';

// Lazy-load the existing profile editing form to avoid circular deps
const ProProfilePageForm = lazy(() =>
  import('@/pages/pro/ProProfilePage').then(m => ({ default: m.default })),
);

const TOTAL_STEPS = 5;

const ENCOURAGING_COPY: Record<number, string> = {
  1: "Let's get your business on the map — this takes about 2 minutes.",
  2: 'A complete profile gets 3× more quote requests.',
  3: 'Detailed services help us match you with the right leads.',
  4: 'Coverage areas ensure you only get leads you can actually serve.',
  5: 'Almost there — choose a plan and go live!',
};

export function ProviderOnboardingWizard() {
  const { status, isLoading } = useServiceProviderOnboardingStatus();
  const [state, dispatch] = useOnboardingReducer();

  // Determine starting step from server status on first load
  const serverStep = status?.onboardingStep ?? 0;
  const isComplete = serverStep >= TOTAL_STEPS;

  // If provider has already completed onboarding, show the existing profile form
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center text-sm text-slate-500">
        Preparing your profile…
      </div>
    );
  }

  if (isComplete) {
    return (
      <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
        <ProProfilePageForm />
      </Suspense>
    );
  }

  // Sync server step into local state on first render (if server is ahead)
  const effectiveStep = state.currentStep === 1 && serverStep > 0
    ? serverStep + 1
    : state.currentStep;

  const currentStep = Math.min(effectiveStep, TOTAL_STEPS + 1); // +1 for completion screen

  function goToStep(step: number) {
    dispatch({ type: 'SET_STEP', step });
  }

  const showProgress = currentStep >= 1 && currentStep <= TOTAL_STEPS;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      {showProgress && (
        <div className="mb-6">
          <WizardProgressIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            encouragingCopy={ENCOURAGING_COPY[currentStep]}
          />
        </div>
      )}

      <div aria-live="polite">
        {currentStep === 1 && (
          <BusinessBasicsStep
            state={state}
            dispatch={dispatch}
            onNext={() => goToStep(2)}
          />
        )}
        {currentStep === 2 && (
          <ProfileDetailsStep
            state={state}
            dispatch={dispatch}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && (
          <ServicesOfferedStep
            state={state}
            dispatch={dispatch}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && (
          <CoverageAreasStep
            state={state}
            dispatch={dispatch}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}
        {currentStep === 5 && (
          <SubscriptionPlanStep
            state={state}
            dispatch={dispatch}
            onNext={() => goToStep(6)}
            onBack={() => goToStep(4)}
          />
        )}
        {currentStep === 6 && (
          <CompletionScreen state={state} />
        )}
      </div>
    </main>
  );
}
