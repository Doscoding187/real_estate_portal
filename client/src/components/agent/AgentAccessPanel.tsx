import { Check, Copy, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PAYMENT_PANEL_CANCELLATION_NOTICE } from '@shared/legalPlaceholders';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL_HREF,
} from '@shared/supportContact';
import type { AgentBankDetails, AgentInvoice } from '@/hooks/useAgentLaunchInvoiceRequest';

export function formatAccessAmount(amountMinor: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountMinor || 0) / 100);
}

const STEP_LABELS = ['Your plan', 'Make payment', 'Finance review'] as const;

/** Visible 1-2-3 stepper shared by the plan dialog and the full-page package route. */
export function AccessStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol aria-label="Get access steps" className="flex items-center gap-2 text-xs">
      {STEP_LABELS.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li
            key={label}
            data-step={number}
            aria-current={active ? 'step' : undefined}
            className="flex flex-1 items-center gap-2"
          >
            <span
              className={
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono font-bold ' +
                (active
                  ? 'bg-slate-950 text-white'
                  : done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600')
              }
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : number}
            </span>
            <span className={active ? 'font-semibold text-slate-950' : 'text-slate-500'}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

async function copyValue(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}. Please copy it manually.`);
  }
}

function CopyRow({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value || '';
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-all text-sm font-semibold text-slate-900">{text || 'Unavailable'}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!text}
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={() => void copyValue(label, text)}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

// Every billing_invoices.status value (drizzle/schema/billing.ts), mapped explicitly.
const INVOICE_STEP: Record<string, AccessStep> = {
  draft: 1, // not issued yet: nothing to pay, get a reference
  issued: 2, // awaiting payment
  partially_paid: 2,
  overdue: 2,
  submitted: 3, // payment notice sent, finance reviewing
  paid: 'active', // verified: access is active
  void: 1, // closed: a new reference is needed
};

export type AccessStep = 1 | 2 | 3 | 'active';

/** Unknown or terminal statuses (cancelled, expired, ...) fall back to step 1. */
export function getAccessStep(
  invoiceStatus: string | null | undefined,
  rejected: boolean,
): AccessStep {
  const mapped = INVOICE_STEP[String(invoiceStatus)] ?? 1;
  return rejected && mapped === 2 ? 2 : mapped;
}

function statusLabel(step: AccessStep) {
  if (step === 'active') return 'Active';
  if (step === 3) return 'Under review';
  return 'Awaiting payment';
}

/**
 * Steps 2 and 3 of the Agent "Get access" flow. Step 2: pay by EFT with the
 * payment reference and tell us. Step 3: finance review status.
 */
export function AgentAccessPanel({
  invoice,
  bankDetails,
  rejectionMessage,
  onSubmit,
  isSubmitting,
  submitDisabledReason = null,
  onBack,
  layout = 'inline',
}: {
  invoice: AgentInvoice;
  bankDetails?: AgentBankDetails;
  rejectionMessage?: string | null;
  onSubmit: () => void;
  isSubmitting: boolean;
  /** When set (journey blocked or sales paused) the "I've paid" action is hidden. */
  submitDisabledReason?: string | null;
  /** When set, step 2 shows a Back button that returns to the plan step. */
  onBack?: () => void;
  /** 'sheet' scrolls the content and pins the step buttons at the bottom (dialog use). */
  layout?: 'inline' | 'sheet';
}) {
  const step = getAccessStep(invoice.status, Boolean(rejectionMessage));
  if (step === 1) return null;

  const sheet = layout === 'sheet';
  const actions =
    step === 2 ? (
      <>
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
        {submitDisabledReason ? null : (
          <Button type="button" className="flex-1" disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? 'Sending...' : 'I’ve paid'}
          </Button>
        )}
      </>
    ) : null;
  const showActions = step === 2 && (Boolean(onBack) || !submitDisabledReason);

  return (
    <div
      className={sheet ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4'}
      data-testid="agent-access-panel"
      data-step={step}
    >
      <div
        className={
          sheet ? 'min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6' : 'space-y-4'
        }
      >
        <AccessStepper current={step === 'active' ? 4 : step} />

        {step === 2 ? (
          <div className="space-y-3">
            <h3
              tabIndex={-1}
              data-step-heading
              className="text-base font-semibold text-slate-950 focus:outline-none"
            >
              Make payment
            </h3>
            <p className="text-sm text-slate-600">
              Pay from your banking app. Your access starts when we confirm your payment, normally
              within 1 business day (Monday to Friday).
            </p>
            <div className="rounded-lg border-2 border-slate-900 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment reference
              </p>
              <p
                data-testid="payment-reference"
                className="mt-1 break-all font-mono text-2xl font-bold tracking-wider text-slate-950 sm:text-3xl"
              >
                {invoice.paymentReference}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                aria-label="Copy payment reference"
                onClick={() =>
                  void copyValue('Payment reference', String(invoice.paymentReference))
                }
              >
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Copy reference
              </Button>
              <p className="mt-2 text-sm font-medium text-slate-700">
                Use the reference shown exactly. We match payments by reference; a missing or wrong
                reference delays activation.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <CopyRow label="Amount" value={formatAccessAmount(invoice.amountDue)} />
              <CopyRow label="Bank name" value={bankDetails?.bankName} />
              <CopyRow label="Account holder" value={bankDetails?.accountName} />
              <CopyRow label="Account number" value={bankDetails?.accountNumber} />
              <CopyRow label="Branch code" value={bankDetails?.branchCode} />
            </div>
            {bankDetails?.configurationMessage ? (
              <p className="text-xs text-slate-500">{bankDetails.configurationMessage}</p>
            ) : null}
            <p data-testid="payment-cancellation-notice" className="text-xs text-slate-500">
              {PAYMENT_PANEL_CANCELLATION_NOTICE}{' '}
              <a href="/legal/terms" className="underline underline-offset-2">
                Terms
              </a>
            </p>
            <p data-testid="payment-help" className="text-xs text-slate-500">
              Payment help: call or WhatsApp{' '}
              <a href={SUPPORT_PHONE_TEL_HREF} className="underline underline-offset-2">
                {SUPPORT_PHONE_DISPLAY}
              </a>
              , or email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
            {rejectionMessage ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">Finance requested a correction</p>
                  <p className="mt-1 leading-6">{rejectionMessage}</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Check your payment details, then submit a corrected notice below for a new
                    review.
                  </p>
                </div>
              </div>
            ) : null}
            {submitDisabledReason ? (
              <div
                role="status"
                data-testid="agent-access-submit-closed"
                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
              >
                <p>{submitDisabledReason}</p>
                <p className="mt-1 font-medium">
                  Already paid? Finance matches payments by your reference. You don&apos;t need to
                  do anything else.
                </p>
              </div>
            ) : null}
          </div>
        ) : step === 'active' ? (
          <div className="space-y-3" data-testid="agent-access-active">
            <h3
              tabIndex={-1}
              data-step-heading
              className="text-base font-semibold text-slate-950 focus:outline-none"
            >
              Your access is active
            </h3>
            <p className="text-sm text-slate-700">
              Your payment is confirmed. Publishing and enquiries are open.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="agent-access-review">
            <h3
              tabIndex={-1}
              data-step-heading
              className="text-base font-semibold text-slate-950 focus:outline-none"
            >
              Finance review
            </h3>
            <p className="text-sm text-slate-700">
              We&apos;re matching your payment to your reference, usually within 1 business day.
              When it&apos;s confirmed, your access opens and we email you a paid invoice.
            </p>
            <p className="text-sm text-slate-600">
              Status: <span className="font-semibold text-slate-900">{statusLabel(step)}</span>
            </p>
            <p className="text-xs text-slate-500">
              Reference {invoice.paymentReference} · {formatAccessAmount(invoice.amountDue)}
            </p>
          </div>
        )}
      </div>
      {showActions ? (
        <div
          className={
            sheet ? 'flex shrink-0 gap-2 border-t bg-background px-4 py-3 sm:px-6' : 'flex gap-2'
          }
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

type PaymentLike = {
  invoiceId?: unknown;
  state?: unknown;
  reviewNote?: string | null;
  rejectionReason?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  reviewedAt?: unknown;
};

/** The latest rejected payment notice's reason for this invoice, if finance rejected it. */
export function getRejectionMessage(
  invoiceId: number | null | undefined,
  payments: readonly PaymentLike[] | null | undefined,
): string | null {
  if (invoiceId == null) return null;
  const time = (p: PaymentLike) =>
    new Date(String(p.createdAt || p.updatedAt || p.reviewedAt || '')).getTime() || 0;
  const latest = [...(payments || [])]
    .filter(p => Number(p.invoiceId) === Number(invoiceId))
    .sort((l, r) => time(r) - time(l))[0];
  if (!latest || latest.state !== 'rejected') return null;
  return (
    latest.reviewNote?.trim() ||
    latest.rejectionReason?.trim() ||
    'The previous payment notification was not approved. Check your payment details and submit a corrected notice for review.'
  );
}

/** Auto-filled payer name for the one-click "I've paid" notice. */
export function getPayerDisplayName(
  user: { name?: string | null; email?: string | null } | null | undefined,
): string {
  const name = user?.name?.trim();
  if (name) return name;
  const local = user?.email?.split('@')[0]?.trim();
  return local || 'Agent';
}

/** Today's local date as YYYY-MM-DD. */
export function localDateIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}
