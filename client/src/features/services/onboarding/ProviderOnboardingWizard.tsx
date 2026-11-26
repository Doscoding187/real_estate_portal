/**
 * ProviderOnboardingWizard
 *
 * Renders the multi-step onboarding wizard for new service providers, or the
 * existing profile editing form (ProProfilePage) for providers who have already
 * completed onboarding.
 */

import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';
import { Link } from 'wouter';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';
import { trpc } from '@/lib/trpc';
import { canonicalPlaceSelectionFromResolved } from '@/lib/canonicalPlaceSelection';
import { isOnboardingStatePristine, useOnboardingReducer } from './useOnboardingReducer';
import type { OnboardingState } from './useOnboardingReducer';
import { ProviderBusinessSitePreview } from './ProviderBusinessSitePreview';
import { BusinessBasicsStep } from './steps/BusinessBasicsStep';
import { CoverageAreasStep } from './steps/CoverageAreasStep';
import { ProfileDetailsStep } from './steps/ProfileDetailsStep';
import { ServicesOfferedStep } from './steps/ServicesOfferedStep';
import { WebsiteReviewStep } from './steps/WebsiteReviewStep';

const ProProfilePageForm = lazy(() =>
  import('@/pages/pro/ProProfilePage').then(m => ({ default: m.default })),
);

const TOTAL_STEPS = 5;
const ONBOARDING_STEP_LABELS = [
  'Your Business',
  'Your Details',
  'Your Services',
  'Your Coverage',
  'Review & Publish',
] as const;

