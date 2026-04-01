import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APP_TITLE } from '@/const';
import { useAuth } from '@/_core/hooks/useAuth';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Crown,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

type AgentTier = 'free' | 'starter' | 'professional' | 'elite';

type AgentOnboardingStatus = {
  packageSelected: boolean;
  onboardingComplete: boolean;
  onboardingStep: number;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  subscriptionTier: AgentTier;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
};

type TierCard = {
  tier: Exclude<AgentTier, 'free'>;
  name: string;
  description: string;
  headline: string;
  priceLabel: string;
  accent: string;
  ring: string;
  Icon: typeof Briefcase;
  features: string[];
  badge?: string;
};

const packageCards: TierCard[] = [
  {
    tier: 'starter',
    name: 'Starter',
    description: 'A clean launch tier for agents building their first presence.',
    headline: 'Launch your agent workspace',
    priceLabel: 'Entry tier',
    accent: 'from-sky-500 to-cyan-500',
    ring: 'ring-sky-500/25 border-sky-200',
    Icon: Briefcase,
    features: [
      'Core profile and mini-site setup',
      'Lead inbox and follow-up basics',
      'Listing-ready workflow foundation',
    ],
  },
  {
    tier: 'professional',
    name: 'Professional',
    description: 'For agents who want stronger reach, polish, and operating visibility.',
    headline: 'Scale your workflow and visibility',
    priceLabel: 'Growth tier',
    accent: 'from-violet-500 to-indigo-600',
    ring: 'ring-violet-500/25 border-violet-200',
    Icon: Rocket,
    features: [
      'Stronger profile positioning and lead routing',
      'Better performance insights and automation',
      'A fuller Agent OS operating stack',
    ],
  },
  {
    tier: 'elite',
    name: 'Elite',
    description: 'Best launch path for agents who want the full experience from day one.',
    headline: 'Start at full power',
    priceLabel: '3 months free',
    accent: 'from-amber-400 via-orange-500 to-rose-500',
    ring: 'ring-amber-500/30 border-amber-200',
    Icon: Crown,
    badge: 'Recommended',
    features: [
      'Priority visibility and premium profile polish',
      'Advanced analytics, branding, and marketing support',
      'Free for the first 90 days before billing decisions',
    ],
  },
];

function formatTrialEndDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AgentPackageSelection() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  const [selectedTier, setSelectedTier] = useState<AgentTier>('elite');
  const [status, setStatus] = useState<AgentOnboardingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified. Choose your launch package to continue.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading || user?.role !== 'agent') return;

    let cancelled = false;

    const loadStatus = async () => {
      setStatusLoading(true);
      try {
        const result = await apiFetch<AgentOnboardingStatus>('/agent/onboarding-status');
        if (cancelled) return;

        setStatus(result);

        if (result.packageSelected) {
          if (result.dashboardUnlocked) {
            setLocation('/agent/dashboard');
            return;
          }

          setLocation('/agent/setup');
          return;
        }
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : 'Could not load your onboarding status',
        );
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [loading, setLocation, user?.role]);

  const handleSelectPackage = async (tier: AgentTier) => {
    setIsSubmitting(true);
    try {
      const result = await apiFetch<AgentOnboardingStatus>('/agent/select-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      setStatus(result);
      toast.success(
        tier === 'elite'
          ? 'Elite trial started. Continue with your profile setup.'
          : 'Package saved. Continue with your profile setup.',
      );
      setLocation(`/agent/setup?package=${tier}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.body?.error || `Could not save package (${error.status})`;
        toast.error(message);
      } else {
        toast.error(error instanceof Error ? error.message : 'Could not save package');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f3ec] px-6">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
          Preparing your onboarding flow...
        </div>
      </div>
    );
  }

  const trialEnd = formatTrialEndDate(status?.trialEndsAt || null);
  const selectedCard = packageCards.find(card => card.tier === selectedTier) || packageCards[2];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_35%),linear-gradient(180deg,#f8f6ef_0%,#f3efe6_100%)] text-slate-950">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#1f7bc2] text-white shadow-[0_12px_28px_rgba(0,92,168,0.24)]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {APP_TITLE}
              </p>
              <h1 className="text-lg font-semibold text-slate-950">Agent onboarding</h1>
            </div>
          </div>

          <Button variant="ghost" className="text-slate-600" onClick={() => setLocation('/login')}>
            Exit
          </Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="rounded-[32px] border border-white/80 bg-white/90 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">
                Email verified
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 px-3 py-1 text-slate-600"
              >
                Step 2 of 4
              </Badge>
            </div>

            <div className="mt-5 max-w-3xl">
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                Choose the package that should carry your launch.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Your account is verified. One quick package decision lets us route you into the
                right onboarding path, unlock your trial, and move you straight into setup without
                wasting a step.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Verify email', done: true },
                { label: 'Choose package', done: false, active: true },
                { label: 'Finish profile', done: false },
                { label: 'Launch dashboard', done: false },
              ].map(step => (
                <div
                  key={step.label}
                  className={cn(
                    'rounded-2xl border px-4 py-3',
                    step.active
                      ? 'border-[var(--primary)] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)]'
                      : step.done
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          step.active ? 'bg-[var(--primary)]' : 'bg-slate-300',
                        )}
                      />
                    )}
                    {step.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-3">
              {packageCards.map(card => {
                const isSelected = selectedTier === card.tier;
                const Icon = card.Icon;

                return (
                  <button
                    key={card.tier}
                    type="button"
                    onClick={() => setSelectedTier(card.tier)}
                    className={cn(
                      'group relative overflow-hidden rounded-[28px] border bg-white p-6 text-left shadow-[0_10px_40px_rgba(15,23,42,0.06)] transition-all',
                      isSelected
                        ? `-translate-y-1 ring-2 ${card.ring}`
                        : 'border-slate-200 hover:-translate-y-1 hover:border-slate-300',
                    )}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r opacity-90',
                        card.accent,
                      )}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/88 text-slate-900 shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        {card.badge ? (
                          <Badge className="rounded-full bg-slate-950/90 px-3 py-1 text-white hover:bg-slate-950/90">
                            {card.badge}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-10">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          {card.priceLabel}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                          {card.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                        {card.headline}
                      </div>

                      <ul className="mt-5 space-y-3">
                        {card.features.map(feature => (
                          <li
                            key={feature}
                            className="flex items-start gap-3 text-sm text-slate-700"
                          >
                            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Prefer to start smaller?</p>
                  <p className="mt-1 text-sm text-slate-600">
                    You can continue on the free tier and upgrade later from your agent settings.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-300 bg-white"
                  disabled={isSubmitting}
                  onClick={() => void handleSelectPackage('free')}
                >
                  Continue on free
                </Button>
              </div>
            </div>
          </div>

          <aside className="rounded-[32px] border border-slate-200/80 bg-[#111827] p-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/50">
                  Launch summary
                </p>
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  {selectedCard.name}
                </h3>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/60">Selected outcome</p>
              <p className="mt-2 text-lg font-semibold text-white">{selectedCard.headline}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">{selectedCard.description}</p>
            </div>

            <div className="mt-5 space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  What happens next
                </p>
                <ul className="mt-3 space-y-3 text-sm text-white/80">
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    Your trial and package preference are saved immediately.
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    You continue into profile setup without another login step.
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    Dashboard access unlocks as soon as your setup threshold is met.
                  </li>
                </ul>
              </div>

              <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-semibold text-emerald-200">
                  Elite launch recommendation
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-50/90">
                  Start on Elite now, use the first 90 days free, and decide on long-term billing
                  once your profile and pipeline are live.
                </p>
                {trialEnd ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald-100/70">
                    Current trial ends {trialEnd}
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              className="mt-6 h-12 w-full rounded-2xl bg-white text-slate-950 hover:bg-white/90"
              disabled={isSubmitting}
              onClick={() => void handleSelectPackage(selectedTier)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving your package...
                </>
              ) : (
                <>
                  Continue with {selectedCard.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-xs leading-5 text-white/50">
              You can revisit package and billing decisions later from agent settings.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
