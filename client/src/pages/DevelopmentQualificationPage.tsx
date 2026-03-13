import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { MetaControl } from '@/components/seo/MetaControl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { calculateMonthlyRepayment, formatSARandShort, SA_PRIME_RATE } from '@/lib/bond-calculator';
import { formatPriceCompact } from '@/lib/formatPrice';
import { trackCTAClick, trackFunnelStep } from '@/lib/analytics/advertiseTracking';

const DEFAULT_BOND_TERM_YEARS = 20;

const parseNumberInput = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateAffordableLoanAmount = (
  monthlyBudget: number,
  annualInterestRate: number,
  termYears: number,
) => {
  if (monthlyBudget <= 0 || termYears <= 0) return 0;
  if (annualInterestRate <= 0) return monthlyBudget * termYears * 12;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, numberOfPayments);

  return Math.round((monthlyBudget * (factor - 1)) / (monthlyRate * factor));
};

export default function DevelopmentQualificationPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const initialIncome =
    typeof window !== 'undefined'
      ? parseNumberInput(new URLSearchParams(window.location.search).get('income') || '')
      : 0;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [financials, setFinancials] = useState({
    monthlyIncome: initialIncome > 0 ? `${initialIncome}` : '',
    coApplicantIncome: '',
    monthlyExpenses: '',
    monthlyDebts: '',
    availableDeposit: '',
  });
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const { data: dev, isLoading } = trpc.developer.getPublicDevelopmentBySlug.useQuery(
    { slugOrId: slug || '' },
    { enabled: !!slug },
  );

  useEffect(() => {
    if (!dev) return;
    trackFunnelStep({
      funnel: 'development_qualification',
      step: 'qualification_page',
      action: 'view',
      path: dev.slug || slug,
    });
  }, [dev, slug]);

  const createLead = trpc.developer.createLead.useMutation({
    onSuccess: () => {
      trackFunnelStep({
        funnel: 'development_qualification',
        step: 'submit',
        action: 'lead_submitted',
        path: dev?.slug || slug,
      });
      setSubmitted(true);
      toast.success('Qualification submitted to the sales team.');
    },
    onError: error => {
      toast.error(error.message || 'Unable to submit qualification.');
    },
  });

  const developmentPricing = useMemo(() => {
    const unitTypes = Array.isArray(dev?.unitTypes) ? dev.unitTypes : [];
    const prices = unitTypes
      .flatMap((unit: any) => [Number(unit.basePriceFrom || 0), Number(unit.basePriceTo || 0)])
      .filter((value: number) => Number.isFinite(value) && value > 0);

    const minPrice =
      (prices.length > 0 ? Math.min(...prices) : 0) || Number(dev?.priceFrom || 0) || 0;
    const maxPrice =
      (prices.length > 0 ? Math.max(...prices) : 0) || Number(dev?.priceTo || 0) || minPrice;

    return {
      minPrice,
      maxPrice: maxPrice > minPrice ? maxPrice : undefined,
    };
  }, [dev?.priceFrom, dev?.priceTo, dev?.unitTypes]);

  const monthlyIncome = parseNumberInput(financials.monthlyIncome);
  const coApplicantIncome = parseNumberInput(financials.coApplicantIncome);
  const monthlyExpenses = parseNumberInput(financials.monthlyExpenses);
  const monthlyDebts = parseNumberInput(financials.monthlyDebts);
  const availableDeposit = parseNumberInput(financials.availableDeposit);
  const totalIncome = monthlyIncome + coApplicantIncome;

  const baseRepaymentBudget = totalIncome / 3;
  const monthlyCommitments = monthlyExpenses + monthlyDebts;
  const commitmentRatio = totalIncome > 0 ? Math.min(monthlyCommitments / totalIncome, 0.7) : 0;
  const adjustedRepaymentBudget = Math.max(baseRepaymentBudget * (1 - commitmentRatio * 0.7), 0);
  const affordableLoan = calculateAffordableLoanAmount(
    adjustedRepaymentBudget,
    SA_PRIME_RATE,
    DEFAULT_BOND_TERM_YEARS,
  );
  const maxAffordable = Math.max(affordableLoan + availableDeposit, 0);
  const comfortFloor = Math.max(Math.round(maxAffordable * 0.82), 0);
  const targetPrice = developmentPricing.minPrice;
  const depositGap = Math.max(targetPrice - maxAffordable, 0);
  const estimatedTargetRepayment = calculateMonthlyRepayment(
    Math.max(targetPrice - availableDeposit, 0),
    SA_PRIME_RATE,
    DEFAULT_BOND_TERM_YEARS,
  );
  const qualifies = maxAffordable >= targetPrice;
  const closeFit = !qualifies && maxAffordable >= targetPrice * 0.9;

  const resultTone = qualifies ? 'success' : closeFit ? 'warning' : 'muted';
  const resultCopy = qualifies
    ? {
        title: `You likely qualify for ${dev?.name || 'this development'}`,
        body: `Estimated buying power is up to ${formatSARandShort(maxAffordable)}. Homes in this development start from ${formatSARandShort(targetPrice)}.`,
      }
    : closeFit
      ? {
          title: 'You are close to qualifying',
          body: `You may need a stronger deposit or lower commitments. You are currently about ${formatSARandShort(depositGap)} short of the entry price.`,
        }
      : {
          title: 'This development may be above your current range',
          body: `Estimated buying power is around ${formatSARandShort(maxAffordable)}. Submit your details and the sales team can help with next-best options.`,
        };

  const canContinueStep1 = monthlyIncome > 0;
  const canContinueStep2 = totalIncome > 0;
  const canSubmit =
    contact.name.trim().length >= 2 &&
    contact.email.trim().length > 3 &&
    contact.phone.trim().length >= 7 &&
    totalIncome > 0;

  const handleSubmit = () => {
    if (!dev || !canSubmit) {
      toast.error('Complete the required details before submitting.');
      return;
    }

    trackCTAClick({
      ctaLabel: 'Submit Qualification',
      ctaLocation: 'development_qualification_result',
      ctaHref: typeof window !== 'undefined' ? window.location.href : '',
    });
    trackFunnelStep({
      funnel: 'development_qualification',
      step: 'submit',
      action: 'attempt',
      path: dev.slug || slug,
    });

    const qualificationSummary = [
      `Development: ${dev.name}`,
      `Estimated affordability range: ${formatSARandShort(comfortFloor)} - ${formatSARandShort(maxAffordable)}`,
      `Monthly income: ${formatSARandShort(monthlyIncome)}`,
      coApplicantIncome > 0 ? `Co-applicant income: ${formatSARandShort(coApplicantIncome)}` : null,
      monthlyExpenses > 0 ? `Monthly expenses: ${formatSARandShort(monthlyExpenses)}` : null,
      monthlyDebts > 0 ? `Monthly debts: ${formatSARandShort(monthlyDebts)}` : null,
      availableDeposit > 0 ? `Available deposit: ${formatSARandShort(availableDeposit)}` : null,
      `Result: ${qualifies ? 'Likely qualifies' : closeFit ? 'Near qualification' : 'Out of range'}`,
    ]
      .filter(Boolean)
      .join('\n');

    createLead.mutate({
      developmentId: dev.id,
      developerBrandProfileId: (dev as any).developerBrandProfileId ?? undefined,
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      message: qualificationSummary,
      leadSource: 'development_full_qualification',
      referrerUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      affordabilityData: {
        monthlyIncome: totalIncome,
        monthlyExpenses,
        monthlyDebts,
        availableDeposit,
        maxAffordable,
        calculatedAt: new Date().toISOString(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dev) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 pb-16 pt-28">
          <Card className="mx-auto max-w-2xl border-slate-200">
            <CardContent className="p-10 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Development not found</h1>
              <p className="mt-2 text-slate-600">
                The development linked to this qualification flow is unavailable.
              </p>
              <Button className="mt-6" onClick={() => setLocation('/')}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const priceLabel = developmentPricing.maxPrice
    ? `${formatPriceCompact(developmentPricing.minPrice)} - ${formatPriceCompact(developmentPricing.maxPrice)}`
    : formatPriceCompact(developmentPricing.minPrice);
  const progressValue = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <>
      <MetaControl
        title={`Qualify For ${dev.name}`}
        description={`Check affordability and submit a qualification request for ${dev.name}.`}
      />

      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />

        <div className="container mx-auto max-w-6xl px-4 pb-16 pt-24">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: dev.name, href: `/development/${dev.slug || slug}` },
              { label: 'Qualification', href: `/development/${dev.slug || slug}/qualification` },
            ]}
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_360px]">
            <main className="space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-slate-950 px-6 py-8 text-white">
                    <button
                      type="button"
                      onClick={() => setLocation(`/development/${dev.slug || slug}`)}
                      className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to development
                    </button>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Badge className="border border-white/10 bg-white/10 text-white hover:bg-white/10">
                        Full Qualification
                      </Badge>
                      <Badge className="border border-orange-300/20 bg-orange-400/10 text-orange-100 hover:bg-orange-400/10">
                        {priceLabel}
                      </Badge>
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                      Check whether {dev.name} fits your budget
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                      Complete a few affordability inputs, review your estimated range, then send a
                      stronger lead to the sales team.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 px-6 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Step {step} of 3
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {step === 1
                            ? 'Household income'
                            : step === 2
                              ? 'Monthly commitments'
                              : 'Result and lead submission'}
                        </p>
                      </div>
                      <div className="w-40">
                        <Progress value={progressValue} indicatorClassName="bg-orange-500" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {submitted ? (
                <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-900">
                          Qualification sent successfully
                        </h2>
                        <p className="text-slate-700">
                          The sales team now has your affordability snapshot and contact details for{' '}
                          {dev.name}.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button onClick={() => setLocation(`/development/${dev.slug || slug}`)}>
                            Return to Development
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSubmitted(false);
                              setStep(1);
                            }}
                          >
                            Start Another Check
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {step === 1 && (
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle>Household Income</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="monthlyIncome">Primary monthly income</Label>
                            <Input
                              id="monthlyIncome"
                              inputMode="numeric"
                              placeholder="e.g. 45 000"
                              value={financials.monthlyIncome}
                              onChange={e =>
                                setFinancials(prev => ({ ...prev, monthlyIncome: e.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="coApplicantIncome">Co-applicant monthly income</Label>
                            <Input
                              id="coApplicantIncome"
                              inputMode="numeric"
                              placeholder="Optional"
                              value={financials.coApplicantIncome}
                              onChange={e =>
                                setFinancials(prev => ({
                                  ...prev,
                                  coApplicantIncome: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-700">
                            This check starts with income so we can estimate whether homes from{' '}
                            {formatSARandShort(targetPrice)} are in range.
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            disabled={!canContinueStep1}
                            onClick={() => {
                              trackFunnelStep({
                                funnel: 'development_qualification',
                                step: 'income',
                                action: 'continue',
                                path: dev.slug || slug,
                              });
                              setStep(2);
                            }}
                          >
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {step === 2 && (
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle>Monthly Commitments</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="monthlyExpenses">Monthly living expenses</Label>
                            <Input
                              id="monthlyExpenses"
                              inputMode="numeric"
                              placeholder="e.g. 18 000"
                              value={financials.monthlyExpenses}
                              onChange={e =>
                                setFinancials(prev => ({
                                  ...prev,
                                  monthlyExpenses: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="monthlyDebts">Monthly debt repayments</Label>
                            <Input
                              id="monthlyDebts"
                              inputMode="numeric"
                              placeholder="e.g. 4 500"
                              value={financials.monthlyDebts}
                              onChange={e =>
                                setFinancials(prev => ({ ...prev, monthlyDebts: e.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="availableDeposit">Available deposit</Label>
                            <Input
                              id="availableDeposit"
                              inputMode="numeric"
                              placeholder="e.g. 150 000"
                              value={financials.availableDeposit}
                              onChange={e =>
                                setFinancials(prev => ({
                                  ...prev,
                                  availableDeposit: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <Badge variant="outline" className="border-slate-300 text-slate-700">
                            Accuracy pass
                          </Badge>
                          <p className="text-sm text-slate-600">
                            Adding expenses, debts, and deposit improves the affordability estimate
                            before you submit.
                          </p>
                        </div>

                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setStep(1)}>
                            Back
                          </Button>
                          <Button
                            disabled={!canContinueStep2}
                            onClick={() => {
                              trackFunnelStep({
                                funnel: 'development_qualification',
                                step: 'commitments',
                                action: 'continue',
                                path: dev.slug || slug,
                              });
                              setStep(3);
                            }}
                          >
                            See Result
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {step === 3 && (
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle>Qualification Result</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div
                          className={`rounded-2xl border p-5 ${
                            resultTone === 'success'
                              ? 'border-emerald-200 bg-emerald-50'
                              : resultTone === 'warning'
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-full p-2 ${
                                resultTone === 'success'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : resultTone === 'warning'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              <BadgeCheck className="h-5 w-5" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-slate-900">
                                {resultCopy.title}
                              </h3>
                              <p className="text-slate-700">{resultCopy.body}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <TrendingUp className="h-4 w-4 text-orange-600" />
                              Buying Power
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {formatSARandShort(maxAffordable)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Estimated upper affordability
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Calculator className="h-4 w-4 text-blue-600" />
                              Repayment
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {formatSARandShort(estimatedTargetRepayment)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Estimated monthly payment at the entry price
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Wallet className="h-4 w-4 text-emerald-600" />
                              Deposit
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {formatSARandShort(availableDeposit)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Deposit considered in this estimate
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="contactName">Full name</Label>
                            <Input
                              id="contactName"
                              value={contact.name}
                              onChange={e =>
                                setContact(prev => ({ ...prev, name: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contactEmail">Email address</Label>
                            <Input
                              id="contactEmail"
                              type="email"
                              value={contact.email}
                              onChange={e =>
                                setContact(prev => ({ ...prev, email: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="contactPhone">Phone number</Label>
                            <Input
                              id="contactPhone"
                              type="tel"
                              value={contact.phone}
                              onChange={e =>
                                setContact(prev => ({ ...prev, phone: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setStep(2)}>
                            Back
                          </Button>
                          <Button
                            disabled={!canSubmit || createLead.isPending}
                            onClick={handleSubmit}
                          >
                            {createLead.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting
                              </>
                            ) : (
                              <>
                                Submit Qualification
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </main>

            <aside className="space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{dev.name}</h2>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      Homes from{' '}
                      <span className="font-semibold text-slate-900">
                        {formatSARandShort(targetPrice)}
                      </span>
                    </p>
                    {developmentPricing.maxPrice && (
                      <p>
                        Range up to{' '}
                        <span className="font-semibold text-slate-900">
                          {formatSARandShort(developmentPricing.maxPrice)}
                        </span>
                      </p>
                    )}
                    <p>
                      Developer:{' '}
                      <span className="font-semibold text-slate-900">
                        {dev.publisher?.name || dev.developer?.name || 'Developer'}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-base font-bold text-slate-900">How this works</h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                        1
                      </span>
                      Add income and commitments.
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                        2
                      </span>
                      Review your estimated affordability for this development.
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                        3
                      </span>
                      Submit a stronger lead with your affordability context attached.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-base font-bold text-slate-900">Included with this check</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Development-specific affordability estimate
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-orange-500" />
                      Direct handoff to the sales team
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      Follow-up for next steps and availability
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
