import React from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  GitBranch,
  Globe2,
  Heart,
  MapPin,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';
import { PerformanceOptimizer } from '@/components/advertise/PerformanceOptimizer';
import { SkipLinks } from '@/components/advertise/SkipLinks';
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';
import { trpc } from '@/lib/trpc';
import advertiseHero from '@/assets/advertisewithus-hero.png';
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

const audienceSegments = [
  {
    title: 'Estate Agents',
    pain: [
      'Paying for listings that do not convert',
      'Competing against boosted inventory',
      'No integrated marketing support',
    ],
  },
  {
    title: 'Property Developers',
    pain: [
      'Expensive portal packages with low story depth',
      'Weak project branding and launch narrative',
      'Limited visibility outside listing pages',
    ],
  },
  {
    title: 'Private Sellers',
    pain: [
      'Low exposure to serious buyers',
      'No digital marketing expertise',
      'Fear of wasting budget on poor channels',
    ],
  },
];

const whatYouGetFeatures = [
  {
    icon: Globe2,
    title: 'Microsite profile',
    description:
      'Publish a shareable profile page that builds trust and keeps your brand consistent.',
  },
  {
    icon: Heart,
    title: 'Seller + buyer lead capture',
    description:
      'Capture seller valuation requests and buyer enquiries inside one workflow.',
  },
  {
    icon: MapPin,
    title: 'Listings + exposure',
    description:
      'List properties and get surfaced to active buyers across discovery surfaces.',
  },
  {
    icon: BarChart3,
    title: 'Analytics dashboard',
    description:
      'Track listing performance, lead flow, and outcomes in one reporting view.',
  },
  {
    icon: GitBranch,
    title: 'CRM-lite pipeline (Pro+)',
    description:
      'Manage opportunities, stage movement, and follow-up actions as your volume grows.',
  },
  {
    icon: Sparkles,
    title: 'AI insights (Elite)',
    description:
      'Unlock AI recommendations and benchmarking signals for higher conversion quality.',
  },
];

const howItWorksSteps = [
  {
    title: 'Create your advertiser profile',
    description:
      'Set up your profile once and activate your public brand presence across key discovery surfaces.',
  },
  {
    title: 'Activate your exposure plan',
    description:
      'Select a plan aligned to your stage and listing volume, then launch with billing controls in one place.',
  },
  {
    title: 'Receive qualified buyer enquiries',
    description:
      'Capture buyer intent from users who have already filtered by budget, location, and property type.',
  },
];

const faqs = [
  {
    q: 'Is it really free for 30 days?',
    a: 'Yes. Agent plans include a 30-day trial window before billing starts.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'Your account stays accessible. Paid-only capabilities are gated until you select an active paid plan.',
  },
  {
    q: 'Can I downgrade?',
    a: 'Yes. You can change plans from billing at any time, and changes apply without deleting your data.',
  },
  {
    q: 'What happens to my listings if I downgrade?',
    a: 'Nothing is deleted. If you exceed the new plan limit, extra active listings are moved to draft.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No long lock-in. Plans are monthly and can be changed as your business needs change.',
  },
];

const heroTrustSignals = [
  'Built for agents, developers, and private sellers',
  'Live billing controls from one dashboard',
  'Month-to-month plans with no lock-in',
];

const STATIC_AGENT_FALLBACK_PLANS: PlanCatalogEntry[] = [
  {
    id: 9001,
    name: 'agent_starter_fallback',
    displayName: 'Starter',
    priceMonthly: 49900,
    trialDays: 30,
    entitlements: {
      max_active_listings: 5,
      has_ai_insights: false,
      has_area_intelligence: false,
      has_commission_tracking: false,
      has_benchmarking: false,
    },
  },
  {
    id: 9002,
    name: 'agent_pro_fallback',
    displayName: 'Pro',
    priceMonthly: 129900,
    trialDays: 30,
    entitlements: {
      max_active_listings: -1,
      has_ai_insights: false,
      has_area_intelligence: true,
      has_commission_tracking: true,
      has_benchmarking: false,
    },
  },
  {
    id: 9003,
    name: 'agent_elite_fallback',
    displayName: 'Elite',
    priceMonthly: 249900,
    trialDays: 30,
    entitlements: {
      max_active_listings: -1,
      has_ai_insights: true,
      has_area_intelligence: true,
      has_commission_tracking: true,
      has_benchmarking: true,
    },
  },
];

