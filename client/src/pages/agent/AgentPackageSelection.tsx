import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APP_TITLE } from '@/const';
import { apiFetch } from '@/lib/api';
import {
  formatCommercialLimitLabel,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
} from '@/lib/commercialCatalog';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';
import { cn } from '@/lib/utils';
import { ArrowRight, Briefcase, Check, Crown, Loader2, LogOut, Rocket } from 'lucide-react';
import { toast } from 'sonner';

type AgentOnboardingStatus = {
  packageSelected: boolean;
  onboardingComplete: boolean;
  onboardingStep: number;
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
};

function planIcon(index: number) {
  if (index === 0) return Briefcase;
  if (index === 1) return Rocket;
  return Crown;
}

function formatLimitValue(value: unknown) {
  if (value === -1) return 'Unlimited';
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included';
  return String(value);
}

function getProductPresentation(product: CommercialProduct) {
  const price = getCommercialPricePresentation(product);
  const action = getCommercialActionPresentation(product);
  const selectable = false;
  const benefitLines = product.benefits.length
    ? product.benefits
    : ['Benefits are configured from the canonical commercial plan.'];
  const limitLines = Object.entries(product.limits).map(
    ([key, value]) => `${formatCommercialLimitLabel(key)}: ${formatLimitValue(value)}`,
  );

  return { price, action, selectable, benefitLines, limitLines };
}

export default function AgentPackageSelection() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const catalog = useCommercialCatalog();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [, setStatus] = useState<AgentOnboardingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const agentProducts = useMemo(
    () =>
      (catalog.data?.products || []).filter(
        product => product.audience === 'agent' && product.term.kind === 'paid_launch_access',
      ),
    [catalog.data?.products],
  );
  const selectedProduct = agentProducts.find(product => product.source.planId === selectedProductId);
  const selectedPresentation = selectedProduct
    ? getProductPresentation(selectedProduct)
    : null;

  useEffect(() => {
    if (new URLSearchParams(search).get('verified') === 'true') {
      toast.success('Email verified. Choose a canonical launch product to continue.');
    }
  }, [search]);

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
          setLocation(result.dashboardUnlocked ? '/agent/dashboard' : '/agent/setup');
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : 'Could not load your onboarding status',
          );
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [loading, setLocation, user?.role]);

  useEffect(() => {
    if (selectedProductId !== null || agentProducts.length === 0) return;
    setSelectedProductId(agentProducts[0].source.planId);
  }, [agentProducts, selectedProductId]);

  if (loading || statusLoading || catalog.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
          Loading canonical agent products...
        </div>
      </div>
    );
  }

  if (catalog.isError || agentProducts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl font-semibold text-slate-950">
            Agent products are temporarily unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            No canonical agent product can be selected safely right now. Please try again later or
            contact Property Listify.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => void catalog.refetch()}>
              Retry
            </Button>
            <Button onClick={() => setLocation('/contact')}>Contact us</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7f4ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
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
          <Button variant="ghost" className="gap-2 text-slate-600" onClick={() => setLocation('/login')}>
            Exit <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-12 sm:px-8 lg:px-10 lg:pt-16">
        <section className="max-w-4xl">
          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Canonical commercial products
          </Badge>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
            Choose the product that fits your next season.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Product pricing, term, benefits, and limits below come from Property Listify&apos;s
            canonical commercial catalog. Launch Access is a paid 90-day term activated only after
            manual-EFT payment is verified.
          </p>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-3">
          {agentProducts.map((product, index) => {
            const presentation = getProductPresentation(product);
            const isSelected = selectedProductId === product.source.planId;
            const Icon = planIcon(index);

            return (
              <article
                key={product.productId}
                className={cn(
                  'relative flex flex-col rounded-[28px] border bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.06)] transition-all',
                  isSelected
                    ? 'border-slate-950 ring-2 ring-slate-950/10 -translate-y-1'
                    : 'border-slate-200',
                )}
              >
                {product.popular ? (
                  <Badge className="absolute right-6 top-6 rounded-full bg-slate-950 text-white">
                    Most popular
                  </Badge>
                ) : null}

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-950">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-serif text-[2rem] font-semibold leading-none tracking-[-0.03em] text-slate-950">
                  {product.displayName}
                </h2>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                  {product.description || 'A canonical Property Listify agent product.'}
                </p>

                <div className="mt-7 rounded-[20px] bg-slate-950 px-5 py-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    Current catalog price
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-mono text-4xl font-medium tracking-[-0.05em]">
                      {presentation.price.label}
                    </span>
                    {presentation.price.period ? (
                      <span className="pb-1 text-sm text-white/65">{presentation.price.period}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/65">
                    Paid Launch Access · {product.term.durationDays || 90} days · no automatic renewal.
                  </p>
                </div>

                <ul className="mt-5 flex-1 space-y-3">
                  {[...presentation.benefitLines, ...presentation.limitLines].map(line => (
                    <li key={line} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() =>
                      presentation.action.href
                        ? setLocation(presentation.action.href)
                        : setLocation('/contact')
                    }
                  >
                    {presentation.action.label}
                  </Button>
                  {!presentation.selectable && presentation.action.href ? (
                    <a
                      className="text-center text-xs font-semibold text-slate-600 underline underline-offset-4"
                      href={presentation.action.href}
                    >
                      {presentation.action.label}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-[32px] bg-slate-950 px-7 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Selected product
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {selectedProduct?.displayName || 'Select a Launch Access product'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Request an invoice to begin the assisted manual-EFT flow. The 90-day entitlement
                starts only after finance verifies payment; profile and publication rules remain
                separate from commercial entitlement.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:min-w-[290px] lg:items-end">
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 lg:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {selectedPresentation?.price.period ? 'Catalog price' : 'Commercial action'}
                </p>
                <p className="mt-2 font-mono text-3xl font-medium tracking-[-0.05em]">
                  {selectedPresentation?.price.label || 'Unavailable'}
                </p>
              </div>
              <Button
                size="lg"
                className="h-12 rounded-2xl bg-white px-6 text-slate-950 hover:bg-white/90"
                onClick={() =>
                  selectedPresentation?.action.href
                    ? setLocation(selectedPresentation.action.href)
                    : setLocation('/contact')
                }
              >
                Request invoice <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs leading-5 text-white/40 lg:text-right">
                Paid activation remains assisted and requires verified commercial state.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
