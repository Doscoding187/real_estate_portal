/**
 * Revenue Center Integration Guide
 * How to integrate Subscription Management with Revenue Center
 */

// ============================================
// EXAMPLE 1: Recording a Subscription Payment
// ============================================

import { recordSubscriptionTransaction } from './revenueCenterSync';

// When a subscription payment is successfully processed:
async function handleSuccessfulPayment(subscriptionId: number, invoiceData: any) {
  // Record in Revenue Center for analytics
  await recordSubscriptionTransaction({
    subscriptionId,
    agencyId: invoiceData.agencyId,
    userId: invoiceData.userId,
    amount: invoiceData.amount, // in cents
    currency: 'ZAR',
    status: 'completed',
    revenueCategory: 'agency', // or 'developer', 'agent', 'vendor'
    billingPeriodStart: invoiceData.periodStart,
    billingPeriodEnd: invoiceData.periodEnd,
    stripePaymentIntentId: invoiceData.paymentIntentId,
    paymentMethod: 'card',
    description: `Monthly subscription payment`,
  });
}

// ============================================
// EXAMPLE 2: Recording a Failed Payment
// ============================================

import { recordFailedPayment } from './revenueCenterSync';

// When a subscription payment fails:
async function handleFailedPayment(subscriptionId: number, errorData: any) {
  // Record in Revenue Center for churn prevention
  await recordFailedPayment({
    subscriptionId,
    agencyId: errorData.agencyId,
    amount: errorData.amount,
    currency: 'ZAR',
    failureReason: errorData.error.message,
    failureCode: errorData.error.code,
    stripePaymentIntentId: errorData.paymentIntentId,
  });
  
  // This automatically:
  // - Sets churn risk level
  // - Schedules retry in 24 hours
  // - Tracks for dunning management
}

// ============================================
// EXAMPLE 3: Stripe Webhook Integration
// ============================================

import { handleStripeWebhook } from './revenueCenterSync';

// In your Stripe webhook endpoint:
export async function stripeWebhookHandler(req: any, res: any) {
  const event = req.body;
  
  try {
    // Let Revenue Center handle the event
    await handleStripeWebhook(event);
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
}

// ============================================
// EXAMPLE 4: Backfilling Historical Data
// ============================================

import { backfillRevenueCenter } from './revenueCenterSync';

// Run once to populate Revenue Center with existing data:
async function runBackfill() {
  console.log('Starting Revenue Center backfill...');
  const result = await backfillRevenueCenter();
  console.log(`Backfill complete: ${result.synced}/${result.total} subscriptions synced`);
}

// ============================================
// EXAMPLE 5: Admin Router Integration
// ============================================

// Add to adminRouter.ts:

import { 
  recordSubscriptionTransaction,
  recordFailedPayment,
  updateFailedPaymentRetry,
  backfillRevenueCenter 
} from './revenueCenterSync';

// Endpoint to manually sync a subscription
manualSyncSubscription: superAdminProcedure
  .input(z.object({ subscriptionId: z.number() }))
  .mutation(async ({ input }) => {
    const { syncSubscriptionToRevenueCenter } = await import('./revenueCenterSync');
    const count = await syncSubscriptionToRevenueCenter(input.subscriptionId);
    return { success: true, transactionsSynced: count };
  }),

// Endpoint to run backfill
backfillRevenueData: superAdminProcedure
  .mutation(async () => {
    const result = await backfillRevenueCenter();
    return result;
  }),

// Endpoint to retry a failed payment
retryFailedPayment: superAdminProcedure
  .input(z.object({ 
    failedPaymentId: z.number(),
    success: z.boolean() 
  }))
  .mutation(async ({ input }) => {
    await updateFailedPaymentRetry(input.failedPaymentId, input.success);
    return { success: true };
  }),

// ============================================
// EXAMPLE 6: Billing Router Integration
// ============================================

// In billingRouter.ts, after processing a payment:

import { recordSubscriptionTransaction, recordFailedPayment } from './revenueCenterSync';

// After successful charge:
const charge = await stripe.charges.create({...});
if (charge.status === 'succeeded') {
  // Update subscription in database
  await updateSubscription(subscriptionId, { status: 'active' });
  
  // Sync to Revenue Center
  await recordSubscriptionTransaction({
    subscriptionId,
    agencyId,
    amount: charge.amount,
    status: 'completed',
    revenueCategory: determineRevenueCategory(agency),
    stripePaymentIntentId: charge.payment_intent,
    paymentMethod: charge.payment_method_details?.type,
  });
}

// After failed charge:
if (charge.status === 'failed') {
  // Sync to Revenue Center for churn tracking
  await recordFailedPayment({
    subscriptionId,
    agencyId,
    amount: charge.amount,
    failureReason: charge.failure_message,
    failureCode: charge.failure_code,
    stripePaymentIntentId: charge.payment_intent,
  });
}

// ============================================
// HELPER FUNCTION: Determine Revenue Category
// ============================================

function determineRevenueCategory(agency: any): 'developer' | 'agency' | 'agent' | 'vendor' {
  // Your business logic to categorize agencies
  if (agency.type === 'property_developer') return 'developer';
  if (agency.agentCount > 1) return 'agency';
  if (agency.agentCount === 1) return 'agent';
  return 'vendor';
}

// ============================================
// AUTOMATED SYNC PATTERN
// ============================================

// Best practice: Use database triggers or event listeners
// to automatically sync when invoices are paid

// Example with event emitter:
import { EventEmitter } from 'events';
const billingEvents = new EventEmitter();

billingEvents.on('invoice.paid', async (invoice) => {
  await recordSubscriptionTransaction({
    subscriptionId: invoice.subscriptionId,
    agencyId: invoice.agencyId,
    amount: invoice.amount,
    status: 'completed',
    revenueCategory: invoice.revenueCategory,
    billingPeriodStart: invoice.periodStart,
    billingPeriodEnd: invoice.periodEnd,
  });
});

billingEvents.on('payment.failed', async (payment) => {
  await recordFailedPayment({
    subscriptionId: payment.subscriptionId,
    agencyId: payment.agencyId,
    amount: payment.amount,
    failureReason: payment.error.message,
    failureCode: payment.error.code,
  });
});

// Emit events in your billing code:
// billingEvents.emit('invoice.paid', invoiceData);
// billingEvents.emit('payment.failed', paymentData);
