import { useEffect, useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/advertise/SEOHead';
import { trackCTAClick, trackFunnelStep } from '@/lib/analytics/advertiseTracking';
import {
  getAdvertiserRoleBySlug,
  getAdvertiserRoleConfig,
  getRoleStrategyHref,
  getAdvertiserRoleSlug,
  getStoredAdvertiserPath,
  setStoredAdvertiserPath,
  setStoredAdvertiserRole,
  type TierKey,
  type AdvertiserRole,
} from '@/lib/advertise/onboarding';

const tierBlueprint: Array<{ key: TierKey; subtitle: string; fit: string }> = [
  {
    key: 'starter',
    subtitle: 'Visibility Layer',
    fit: 'For controlled entry and fast activation',
  },
  {
    key: 'growth',
    subtitle: 'Amplification Layer',
    fit: 'Most popular for consistent buyer demand',
  },
  {
    key: 'dominance',
    subtitle: 'Infrastructure Layer',
    fit: 'For scale, authority, and strategic control',
  },
];

const strategyPreparation = [
  'Market focus areas and target inventory mix',
  'Current enquiry quality and conversion constraints',
  'Desired timeline, launch goals, and growth priorities',
];

const strategyCoverage = [
  'Role-specific positioning and exposure strategy',
  'Package recommendation with add-on sequencing',
  'Execution plan for the first 30 days after activation',
];

type ViewMode = 'self_serve' | 'strategy_confirmation';

export default function GetStartedRole() {
  const [, setLocation] = useLocation();
  const [isConfirmation, confirmationParams] = useRoute('/get-started/:role/confirmation');
  const [isSelfServe, selfServeParams] = useRoute('/get-started/:role');
  const roleSlug = isConfirmation ? confirmationParams?.role : isSelfServe ? selfServeParams?.role : '';
  const roleFromPath = getAdvertiserRoleBySlug(roleSlug || '');
  const role = useMemo<AdvertiserRole | null>(() => roleFromPath || null, [roleFromPath]);
  const roleConfig = role ? getAdvertiserRoleConfig(role) : null;
  const mode: ViewMode = isConfirmation ? 'strategy_confirmation' : 'self_serve';
  const storedIntent = getStoredAdvertiserPath();

  useEffect(() => {
    if (!role || !roleConfig) {
      setLocation('/get-started');
      return;
    }

    setStoredAdvertiserRole(role);
    setStoredAdvertiserPath(mode === 'strategy_confirmation' ? 'strategy_call' : 'self_serve');
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_3',
      action: mode === 'strategy_confirmation' ? 'confirmation_viewed' : 'pricing_viewed',
      role,
      path: mode === 'strategy_confirmation' ? 'strategy_call' : 'self_serve',
    });
  }, [role, roleConfig, mode, setLocation]);

  if (!role || !roleConfig) return null;

  const rolePageHref = `/get-started/${getAdvertiserRoleSlug(role)}`;
  const strategyHref = getRoleStrategyHref(role);
  const recommendedTierLabel = roleConfig.tierLabels[roleConfig.recommendedTier];
  const selfServeAnchor = roleConfig.anchorCopy
    .replace('{rolePlural}', roleConfig.rolePlural)
    .replace('{recommendedTierLabel}', recommendedTierLabel);
  const strategyAnchor = `Based on your role, we typically prepare the ${recommendedTierLabel} package for discussion.`;
  const planPreview = tierBlueprint.map(tier => ({
    ...tier,
    title: roleConfig.tierLabels[tier.key],
    popular: roleConfig.recommendedTier === tier.key,
  }));

  const handleStartSetup = () => {
    setStoredAdvertiserPath('self_serve');
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_3',
      action: 'setup_started',
      role,
      path: 'self_serve',
    });
    trackCTAClick({
      ctaLabel: 'Start Setup',
      ctaLocation: 'get_started_role_page',
      ctaHref: roleConfig.startSetupHref,
    });
    setLocation(roleConfig.startSetupHref);
  };

  const handleBookStrategy = () => {
    setStoredAdvertiserPath('strategy_call');
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_3',
      action: 'book_strategy_click',
      role,
      path: 'strategy_call',
    });
    trackCTAClick({
      ctaLabel: 'Book Strategy Call',
      ctaLocation: 'get_started_role_page',
      ctaHref: strategyHref,
    });
    setLocation(strategyHref);
  };

  const handleExplorePackages = () => {
    setStoredAdvertiserPath('self_serve');
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_3',
      action: 'explore_packages_while_waiting',
      role,
      path: 'strategy_call',
    });
    trackCTAClick({
      ctaLabel: 'Explore Packages While You Wait',
      ctaLocation: 'strategy_confirmation_page',
      ctaHref: rolePageHref,
    });
    setLocation(rolePageHref);
  };

  const handleContinueStrategyTrack = () => {
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_3',
      action: 'return_to_strategy_confirmation',
      role,
      path: 'strategy_call',
    });
    setLocation(`/get-started/${getAdvertiserRoleSlug(role)}/confirmation`);
  };

  const handleTierPreviewClick = (tier: TierKey) => {
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_3',
      action: 'tier_preview_click',
      role,
      path: mode === 'strategy_confirmation' ? 'strategy_call' : 'self_serve',
      plan: tier,
    });
  };

  const titlePrefix =
    mode === 'strategy_confirmation' ? `${roleConfig.label} Strategy Confirmation` : `${roleConfig.label} Onboarding`;
  const canonicalSuffix =
    mode === 'strategy_confirmation'
      ? `/get-started/${getAdvertiserRoleSlug(role)}/confirmation`
      : `/get-started/${getAdvertiserRoleSlug(role)}`;

  return (
    <>
      <SEOHead
        title={`${titlePrefix} | Advertise With Us`}
        description={
          mode === 'strategy_confirmation'
            ? `Strategy confirmation for ${roleConfig.label.toLowerCase()} with next-step preparation and package preview.`
            : `Role-specific onboarding for ${roleConfig.label.toLowerCase()} with tailored value positioning, plan preview, and setup path.`
        }
        canonicalUrl={`https://platform.com${canonicalSuffix}`}
        ogImage="https://platform.com/images/advertise-og-image.jpg"
        ogType="website"
      />
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <button
            type="button"
            onClick={() => setLocation(mode === 'strategy_confirmation' ? '/book-strategy' : '/get-started')}
            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {mode === 'strategy_confirmation' ? 'Back to Strategy Booking' : 'Back to Profile Selection'}
          </button>

          <section className="rounded-3xl border border-blue-100 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {roleConfig.shortLabel} Growth Path
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              {mode === 'strategy_confirmation'
                ? 'Strategy Session Confirmed. You are now in guided onboarding.'
                : 'Choose Your Growth Plan'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              {mode === 'strategy_confirmation'
                ? 'We will guide your setup during the session. You can review package options now without re-entering role information.'
                : `${roleConfig.stepTwoHeadline} ${roleConfig.stepTwoSubtext}`}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {mode === 'strategy_confirmation' ? (
                <>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleExplorePackages}>
                    Explore Packages While You Wait <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="border-blue-200 text-blue-700" onClick={handleStartSetup}>
                    Start Setup Now
                  </Button>
                </>
              ) : (
                <>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleStartSetup}>
                    Start Setup <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="border-blue-200 text-blue-700" onClick={handleBookStrategy}>
                    Book Strategy Call
                  </Button>
                </>
              )}
            </div>
          </section>

          {mode === 'self_serve' && storedIntent === 'strategy_call' && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-amber-900">
                You previously chose guided onboarding for this role.
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Continue with strategy confirmation, or stay here if you want to proceed self-serve.
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={handleContinueStrategyTrack}
                >
                  Continue Guided Path
                </Button>
              </div>
            </section>
          )}

          {mode === 'strategy_confirmation' ? (
            <section className="grid gap-4 md:grid-cols-2">
              <Card className="border-blue-100">
                <CardContent className="space-y-3 p-5">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-900">What to Prepare</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {strategyPreparation.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-blue-100">
                <CardContent className="space-y-3 p-5">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-900">What We Will Cover</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {strategyCoverage.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ) : (
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="border-blue-100">
                <CardContent className="space-y-3 p-5">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-900">What You Get</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {roleConfig.valueHighlights.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-blue-100">
                <CardContent className="space-y-3 p-5">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-900">Recommended Add-Ons</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {roleConfig.addOns.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-blue-100">
                <CardContent className="space-y-3 p-5">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-900">ROI Orientation</h2>
                  <p className="text-sm text-slate-600">{roleConfig.roiExample}</p>
                  <p className="text-xs text-slate-500">
                    Outcome focus: qualified demand, brand authority, and predictable growth velocity.
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'strategy_confirmation' ? 'Package Preview (Before Your Session)' : 'Plan Preview'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {mode === 'strategy_confirmation'
                ? 'Light preview only. Final recommendation is aligned during your guided strategy session.'
                : 'Your role-specific setup unlocks the right tier path without sending you back through role selection.'}
            </p>
            {mode === 'strategy_confirmation' && (
              <p className="mt-2 text-sm font-medium text-blue-700">
                {strategyAnchor}
              </p>
            )}
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {planPreview.map(plan => (
                <button
                  type="button"
                  key={plan.key}
                  onClick={() => handleTierPreviewClick(plan.key)}
                  className={`rounded-2xl border p-4 ${
                    plan.popular ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'
                  } text-left transition hover:border-blue-300`}
                >
                  {plan.popular && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                      Most Popular
                    </p>
                  )}
                  <p className="text-lg font-semibold text-slate-900">{plan.title}</p>
                  <p className="text-sm font-medium text-blue-700">{plan.subtitle}</p>
                  <p className="mt-2 text-sm text-slate-600">{plan.fit}</p>
                </button>
              ))}
            </div>
            {mode === 'self_serve' && (
              <p className="mt-3 text-sm font-medium text-blue-700">{selfServeAnchor}</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
