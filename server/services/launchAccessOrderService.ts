import { and, desc, eq, inArray } from 'drizzle-orm';
import { billingInvoices, billingPayments } from '../../drizzle/schema';
import { getDb } from '../db';

export type PendingLaunchAccessOrder = {
  invoiceId: number;
  reference: string;
  amountMinor: number;
  currency: string;
  /** When the payment notice was submitted to finance. */
  submittedAt: string | null;
  state: 'under_review';
};

type OwnerType = 'agent' | 'agency' | 'developer';

/**
 * The Launch Access order a finance reviewer still has to decide: an invoice in
 * `submitted` state whose payment notice is submitted / under review. This is
 * the same pair of records the finance queue and the review mutation use, so a
 * pending order shown to the owner is exactly an order finance can approve or
 * reject. Read-only; never writes.
 */
export async function getPendingLaunchAccessOrder(
  ownerType: OwnerType,
  ownerId: number,
): Promise<PendingLaunchAccessOrder | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [invoice] = await db
    .select()
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.ownerType, ownerType),
        eq(billingInvoices.ownerId, ownerId),
        eq(billingInvoices.status, 'submitted'),
        eq(billingInvoices.commercialTermKind, 'paid_launch_access'),
      ),
    )
    .orderBy(desc(billingInvoices.createdAt))
    .limit(1);
  if (!invoice) return null;

  const [payment] = await db
    .select()
    .from(billingPayments)
    .where(
      and(
        eq(billingPayments.invoiceId, invoice.id),
        inArray(billingPayments.state, ['submitted', 'under_review']),
      ),
    )
    .orderBy(desc(billingPayments.createdAt))
    .limit(1);
  if (!payment) return null;

  return {
    invoiceId: Number(invoice.id),
    reference: String(invoice.paymentReference),
    amountMinor: Number(invoice.amountDue),
    currency: String(invoice.currency || 'ZAR'),
    submittedAt: payment.createdAt ? String(payment.createdAt) : null,
    state: 'under_review',
  };
}
