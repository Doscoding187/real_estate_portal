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
import { BadgeCheck, BriefcaseBusiness, MapPinned, Sparkles } from 'lucide-react';

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
  const isComplete = status?.fullFeaturesUnlocked ?? false;
  const providerPublicPath = status?.provider?.providerId
    ? `/services/provider/${encodeURIComponent(status.provider.providerId)}`
    : '/service/profile';

  // If provider has already completed onboarding, show the existing profile form
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec]">
        <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center text-sm text-slate-500 md:px-6">
          Preparing your profile…
        </div>
      </main>
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
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Service Listify Pro
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Provider onboarding
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Build your provider profile and start receiving better-fit leads.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  Service Listify Pro is where you define your business identity, public profile,
                  services, and coverage areas so the marketplace can match you accurately.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Setup steps
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">5 guided steps</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Outcome
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">A public profile plus lead access</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Focus
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">Coverage, trust, and provider fit</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                What this unlocks
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { icon: BriefcaseBusiness, text: 'A clearer public business profile for homeowners comparing providers.' },
                  { icon: MapPinned, text: 'Coverage areas that stop low-fit leads before they reach your inbox.' },
                  { icon: BadgeCheck, text: 'A better setup path into the dashboard, leads, and explore publishing tools.' },
                ].map(item => (
                  <div key={item.text} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-white/85" />
                    <p className="text-sm leading-6 text-white/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-2xl">
            {showProgress && (
              <div className="mb-6">
                <WizardProgressIndicator
                  currentStep={currentStep}
                  totalSteps={TOTAL_STEPS}
                  encouragingCopy={ENCOURAGING_COPY[currentStep]}
                />
              </div>
            )}

            <div
              aria-live="polite"
              className="rounded-[2rem] border border-[#0f3d91]/10 bg-white/92 p-4 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)] md:p-6"
            >
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
                <CompletionScreen state={state} providerPublicPath={providerPublicPath} />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
