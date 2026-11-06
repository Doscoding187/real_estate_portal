import { toast } from 'sonner';
import {
  PAID_INTAKE_CLOSED_MESSAGE,
  PAID_WAITLIST_LABEL,
  PAID_WAITLIST_MAILTO,
} from '@shared/paidIntakeCopy';

export function PaidIntakeNotice() {
  return (
    <div role="status">
      <p>{PAID_INTAKE_CLOSED_MESSAGE}</p>
      <a href={PAID_WAITLIST_MAILTO} className="font-medium underline">
        {PAID_WAITLIST_LABEL}
      </a>
    </div>
  );
}

export function isPaidIntakeClosedError(error: unknown): boolean {
  return error instanceof Error && error.message === PAID_INTAKE_CLOSED_MESSAGE;
}

/** Owner purchase/invoice/payment-notice error toast; friendly notice for intake-closed. */
export function toastPaidError(error: unknown, fallback: string) {
  if (isPaidIntakeClosedError(error)) {
    toast.error(<PaidIntakeNotice />, { duration: 15000 });
    return;
  }
  toast.error(error instanceof Error && error.message ? error.message : fallback);
}
