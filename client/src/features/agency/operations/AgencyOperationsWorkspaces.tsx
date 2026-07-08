import {
  ArrowRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clipboard,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  HelpCircle,
  Landmark,
  Receipt,
  Settings,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { WORKSPACE_TITLES } from '../workspace/constants';
import { SectionTitle } from '../workspace/WorkspacePrimitives';
import { AttentionPanel } from '../workspace/WorkspacePanels';
import type { Tone, WorkspaceContentProps } from '../workspace/types';
import { numberLabel, toneClasses } from '../workspace/utils';

export function AgencyAttentionWorkspace(props: WorkspaceContentProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <AttentionPanel
        items={props.attentionItems}
        onNavigate={props.onNavigate}
        isLoading={props.isLoading.leads}
      />
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={Gauge} title="Queue Composition" eyebrow="Operational split" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'New leads', value: props.leadSignals.newLeadCount, tone: 'rose' as Tone },
            { label: 'Unassigned', value: props.leadSignals.unassignedCount, tone: 'amber' as Tone },
            {
              label: 'Overdue follow-ups',
              value: props.leadSignals.contactedFollowUpCount,
              tone: 'sky' as Tone,
            },
            { label: 'Pending listings', value: props.stats.pendingListings, tone: 'teal' as Tone },
          ].map(item => {
            const classes = toneClasses(item.tone);
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className="text-slate-500">{numberLabel(item.value)}</span>
                </div>
                <Progress
                  value={Math.min(100, item.value * 20)}
                  indicatorClassName={classes.progress}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}

export function AgencyComplianceWorkspace(props: WorkspaceContentProps) {
  const accessQuery = trpc.agency.getAccessState.useQuery();
  const access = accessQuery.data;
  const checks = [
    {
      label: 'Profile configured',
      done: Boolean(access?.onboardingComplete || props.setupComplete),
      detail: access?.onboardingComplete ? 'Configured' : 'Pending',
    },
    {
      label: 'Billing active',
      done: access?.billingStatus === 'active',
      detail: access?.actionableReason || 'Canonical billing state unavailable',
    },
    {
      label: 'Team ready',
      done: props.stats.totalAgents > 0,
      detail: `${numberLabel(props.stats.totalAgents)} active team members`,
    },
  ];

  return (
    <section className="grid gap-5 md:grid-cols-3">
      {checks.map(item => (
        <Card key={item.label} className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-950">{item.label}</p>
              <Badge className={item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {item.done ? 'Ready' : 'Needs action'}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function AgencyBillingWorkspace(_props: WorkspaceContentProps) {
  const utils = trpc.useUtils();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState<File | null>(null);

  const billingStateQuery = trpc.agency.getBillingState.useQuery();
  const workspaceQuery = trpc.billing.workspace.useQuery();
  const startCheckout = trpc.billing.startManualEftCheckout.useMutation({
    onSuccess: async data => {
      await refreshBilling(utils);
      setSelectedInvoiceId(data.invoice.id);
      setPaymentAmount(String(Number(data.invoice.amountDue || 0) / 100));
      toast.success('Invoice issued', {
        description: `${data.invoice.invoiceNumber} is ready for EFT payment.`,
      });
    },
    onError: error => toast.error(error.message || 'Invoice could not be issued'),
  });
  const submitProof = trpc.billing.submitPaymentProof.useMutation({
    onSuccess: async () => {
      await refreshBilling(utils);
      setProofFile(null);
      setBankReference('');
      toast.success('Proof submitted for review');
    },
    onError: error => toast.error(error.message || 'Proof could not be submitted'),
  });
  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: async () => {
      await refreshBilling(utils);
      toast.success('Subscription cancellation scheduled');
    },
    onError: error => toast.error(error.message || 'Subscription could not be cancelled'),
  });
  const reactivateSubscription = trpc.billing.reactivateSubscription.useMutation({
    onSuccess: async () => {
      await refreshBilling(utils);
      toast.success('Subscription reactivated');
    },
    onError: error => toast.error(error.message || 'Subscription could not be reactivated'),
  });

  const billingState = billingStateQuery.data;
  const workspace = workspaceQuery.data;
  const access = billingState?.accessState;
  const currentPlan = workspace?.currentPlan || billingState?.canonicalSubscription?.plan || null;
  const subscription = workspace?.subscription || billingState?.canonicalSubscription?.subscription || null;
  const currentStatus = access?.billingStatus || 'unavailable';
  const invoices = workspace?.invoices || [];
  const payments = workspace?.payments || [];
  const bankDetails = workspace?.bankDetails;
  const eftCanIssueInvoices = Boolean(bankDetails?.canIssueInvoices);
  const proofStorageReady = Boolean(workspace?.proofStorage?.configured);
  const activeInvoice =
    (selectedInvoiceId ? invoices.find((invoice: any) => invoice.id === selectedInvoiceId) : null) ||
    workspace?.activeInvoice ||
    invoices.find((invoice: any) => ['issued', 'submitted', 'partially_paid', 'overdue'].includes(invoice.status)) ||
    null;
  const capabilityLabels = [
    { key: 'listings', label: 'Listing workspace' },
    { key: 'publishing', label: 'Publication controls' },
    { key: 'teamManagement', label: 'Team management' },
    { key: 'reporting', label: 'Reporting' },
  ];
  const includedCapabilities = capabilityLabels.filter(
    capability => Boolean((access?.workspaceAccess as any)?.[capability.key]),
  );
  const blockedCapabilities = capabilityLabels.filter(
    capability => !(access?.workspaceAccess as any)?.[capability.key],
  );
  const nextBillingAction =
    currentStatus === 'active'
      ? 'No billing action required.'
      : currentStatus === 'unavailable'
        ? 'Run migrations or contact support before trusting billing gates.'
        : currentStatus === 'not_started'
          ? 'Select an available agency plan.'
          : access?.actionableReason || 'Review subscription status.';

  const handleCopy = async (value?: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  const handleProofSubmit = async () => {
    if (!activeInvoice) {
      toast.error('Select an invoice first');
      return;
    }
    if (!proofFile) {
      toast.error('Attach proof of payment');
      return;
    }
    if (!proofStorageReady) {
      toast.error(workspace?.proofStorage?.message || 'Private proof storage is not configured');
      return;
    }
    const amountRand = Number(paymentAmount);
    if (!Number.isFinite(amountRand) || amountRand <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    const contentBase64 = await fileToBase64(proofFile);
    submitProof.mutate({
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
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={CreditCard} title="Billing" eyebrow="Canonical access state" />
          </CardHeader>
          <CardContent>
            {billingStateQuery.isLoading || workspaceQuery.isLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Current plan</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-950">
                      {currentPlan?.displayName || currentPlan?.name || 'No canonical plan'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Source: {access?.planAccessSource || 'none'}
                    </p>
                  </div>
                  <StatusBadge status={currentStatus} />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    {access?.actionableReason || 'Billing state could not be resolved.'}
                  </p>
                  {access?.fallbackReason ? (
                    <p className="mt-2 text-sm text-slate-500">{access.fallbackReason}</p>
                  ) : null}
                </div>

                {subscription?.currentPeriodEnd ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoTile
                      icon={Receipt}
                      label={subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}
                      value={formatDate(subscription.currentPeriodEnd)}
                    />
                    <InfoTile
                      icon={FileCheck2}
                      label="Subscription"
                      value={subscription.cancelAtPeriodEnd ? 'Cancelling at period end' : String(subscription.status || currentStatus).replace(/_/g, ' ')}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-3">
                  <AccessTile label="Listings" enabled={Boolean(access?.workspaceAccess.listings)} />
                  <AccessTile label="Publishing" enabled={Boolean(access?.workspaceAccess.publishing)} />
                  <AccessTile label="Reporting" enabled={Boolean(access?.workspaceAccess.reporting)} />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <CapabilityList
                    title="Included capabilities"
                    empty="No capabilities are currently unlocked."
                    items={includedCapabilities.map(item => item.label)}
                    tone="included"
                  />
                  <CapabilityList
                    title="Blocked capabilities"
                    empty="No blocked capabilities."
                    items={blockedCapabilities.map(item => item.label)}
                    tone="blocked"
                    reason={access?.actionableReason}
                  />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Available next action
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{nextBillingAction}</p>
                </div>

                {subscription?.cancelAtPeriodEnd ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Subscription cancellation is scheduled for the current period end.
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={Landmark} title="EFT Details" eyebrow="Manual verification" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!bankDetails?.configured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {bankDetails?.configurationMessage || 'Manual EFT bank details are not configured.'}
              </div>
            ) : null}
            {!proofStorageReady ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {workspace?.proofStorage?.message || 'Private proof storage is not configured.'}
              </div>
            ) : null}
            <InfoTile icon={Building2} label="Bank" value={bankDetails?.bankName || 'Not configured'} />
            <InfoTile
              icon={Receipt}
              label="Account"
              value={
                bankDetails?.configured || bankDetails?.localFixture
                  ? bankDetails.accountNumber
                  : 'Not configured'
              }
            />
            <InfoTile icon={FileText} label="Branch" value={bankDetails?.branchCode || 'Not configured'} />
            {activeInvoice?.paymentReference ? (
              <button
                type="button"
                onClick={() => handleCopy(activeInvoice.paymentReference)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-sm transition hover:bg-slate-50"
              >
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Payment reference
                  </span>
                  <span className="mt-1 block font-semibold text-slate-950">
                    {activeInvoice.paymentReference}
                  </span>
                </span>
                <Clipboard className="h-4 w-4 text-slate-400" />
              </button>
            ) : null}
            {subscription?.cancelAtPeriodEnd ? (
              <Button
                disabled={reactivateSubscription.isPending}
                onClick={() => reactivateSubscription.mutate()}
                className="w-full"
              >
                Reactivate subscription
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={
                  cancelSubscription.isPending ||
                  !subscription ||
                  !['active', 'grace_period'].includes(String(subscription.status))
                }
                onClick={() => cancelSubscription.mutate()}
                className="w-full"
              >
                Cancel at period end
              </Button>
            )}
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
              Invoices: {numberLabel(invoices.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={CreditCard} title="Available Plans" eyebrow="Agency plans" />
        </CardHeader>
        <CardContent>
          {workspaceQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          ) : workspace?.plans?.length ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {workspace.plans.map((plan: any) => (
                <div key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{plan.displayName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPlanPrice(plan.priceMonthly || plan.price, plan.interval)}
                        </p>
                      </div>
                      {currentPlan?.id === plan.id ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Current</Badge>
                      ) : null}
                    </div>
                    <FeatureList value={plan.features} />
                      <Button
                      variant={currentPlan?.id === plan.id ? 'outline' : 'default'}
                      disabled={
                        startCheckout.isPending ||
                        currentPlan?.id === plan.id ||
                        !eftCanIssueInvoices ||
                        !proofStorageReady
                      }
                      onClick={() =>
                        startCheckout.mutate({
                          planId: plan.id,
                          billingCycle,
                        })
                      }
                      className="mt-4 w-full"
                    >
                      {currentPlan?.id === plan.id ? 'Selected' : 'Select plan'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
              No active agency plans are available.
            </div>
          )}
          <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['monthly', 'annual'] as const).map(cycle => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                  billingCycle === cycle ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={UploadCloud} title="Proof Of Payment" eyebrow="Private upload" />
        </CardHeader>
        <CardContent>
          {activeInvoice ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-950">{activeInvoice.invoiceNumber}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCurrency(Number(activeInvoice.amountDue || 0))} due by {formatDate(activeInvoice.dueAt)}
                </p>
                <StatusBadge status={activeInvoice.status} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="payment-amount">Amount paid</Label>
                  <Input
                    id="payment-amount"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={event => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-date">Payment date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={event => setPaymentDate(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bank-reference">Bank reference</Label>
                  <Input
                    id="bank-reference"
                    value={bankReference}
                    onChange={event => setBankReference(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="payer-name">Payer</Label>
                  <Input
                    id="payer-name"
                    value={payerName}
                    onChange={event => setPayerName(event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="proof-file">Proof document</Label>
                  <Input
                    id="proof-file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={event => setProofFile(event.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  disabled={submitProof.isPending || !proofStorageReady}
                  onClick={handleProofSubmit}
                  className="md:col-span-2"
                >
                  Submit proof
                  <UploadCloud className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
              Select a plan to generate an invoice before uploading proof of payment.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={Receipt} title="Invoices" eyebrow="Billing history" />
        </CardHeader>
        <CardContent>
          {workspaceQuery.isLoading ? (
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          ) : invoices.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="grid gap-2 border-t border-slate-200 px-4 py-3 text-sm first:border-t-0 md:grid-cols-[1fr_140px_140px_140px_160px]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoiceId(invoice.id);
                      setPaymentAmount(String(Number(invoice.amountDue || 0) / 100));
                    }}
                    className="text-left font-medium text-slate-950"
                  >
                    {invoice.invoiceNumber}
                  </button>
                  <span>{formatDate(invoice.createdAt)}</span>
                  <span>{formatCurrency(Number(invoice.amountDue || 0))}</span>
                  <Badge variant="outline" className="w-fit capitalize">
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
              No invoices recorded.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={FileCheck2} title="Payments" eyebrow="Verification history" />
        </CardHeader>
        <CardContent>
          {payments.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="grid gap-2 border-t border-slate-200 px-4 py-3 text-sm first:border-t-0 md:grid-cols-[1fr_140px_140px_160px]"
                >
                  <span className="font-medium text-slate-950">{payment.paymentReference}</span>
                  <span>{formatDate(payment.createdAt)}</span>
                  <span>{formatCurrency(Number(payment.amount || 0))}</span>
                  <Badge variant="outline" className="w-fit capitalize">
                    {String(payment.state || '').replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
              No payment submissions recorded.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function AgencyUtilityWorkspace(props: WorkspaceContentProps) {
  const meta = WORKSPACE_TITLES[props.workspace];
  const Icon = props.workspace === 'settings' ? Settings : props.workspace === 'help' ? HelpCircle : meta.icon;
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={Icon} title={meta.title} eyebrow={meta.eyebrow} />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">
          This workspace keeps the agency shell active while detailed utility controls are expanded.
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active' || status === 'grace_period' || status === 'paid' || status === 'verified';
  const warning = ['pending_payment', 'payment_under_review', 'issued', 'submitted', 'partially_paid', 'overdue', 'past_due'].includes(status);
  const Icon = active ? CheckCircle2 : warning ? AlertTriangle : XCircle;
  return (
    <Badge
      className={
        active
          ? 'bg-emerald-100 text-emerald-700'
          : warning
            ? 'bg-amber-100 text-amber-700'
            : 'bg-rose-100 text-rose-700'
      }
    >
      <Icon className="mr-1 h-3.5 w-3.5" />
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AccessTile({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {enabled ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-slate-400" />
        )}
      </div>
    </div>
  );
}

function CapabilityList({
  title,
  items,
  empty,
  tone,
  reason,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: 'included' | 'blocked';
  reason?: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-950">{title}</p>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
              {tone === 'included' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      )}
      {reason && tone === 'blocked' ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">{reason}</p>
      ) : null}
    </div>
  );
}

function FeatureList({ value }: { value?: string | null }) {
  const features = parseFeatures(value).slice(0, 4);
  if (!features.length) return null;
  return (
    <ul className="mt-4 space-y-2 text-sm text-slate-600">
      {features.map(feature => (
        <li key={feature} className="flex gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function parseFeatures(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPlanPrice(cents: number, interval?: string | null) {
  return `${formatCurrency(Number(cents || 0))} / ${interval || 'month'}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function refreshBilling(utils: ReturnType<typeof trpc.useUtils>) {
  await Promise.all([
    utils.agency.getBillingState.invalidate(),
    utils.agency.getAccessState.invalidate(),
    utils.agency.getOnboardingStatus.invalidate(),
    utils.billing.workspace.invalidate(),
    utils.billing.subscription.invalidate(),
    utils.billing.invoices.invalidate(),
    utils.billing.payments.invalidate(),
  ]);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.onerror = () => reject(reader.error || new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}
