import { getDb } from './db';
import { 
  subscriptionTransactions, 
  failedPayments,
  agencySubscriptions,
  invoices,
  agencies,
  users 
} from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Revenue Center Sync Service
 * Syncs subscription events to Revenue Center for analytics
 */

interface SubscriptionTransactionData {
  subscriptionId: number;
  agencyId: number;
  userId?: number;
  amount: number; // in cents
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  revenueCategory: 'developer' | 'agency' | 'agent' | 'vendor';
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
  stripePaymentIntentId?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: any;
}

interface FailedPaymentData {
  subscriptionId?: number;
  invoiceId?: number;
  agencyId: number;
  userId?: number;
  amount: number; // in cents
  currency?: string;
  failureReason?: string;
  failureCode?: string;
  stripePaymentIntentId?: string;
  metadata?: any;
}

/**
 * Record a subscription transaction in Revenue Center
 */
export async function recordSubscriptionTransaction(data: SubscriptionTransactionData) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const result = await db.insert(subscriptionTransactions).values({
      subscriptionId: data.subscriptionId,
      agencyId: data.agencyId,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency || 'ZAR',
      status: data.status,
      revenueCategory: data.revenueCategory,
      billingPeriodStart: data.billingPeriodStart?.toISOString().slice(0, 19).replace('T', ' '),
      billingPeriodEnd: data.billingPeriodEnd?.toISOString().slice(0, 19).replace('T', ' '),
      stripePaymentIntentId: data.stripePaymentIntentId,
      paymentMethod: data.paymentMethod,
      description: data.description,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      paidAt: data.status === 'completed' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    });

    console.log('[Revenue Center] Recorded subscription transaction:', result[0].insertId);
    return result[0].insertId;
  } catch (error) {
    console.error('[Revenue Center] Failed to record subscription transaction:', error);
    throw error;
  }
}

/**
 * Record a failed payment in Revenue Center
 */
export async function recordFailedPayment(data: FailedPaymentData) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Calculate churn risk based on retry count and amount
    let churnRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (data.amount > 100000) churnRisk = 'high'; // High-value customer
    
    const result = await db.insert(failedPayments).values({
      subscriptionId: data.subscriptionId,
      invoiceId: data.invoiceId,
      agencyId: data.agencyId,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency || 'ZAR',
      failureReason: data.failureReason,
      failureCode: data.failureCode,
      retryCount: 0,
      maxRetries: 3,
      status: 'pending_retry',
      nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), // 24 hours
      churnRisk,
      stripePaymentIntentId: data.stripePaymentIntentId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });

    console.log('[Revenue Center] Recorded failed payment:', result[0].insertId);
    return result[0].insertId;
  } catch (error) {
    console.error('[Revenue Center] Failed to record failed payment:', error);
    throw error;
  }
}

/**
 * Sync existing subscription to Revenue Center
 * Used for backfilling or manual sync
 */
