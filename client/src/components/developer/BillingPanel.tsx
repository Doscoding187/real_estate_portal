// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Gift,
  Building2,
  Users,
  TrendingUp,
  Check,
  X,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCommercialStatus, formatInvoiceStatus } from '@/lib/developerStatusVocabulary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const PLAN_PRESENTATION = {
  trial: {
    icon: Gift,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    gradient: 'from-purple-500 to-pink-500',
  },
  standard: {
    icon: Sparkles,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    gradient: 'from-blue-500 to-cyan-500',
  },
};

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

export default function BillingPanel() {
  const [, setLocation] = useLocation();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Fetch subscription data
  const {
    data: subscriptionData,
    isLoading,
    refetch,
  } = trpc.developer.getSubscription.useQuery(undefined, { staleTime: 0, refetchOnMount: true });
  const workspaceQuery = trpc.billing.developerWorkspace.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: true,
  });
  const submitProof = trpc.billing.submitDeveloperPaymentProof.useMutation({
    onSuccess: async () => {
      await workspaceQuery.refetch();
      setProofFile(null);
      setBankReference('');
      toast.success('Proof submitted for finance review');
    },
    onError: error => toast.error(error.message || 'Proof could not be submitted'),
  });

  // The tRPC procedure returns the canonical developer projection directly.
  const subscription = subscriptionData;
  const workspace = workspaceQuery.data;
  const activeInvoice = workspace?.activeInvoice;
  const invoices = workspace?.invoices || [];
  const limits = subscription?.limits;
  const usage = subscription?.usage;

  // Trial and paid fixed-term access have different commercial meanings.
  const getDaysRemaining = () => {
    if (!subscription?.trialEndsAt) return null;
    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysRemaining = getDaysRemaining();
  const getLaunchDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return null;
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const days = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const launchDaysRemaining = getLaunchDaysRemaining();

  // Calculate usage percentages
  const getUsagePercent = (current: number, max: number | null | undefined) => {
    if (max === null || max === undefined || max <= 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const developmentPortfolioUnlimited = Boolean(limits?.developmentPortfolioUnlimited);
  const maxDevelopments = limits?.maxDevelopments ?? 0;
  const maxLeadsPerMonth = limits?.maxLeadsPerMonth ?? 0;
  const maxTeamMembers = limits?.maxTeamMembers ?? 0;
  const analyticsRetentionDays = limits?.analyticsRetentionDays ?? 0;

  useEffect(() => {
    if (activeInvoice && !paymentAmount) {
      setPaymentAmount((Number(activeInvoice.amountDue || 0) / 100).toFixed(2));
    }
  }, [activeInvoice, paymentAmount]);

  const handleProofSubmit = async () => {
    if (!activeInvoice) {
      toast.error('Request an invoice before submitting payment proof');
      return;
    }
    if (!proofFile) {
      toast.error('Attach proof of payment');
      return;
    }
    const amountRand = Number(paymentAmount);
    if (!Number.isFinite(amountRand) || amountRand <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    try {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read proof document');
    }
  };

  if (isLoading || workspaceQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="h-48" />
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        {activeInvoice && (
          <DeveloperManualEftPanel
            invoice={activeInvoice}
            bankDetails={workspace?.bankDetails}
            proofStorage={workspace?.proofStorage}
            paymentAmount={paymentAmount}
            setPaymentAmount={setPaymentAmount}
            bankReference={bankReference}
            setBankReference={setBankReference}
            payerName={payerName}
            setPayerName={setPayerName}
            paymentDate={paymentDate}
            setPaymentDate={setPaymentDate}
            proofFile={proofFile}
            setProofFile={setProofFile}
            onSubmit={handleProofSubmit}
            isSubmitting={submitProof.isPending}
          />
        )}
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Launch Access not active</h3>
            <p className="text-slate-600 mb-4">
              Request Developer Launch Access. It begins only after manual-EFT payment is verified.
            </p>
            <Button
              onClick={() => setLocation('/developer/plans')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Request Launch Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTrial = subscription.commercial?.commercialTerm?.kind === 'free_trial';
  const isLaunchAccess = subscription.commercial?.commercialTerm?.kind === 'paid_launch_access';
  // Only the canonical expired status means expired. Unpaid invoices and
  // payment proofs under review are pending commercial states, not expiries.
  const launchAccessExpired = isLaunchAccess && subscription.commercial?.status === 'expired';
  const tierConfig = isTrial ? PLAN_PRESENTATION.trial : PLAN_PRESENTATION.standard;
  const TierIcon = tierConfig.icon;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${tierConfig.gradient}`} />
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-3 rounded-xl', tierConfig.color)}>
                <TierIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {subscription.commercial?.planDisplayName || 'Current developer plan'}
                  <Badge variant="outline" className={cn('ml-2', tierConfig.color)}>
                    {formatCommercialStatus(subscription.commercial?.status)}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {isLaunchAccess && launchDaysRemaining !== null ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {launchDaysRemaining > 0
                        ? `${launchDaysRemaining} days of Launch Access remaining`
                        : 'Launch Access expired'}
                    </span>
                  ) : isTrial && daysRemaining !== null ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Trial expired'}
                    </span>
                  ) : (
                    'Your current subscription plan'
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              {(isTrial || launchAccessExpired) && (
                <Button
                  onClick={() => setLocation('/developer/plans')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {launchAccessExpired ? 'Request Launch Access' : 'Upgrade'}
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Metrics */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Current Usage
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Developments */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Developments
                  </span>
                  <span className="text-sm font-semibold">
                    {usage?.developmentsCount || 0} /{' '}
                    {developmentPortfolioUnlimited ? '∞' : maxDevelopments}
                  </span>
                </div>
                <Progress
                  value={getUsagePercent(
                    usage?.developmentsCount || 0,
                    developmentPortfolioUnlimited ? null : maxDevelopments,
                  )}
                  className="h-2"
                />
                {!developmentPortfolioUnlimited &&
                  getUsagePercent(usage?.developmentsCount || 0, maxDevelopments) >= 80 && (
                    <p className="text-xs text-orange-600 mt-1">Approaching limit</p>
                  )}
              </div>

              {/* Leads This Month */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    Leads This Month
                  </span>
                  <span className="text-sm font-semibold">
                    {usage?.leadsThisMonth || 0} / {maxLeadsPerMonth}
                  </span>
                </div>
                <Progress
                  value={getUsagePercent(usage?.leadsThisMonth || 0, maxLeadsPerMonth)}
                  className="h-2"
                />
              </div>

              {/* Team Members */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Team Members
                  </span>
                  <span className="text-sm font-semibold">
                    {usage?.teamMembersCount || 0} / {maxTeamMembers}
                  </span>
                </div>
                <Progress
                  value={getUsagePercent(usage?.teamMembersCount || 0, maxTeamMembers)}
                  className="h-2"
                />
              </div>
            </div>
          </div>

          {/* Features Access */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Features</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FeatureBadge
                label="CRM Integration"
                enabled={limits?.crmIntegrationEnabled || false}
              />
              <FeatureBadge
                label="Advanced Analytics"
                enabled={limits?.advancedAnalyticsEnabled || false}
              />
              <FeatureBadge
                label="Bond Integration"
                enabled={limits?.bondIntegrationEnabled || false}
              />
              <FeatureBadge
                label={
                  analyticsRetentionDays > 0
                    ? `${analyticsRetentionDays} Days Analytics`
                    : 'Analytics not configured'
                }
                enabled={analyticsRetentionDays > 0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {activeInvoice && (
        <DeveloperManualEftPanel
          invoice={activeInvoice}
          bankDetails={workspace?.bankDetails}
          proofStorage={workspace?.proofStorage}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          bankReference={bankReference}
          setBankReference={setBankReference}
          payerName={payerName}
          setPayerName={setPayerName}
          paymentDate={paymentDate}
          setPaymentDate={setPaymentDate}
          proofFile={proofFile}
          setProofFile={setProofFile}
          onSubmit={handleProofSubmit}
          isSubmitting={submitProof.isPending}
        />
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
          <CardDescription>Your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length ? (
                invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.createdAt
                        ? new Date(invoice.createdAt).toLocaleDateString('en-ZA')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {invoice.commercialTermKind === 'paid_launch_access'
                        ? 'Developer Launch Access · 90 days'
                        : invoice.planId
                          ? `Plan ${invoice.planId}`
                          : 'Commercial invoice'}
                    </TableCell>
                    <TableCell>{formatInvoiceAmount(invoice.amountDue)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatInvoiceStatus(invoice.status)}</Badge>
                    </TableCell>
                    <TableCell>{invoice.paymentReference || '—'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    No commercial invoices have been issued yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Commercial action prompt for free-trial or expired Launch Access state */}
      {(isTrial || launchAccessExpired) && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">
                  {launchAccessExpired ? 'Launch Access has ended' : 'Ready to grow?'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {launchAccessExpired
                    ? 'Request the next approved developer commercial product. Access does not renew automatically.'
                    : 'Review the canonical developer products to request additional developments, leads, or features.'}
                </p>
                <Button
                  onClick={() => setLocation('/developer/plans')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Plans
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeveloperManualEftPanel({
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
  proofFile,
  setProofFile,
  onSubmit,
  isSubmitting,
}) {
  const proofCanBeSubmitted = ['issued', 'partially_paid', 'overdue'].includes(invoice.status);

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UploadCloud className="h-5 w-5 text-blue-600" />
          Developer Launch Access invoice
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
              {formatInvoiceStatus(invoice.status)}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Manual EFT instructions</p>
          <p className="mt-1">
            {bankDetails?.accountName || 'Account details unavailable'} ·{' '}
            {bankDetails?.bankName || 'Bank details unavailable'} ·{' '}
            {bankDetails?.maskedAccountNumber || 'Account number unavailable'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Use the payment reference above. Do not treat local fixture banking details as payable.
          </p>
        </div>

        {proofCanBeSubmitted ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="developer-payment-amount">Amount paid</Label>
              <Input
                id="developer-payment-amount"
                inputMode="decimal"
                value={paymentAmount}
                onChange={event => setPaymentAmount(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="developer-payment-date">Payment date</Label>
              <Input
                id="developer-payment-date"
                type="date"
                value={paymentDate}
                onChange={event => setPaymentDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="developer-bank-reference">Bank reference</Label>
              <Input
                id="developer-bank-reference"
                value={bankReference}
                onChange={event => setBankReference(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="developer-payer-name">Payer name</Label>
              <Input
                id="developer-payer-name"
                value={payerName}
                onChange={event => setPayerName(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="developer-proof-file">Proof of payment</Label>
              <Input
                id="developer-proof-file"
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

// Feature badge component
function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors',
        enabled
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-slate-100 text-slate-500 border border-slate-200',
      )}
    >
      {enabled ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-slate-400" />
      )}
      {label}
    </div>
  );
}
