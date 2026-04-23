/**
 * ProviderOnboardingWizard
 *
 * Renders the multi-step onboarding wizard for new service providers, or the
 * existing profile editing form (ProProfilePage) for providers who have already
 * completed onboarding.
 */

import { lazy, Suspense, useEffect, useRef } from 'react';
import { WizardProgressIndicator } from '@/components/services/WizardProgressIndicator';
import { SA_PROVINCES, toProviderSlug, type SAProvince } from '@/features/services/catalog';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';
import { trpc } from '@/lib/trpc';
import { isOnboardingStatePristine, useOnboardingReducer } from './useOnboardingReducer';
import { BusinessBasicsStep } from './steps/BusinessBasicsStep';
import { CompletionScreen } from './steps/CompletionScreen';
import { CoverageAreasStep } from './steps/CoverageAreasStep';
import { ProfileDetailsStep } from './steps/ProfileDetailsStep';
import { ServicesOfferedStep } from './steps/ServicesOfferedStep';
import { SubscriptionPlanStep } from './steps/SubscriptionPlanStep';

const ProProfilePageForm = lazy(() =>
  import('@/pages/pro/ProProfilePage').then(m => ({ default: m.default })),
);

const TOTAL_STEPS = 5;

const ENCOURAGING_COPY: Record<number, string> = {
  1: "Let's get your business on the map - this takes about 2 minutes.",
  2: 'A complete profile gets 3x more quote requests.',
  3: 'Detailed services help us match you with the right leads.',
  4: 'Coverage areas ensure you only get leads you can actually serve.',
  5: 'Almost there - choose a plan and go live!',
};

type ProviderProfileData = {
  companyName?: string | null;
  headline?: string | null;
  bio?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  subscriptionTier?: 'directory' | 'directory_explore' | 'ecosystem_pro' | null;
  services?: Array<{
    category?:
      | 'home_improvement'
      | 'finance_legal'
      | 'moving'
      | 'inspection_compliance'
      | 'insurance'
      | 'media_marketing'
      | null;
    displayName?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
  }>;
  locations?: Array<{
    suburb?: string | null;
    city?: string | null;
    province?: string | null;
    radiusKm?: number | null;
  }>;
} | null;

function makeRowId(prefix: 'svc' | 'loc') {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function toProvince(value?: string | null): SAProvince | '' {
  return value && SA_PROVINCES.includes(value as SAProvince) ? (value as SAProvince) : '';
}

export function ProviderOnboardingWizard() {
  const { status, isLoading } = useServiceProviderOnboardingStatus();
  const [state, dispatch] = useOnboardingReducer();
  const profileQuery = trpc.servicesEngine.myProviderProfile.useQuery(undefined, {
    enabled: Boolean(status?.hasProviderIdentity),
    refetchOnWindowFocus: false,
  });
  const hasHydratedProfileRef = useRef(false);

  const serverStep = status?.onboardingStep ?? 0;
  const isComplete = status?.fullFeaturesUnlocked ?? false;
  const providerPublicPath = status?.provider?.providerId
    ? `/services/provider/${encodeURIComponent(
        toProviderSlug(status.provider.companyName, status.provider.providerId),
      )}`
    : '/service/profile';
  const effectiveStep =
    state.currentStep === 1 && serverStep > 0 ? serverStep + 1 : state.currentStep;
  const currentStep = Math.min(effectiveStep, TOTAL_STEPS + 1);
  const showProgress = currentStep >= 1 && currentStep <= TOTAL_STEPS;

  useEffect(() => {
    if (hasHydratedProfileRef.current) return;
    if (!isOnboardingStatePristine(state)) return;

    const profile = profileQuery.data as ProviderProfileData;
    if (!profile) return;

    dispatch({
      type: 'HYDRATE',
      value: {
        companyName: profile.companyName || '',
        primaryCategory: profile.services?.[0]?.category || null,
        bio: profile.bio || '',
        headline: profile.headline || '',
        contactEmail: profile.contactEmail || '',
        contactPhone: profile.contactPhone || '',
        websiteUrl: profile.websiteUrl || '',
        selectedPlan: profile.subscriptionTier || null,
        services: (profile.services || []).map(service => ({
          id: makeRowId('svc'),
          displayName: service.displayName || '',
          category: service.category || 'home_improvement',
          minPrice: service.minPrice != null ? String(service.minPrice) : '',
          maxPrice: service.maxPrice != null ? String(service.maxPrice) : '',
        })),
        locations: (profile.locations || []).map(location => ({
          id: makeRowId('loc'),
          suburb: location.suburb || '',
          city: location.city || '',
          province: toProvince(location.province),
          radiusKm:
            location.radiusKm != null && Number.isFinite(Number(location.radiusKm))
              ? String(location.radiusKm)
              : '25',
        })),
      },
    });

    hasHydratedProfileRef.current = true;
  }, [dispatch, profileQuery.data, state]);

  function goToStep(step: number) {
    dispatch({ type: 'SET_STEP', step });
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center text-sm text-slate-500">
        Preparing your profile...
      </div>
    );
  }

  if (isComplete) {
    return (
      <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading...</div>}>
        <ProProfilePageForm />
      </Suspense>
    );
  }

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
          <BusinessBasicsStep state={state} dispatch={dispatch} onNext={() => goToStep(2)} />
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
    </main>
  );
}
