import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APP_TITLE } from '@/const';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  LogOut,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

type AgentTier = 'free' | 'starter' | 'professional' | 'elite';
type BillingCadence = 'monthly' | 'annual';

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

type PlanTone = {
  card: string;
  price: string;
  badge: string;
  token: string;
  dot: string;
  selected: string;
  glow: string;
};

type TierBlueprint = {
  tier: Exclude<AgentTier, 'free'>;
  name: string;
  eyebrow: string;
  description: string;
  leadRange: string;
  listings: string;
  tokenCount: number;
  cta: string;
  badge?: string;
  Icon: typeof Briefcase;
  features: string[];
  fallbackMonthlyCents: number;
  tone: PlanTone;
};

const ANNUAL_DISCOUNT = 0.2;
const AGENT_TRIAL_DAYS = 90;

const tierBlueprints: TierBlueprint[] = [
  {
    tier: 'starter',
    name: 'Starter',
    eyebrow: 'Entry tier',
    description:
      'A disciplined launch for agents building presence, consistency, and early lead flow.',
    leadRange: '10-15 property leads / month',
    listings: 'Featured placement on up to 20 listings',
    tokenCount: 20,
    cta: 'Select Starter',
    Icon: Briefcase,
    features: [
      'Agent profile and mini-site',
      'Lead inbox with follow-up basics',
      'Core CRM and listing workflow',
      'Platform visibility for launch-stage agents',
    ],
    fallbackMonthlyCents: 99900,
    tone: {
      card: 'border-slate-200 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)]',
      price: 'bg-slate-950 text-white',
      badge: 'bg-slate-100 text-slate-700',
      token: 'bg-slate-100 text-slate-700',
      dot: 'bg-slate-500',
      selected:
        'border-slate-900 ring-2 ring-slate-900/10 shadow-[0_24px_65px_rgba(15,23,42,0.12)]',
      glow: 'from-slate-200/80 via-slate-100/20 to-transparent',
    },
  },
  {
    tier: 'professional',
    name: 'Professional',
    eyebrow: 'Growth tier',
    description:
      'For agents who want stronger lead momentum, cleaner operating systems, and better market presence.',
    leadRange: '30-50 property leads / month',
    listings: 'Featured placement on up to 40 listings',
    tokenCount: 60,
    cta: 'Select Professional',
    Icon: Rocket,
    features: [
      'Everything in Starter',
      'Priority lead handling and deeper CRM visibility',
      'Performance insights and automation',
      'Stronger search and profile positioning',
    ],
    fallbackMonthlyCents: 249900,
    tone: {
      card: 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.92)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_18px_60px_rgba(14,116,144,0.09)]',
      price: 'bg-[linear-gradient(135deg,#0f3b63_0%,#0b5fa5_100%)] text-white',
      badge: 'bg-sky-100 text-sky-700',
      token: 'bg-sky-50 text-sky-700',
      dot: 'bg-sky-600',
      selected: 'border-sky-500 ring-2 ring-sky-500/20 shadow-[0_28px_70px_rgba(14,116,144,0.16)]',
      glow: 'from-sky-300/60 via-sky-100/25 to-transparent',
    },
  },
  {
    tier: 'elite',
    name: 'Elite',
    eyebrow: 'Premier tier',
    description:
      'The strongest launch lane for agents who want maximum visibility, premium tools, and room to scale fast.',
    leadRange: '80-120+ property leads / month',
    listings: 'Unlimited featured placement',
    tokenCount: 150,
    cta: 'Select Elite',
    badge: '90-day trial',
    Icon: Crown,
    features: [
      'Everything in Professional',
      'Priority exposure and premium positioning',
      'Advanced analytics, branding, and marketing tools',
      'Area dominance and high-visibility launch support',
    ],
    fallbackMonthlyCents: 499900,
    tone: {
      card: 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_20px_70px_rgba(217,119,6,0.12)]',
      price: 'bg-[linear-gradient(135deg,#9a6a12_0%,#d89723_100%)] text-white',
      badge: 'bg-amber-100 text-amber-800',
      token: 'bg-amber-50 text-amber-800',
      dot: 'bg-amber-500',
      selected:
        'border-amber-500 ring-2 ring-amber-400/25 shadow-[0_32px_80px_rgba(217,119,6,0.18)]',
      glow: 'from-amber-200/75 via-amber-50/30 to-transparent',
    },
  },
];

