import { Check, Copy, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
export function AccessStepper({ current }: { current: 1 | 2 | 3 }) {
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

const PAYABLE = ['issued', 'partially_paid', 'overdue'];

export function getAccessStep(invoiceStatus: string | null | undefined, rejected: boolean): 2 | 3 {
  if (rejected) return 2;
  return PAYABLE.includes(String(invoiceStatus)) ? 2 : 3;
}

function statusLabel(status: string, rejected: boolean) {
  if (rejected) return 'Rejected';
  if (PAYABLE.includes(status)) return 'Awaiting payment';
  if (status === 'submitted') return 'Under review';
  if (status === 'paid') return 'Active';
  return status.replace(/_/g, ' ');
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
}: {
  invoice: AgentInvoice;
  bankDetails?: AgentBankDetails;
  rejectionMessage?: string | null;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const step = getAccessStep(invoice.status, Boolean(rejectionMessage));

  return (
    <div className="space-y-4" data-testid="agent-access-panel" data-step={step}>
      <AccessStepper current={step} />

      {step === 2 ? (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-950">Make payment</h3>
          <p className="text-sm text-slate-600">
            Pay from your banking app using this exact reference. Access starts only after your
            payment is confirmed.
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
              onClick={() => void copyValue('Payment reference', String(invoice.paymentReference))}
            >
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Copy reference
            </Button>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Use this exact reference. It identifies your account.
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
          {rejectionMessage ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <div>
                <p className="font-semibold">Finance requested a correction</p>
                <p className="mt-1 leading-6">{rejectionMessage}</p>
                <p className="mt-1 text-xs text-amber-800">
                  Check your payment details, then submit a corrected notice below for a new review.
                </p>
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? 'Sending...' : 'I’ve paid'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="agent-access-review">
          <h3 className="text-base font-semibold text-slate-950">Finance review</h3>
          <p className="text-sm text-slate-700">
            We&apos;re matching your payment to your reference, usually within 1 business day. When
            it&apos;s confirmed, your access opens and we email you a paid invoice.
          </p>
          <p className="text-sm text-slate-600">
            Status:{' '}
            <span className="font-semibold text-slate-900">
              {statusLabel(String(invoice.status), false)}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            Reference {invoice.paymentReference} · {formatAccessAmount(invoice.amountDue)}
          </p>
        </div>
      )}
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