export async function syncSubscriptionToRevenueCenter(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Get subscription details
    const [subscription] = await db
      .select()
      .from(agencySubscriptions)
      .where(eq(agencySubscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Get agency details to determine revenue category
    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, subscription.agencyId))
      .limit(1);

    if (!agency) {
      throw new Error(`Agency ${subscription.agencyId} not found`);
    }

    // Determine revenue category based on agency type or subscription plan
    // This is a simplified example - you may have more complex logic
    let revenueCategory: 'developer' | 'agency' | 'agent' | 'vendor' = 'agency';
    
    // Get related invoices
    const relatedInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, subscriptionId));

    // Record each paid invoice as a transaction
    for (const invoice of relatedInvoices) {
      if (invoice.status === 'paid') {
        await recordSubscriptionTransaction({
          subscriptionId: subscription.id,
          agencyId: subscription.agencyId,
          amount: invoice.amount,
          currency: invoice.currency,
          status: 'completed',
          revenueCategory,
          billingPeriodStart: invoice.periodStart ? new Date(invoice.periodStart) : undefined,
          billingPeriodEnd: invoice.periodEnd ? new Date(invoice.periodEnd) : undefined,
          stripePaymentIntentId: invoice.stripeInvoiceId || undefined,
          description: invoice.description || undefined,
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        });
      }
    }

    console.log(`[Revenue Center] Synced subscription ${subscriptionId} with ${relatedInvoices.length} transactions`);
    return relatedInvoices.length;
  } catch (error) {
    console.error('[Revenue Center] Failed to sync subscription:', error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events and sync to Revenue Center
 */
export async function handleStripeWebhook(event: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        // Find the subscription in our database
        const [subscription] = await db
          .select()
          .from(agencySubscriptions)
          .where(eq(agencySubscriptions.stripeSubscriptionId, invoice.subscription))
          .limit(1);

        if (subscription) {
          await recordSubscriptionTransaction({
            subscriptionId: subscription.id,
            agencyId: subscription.agencyId,
            amount: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            status: 'completed',
            revenueCategory: 'agency', // Determine based on your logic
            billingPeriodStart: new Date(invoice.period_start * 1000),
            billingPeriodEnd: new Date(invoice.period_end * 1000),
            stripePaymentIntentId: invoice.payment_intent,
            paymentMethod: invoice.payment_method_types?.[0],
            description: `Subscription payment for period ${new Date(invoice.period_start * 1000).toLocaleDateString()}`,
            metadata: { stripeInvoiceId: invoice.id },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        // Find the subscription in our database
        const [subscription] = await db
          .select()
          .from(agencySubscriptions)
          .where(eq(agencySubscriptions.stripeSubscriptionId, invoice.subscription))
          .limit(1);

        if (subscription) {
          await recordFailedPayment({
            subscriptionId: subscription.id,
            agencyId: subscription.agencyId,
            amount: invoice.amount_due,
            currency: invoice.currency.toUpperCase(),
            failureReason: invoice.last_payment_error?.message,
            failureCode: invoice.last_payment_error?.code,
            stripePaymentIntentId: invoice.payment_intent,
            metadata: { stripeInvoiceId: invoice.id },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        
        // Find and update the transaction
        const [transaction] = await db
          .select()
          .from(subscriptionTransactions)
          .where(eq(subscriptionTransactions.stripePaymentIntentId, charge.payment_intent))
          .limit(1);

        if (transaction) {
          await db
            .update(subscriptionTransactions)
            .set({ status: 'refunded' })
            .where(eq(subscriptionTransactions.id, transaction.id));
        }
        break;
      }

      default:
        console.log(`[Revenue Center] Unhandled webhook event: ${event.type}`);
    }
  } catch (error) {
    console.error('[Revenue Center] Webhook handling error:', error);
    throw error;
  }
}

/**
 * Update failed payment retry status
 */
export async function updateFailedPaymentRetry(failedPaymentId: number, success: boolean) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const [failedPayment] = await db
      .select()
      .from(failedPayments)
      .where(eq(failedPayments.id, failedPaymentId))
      .limit(1);

    if (!failedPayment) {
      throw new Error(`Failed payment ${failedPaymentId} not found`);
    }

    if (success) {
      // Payment retry succeeded
      await db
        .update(failedPayments)
        .set({
          status: 'resolved',
          resolvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(failedPayments.id, failedPaymentId));
    } else {
      // Payment retry failed
      const newRetryCount = failedPayment.retryCount + 1;
      const status = newRetryCount >= failedPayment.maxRetries ? 'abandoned' : 'pending_retry';
      const churnRisk = newRetryCount >= 2 ? 'critical' : failedPayment.churnRisk;

      await db
        .update(failedPayments)
        .set({
          retryCount: newRetryCount,
          status,
          churnRisk,
          lastRetryAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          nextRetryAt: status === 'pending_retry' 
            ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ') // 48 hours
            : null,
        })
        .where(eq(failedPayments.id, failedPaymentId));
    }

    console.log(`[Revenue Center] Updated failed payment ${failedPaymentId} retry status: ${success ? 'resolved' : 'retry failed'}`);
  } catch (error) {
    console.error('[Revenue Center] Failed to update retry status:', error);
    throw error;
  }
}

/**
 * Backfill all existing subscriptions to Revenue Center
 * Run this once to populate historical data
 */
export async function backfillRevenueCenter() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const allSubscriptions = await db.select().from(agencySubscriptions);
    
    let syncedCount = 0;
    for (const subscription of allSubscriptions) {
      try {
        await syncSubscriptionToRevenueCenter(subscription.id);
        syncedCount++;
      } catch (error) {
        console.error(`[Revenue Center] Failed to sync subscription ${subscription.id}:`, error);
      }
    }

    console.log(`[Revenue Center] Backfill complete: ${syncedCount}/${allSubscriptions.length} subscriptions synced`);
    return { total: allSubscriptions.length, synced: syncedCount };
  } catch (error) {
    console.error('[Revenue Center] Backfill failed:', error);
    throw error;
  }
}