function ServicesOnboardingStepNavigation({
  currentStep,
  onNavigate,
}: {
  currentStep: number;
  onNavigate: (step: number) => void;
}) {
  const progress = Math.max(12, ((currentStep - 0.5) / TOTAL_STEPS) * 100);

  return (
    <nav aria-label="Website setup steps" className="mx-auto w-full max-w-[1500px] px-4 pb-4 pt-1 sm:px-0">
      <div className="relative">
        <div className="absolute left-[10%] right-[10%] top-[17px] h-[3px] rounded-full bg-[#c6cedd]" />
        <div className="absolute left-[10%] top-[17px] h-[3px] rounded-full bg-[#0868da] transition-all" style={{ width: `${progress * 0.8}%` }} />
        <ol className="relative grid grid-cols-5 gap-1">
        {ONBOARDING_STEP_LABELS.map((label, index) => {
          const step = index + 1;
          const isCurrent = step === currentStep;
          const isComplete = step < currentStep;
          const canNavigate = isComplete;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => canNavigate && onNavigate(step)}
                disabled={!isComplete && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${step}: ${label}${isComplete ? ', completed' : isCurrent ? ', current' : ', not available yet'}`}
                className={`flex w-full flex-col items-center gap-2 text-center disabled:opacity-100 ${
                  isCurrent ? 'text-[#061b4b]' : isComplete ? 'text-[#53627c] hover:text-[#0868da]' : 'text-[#72819c]'
                }`}
              >
                <span className={`relative z-[1] inline-flex h-9 w-9 items-center justify-center rounded-full border-[4px] border-white text-sm font-bold shadow-sm ${
                  isCurrent ? 'bg-[#0868da] text-white ring-1 ring-[#0868da]/15' : isComplete ? 'bg-[#0868da] text-white' : 'bg-[#aeb8ca] text-white'
                }`}>{String(step)}</span>
                <span className={`hidden max-w-full truncate text-xs sm:block ${isCurrent ? 'font-bold' : 'font-medium'}`}>{label}</span>
                <span className={`max-w-full truncate text-[10px] sm:hidden ${isCurrent ? 'font-bold' : 'font-medium'}`}>{['Business', 'Details', 'Services', 'Coverage', 'Review'][index]}</span>
              </button>
            </li>
          );
        })}
        </ol>
      </div>
    </nav>
  );
}

function OnboardingHomeIllustration() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute -right-10 top-4 h-36 w-[110%] rotate-[-8deg] rounded-[50%] bg-[#d5e6ff]/80" />
      <div className="absolute -right-16 top-14 h-28 w-[110%] rotate-[-5deg] rounded-[50%] bg-[#c8ddfb]/80" />
      <svg viewBox="0 0 640 240" className="absolute -bottom-1 right-3 h-[180px] w-[560px] max-w-full opacity-90" fill="none">
        <path d="M15 225h610" stroke="#abc9ed" strokeWidth="3" />
        <g fill="#8cb4e9">
          <circle cx="72" cy="143" r="32" /><circle cx="100" cy="131" r="26" /><circle cx="566" cy="134" r="36" /><circle cx="597" cy="146" r="26" />
        </g>
        <g fill="#789fcf"><path d="M68 166h8v59h-8z" /><path d="M560 164h9v61h-9z" /></g>
        <path d="M135 127 251 45l117 82v98H135z" fill="#f8fbff" stroke="#789fcf" strokeWidth="4" />
        <path d="m115 130 136-99 139 99" stroke="#477bbd" strokeWidth="13" strokeLinejoin="round" />
        <path d="M189 126h46v42h-46zM275 126h47v42h-47z" fill="#b9d7fb" stroke="#7ba4d5" strokeWidth="3" />
        <path d="M237 171h34v54h-34z" fill="#668dbd" />
        <path d="M390 145 477 84l88 61v80H390z" fill="#f8fbff" stroke="#789fcf" strokeWidth="4" />
        <path d="m374 148 103-76 105 76" stroke="#315f98" strokeWidth="11" strokeLinejoin="round" />
        <path d="M416 151h32v30h-32zM486 151h32v30h-32z" fill="#b9d7fb" stroke="#7ba4d5" strokeWidth="3" />
        <path d="M460 184h27v41h-27z" fill="#789fcf" />
      </svg>
      <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#f6f9ff] via-[#f6f9ff]/80 to-transparent" />
    </div>
  );
}

type ProviderProfileData = {
  companyName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  businessType?: OnboardingState['businessType'];
  websiteTemplate?: OnboardingState['websiteTemplate'];
  businessYearsInOperation?: number | null;
  operatingHours?: string | null;
  socialLinks?: { facebook: string | null; instagram: string | null; linkedin: string | null };
  submissionStatus?: string | null;
  reviewNote?: string | null;
  isPublished?: boolean;
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
    id?: number;
    code?: string | null;
    displayName?: string | null;
    description?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    currency?: string | null;
    isActive?: boolean | null;
  }>;
  locations?: Array<{
    id?: number;
    canonicalPlaceId?: string | null;
    label?: string | null;
    isPrimary?: boolean | null;
  }>;
} | null;

function makeRowId(prefix: 'svc' | 'loc') {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

export function ProviderOnboardingWizard() {
  const { status, isLoading } = useServiceProviderOnboardingStatus();
  const [state, dispatch] = useOnboardingReducer();
  const profileQuery = trpc.servicesEngine.myProviderProfile.useQuery(undefined, {
    enabled: Boolean(status?.hasProviderIdentity),
    refetchOnWindowFocus: false,
  });
  const profilePlaceIds = useMemo(
    () =>
      (profileQuery.data as ProviderProfileData | undefined)?.locations
        ?.map(location => location.canonicalPlaceId)
        .filter((placeId): placeId is string => Boolean(placeId)) || [],
    [profileQuery.data],
  );
  const resolvedProfilePlacesQuery = trpc.placeAuthority.resolveSearchPlaces.useQuery(
    { placeIds: profilePlaceIds },
    {
      enabled: Boolean(profileQuery.data && profilePlaceIds.length > 0),
      refetchOnWindowFocus: false,
    },
  );
  const hasHydratedProfileRef = useRef(false);
  const hasAppliedResumeStepRef = useRef(false);
  const hasUnsavedChanges = Object.values(state.dirtySteps).some(Boolean);

  const serverStep = status?.onboardingStep ?? 0;
  const isPublished = Boolean((profileQuery.data as ProviderProfileData | undefined)?.isPublished);
  const isSubmitted =
    (profileQuery.data as ProviderProfileData | undefined)?.submissionStatus === 'submitted';
  const currentStep = Math.min(state.currentStep, TOTAL_STEPS);
  const showProgress = currentStep >= 1 && currentStep <= TOTAL_STEPS;

  useEffect(() => {
    if (isLoading || !status || hasAppliedResumeStepRef.current) return;
    hasAppliedResumeStepRef.current = true;
    if (state.currentStep === 1 && serverStep > 0) {
      dispatch({ type: 'SET_STEP', step: Math.min(serverStep + 1, TOTAL_STEPS) });
    }
  }, [dispatch, isLoading, serverStep, state.currentStep, status]);

  useEffect(() => {
    if (hasHydratedProfileRef.current) return;
    if (!isOnboardingStatePristine(state)) return;

    const profile = profileQuery.data as ProviderProfileData;
    if (!profile) return;
    if (profilePlaceIds.length > 0 && resolvedProfilePlacesQuery.isLoading) return;
    const resolvedPlaces = new Map(
      (resolvedProfilePlacesQuery.data?.results || []).flatMap(place =>
        place
          ? [[place.placeId, canonicalPlaceSelectionFromResolved(place)] as const]
          : [],
      ),
    );

    dispatch({
      type: 'HYDRATE',
      value: {
        companyName: profile.companyName || '',
        businessType: profile.businessType || null,
        logoUrl: profile.logoUrl || '',
        websiteTemplate: profile.websiteTemplate || 'corporate_brand',
        businessYearsInOperation:
          profile.businessYearsInOperation == null ? '' : String(profile.businessYearsInOperation),
        operatingHours: profile.operatingHours || '',
        socialLinks: {
          facebook: profile.socialLinks?.facebook || '',
          instagram: profile.socialLinks?.instagram || '',
          linkedin: profile.socialLinks?.linkedin || '',
        },
        bio: profile.bio || profile.description || '',
        headline: profile.headline || '',
        contactEmail: profile.contactEmail || '',
        contactPhone: profile.contactPhone || '',
        websiteUrl: profile.websiteUrl || '',
        selectedPlan: profile.subscriptionTier || null,
        services: (profile.services || []).map(service => ({
          id: makeRowId('svc'),
          recordId: service.id,
          code: service.code || '',
          displayName: service.displayName || '',
          description: service.description || '',
          category: service.category || 'home_improvement',
          minPrice: service.minPrice != null ? String(service.minPrice) : '',
          maxPrice: service.maxPrice != null ? String(service.maxPrice) : '',
          currency: 'ZAR',
          isActive: service.isActive !== false,
        })),
        locations: (profile.locations || []).map((location, index) => ({
          id: makeRowId('loc'),
          recordId: location.id,
          place: location.canonicalPlaceId
            ? resolvedPlaces.get(location.canonicalPlaceId) || null
            : null,
          isPrimary: location.isPrimary === true || (location.isPrimary == null && index === 0),
        })),
      },
    });

    hasHydratedProfileRef.current = true;
  }, [
    dispatch,
    profilePlaceIds.length,
    profileQuery.data,
    resolvedProfilePlacesQuery.data,
    resolvedProfilePlacesQuery.isLoading,
    state,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  function goToStep(step: number) {
    dispatch({ type: 'SET_STEP', step });
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec]">
        <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center text-sm text-slate-500 md:px-6">
          Preparing your profile...
        </div>
      </main>
    );
  }

  if (status?.hasProviderIdentity && profileQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl text-sm text-slate-500">
          Loading your provider profile…
        </div>
      </main>
    );
  }

  if (status?.hasProviderIdentity && profileQuery.isError) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          We could not load your provider profile. Refresh before editing it.
        </div>
      </main>
    );
  }

  if (isPublished) {
    return (
      <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading...</div>}>
        <ProProfilePageForm />
      </Suspense>
    );
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm sm:p-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-700" aria-hidden="true" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Website submitted</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Your business website is with our review team.</h1>
          <p className="mt-3 leading-7 text-slate-600">Your profile and website preview remain private while we review the information. Submitting does not publish your profile.</p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">What happens next</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">We’ll show the review outcome here. If changes are requested, you can return to your profile and update it. Once approved, your public website and provider workspace become available.</p>
            <p className="mt-3 text-sm font-medium text-slate-700">Current status: awaiting review</p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/services"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0868da] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#075bc4]"
            >
              Continue to Services <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Return to Property Listify
            </Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">You can return to your provider profile later to check the review status or respond to requested changes.</p>
        </section>
      </main>
    );
  }

  const publicationBadge =
    (profileQuery.data as ProviderProfileData | undefined)?.submissionStatus === 'changes_requested'
      ? 'Changes requested'
      : (profileQuery.data as ProviderProfileData | undefined)?.submissionStatus === 'rejected'
        ? 'Not approved · private'
        : 'Private draft';

  return (
    <main className="min-h-screen bg-[#f5f8fd] text-[#071b4a]">
      <div className="relative isolate min-h-screen overflow-hidden">
        <header className="relative overflow-hidden bg-[#f2f6fd]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#edf4ff_0%,#f8fbff_100%)]" />
          <OnboardingHomeIllustration />
          <div className="relative mx-auto w-full max-w-[1540px] px-5 pb-4 pt-6 sm:px-7 lg:px-10 lg:pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex shrink-0 items-center gap-2.5">
                <img src="/brand/app-icon-blue.svg" alt="" aria-hidden="true" className="h-12 w-12 sm:h-14 sm:w-14" />
                <div>
                  <p className="text-[20px] font-bold leading-tight tracking-[-0.04em] text-[#0b2b5c] sm:text-[24px]">Property Listify</p>
                  <p className="text-[18px] font-bold leading-tight tracking-[-0.03em] text-[#0868da] sm:text-[21px]">– Services</p>
                </div>
              </div>
              <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d9e7fb] bg-white/80 px-4 py-2 text-xs font-semibold text-[#087a65] shadow-sm sm:px-5 sm:py-2.5 sm:text-sm">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                {publicationBadge}
              </div>
            </div>
            <div className="relative z-[1] mt-10 max-w-[900px]">
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] text-[#071b4a] sm:text-[38px] lg:text-[40px]">
                Let’s build your business presence.
              </h1>
              <p className="mt-2 max-w-[900px] text-base leading-7 text-[#13264e] sm:text-lg lg:text-xl">
                Complete your business information. Watch your professional website take shape as you go.
              </p>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1540px] px-3 pb-8 sm:px-5 lg:px-6">
          <section className="overflow-hidden rounded-[24px] border border-[#dfe7f2] bg-white shadow-[0_18px_55px_-40px_rgba(15,41,79,0.45)]">
            {showProgress && (
              <div className="border-b border-[#e3eaf4] bg-[#fbfcff] pb-5 pt-3 sm:pt-4">
                <ServicesOnboardingStepNavigation currentStep={currentStep} onNavigate={goToStep} />
              </div>
            )}
            <div className="grid items-stretch lg:grid-cols-[minmax(390px,0.325fr)_minmax(0,0.675fr)]">
              <div className="min-w-0 p-5 sm:p-7 lg:px-9 lg:py-8">
                <div className="mb-4 inline-flex items-center rounded-full bg-[#e8f1ff] px-3.5 py-1.5 text-sm font-semibold text-[#0868da]">
                  Step {currentStep} of {TOTAL_STEPS}
                </div>
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
                  <WebsiteReviewStep
                    state={state}
                    onBack={() => goToStep(4)}
                  />
                )}
                </div>
                {hasUnsavedChanges && (
                  <div className="mt-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                    <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    This step has unsaved changes. Continue to save them; leaving this page will trigger a warning.
                  </div>
                )}
              </div>

              <div className="min-w-0 border-t border-[#e7edf5] bg-[#edf4ff] p-3 sm:p-5 lg:border-l lg:border-t-0 lg:p-5">
                <ProviderBusinessSitePreview profile={profileQuery.data} state={state} />
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
