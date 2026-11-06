import { PAID_SALES_PAUSED_MESSAGE, PAID_SUPPORT_EMAIL } from '@shared/paidIntakeCopy';

export function SalesPauseNotice() {
  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950">
      {PAID_SALES_PAUSED_MESSAGE} Questions: {PAID_SUPPORT_EMAIL}
    </div>
  );
}
