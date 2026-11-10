import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const rand = (minor: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(minor / 100);

function localDateString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Finance records a received EFT by invoice reference, then approves and activates. */
export function RecordPaymentByReferenceCard({ onRecorded }: { onRecorded?: () => void }) {
  const utils = trpc.useUtils();
  const [reference, setReference] = useState('');
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  const [amountRand, setAmountRand] = useState('');
  const [paidOn, setPaidOn] = useState(localDateString());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lookup = trpc.billing.admin.lookupLaunchInvoiceByReference.useQuery(
    { paymentReference: lookedUp ?? '' },
    { enabled: lookedUp !== null, retry: false },
  );
  const record = trpc.billing.admin.recordLaunchPaymentByReference.useMutation({
    onSuccess: () => {
      toast.success('Payment recorded and approved');
      setConfirmOpen(false);
      setLookedUp(null);
      setReference('');
      setAmountRand('');
      void utils.billing.admin.financeQueue.invalidate();
      onRecorded?.();
    },
    onError: error => {
      setConfirmOpen(false);
      toast.error(error.message);
    },
  });

  const invoice = lookup.data;
  const effectiveAmount =
    amountRand !== ''
      ? amountRand
      : invoice
        ? String(Math.max(0, invoice.amountDue - invoice.amountPaid) / 100)
        : '';
  const amountFormatOk = /^\d+(\.\d{1,2})?$/.test(effectiveAmount);
  const amountMinor = amountFormatOk ? Math.round(Number(effectiveAmount) * 100) : 0;
  const balanceMinor = invoice ? Math.max(0, invoice.amountDue - invoice.amountPaid) : 0;
  const amountValid = amountFormatOk && amountMinor > 0 && amountMinor <= balanceMinor;
  const amountMessage =
    effectiveAmount === ''
      ? null
      : !amountFormatOk
        ? 'Enter an amount in rand with at most 2 decimals.'
        : amountMinor <= 0
          ? 'Amount must be more than zero.'
          : amountMinor > balanceMinor
            ? `Amount is more than the balance due (${rand(balanceMinor)}).`
            : null;
  const canApprove = Boolean(invoice) && invoice?.status !== 'paid' && amountValid && !!paidOn;

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-slate-900">Record payment by reference</h3>
      <p className="text-slate-500 text-sm mb-4">
        Enter the invoice reference from the bank transaction. Check the preview, then approve.
      </p>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Invoice payment reference"
          value={reference}
          maxLength={120}
          onChange={event => setReference(event.target.value)}
        />
        <Button
          variant="outline"
          disabled={!reference.trim()}
          onClick={() => {
            setLookedUp(reference.trim());
            setAmountRand('');
          }}
        >
          Look up
        </Button>
      </div>
      {lookup.isError ? <p className="text-sm text-red-600">{lookup.error.message}</p> : null}
      {invoice ? (
        <div className="space-y-3 text-sm">
          <div>
            <div>
              <strong>{invoice.ownerName}</strong> ({invoice.ownerType})
            </div>
            <div>
              Invoice {invoice.invoiceNumber} · status {invoice.status}
            </div>
            <div>Amount due: {rand(invoice.amountDue)}</div>
            {invoice.payments.length ? (
              <ul className="list-disc ml-5">
                {invoice.payments.map(payment => (
                  <li key={payment.id}>
                    Payment #{payment.id}: {payment.state}, {rand(payment.amount)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {invoice.status === 'paid' ? (
            <p className="text-amber-700">Already paid.</p>
          ) : (
            <div className="flex flex-wrap gap-2 items-end">
              <label>
                Amount received (R)
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={effectiveAmount}
                  onChange={event => setAmountRand(event.target.value)}
                />
              </label>
              <label>
                Date paid
                <Input type="date" value={paidOn} onChange={event => setPaidOn(event.target.value)} />
              </label>
              {amountMessage ? <p className="text-red-600 w-full">{amountMessage}</p> : null}
              <Button
                disabled={!canApprove}
                onClick={() => setConfirmOpen(true)}
              >
                Approve and activate
              </Button>
            </div>
          )}
        </div>
      ) : null}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve and activate?</DialogTitle>
            <DialogDescription>
              Record {amountValid ? rand(amountMinor) : 'this amount'} received on {paidOn} for{' '}
              {invoice?.ownerName} ({invoice?.paymentReference}). This activates Launch Access and
              emails a PAID invoice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={!amountValid || record.isPending || !invoice}
              onClick={() =>
                record.mutate({
                  paymentReference: invoice!.paymentReference,
                  amountReceivedMinor: amountMinor,
                  paidOn,
                })
              }
            >
              Confirm approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
