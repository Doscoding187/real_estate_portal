import { useCallback, useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import type { AppRouter } from '../../../server/routers';
import { PAID_SALES_PAUSED_MESSAGE } from '@shared/paidIntakeCopy';
import { isPaidIntakeClosedError, toastPaidError } from '@/components/commercial/PaidIntakeNotice';

// Exact server phrases for "launch access closed" on the invoice request
// (server/services/commercialActivationPolicy.ts requirePaidMvp* / requireCommercialActivation).
// Anchored phrases only: bare words such as "closed" or "paused" appear in genuine conflicts.
const LAUNCH_ACCESS_CLOSED_PATTERN = new RegExp(
  [
    '^' + PAID_SALES_PAUSED_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
    '^.+ is unavailable while Property Listify is in preparation-only onboarding\\.',
    '^.+ requires an approved persisted Paid MVP product and matching owner\\.$',
  ].join('|'),
);

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AgentBillingWorkspace = RouterOutputs['billing']['agentWorkspace'];
export type AgentInvoice = NonNullable<AgentBillingWorkspace['activeInvoice']>;
export type AgentBankDetails = AgentBillingWorkspace['bankDetails'];

export type AgentInvoiceResponse = {
  invoice: AgentInvoice;
  bankDetails: AgentBankDetails;
  paymentReference: string;
  reused: boolean;
  ownerType: string;
  ownerId: number;
};

type LegalChoice = unknown;

/**
 * Shared "request my Agent Launch Access invoice" call. Used by the full-page
 * package selection and by the in-workspace plan dialog so the request, the
 * legal acceptance payload and the closed-sales messaging stay identical.
 */
export function useAgentLaunchInvoiceRequest({
  planId,
  legalChoice,
  salesPaused = false,
  reloadLegal,
  refetchCatalog,
  refetchWorkspace,
}: {
  planId: number | null | undefined;
  legalChoice: LegalChoice | undefined;
  salesPaused?: boolean;
  reloadLegal: () => void;
  refetchCatalog: () => unknown;
  refetchWorkspace: () => unknown | Promise<unknown>;
}) {
  const [invoiceResponse, setInvoiceResponse] = useState<AgentInvoiceResponse | null>(null);
  const [isRequestingInvoice, setIsRequestingInvoice] = useState(false);

  const requestInvoice = useCallback(async () => {
    if (salesPaused) return;
    if (!legalChoice) return;
    if (!planId) {
      toast.error('The canonical Agent Launch Access product is not requestable right now.');
      return;
    }

    setIsRequestingInvoice(true);
    try {
      const result = await apiFetch<AgentInvoiceResponse>('/agent/request-launch-access-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, legalAcceptance: legalChoice }),
      });
      setInvoiceResponse(result);
      await refetchWorkspace();
      toast.success(
        result.reused ? 'Your existing payment reference is ready.' : 'Your payment reference is ready.',
        {
          description: 'Pay by EFT, then select “I’ve paid” for finance verification.',
        },
      );
    } catch (error) {
      reloadLegal();
      void refetchCatalog();
      const status = (error as { status?: unknown } | null)?.status;
      if (isPaidIntakeClosedError(error)) {
        toastPaidError(error, 'Could not request the Agent invoice');
      } else if (status === 409) {
        const raw = error instanceof Error ? error.message.trim() : '';
        const message = raw && !/^HTTP \d+/.test(raw) ? raw : '';
        if (!message) {
          toast.error(
            'We could not request your invoice. Refresh the page and try again, or contact support@propertylistifysa.co.za.',
          );
        } else if (LAUNCH_ACCESS_CLOSED_PATTERN.test(message)) {
          toast.info(
            'Agent Launch Access purchases are not open for your account yet. We will email you when they open. Questions: support@propertylistifysa.co.za',
            { duration: 15000 },
          );
          void refetchWorkspace();
        } else {
          toast.error(message);
          void refetchWorkspace();
        }
      } else {
        toastPaidError(error, 'Could not request the Agent invoice');
      }
    } finally {
      setIsRequestingInvoice(false);
    }
  }, [legalChoice, planId, refetchCatalog, refetchWorkspace, reloadLegal, salesPaused]);

  return { requestInvoice, isRequestingInvoice, invoiceResponse, setInvoiceResponse };
}