type PlanCatalogEntry = {
  id: number;
  name: string;
  displayName?: string | null;
  description?: string | null;
  priceMonthly?: number | null;
  trialDays?: number | null;
  entitlements?: Record<string, unknown> | null;
};

function toPlanCatalogEntries(payload: unknown): PlanCatalogEntry[] {
  if (Array.isArray(payload)) return payload as PlanCatalogEntry[];
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    if (Array.isArray(data.plans)) return data.plans as PlanCatalogEntry[];
    if (Array.isArray(data.items)) return data.items as PlanCatalogEntry[];
    if (Array.isArray(data.data)) return data.data as PlanCatalogEntry[];
  }
  return [];
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function normalizePlanName(plan: PlanCatalogEntry): string {
  return String(plan.name || plan.displayName || '')
    .trim()
    .toLowerCase();
}

function getPlanOrder(plan: PlanCatalogEntry): number {
  const normalized = normalizePlanName(plan);
  if (normalized.includes('starter')) return 0;
  if (normalized.includes('pro')) return 1;
  if (normalized.includes('elite')) return 2;
  return 99;
}

function formatPlanLabel(plan: PlanCatalogEntry): string {
  if (plan.displayName && plan.displayName.trim().length > 0) return plan.displayName;

  const normalized = normalizePlanName(plan);
  if (normalized.includes('starter')) return 'Starter';
  if (normalized.includes('pro')) return 'Pro';
  if (normalized.includes('elite')) return 'Elite';

  return String(plan.name || 'Plan')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatZarFromCents(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getEntitlementMap(plan: PlanCatalogEntry): Record<string, unknown> {
  if (plan.entitlements && typeof plan.entitlements === 'object' && !Array.isArray(plan.entitlements)) {
    return plan.entitlements;
  }
  return {};
}

function getEntitlementBoolean(plan: PlanCatalogEntry, key: string, fallbackKey?: string): boolean {
  const map = getEntitlementMap(plan);
  const raw = map[key] ?? (fallbackKey ? map[fallbackKey] : undefined);

  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw > 0;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  return false;
}

function getEntitlementNumber(
  plan: PlanCatalogEntry,
  key: string,
  fallback = -1,
  fallbackKey?: string,
): number {
  const map = getEntitlementMap(plan);
  const raw = map[key] ?? (fallbackKey ? map[fallbackKey] : undefined);

  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof raw === 'boolean') return raw ? 1 : 0;

  return fallback;
}

function getListingLimitLabel(maxActiveListings: number): string {
  return maxActiveListings < 0
    ? 'Unlimited active listings'
    : `${maxActiveListings} active listing${maxActiveListings === 1 ? '' : 's'}`;
}

function getPlanFit(plan: PlanCatalogEntry): string {
  const normalized = normalizePlanName(plan);
  if (normalized.includes('starter') || normalized.includes('essential') || normalized.includes('basic')) {
    return 'For early and part-time agents.';
  }
  if (normalized.includes('elite') || normalized.includes('ecosystem')) {
    return 'For high-volume agents focused on optimization.';
  }
  return 'For full-time agents scaling pipeline and revenue.';
}

function getPlanHighlights(plan: PlanCatalogEntry, maxActiveListings: number): string[] {
  const highlights: string[] = [
    'Microsite and lead capture workflows',
    getListingLimitLabel(maxActiveListings),
  ];

  if (getEntitlementBoolean(plan, 'has_commission_tracking', 'hasCommissionTracking')) {
    highlights.push('Commission tracking and revenue visibility');
  }
  if (getEntitlementBoolean(plan, 'has_area_intelligence', 'hasAreaIntelligence')) {
    highlights.push('Area intelligence for local pricing signals');
  }
  if (getEntitlementBoolean(plan, 'has_ai_insights', 'hasAiInsights')) {
    highlights.push('AI insights and conversion recommendations');
  }
  if (getEntitlementBoolean(plan, 'has_benchmarking', 'hasBenchmarking')) {
    highlights.push('Performance benchmarking');
  }

  return highlights.slice(0, 4);
}

function pickTopAgentPlans(plans: PlanCatalogEntry[]): PlanCatalogEntry[] {
  if (!plans.length) return [];

  const sorted = [...plans].sort((a, b) => {
    const orderDiff = getPlanOrder(a) - getPlanOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return Number(a.priceMonthly || 0) - Number(b.priceMonthly || 0);
  });

  const filtered = sorted.filter(plan => {
    const name = normalizePlanName(plan);
    return (
      name.includes('starter') ||
      name.includes('pro') ||
      name.includes('elite') ||
      name.includes('essential') ||
      name.includes('growth') ||
      name.includes('ecosystem') ||
      name.includes('basic') ||
      name.includes('premium')
    );
  });

  const source = filtered.length > 0 ? filtered : sorted;
  return source.slice(0, 3);
}

export default function AdvertiseWithUs() {
  useAdvertiseAnalytics();
  const isMobileStickyCTAVisible = useMobileStickyCTA('hero-section');

  const planCatalogQuery = trpc.subscription.getPlanCatalog.useQuery(
    { segment: 'agent' },
    {
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const isPlansLoading = planCatalogQuery.isLoading;
  const primaryCatalogPlans = React.useMemo(
    () => toPlanCatalogEntries(planCatalogQuery.data),
    [planCatalogQuery.data],
  );
  const rankedPrimaryPlans = React.useMemo(
    () => pickTopAgentPlans(primaryCatalogPlans),
    [primaryCatalogPlans],
  );
  const fallbackCatalogPlans = React.useMemo(
    () => pickTopAgentPlans(STATIC_AGENT_FALLBACK_PLANS),
    [],
  );

  const liveAgentPlans = React.useMemo(() => {
    if (rankedPrimaryPlans.length > 0) return rankedPrimaryPlans;
    if (!isPlansLoading) return fallbackCatalogPlans;
    return [];
  }, [fallbackCatalogPlans, isPlansLoading, rankedPrimaryPlans]);

  const isUsingFallbackPlans = !isPlansLoading && rankedPrimaryPlans.length === 0;

  const primaryCtaHref = '/login';
  const primaryCtaLabel = 'Start free trial';

  return (
    <>
      <SEOHead
        title="Advertise With Us | Property Marketing Ecosystem"
        description="Turn listings into predictable buyer enquiries with a premium South African property marketing ecosystem for agents, developers, and private sellers."
        canonicalUrl="https://platform.com/advertise"
        ogImage="https://platform.com/images/advertise-og-image.jpg"
        ogType="website"
      />
      <StructuredData
        pageUrl="https://platform.com/advertise"
        organizationName="Property Listify"
        organizationUrl="https://platform.com"
        organizationLogo="https://platform.com/logo.png"
      />
      <PerformanceOptimizer />
      <SkipLinks />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <span className="flex cursor-pointer items-center gap-2 text-lg font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              Property Listify
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#what-you-get" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">
              How It Works
            </a>
            <a href="#pricing-plans" className="transition-colors hover:text-slate-900">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-slate-900">
              FAQ
            </a>
          </nav>

          <Button
            asChild
            size="sm"
            className="border-0 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white hover:opacity-95"
          >
            <a href={primaryCtaHref}>{primaryCtaLabel}</a>
          </Button>
        </div>
      </header>

      <main id="main-content" className="advertise-page relative min-h-screen overflow-x-hidden bg-slate-50 pt-16 text-slate-900">
        <section id="hero-section" className="relative overflow-hidden pb-16 pt-16 md:pb-24 md:pt-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_0%_30%,rgba(37,99,235,0.14),transparent_35%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:60px_60px]" />

          <div className="container relative text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
              <span className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#2563eb,#06b6d4)]" />
              Premium Property Marketing Ecosystem
            </div>

            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn Property Listings Into{' '}
              <span className="bg-[linear-gradient(135deg,#06b6d4,#2563eb)] bg-clip-text text-transparent">
                Predictable Buyer Enquiries
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600">
              A premium property marketing ecosystem built for estate agents, developers, and private sellers who
              want more than exposure.
            </p>

            <div className="mx-auto mb-14 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 w-full border-0 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] px-8 text-base text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.55)] sm:w-auto"
              >
                <a href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>

              <Button asChild size="lg" variant="outline" className="h-12 w-full border-slate-300 bg-white px-8 text-base text-slate-700 sm:w-auto">
                <a href="#pricing-plans">
                  <Play className="mr-2 h-4 w-4" />
                  View plans
                </a>
              </Button>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_20px_45px_-18px_rgba(37,99,235,0.30)]">
                <img
                  src={advertiseHero}
                  alt="Property Listify dashboard preview"
                  className="h-[300px] w-full object-cover sm:h-[380px] lg:h-[460px]"
                />
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
              {heroTrustSignals.map(signal => (
                <span
                  key={signal}
                  className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 font-medium text-slate-700"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-24">
          <div className="container">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">The Property Portal Model Is Broken.</h2>
              <p className="text-slate-600">
                Most advertisers still pay for generic visibility while competing in crowded feeds. Buyers see more
                listings, but advertisers get less certainty.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {audienceSegments.map(segment => (
                <Card key={segment.title} className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                  <CardContent className="p-5 sm:p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">{segment.title}</h3>
                    <ul className="space-y-3">
                      {segment.pain.map(item => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="what-you-get" className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Built for you
              </div>
              <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
                More Than Exposure. Agent Operating Infrastructure.
              </h2>
              <p className="text-slate-600">
                Every tool is designed to reduce friction across seller acquisition, listing conversion, and buyer
                enquiries.
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {whatYouGetFeatures.map(feature => (
                <Card
                  key={feature.title}
                  className="feature-tile border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)] transition-shadow duration-300 hover:shadow-[0_18px_38px_-18px_rgba(37,99,235,0.28)]"
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16 md:py-24">
          <div className="container">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Simple onboarding
              </div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">How It Works</h2>
            </div>

            <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-3">
              {howItWorksSteps.map((step, index) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#06b6d4)] px-6 py-10 sm:px-8 sm:py-12 md:flex-row md:py-14">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Limited time offer
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl">Start your 30-day free trial</h2>
                <p className="max-w-xl text-sm text-blue-50">
                  Start free, then upgrade or downgrade anytime from billing. No lock-ins or hidden fees.
                </p>
              </div>

              <Button asChild size="lg" className="h-12 w-full shrink-0 border-0 bg-white px-8 text-slate-900 hover:bg-slate-100 sm:w-auto">
                <a href={primaryCtaHref}>
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section id="pricing-plans" className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Plans and pricing
              </div>
              <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">Plans &amp; Pricing</h2>
              <p className="text-slate-600">Start free for 30 days. Upgrade or downgrade anytime from billing.</p>
            </div>

            {isPlansLoading ? (
              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                {[0, 1, 2].map(index => (
                  <Card key={index} className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                    <CardContent className="space-y-4 p-6 sm:p-8">
                      <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
                      <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                      <div className="h-11 w-full animate-pulse rounded bg-slate-200" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mx-auto grid max-w-6xl items-start gap-6 md:grid-cols-3">
                {liveAgentPlans.map(plan => {
                  const normalized = normalizePlanName(plan);
                  const isRecommended = normalized.includes('pro') || normalized.includes('growth');
                  const maxActiveListings = getEntitlementNumber(
                    plan,
                    'max_active_listings',
                    -1,
                    'maxActiveListings',
                  );
                  const planPrice = Number(plan.priceMonthly || 0);
                  const highlights = getPlanHighlights(plan, maxActiveListings);

                  return (
                    <Card
                      key={plan.id}
                      className={classNames(
                        'pricing-card rounded-xl border p-0',
                        isRecommended
                          ? 'border-transparent bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white shadow-[0_25px_60px_-12px_rgba(37,99,235,0.25)] md:scale-[1.04]'
                          : 'border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]',
                      )}
                    >
                      <CardContent className="flex h-full flex-col p-6 sm:p-8">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{formatPlanLabel(plan)}</h3>
                          {isRecommended ? (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
                              Recommended
                            </span>
                          ) : null}
                        </div>

                        <p className={classNames('mb-5 text-sm', isRecommended ? 'text-blue-50' : 'text-slate-600')}>
                          {getPlanFit(plan)}
                        </p>

                        <div className="mb-6">
                          <span className="text-3xl font-extrabold">{formatZarFromCents(planPrice)}</span>
                          <span className={classNames('ml-1 text-sm', isRecommended ? 'text-blue-50' : 'text-slate-500')}>
                            /month
                          </span>
                          {(plan.trialDays || 0) > 0 ? (
                            <p
                              className={classNames(
                                'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                isRecommended ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700',
                              )}
                            >
                              First month free
                            </p>
                          ) : null}
                        </div>

                        <ul className="mb-8 flex-1 space-y-3">
                          {highlights.map(point => (
                            <li key={point} className="flex items-start gap-2 text-sm">
                              <Check className={classNames('mt-0.5 h-4 w-4 shrink-0', isRecommended ? 'text-white' : 'text-blue-700')} />
                              <span className={classNames(isRecommended ? 'text-blue-50' : 'text-slate-600')}>
                                {point}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div
                          className={classNames(
                            'mb-6 rounded-xl px-3 py-2 text-xs font-medium',
                            isRecommended ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700',
                          )}
                        >
                          Limit: {getListingLimitLabel(maxActiveListings)}
                        </div>

                        <Button
                          asChild
                          className={classNames(
                            'h-11 w-full border-0',
                            isRecommended
                              ? 'bg-white text-slate-900 hover:bg-slate-100'
                              : 'bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white',
                          )}
                        >
                          <a href={primaryCtaHref}>{primaryCtaLabel}</a>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {isUsingFallbackPlans ? (
              <p className="mx-auto mt-5 max-w-6xl text-sm text-slate-600">
                Showing preview pricing while live plan data reconnects.
              </p>
            ) : null}
          </div>
        </section>

        <section id="faq" className="bg-white py-16 md:py-24">
          <div className="container max-w-3xl">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                FAQ
              </div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
                Pricing and trial questions, answered clearly
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((item, idx) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${idx}`}
                  className="faq-accordion-item rounded-lg border border-slate-200 bg-slate-50 px-6"
                >
                  <AccordionTrigger className="text-left text-sm font-semibold text-slate-900 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-600">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_45%,#0f172a_100%)] px-6 py-14 text-center shadow-[0_30px_80px_-38px_rgba(8,47,116,0.85)] sm:px-8 sm:py-16">
              <h2 className="mx-auto mb-4 max-w-3xl text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                Serious Buyers Are Searching. Position Yourself Where It Matters.
              </h2>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 w-full border-0 bg-white px-8 text-slate-900 hover:bg-slate-100 sm:w-auto">
                  <a href={primaryCtaHref}>
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>

                <a href="#hero-section" className="text-sm font-semibold text-blue-100 transition-colors hover:text-white">
                  Back to top
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileStickyCTA
        label={primaryCtaLabel}
        href={primaryCtaHref}
        isVisible={isMobileStickyCTAVisible}
      />
    </>
  );
}
