import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

function randToCents(value: string): number {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return 0;
  const cents = Math.round(Number(text) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : 0;
}

type RevokeTarget = {
  id: number;
  status: string;
  ownerName?: string | null;
  planName?: string | null;
};

const ENTITLED = new Set(['active', 'grace_period']);

/** "Revoke access" action for one subscription row (super admin only on the server). */
export function RevokeAccessButton({
  subscription,
  onDone,
}: {
  subscription: RevokeTarget;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const mutation = trpc.billing.admin.revokeLaunchAccess.useMutation({
    onSuccess: () => {
      toast.success('Access revoked');
      setOpen(false);
      setReason('');
      onDone?.();
    },
    onError: error => toast.error(`Revoke failed: ${error.message}`),
  });

  if (!ENTITLED.has(subscription.status)) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Revoke access
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke access?</DialogTitle>
            <DialogDescription>
              {subscription.ownerName || 'This account'} ({subscription.planName || 'plan'}) will
              lose paid access immediately. No money is moved.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason (required, recorded in the audit log)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || mutation.isPending}
              onClick={() =>
                mutation.mutate({ subscriptionId: subscription.id, reason: reason.trim() })
              }
            >
              Revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ownerLabel(row: any): string {
  return (
    row.agency?.name ||
    row.developerOrganisation?.name ||
    row.agentUser?.name ||
    row.agentUser?.email ||
    'Unknown account'
  );
}

/** Lists approved (verified) EFT payments with "Record refund"; also shows refunded ones. */
export function ApprovedPaymentsRefundCard() {
  const [target, setTarget] = useState<any | null>(null);
  const [amountRand, setAmountRand] = useState('');
  const [refundedOn, setRefundedOn] = useState('');
  const [note, setNote] = useState('');
  const utils = trpc.useUtils();
  const verified = trpc.billing.admin.financeQueue.useQuery({
    status: 'verified',
    limit: 50,
    offset: 0,
  });
  const refunded = trpc.billing.admin.financeQueue.useQuery({
    status: 'refunded',
    limit: 50,
    offset: 0,
  });
  const mutation = trpc.billing.admin.recordEftRefund.useMutation({
    onSuccess: data => {
      if (data?.accessRevoked === false) {
        toast.info(
          data?.alreadyRefunded
            ? 'Refund was already recorded; nothing changed.'
            : 'Refund recorded. Access was NOT revoked because a newer paid term is in place; use Revoke access if needed.',
        );
      } else {
        toast.success('Refund recorded and access revoked');
      }
      setTarget(null);
      utils.billing.admin.financeQueue.invalidate();
      utils.billing.admin.subscriptions.invalidate();
    },
    onError: error => toast.error(`Refund failed: ${error.message}`),
  });

  const openRefund = (row: any) => {
    setTarget(row);
    setAmountRand((Number(row.payment.amount) / 100).toFixed(2));
    setRefundedOn(new Date().toISOString().slice(0, 10));
    setNote('');
  };

  const cents = randToCents(amountRand);
  const canSubmit =
    Boolean(target) &&
    cents === Number(target?.payment?.amount ?? 0) &&
    /^\d{4}-\d{2}-\d{2}$/.test(refundedOn) &&
    note.trim().length > 0 &&
    !mutation.isPending;

  const rows = [
    ...((verified.data?.payments as any[]) || []),
    ...((refunded.data?.payments as any[]) || []),
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/50 p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Approved payments</h3>
        <p className="text-slate-500 text-sm">
          Record a refund after you have paid it back from the bank. This does not move money; it
          marks the payment refunded and ends the linked access.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                No approved payments.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <TableRow key={row.payment.id}>
                <TableCell>{ownerLabel(row)}</TableCell>
                <TableCell>{formatCurrency(Number(row.payment.amount) / 100)}</TableCell>
                <TableCell className="font-mono text-xs">{row.payment.paymentReference}</TableCell>
                <TableCell>
                  {row.payment.state === 'refunded' ? (
                    <Badge className="bg-red-500/10 text-red-600 border-red-200">Refunded</Badge>
                  ) : (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">
                      Approved
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {row.payment.state === 'verified' ? (
                    <Button variant="outline" size="sm" onClick={() => openRefund(row)}>
                      Record refund
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={Boolean(target)} onOpenChange={open => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record refund?</DialogTitle>
            <DialogDescription>
              {target ? ownerLabel(target) : ''} - approved payment of{' '}
              {target ? formatCurrency(Number(target.payment.amount) / 100) : ''} (
              {target?.payment?.paymentReference}). Full refunds only. Access ends only if this payment activated the current term.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Refund amount (rand)"
            placeholder="Refund amount (rand)"
            value={amountRand}
            onChange={e => setAmountRand(e.target.value)}
          />
          <Input
            aria-label="Refund date"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={refundedOn}
            onChange={e => setRefundedOn(e.target.value)}
          />
          <Input
            aria-label="Bank reference or note"
            placeholder="Bank reference / note (required)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canSubmit}
              onClick={() =>
                target &&
                mutation.mutate({
                  paymentId: target.payment.id,
                  amountMinor: cents,
                  refundedOn,
                  note: note.trim(),
                })
              }
            >
              Record refund and revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
