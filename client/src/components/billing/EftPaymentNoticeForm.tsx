import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Notice = { invoiceId: number; paymentDate: string; payerName: string };

/** Keep an uncertain submission's key stable until its details change. */
export function usePaymentNoticeRequest() {
  const previous = useRef<{ signature: string; requestId: string } | null>(null);
  return {
    resetPaymentNoticeRequest: () => {
      previous.current = null;
    },
    paymentNoticeRequest: (notice: Notice) => {
      const signature = JSON.stringify(notice);
      if (previous.current?.signature !== signature) {
        previous.current = { signature, requestId: crypto.randomUUID() };
      }
      return { ...notice, requestId: previous.current.requestId };
    },
  };
}

export function EftPaymentNoticeForm({
  invoiceId,
  paymentDate,
  payerName,
  setPaymentDate,
  setPayerName,
  isSubmitting,
  onSubmit,
}: {
  invoiceId: number;
  paymentDate: string;
  payerName: string;
  setPaymentDate: (value: string) => void;
  setPayerName: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label htmlFor={`eft-date-${invoiceId}`}>Payment date</Label>
        <Input
          id={`eft-date-${invoiceId}`}
          type="date"
          value={paymentDate}
          onChange={event => setPaymentDate(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`eft-payer-${invoiceId}`}>Payer / account name</Label>
        <Input
          id={`eft-payer-${invoiceId}`}
          maxLength={160}
          value={payerName}
          onChange={event => setPayerName(event.target.value)}
        />
      </div>
      <p className="md:col-span-2 text-sm text-slate-600">
        No document is required. We use your invoice reference to review this notice. Access begins
        only after received bank funds are matched and approved. Do not enter bank passwords or
        account numbers.
      </p>
      <Button
        className="md:col-span-2"
        disabled={isSubmitting || !paymentDate || !payerName.trim()}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Submitting notice…' : 'I’ve paid'}
      </Button>
    </div>
  );
}