function formatCurrency(cents: number) {
  return `R${Math.round(cents / 100).toLocaleString('en-ZA')}`;
}

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

  const [selectedTier, setSelectedTier] = useState<Exclude<AgentTier, 'free'>>('elite');
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly');
  const [status, setStatus] = useState<AgentOnboardingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tierCards = useMemo(
    () =>
      tierBlueprints.map(blueprint => {
        const monthlyCents = blueprint.fallbackMonthlyCents;
        const annualMonthlyCents = Math.round(monthlyCents * (1 - ANNUAL_DISCOUNT));

        return {
          ...blueprint,
          monthlyCents,
          annualMonthlyCents,
          annualTotalCents: annualMonthlyCents * 12,
        };
      }),
    [],
  );
  const selectedCard = tierCards.find(card => card.tier === selectedTier) ?? tierCards[2];
  const selectedPrice =
    billingCadence === 'annual' ? selectedCard.annualMonthlyCents : selectedCard.monthlyCents;
  const trialEnd = formatTrialEndDate(status?.trialEndsAt || null);

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
        tier === 'free'
          ? 'Free tier saved. Continue with your profile setup.'
          : `${tierCards.find(card => card.tier === tier)?.name || 'Plan'} saved. Continue with your profile setup.`,
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
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
          Preparing your onboarding flow...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,92,168,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.08),transparent_28%)]" />

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7f4ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-lg font-semibold tracking-[-0.02em] text-slate-950">
                  {APP_TITLE}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Agent onboarding
                </p>
              </div>
            </div>

            <div className="hidden h-6 w-px bg-slate-300 lg:block" />

            <div className="hidden items-center gap-2 lg:flex">
              {[
                { label: 'Verify email', done: true },
                { label: 'Choose plan', active: true },
                { label: 'Build profile' },
                { label: 'Launch dashboard' },
              ].map((step, index) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
                      step.active
                        ? 'bg-slate-950 text-white'
                        : step.done
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-500',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        step.active
                          ? 'bg-amber-300'
                          : step.done
                            ? 'bg-emerald-600'
                            : 'bg-slate-300',
                      )}
                    />
                    {step.label}
                  </div>
                  {index < 3 ? <span className="text-slate-300">›</span> : null}
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            className="gap-2 text-slate-600"
            onClick={() => setLocation('/login')}
          >
            Exit
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-12 sm:px-8 lg:px-10 lg:pt-16">
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Email verified
          </Badge>

          <div className="mt-6 max-w-4xl">
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
              Choose the plan that gives your next season real momentum.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Listings, lead flow, follow-up, and visibility should feel like one system. Choose
              your launch tier now, activate your {AGENT_TRIAL_DAYS}-day onboarding trial, and move
              straight into profile setup.
            </p>
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
            <span
              className={cn(
                'text-sm font-medium',
                billingCadence === 'monthly' ? 'text-slate-950' : 'text-slate-500',
              )}
            >
              Monthly
            </span>
            <button
              type="button"
              aria-label="Toggle billing cadence preview"
              aria-pressed={billingCadence === 'annual'}
              onClick={() =>
                setBillingCadence(current => (current === 'monthly' ? 'annual' : 'monthly'))
              }
              className={cn(
                'relative h-7 w-12 rounded-full border transition-colors',
                billingCadence === 'annual'
                  ? 'border-slate-950 bg-slate-950'
                  : 'border-slate-300 bg-slate-200',
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
                  billingCadence === 'annual' ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
            <span
              className={cn(
                'text-sm font-medium',
                billingCadence === 'annual' ? 'text-slate-950' : 'text-slate-500',
              )}
            >
              Annual preview
            </span>
          </div>

          <Badge className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 hover:bg-amber-50">
            Save 20% on annual billing
          </Badge>

          <p className="text-sm text-slate-500">
            This step saves your tier choice now. Billing cadence can be finalized later in agent
            settings.
          </p>
        </section>

        <section className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-5 xl:grid-cols-3">
            {tierCards.map(card => {
              const isSelected = selectedTier === card.tier;
              const price =
                billingCadence === 'annual' ? card.annualMonthlyCents : card.monthlyCents;
              const annualSavings = card.monthlyCents * 12 - card.annualTotalCents;
              const features = card.features;
              const Icon = card.Icon;

              return (
                <button
                  key={card.tier}
                  type="button"
                  onClick={() => setSelectedTier(card.tier)}
                  className={cn(
                    'group relative overflow-hidden rounded-[28px] border p-7 text-left transition-all duration-300',
                    card.tone.card,
                    isSelected ? `${card.tone.selected} -translate-y-1` : 'hover:-translate-y-1',
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r opacity-80',
                      card.tone.glow,
                    )}
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-slate-950 shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                          <span
                            className={cn('mr-2 inline-block h-2 w-2 rounded-full', card.tone.dot)}
                          />
                          {card.eyebrow}
                        </p>
                      </div>

                      {card.badge ? (
                        <Badge
                          className={cn(
                            'rounded-full px-3 py-1 hover:opacity-100',
                            card.tone.badge,
                          )}
                        >
                          {card.badge}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-6">
                      <h2 className="font-serif text-[2rem] font-semibold leading-none tracking-[-0.03em] text-slate-950">
                        {card.name}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                    </div>

                    <div className={cn('mt-7 rounded-[20px] px-5 py-5', card.tone.price)}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                        {billingCadence === 'annual'
                          ? 'Annual billing preview'
                          : 'Monthly investment'}
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="font-mono text-5xl font-medium tracking-[-0.05em] text-white">
                          {formatCurrency(price)}
                        </span>
                        <span className="pb-1 text-sm text-white/65">/mo</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/60">
                        {billingCadence === 'annual'
                          ? `Billed ${formatCurrency(card.annualTotalCents)} yearly, saving ${formatCurrency(annualSavings)}.`
                          : `${AGENT_TRIAL_DAYS}-day onboarding trial starts now and billing decisions can wait until later.`}
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{card.leadRange}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {card.listings}
                      </p>
                    </div>

                    <ul className="mt-5 space-y-3">
                      {features.map(feature => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                        >
                          <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Visibility tokens / month
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-sm font-semibold',
                          card.tone.token,
                        )}
                      >
                        {card.tokenCount}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Tokens support boosts, premium exposure, and launch actions inside Agent OS.
                    </p>

                    <div className="mt-6">
                      <span
                        className={cn(
                          'flex h-12 w-full items-center justify-center rounded-2xl border text-sm font-semibold transition-colors',
                          isSelected
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-300 bg-transparent text-slate-700 group-hover:border-slate-950 group-hover:text-slate-950',
                        )}
                      >
                        {isSelected ? `${card.cta} ✓` : card.cta}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[32px] bg-slate-950 px-7 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  You&apos;ve selected
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                  {selectedCard.name} plan
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                  Your tier choice is saved immediately, your trial starts right away, and you move
                  directly into profile setup without another auth step.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    'Your plan preference is saved and your launch trial activates.',
                    'You continue directly into profile build with no extra login step.',
                    'Dashboard access unlocks once your setup threshold is met.',
                  ].map((item, index) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-white/72">
                      <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-xs font-semibold text-amber-300">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:min-w-[290px] lg:items-end">
                <div className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 lg:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    {billingCadence === 'annual' ? 'Annual preview' : 'Monthly investment'}
                  </p>
                  <div className="mt-2 flex items-end gap-2 lg:justify-end">
                    <span className="font-mono text-4xl font-medium tracking-[-0.05em] text-white">
                      {formatCurrency(selectedPrice)}
                    </span>
                    <span className="pb-1 text-sm text-white/55">/mo</span>
                  </div>
                  <p className="mt-2 text-xs text-white/45">
                    {billingCadence === 'annual'
                      ? `${formatCurrency(selectedCard.annualTotalCents)} billed yearly after onboarding.`
                      : `${AGENT_TRIAL_DAYS}-day launch trial before any billing decision.`}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span className="text-sm text-white/70">Visibility tokens</span>
                  <span className="font-mono text-sm font-medium text-amber-300">
                    {selectedCard.tokenCount} / month
                  </span>
                </div>

                <Button
                  size="lg"
                  className="h-12 rounded-2xl bg-white px-6 text-slate-950 hover:bg-white/92"
                  disabled={isSubmitting}
                  onClick={() => void handleSelectPackage(selectedTier)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving your plan...
                    </>
                  ) : (
                    <>
                      Continue with {selectedCard.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs leading-5 text-white/40 lg:text-right">
                  Final billing can be changed later from agent settings.
                  {trialEnd ? ` Current trial ends ${trialEnd}.` : ''}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 flex flex-col items-center justify-center gap-3 text-center text-sm text-slate-600 sm:flex-row">
          <span>Not ready to commit to a paid launch tier?</span>
          <Button
            variant="link"
            className="h-auto p-0 font-semibold text-slate-900"
            disabled={isSubmitting}
            onClick={() => void handleSelectPackage('free')}
          >
            Explore the free tier instead
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white/80 px-6 py-5 text-sm leading-6 text-slate-600 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="font-semibold text-slate-900">Why this layout is different</p>
              <p className="mt-1">
                This page is part of onboarding, not checkout. It helps the agent choose the right
                launch tier now, then complete profile setup before they manage billing in the main
                product.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              Step 2 of 4
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
