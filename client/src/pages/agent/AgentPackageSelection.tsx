import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useSearch } from 'wouter';
import type { inferRouterOutputs } from '@trpc/server';
import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_TITLE } from '@/const';
import { apiFetch } from '@/lib/api';
import { trpc } from '@/lib/trpc';
import type { AppRouter } from '../../../../server/routers';
import {
  formatCommercialLimitLabel,
  formatCommercialLimitValue,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
  getCommercialPresentationLimits,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  ArrowRight,
  Briefcase,
  Check,
  Clock3,
  ExternalLink,
  LogOut,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AgentBillingWorkspace = RouterOutputs['billing']['agentWorkspace'];
type AgentInvoice = NonNullable<AgentBillingWorkspace['activeInvoice']>;
type AgentBankDetails = AgentBillingWorkspace['bankDetails'];
type AgentProofStorage = AgentBillingWorkspace['proofStorage'];

type AgentInvoiceResponse = {
  invoice: AgentInvoice;
  bankDetails: AgentBankDetails;
  paymentReference: string;
  reused: boolean;
  ownerType: string;
  ownerId: number;
};

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

function formatLimitValue(value: unknown) {
  return formatCommercialLimitValue(value);
}

function ProductDetails({ product }: { product: CommercialProduct }) {
  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  const limits = getCommercialPresentationLimits(product);

  return (
    <div className="rounded-[28px] border border-blue-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-9">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Canonical commercial product
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            {product.displayName}
          </h2>
        </div>
        <ShieldCheck className="h-6 w-6 text-blue-600" aria-hidden="true" />
      </div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Once-off</p>
          <p className="mt-2 font-mono text-5xl font-semibold tracking-[-0.06em] text-slate-950">
            {price.label}
          </p>
          {price.period ? (
            <p className="mt-1 text-sm font-semibold text-slate-500">{price.period.trim()}</p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold text-slate-500">Access period</p>
          <p className="mt-1 text-xl font-extrabold text-blue-700">{term.label}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {product.benefits.map(benefit => (
          <div key={benefit} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <Check className="mt-1 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            {benefit}
          </div>
        ))}
        {limits.map(([key, value]) => (
          <div key={key} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <Check className="mt-1 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            {formatCommercialLimitLabel(key)}: {formatLimitValue(value)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivationSteps() {
  const steps = [
    'Request the canonical invoice',
    'Pay by manual EFT',
    'Submit payment proof',
    'Finance verifies and activates access',
  ];

  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li
          key={step}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 font-mono text-xs font-bold text-white">
            {index + 1}
          </span>
          <span className="pt-1 text-sm font-semibold leading-5 text-slate-700">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Could not read proof document.'));
    reader.readAsDataURL(file);
  });
}

function formatInvoiceAmount(amountMinor: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountMinor || 0) / 100);
}

function AgentManualEftPanel({
  invoice,
  bankDetails,
  proofStorage,
  paymentAmount,
  setPaymentAmount,
  bankReference,
  setBankReference,
  payerName,
  setPayerName,
  paymentDate,
  setPaymentDate,
  setProofFile,
  onSubmit,
  isSubmitting,
}: {
  invoice: AgentInvoice;
  bankDetails?: AgentBankDetails;
  proofStorage?: AgentProofStorage;
  paymentAmount: string;
  setPaymentAmount: Dispatch<SetStateAction<string>>;
  bankReference: string;
  setBankReference: Dispatch<SetStateAction<string>>;
  payerName: string;
  setPayerName: Dispatch<SetStateAction<string>>;
  paymentDate: string;
  setPaymentDate: Dispatch<SetStateAction<string>>;
  setProofFile: Dispatch<SetStateAction<File | null>>;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const proofCanBeSubmitted = ['issued', 'partially_paid', 'overdue'].includes(invoice.status);

  return (
    <Card className="mt-6 border-blue-200 bg-blue-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UploadCloud className="h-5 w-5 text-blue-600" />
          Agent Launch Access invoice
        </CardTitle>
        <CardDescription>
          {invoice.invoiceNumber} · {formatInvoiceAmount(invoice.amountDue)} once-off for 90 days.
          Access starts only after finance verifies the EFT payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-blue-200 bg-white p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-slate-500">Amount due</p>
            <p className="font-semibold text-slate-900">{formatInvoiceAmount(invoice.amountDue)}</p>
          </div>
          <div>
            <p className="text-slate-500">Payment reference</p>
            <p className="font-semibold text-slate-900">{invoice.paymentReference}</p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <Badge variant="outline" className="mt-1">
              {invoice.status === 'submitted' ? 'Proof under review' : invoice.status}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Manual EFT instructions</p>
          <dl className="mt-2 grid gap-1 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Account</dt>
              <dd className="font-medium text-slate-900">
                {bankDetails?.accountName || 'Account details unavailable'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Bank</dt>
              <dd className="font-medium text-slate-900">
                {bankDetails?.bankName || 'Bank details unavailable'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Account number</dt>
              <dd className="font-medium text-slate-900">
                {bankDetails?.accountNumber || 'Account number unavailable'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Branch</dt>
              <dd className="font-medium text-slate-900">
                {bankDetails?.branchCode || 'Branch unavailable'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Use the invoice payment reference above.{' '}
            {bankDetails?.configurationMessage ||
              'Finance verification is required before the 90-day term starts.'}
          </p>
        </div>

        {proofCanBeSubmitted ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="agent-payment-amount">Amount paid</Label>
              <Input
                id="agent-payment-amount"
                inputMode="decimal"
                value={paymentAmount}
                onChange={event => setPaymentAmount(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="agent-payment-date">Payment date</Label>
              <Input
                id="agent-payment-date"
                type="date"
                value={paymentDate}
                onChange={event => setPaymentDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="agent-bank-reference">Bank reference</Label>
              <Input
                id="agent-bank-reference"
                value={bankReference}
                onChange={event => setBankReference(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="agent-payer-name">Payer name</Label>
              <Input
                id="agent-payer-name"
                value={payerName}
                onChange={event => setPayerName(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="agent-proof-file">Proof of payment</Label>
              <Input
                id="agent-proof-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={event => setProofFile(event.target.files?.[0] || null)}
              />
            </div>
            <Button
              className="md:col-span-2"
              disabled={isSubmitting || proofStorage?.configured === false}
              onClick={onSubmit}
            >
              {isSubmitting ? 'Submitting proof…' : 'Submit proof for review'}
              <UploadCloud className="ml-2 h-4 w-4" />
            </Button>
            {proofStorage?.configured === false && (
              <p className="md:col-span-2 text-xs text-amber-700">
                Proof upload is not available until private billing storage is configured.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium text-blue-800">
            This invoice is already under review. Finance verification is required before the 90-day
            Launch Access term can activate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentPackageSelection() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const catalog = useCommercialCatalog('agent');
  const workspaceQuery = trpc.billing.agentWorkspace.useQuery(undefined, {
    enabled: user?.role === 'agent',
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });
  const submitProof = trpc.billing.submitLaunchAccessPaymentProof.useMutation();
  const [, setStatus] = useState<AgentOnboardingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [invoiceResponse, setInvoiceResponse] = useState<AgentInvoiceResponse | null>(null);
  const [isRequestingInvoice, setIsRequestingInvoice] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState<File | null>(null);

  const agentProducts = useMemo(
    () =>
      (catalog.data?.products || []).filter(
        product => product.audience === 'agent' && product.term.kind === 'paid_launch_access',
      ),
    [catalog.data?.products],
  );
  const launchProduct =
    agentProducts.find(product => product.productKey === 'agent_launch_access') ?? agentProducts[0];

  useEffect(() => {
    if (new URLSearchParams(search).get('verified') === 'true') {
      toast.success(
        'Email verified. Review your canonical Agent Launch Access product to continue.',
      );
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
        if (result.packageSelected && result.subscriptionStatus === 'active') {
          setLocation(result.dashboardUnlocked ? '/agent/dashboard' : '/agent/setup');
          return;
        }
        // A waiting payer has nothing left to do on this page; the dashboard
        // status strip carries the verification state until finance decides.
        if (
          result.packageSelected &&
          result.subscriptionStatus === 'payment_under_review'
        ) {
          setLocation('/agent/dashboard');
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

  const activeInvoice = invoiceResponse?.invoice ?? workspaceQuery.data?.activeInvoice ?? null;
  const bankDetails = invoiceResponse?.bankDetails ?? workspaceQuery.data?.bankDetails;
  const proofStorage = workspaceQuery.data?.proofStorage;

  useEffect(() => {
    if (activeInvoice && !paymentAmount) {
      setPaymentAmount((Number(activeInvoice.amountDue || 0) / 100).toFixed(2));
    }
  }, [activeInvoice, paymentAmount]);

  if (loading || statusLoading || catalog.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          <Clock3 className="h-4 w-4 animate-pulse text-[var(--primary)]" aria-hidden="true" />
          Loading your canonical Agent Launch Access...
        </div>
      </div>
    );
  }

  if (catalog.isError || !launchProduct) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl font-semibold text-slate-950">
            Agent Launch Access is temporarily unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            No canonical Agent product can be selected safely right now. Please try again later or
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

  const action = getCommercialActionPresentation(launchProduct);

  const handleRequestInvoice = async () => {
    const planId = launchProduct.source?.planId;
    if (!planId) {
      toast.error('The canonical Agent Launch Access product is not requestable right now.');
      return;
    }

    setIsRequestingInvoice(true);
    try {
      const result = await apiFetch<AgentInvoiceResponse>('/agent/request-launch-access-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      setInvoiceResponse(result);
      setPaymentAmount((Number(result.invoice.amountDue || 0) / 100).toFixed(2));
      await workspaceQuery.refetch();
      toast.success(
        result.reused ? 'Your existing Agent invoice is ready.' : 'Agent invoice ready.',
        {
          description: 'Pay by manual EFT and submit proof for finance verification.',
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request the Agent invoice');
    } finally {
      setIsRequestingInvoice(false);
    }
  };

  const handleProofSubmit = async () => {
    if (!activeInvoice) {
      toast.error('Request an invoice before submitting payment proof.');
      return;
    }
    if (!proofFile) {
      toast.error('Attach proof of payment.');
      return;
    }

    const amountRand = Number(paymentAmount);
    if (!Number.isFinite(amountRand) || amountRand <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }

    try {
      const contentBase64 = await fileToBase64(proofFile);
      await submitProof.mutateAsync({
        invoiceId: activeInvoice.id,
        amount: Math.round(amountRand * 100),
        bankReference,
        payerName,
        paymentDate,
        file: {
          filename: proofFile.name,
          mimeType: proofFile.type || 'application/octet-stream',
          sizeBytes: proofFile.size,
          contentBase64,
        },
      });
      await workspaceQuery.refetch();
      setInvoiceResponse(null);
      setProofFile(null);
      setBankReference('');
      toast.success('Payment proof submitted for finance review.');
      setLocation('/agent/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment proof could not be submitted.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7f9fc]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold tracking-[-0.02em] text-slate-950">
                {APP_TITLE}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Agent commercial step
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="gap-2 text-slate-600"
            onClick={() => setLocation('/login')}
          >
            Exit <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 pb-20 pt-12 sm:px-8 lg:px-10 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-20">
          <section>
            <Badge className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Account-specific commercial step
            </Badge>
            <h1 className="mt-6 max-w-2xl font-serif text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              You selected Agent Launch Access.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              The public Agent page explains the product. This step confirms the canonical product
              and takes you into the assisted invoice and activation process.
            </p>
            <a
              href="/advertise/sell/agents"
              className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-950"
            >
              Review the public Agent product page{' '}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </section>

          <section>
            <ProductDetails product={launchProduct} />
            <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Activation path
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-950">
                    What happens next
                  </h2>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div className="mt-6">
                <ActivationSteps />
              </div>
              <div className="mt-6 rounded-2xl bg-slate-950 px-5 py-4 text-sm leading-6 text-white">
                Requesting an invoice, receiving an invoice or uploading payment proof does not
                activate access. Finance verification starts the fixed 90-day term.
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 flex-1 rounded-2xl"
                  disabled={isRequestingInvoice}
                  onClick={() => void handleRequestInvoice()}
                >
                  {isRequestingInvoice
                    ? 'Preparing invoice…'
                    : activeInvoice
                      ? 'Refresh invoice'
                      : action.label}{' '}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl"
                  onClick={() => setLocation('/contact')}
                >
                  Talk to Property Listify
                </Button>
              </div>
              {activeInvoice ? (
                <AgentManualEftPanel
                  invoice={activeInvoice}
                  bankDetails={bankDetails}
                  proofStorage={proofStorage}
                  paymentAmount={paymentAmount}
                  setPaymentAmount={setPaymentAmount}
                  bankReference={bankReference}
                  setBankReference={setBankReference}
                  payerName={payerName}
                  setPayerName={setPayerName}
                  paymentDate={paymentDate}
                  setPaymentDate={setPaymentDate}
                  setProofFile={setProofFile}
                  onSubmit={() => void handleProofSubmit()}
                  isSubmitting={submitProof.isPending}
                />
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-16 border-t border-slate-200 pt-10">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Term</p>
              <p className="mt-2 text-base font-bold text-slate-950">Fixed 90-day Launch Access</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The period begins at verified payment activation.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Payment
              </p>
              <p className="mt-2 text-base font-bold text-slate-950">Manual EFT</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Finance review remains the commercial activation authority.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Renewal
              </p>
              <p className="mt-2 text-base font-bold text-slate-950">No automatic renewal</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A future normal Agent product is required after Launch Access expires.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
