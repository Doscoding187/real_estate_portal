import Stripe from 'stripe';
import { ENV } from './env';

// Initialize Stripe with secret key (only if available)
export const stripe = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  : null;

// Webhook signature verification
export function verifyStripeWebhook(rawBody: Buffer, signature: string): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in .env');
  }
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, ENV.stripeWebhookSecret);
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`);
  }
}

// Helper function to get customer by agency ID
export async function getOrCreateStripeCustomer(
  agencyId: number,
  agencyName: string,
  email?: string,
): Promise<string> {
  // This would typically be implemented with database queries
  // For now, return a placeholder - implement when we have the database functions
  throw new Error('Not implemented: getOrCreateStripeCustomer');
}

// Helper function to get subscription by Stripe subscription ID
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  // This would be implemented with database queries
  throw new Error('Not implemented: getSubscriptionByStripeId');
}

// Helper function to update subscription status
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  metadata?: any,
) {
  // This would be implemented with database queries
  throw new Error('Not implemented: updateSubscriptionStatus');
}
