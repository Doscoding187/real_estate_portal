import { useMemo, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePaymentNoticeRequest } from '@/components/billing/EftPaymentNoticeForm';
import { PaidCommitmentDisclosure } from '@/components/commercial/PaidCommitmentDisclosure';
import { toastPaidError } from '@/components/commercial/PaidIntakeNotice';
import {
  AccessStepper,
  AgentAccessPanel,
  getPayerDisplayName,
  getAccessStep,
  getRejectionMessage,
  localDateIso,
} from '@/components/agent/AgentAccessPanel';
import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';
import { useCommercialProductAvailability } from '@/hooks/useCommercialProductAvailability';
import { usePaidLegalAcceptance } from '@/hooks/usePaidLegalAcceptance';
import { useAgentLaunchInvoiceRequest } from '@/hooks/useAgentLaunchInvoiceRequest';
import {
  getCommercialPresentationLimits,
  getCommercialPricePresentation,
  formatCommercialLimitLabel,
  formatCommercialLimitValue,
} from '@/lib/commercialCatalog';
import { trpc } from '@/lib/trpc';
import {
  PAID_INTAKE_CLOSED_MESSAGE,
  PAID_WAITLIST_LABEL,
  PAID_WAITLIST_MAILTO,
} from '@shared/paidIntakeCopy';

function PaidPlansOpenSoon() {
  return (
    <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="font-semibold text-slate-900">Paid plans open soon</p>
      <p className="mt-1 text-slate-600">
        {PAID_INTAKE_CLOSED_MESSAGE.replace(/^Paid plans open soon\.\s*/, '')}{' '}
        <a href={PAID_WAITLIST_MAILTO} className="font-medium underline">
          {PAID_WAITLIST_LABEL}
        </a>
      </p>
    </div>
  );
}

function PlanGateContent({
  blockedReason,
  workspaceEnabled,
}: {
  blockedReason: string | null;
  workspaceEnabled: boolean;
}) {
  const availability = useCommercialProductAvailability('agent_launch_access');
  const catalog = useCommercialCatalog('agent');
  const launchProduct = useMemo(() => {
    const products = (catalog.data?.products || []).filter(
      product => product.audience === 'agent' && product.term.kind === 'paid_launch_access',
    );
    return products.find(product => product.productKey === 'agent_launch_access') ?? products[0];
  }, [catalog.data?.products]);
  const purchasable =
    availability.isAvailable && !availability.salesPaused && Boolean(launchProduct);

  const workspaceQuery = trpc.billing.agentWorkspace.useQuery(undefined, {
    // An existing payment reference must stay visible even when sales are paused
    // or the journey is blocked; only agency-managed access skips the workspace.
    enabled: workspaceEnabled,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });
  const submitNotice = trpc.billing.submitLaunchAccessPaymentNotice.useMutation();
  const { paymentNoticeRequest, resetPaymentNoticeRequest } = usePaymentNoticeRequest();
  const { user } = useAuth();

  const legal = usePaidLegalAcceptance(
    purchasable && launchProduct ? JSON.stringify(launchProduct) : null,
    launchProduct?.source?.planId && launchProduct.pricing.basePrice
      ? {
          planId: launchProduct.source.planId,
          amountDue: launchProduct.pricing.basePrice.amountMinor,
          currency: launchProduct.pricing.basePrice.currency,
        }
      : undefined,
  );
  const { requestInvoice, isRequestingInvoice, invoiceResponse, setInvoiceResponse } =
    useAgentLaunchInvoiceRequest({
      planId: launchProduct?.source?.planId,
      legalChoice: legal.choice,
      salesPaused: availability.salesPaused,
      reloadLegal: legal.reload,
      refetchCatalog: catalog.refetch,
      refetchWorkspace: workspaceQuery.refetch,
    });

  const activeInvoice = invoiceResponse?.invoice ?? workspaceQuery.data?.activeInvoice ?? null;
  const bankDetails = invoiceResponse?.bankDetails ?? workspaceQuery.data?.bankDetails;

  const rejectionMessage = getRejectionMessage(activeInvoice?.id, workspaceQuery.data?.payments);

  const submittingRef = useRef(false);
  const handleNoticeSubmit = async () => {
    if (!activeInvoice || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await submitNotice.mutateAsync(
        paymentNoticeRequest({
          invoiceId: activeInvoice.id,
          paymentDate: localDateIso(),
          payerName: getPayerDisplayName(user),
        }),
      );
      resetPaymentNoticeRequest();
      await workspaceQuery.refetch();
      setInvoiceResponse(null);
      toast.success('Payment notification submitted. Bank verification is pending.');
    } catch (error) {
      toastPaidError(error, 'Payment notification could not be submitted.');
    } finally {
      submittingRef.current = false;
    }
  };

  const submitClosedReason =
    blockedReason ?? (purchasable ? null : 'Paid plans are not open for new payments right now.');

  if (activeInvoice && getAccessStep(activeInvoice.status, Boolean(rejectionMessage)) !== 1) {
    return (
      <AgentAccessPanel
        invoice={activeInvoice}
        bankDetails={bankDetails}
        rejectionMessage={rejectionMessage}
        onSubmit={() => void handleNoticeSubmit()}
        isSubmitting={submitNotice.isPending}
        submitDisabledReason={submitClosedReason}
      />
    );
  }

  if (availability.isLoading || (availability.isAvailable && catalog.isLoading)) {
    return <p className="text-sm text-slate-500">Loading plan details...</p>;
  }

  if (!purchasable || !launchProduct) {
    return (
      <div className="space-y-4">
        <AccessStepper current={1} />
        <PaidPlansOpenSoon />
      </div>
    );
  }

  const price = getCommercialPricePresentation(launchProduct);
  const limits = getCommercialPresentationLimits(launchProduct);

  return (
    <div className="space-y-4">
      <AccessStepper current={1} />
      <div className="rounded-lg border border-blue-200 bg-white p-4">
        <p className="text-base font-semibold text-slate-950">{launchProduct.displayName}</p>
        <p className="mt-1 font-mono text-3xl font-semibold text-slate-950">
          {price.label}
          {price.period ? (
            <span className="ml-1 text-sm font-semibold text-slate-500">{price.period.trim()}</span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-slate-600">Once-off, 90 days, no auto-renewal.</p>
        <ul className="mt-3 space-y-2">
          {launchProduct.benefits.map(benefit => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              {benefit}
            </li>
          ))}
          {limits.map(([key, value]) => (
            <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              {formatCommercialLimitLabel(key)}: {formatCommercialLimitValue(value)}
            </li>
          ))}
        </ul>
      </div>

      {blockedReason ? (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
        >
          {blockedReason}
        </p>
      ) : null}
      <PaidCommitmentDisclosure legal={legal} />

      <Button
        type="button"
        className="w-full"
        disabled={isRequestingInvoice || !legal.choice || Boolean(blockedReason)}
        onClick={() => void requestInvoice()}
      >
        {isRequestingInvoice ? 'Preparing your payment reference...' : 'Get my payment reference'}
      </Button>
    </div>
  );
}

export function PlanGateDialog({
  open,
  onOpenChange,
  blockedReason = null,
  workspaceEnabled = true,
}: {
  open: boolean;
  blockedReason?: string | null;
  workspaceEnabled?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Get access</DialogTitle>
          <DialogDescription>
            Your profile is open. A plan unlocks listings, publishing and enquiries.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PlanGateContent blockedReason={blockedReason} workspaceEnabled={workspaceEnabled} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
