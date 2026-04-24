import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Building2, CheckCircle2, Home, UserCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/advertise/SEOHead';
import { trackCTAClick, trackFunnelStep } from '@/lib/analytics/advertiseTracking';
import {
  ADVERTISER_ROLES,
  getAdvertiserRoleConfig,
  getRoleSelfServeHref,
  getRoleStrategyHref,
  setStoredAdvertiserPath,
  getStoredAdvertiserRole,
  setStoredAdvertiserRole,
  type AdvertiserRole,
  type AdvertiserPath,
} from '@/lib/advertise/onboarding';

const iconByRole: Record<AdvertiserRole, typeof Users> = {
  agent: UserCircle,
  agency: Users,
  developer: Building2,
  private_seller: Home,
};

export default function GetStarted() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<AdvertiserRole | null>(() => getStoredAdvertiserRole());
  const completedRef = useRef(false);
  const loadTimeRef = useRef(Date.now());
  const roleSelectedAtRef = useRef<number | null>(null);

  useEffect(() => {
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'view',
      action: 'page_load',
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!completedRef.current) {
        trackFunnelStep({
          funnel: 'advertise_get_started',
          step: selectedRole ? 'step_2' : 'step_1',
          action: 'dropoff',
          role: selectedRole || undefined,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!completedRef.current) {
        trackFunnelStep({
          funnel: 'advertise_get_started',
          step: selectedRole ? 'step_2' : 'step_1',
          action: 'dropoff_internal_nav',
          role: selectedRole || undefined,
        });
      }
    };
  }, [selectedRole]);

  const flow = useMemo(() => {
    if (!selectedRole) return null;
    const config = getAdvertiserRoleConfig(selectedRole);
    if (!config) return null;

    const selfServeHref = getRoleSelfServeHref(selectedRole);
    const strategyHref = getRoleStrategyHref(selectedRole);
    const primaryIsStrategy = config.primaryPath === 'strategy_call';

    return {
      headline: config.stepTwoHeadline,
      subtext: config.stepTwoSubtext,
      primaryPath: primaryIsStrategy ? ('strategy_call' as AdvertiserPath) : ('self_serve' as AdvertiserPath),
      primaryLabel: primaryIsStrategy ? 'Book Strategy Call' : 'Continue with Self-Serve',
      primaryHref: primaryIsStrategy ? strategyHref : selfServeHref,
      secondaryPath: primaryIsStrategy ? ('self_serve' as AdvertiserPath) : ('strategy_call' as AdvertiserPath),
      secondaryLabel: primaryIsStrategy ? 'Continue with Self-Serve' : 'Need help? Book Strategy Call',
      secondaryHref: primaryIsStrategy ? selfServeHref : strategyHref,
      strategyRecommended: config.strategyRecommended,
    };
  }, [selectedRole]);

  const handleRoleSelect = (role: AdvertiserRole) => {
    setSelectedRole(role);
    setStoredAdvertiserRole(role);
    roleSelectedAtRef.current = Date.now();
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_1',
      action: 'role_selected',
      role,
      durationMs: Date.now() - loadTimeRef.current,
    });
  };

  const handlePathSelect = (path: AdvertiserPath, href: string) => {
    if (!selectedRole) return;

    completedRef.current = true;
    setStoredAdvertiserPath(path);

    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'step_2',
      action: 'path_selected',
      role: selectedRole,
      path,
      durationMs: roleSelectedAtRef.current ? Date.now() - roleSelectedAtRef.current : undefined,
    });

    trackCTAClick({
      ctaLabel: path === 'strategy_call' ? 'Book Strategy Call' : 'Continue with Self-Serve',
      ctaLocation: 'get_started_step_2',
      ctaHref: href,
    });

    if (href.startsWith('/')) {
      setLocation(href);
    } else {
      window.location.href = href;
    }
  };

  const handlePlanPreviewClick = () => {
    setStoredAdvertiserPath('preview_plans');
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: selectedRole ? 'step_2' : 'step_1',
      action: 'plan_preview_click',
      role: selectedRole || undefined,
      durationMs: Date.now() - loadTimeRef.current,
    });
    setLocation('/advertise#pricing-plans');
  };

  return (
    <>
      <SEOHead
        title="Get Started | Advertise With Us"
        description="Set up your advertiser growth profile with role-based onboarding for agents, agencies, developers, and private sellers."
        canonicalUrl="/get-started"
        ogImage="/images/advertise-og-image.jpg"
        ogType="website"
      />
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Advertiser Onboarding
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Let&apos;s Set Up Your Growth Profile
            </h1>
            <p className="mx-auto max-w-2xl text-slate-600">
              Select your profile once. We&apos;ll carry it forward and route you into a role-specific
              onboarding flow.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Step 1: Select Your Profile</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {ADVERTISER_ROLES.map(card => {
                const Icon = iconByRole[card.role];
                const isActive = selectedRole === card.role;
                return (
                  <Card
                    key={card.role}
                    className={`cursor-pointer border transition-all ${
                      isActive
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md'
                        : 'border-blue-100 bg-white/90 hover:border-blue-200 hover:shadow-sm'
                    }`}
                    onClick={() => handleRoleSelect(card.role)}
                  >
                    <CardContent className="space-y-3 p-5">
                      <Icon className="h-5 w-5 text-blue-700" />
                      <h3 className="text-base font-semibold text-slate-900">{card.label}</h3>
                      <p className="text-sm text-slate-600">{card.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {flow && selectedRole && (
            <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-md">
              <h2 className="text-lg font-semibold text-slate-900">Step 2: Choose Your Path</h2>
              <p className="mt-2 text-sm text-slate-600">{flow.headline}</p>
              <p className="mt-1 text-sm text-slate-500">{flow.subtext}</p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => handlePathSelect(flow.primaryPath, flow.primaryHref)}
                >
                  {flow.primaryLabel} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-300"
                  onClick={() => handlePathSelect(flow.secondaryPath, flow.secondaryHref)}
                >
                  {flow.secondaryLabel}
                </Button>
              </div>

              <button
                type="button"
                className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-800"
                onClick={handlePlanPreviewClick}
              >
                Preview plans first
              </button>

              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {flow.strategyRecommended
                  ? 'Strategy onboarding is recommended for this role, but never mandatory.'
                  : 'You can start self-serve now and add strategy support any time.'}
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
