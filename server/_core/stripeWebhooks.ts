import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, verifyStripeWebhook } from './stripe';
import { getDb } from '../db';
import {
  agencySubscriptions,
  invoices,
  agencies,
  plans,
  invitations,
  users,
} from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { EmailService } from './emailService';
import { MockEmailService } from './email/mockEmailService';
import { TRPCError } from '@trpc/server';

// Use mock email service in development
const emailService =
  process.env.NODE_ENV === 'development' || process.env.VITE_USE_MOCK_EMAILS === 'true'
    ? MockEmailService
    : EmailService;

// Webhook event handlers
export const handleStripeWebhook = async (req: Request, res: Response) => {
  // Check if Stripe is configured
  if (!stripe) {
    console.warn('Stripe not configured, skipping webhook processing');
    return res.status(200).json({ received: true, status: 'stripe_not_configured' });
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database not available',
    });
  }

  try {
    // Verify webhook signature
    const event = verifyStripeWebhook(req.body, req.headers['stripe-signature'] as string);

    console.log(`🔔 Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, db);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, db);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, db);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, db);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, db);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, db);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error}`);
  }
};

// Handle subscription creation
async function handleSubscriptionCreated(subscription: Stripe.Subscription, db: any) {
  try {
    // Find the subscription record in our database
    const [existingSubscription] = await db
      .select()
      .from(agencySubscriptions)
      .where(eq(agencySubscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (existingSubscription) {
      // Send email notification for subscription activation
      if (subscription.status === 'active' && existingSubscription.status !== 'active') {
        const [agency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, existingSubscription.agencyId))
          .limit(1);
        const [plan] = await db
          .select()
          .from(plans)
          .where(eq(plans.id, existingSubscription.planId))
          .limit(1);

        if (agency && plan) {
          await EmailService.sendSubscriptionCreatedEmail(
            agency.email,
            agency.name,
            plan.displayName,
          );
        }
      }

      // Update existing subscription
      await db
        .update(agencySubscriptions)
        .set({
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : null,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(agencySubscriptions.id, existingSubscription.id));
    }

    console.log(`✅ Subscription created: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, db: any) {
  try {
    const updateData: any = {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
      updatedAt: new Date(),
    };

    // Update subscription price if changed
    if (subscription.items.data[0]?.price?.id) {
      updateData.stripePriceId = subscription.items.data[0].price.id;
    }

    await db
      .update(agencySubscriptions)
      .set(updateData)
      .where(eq(agencySubscriptions.stripeSubscriptionId, subscription.id));

    console.log(`✅ Subscription updated: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, db: any) {
  try {
    // Update subscription status and downgrade agency to free plan
    const [existingSubscription] = await db
      .select()
      .from(agencySubscriptions)
      .where(eq(agencySubscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (existingSubscription) {
      // Update subscription
      await db
        .update(agencySubscriptions)
        .set({
          status: 'canceled',
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agencySubscriptions.id, existingSubscription.id));

      // Send cancellation email
      const [agency] = await db
        .select()
        .from(agencies)
        .where(eq(agencies.id, existingSubscription.agencyId))
        .limit(1);
      if (agency) {
        const endDate = existingSubscription.currentPeriodEnd?.toLocaleDateString() || 'period end';
        await EmailService.sendSubscriptionCancelledEmail(agency.email, agency.name, endDate);
      }

      // Downgrade agency to free plan
      await db
        .update(agencies)
        .set({
          subscriptionPlan: 'free',
          subscriptionStatus: 'canceled',
          subscriptionExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, existingSubscription.agencyId));
    }

    console.log(`✅ Subscription canceled: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, db: any) {
  try {
    // Create or update invoice record
    const invoiceData = {
      agencyId: 0, // Will be set below
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer as string,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'paid',
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoiceNumber: invoice.number,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      paidAt: new Date(),
      updatedAt: new Date(),
    };

    // Find agency by customer ID
    const [subscription] = await db
      .select()
      .from(agencySubscriptions)
      .where(eq(agencySubscriptions.stripeCustomerId, invoice.customer as string))
      .limit(1);

    if (subscription) {
      invoiceData.agencyId = subscription.agencyId;

      await db.insert(invoices).values(invoiceData).onDuplicateKeyUpdate({
        set: invoiceData,
      });
    }

    console.log(`✅ Invoice paid: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, db: any) {
  try {
    // Update invoice status
    await db
      .update(invoices)
      .set({
        status: 'uncollectible',
        updatedAt: new Date(),
      })
      .where(eq(invoices.stripeInvoiceId, invoice.id));

    console.log(`❌ Invoice payment failed: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

// Handle checkout session completion
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, db: any) {
  try {
    const { agencyId, planId } = session.metadata || {};

    if (!agencyId || !planId) {
      console.warn('⚠️  Missing metadata in checkout session:', session.id);
      return;
    }

    const numericAgencyId = parseInt(agencyId, 10);
    const numericPlanId = parseInt(planId, 10);

    // 1. Update agency subscription to active
    await db
      .update(agencies)
      .set({
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, numericAgencyId));

    // 2. Get agency details with owner for email context
    const [agency] = await db
      .select({
        id: agencies.id,
        name: agencies.name,
        email: agencies.email,
        ownerEmail: users.email,
        ownerName: users.name,
        ownerFirstName: users.firstName,
      })
      .from(agencies)
      .leftJoin(users, eq(agencies.id, users.agencyId))
      .where(eq(agencies.id, numericAgencyId))
      .limit(1);

    if (!agency) {
      console.error(`❌ Agency ${agencyId} not found after checkout`);
      return;
    }

    const [plan] = await db.select().from(plans).where(eq(plans.id, numericPlanId)).limit(1);

    // 3. Get pending team invitations
    const teamInvitations = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.agencyId, numericAgencyId), eq(invitations.status, 'pending')))
      .limit(50); // Safety limit

    // 4. Send team invitation emails
    let successCount = 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const invitation of teamInvitations) {
      try {
        const inviteUrl = `${appUrl}/invite/accept?token=${invitation.token}`;
        const inviterName =
          agency.ownerName ||
          agency.ownerFirstName ||
          agency.ownerEmail?.split('@')[0] ||
          'Your colleague';

        // Send invitation email via EmailService
        await emailService.sendEmail({
          to: invitation.email,
          subject: `You've been invited to join ${agency.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>You're Invited! 🎉</h1>
              <p>
                <strong>${inviterName}</strong> has invited you to join 
                <strong>${agency.name}</strong> on SA Property Portal.
              </p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>What's next?</strong></p>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>Click the button below to accept your invitation</li>
                  <li>Create your account or sign in</li>
                  <li>Start collaborating with your team!</li>
                </ol>
              </div>

              <a href="${inviteUrl}" 
                 style="display: inline-block; background: #2563eb; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        font-weight: bold; margin: 20px 0;">
                Accept Invitation
              </a>

              <p style="color: #666; font-size: 14px;">
                This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString()}.
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        });

        successCount++;
        console.log(`✅ Invitation sent to ${invitation.email} for agency ${agencyId}`);
      } catch (error) {
        console.error(`❌ Failed to send invitation to ${invitation.email}:`, error);
      }
    }

    console.log(
      `📧 Sent ${successCount}/${teamInvitations.length} team invitations for agency ${agencyId}`,
    );

    // 5. Send welcome email to agency owner
    if (agency.email) {
      try {
        await emailService.sendEmail({
          to: agency.email,
          subject: `Welcome to SA Property Portal, ${agency.name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Welcome aboard, ${agency.name}! 🏠</h1>
              
              <p>
                Congratulations! Your agency is now active on our platform with the 
                <strong>${plan?.displayName || 'selected'}</strong> plan.
              </p>

              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; 
                          padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>✅ Your account is fully activated</strong></p>
                <p style="margin: 10px 0 0 0;">
                  ${successCount > 0 ? `We've sent invitations to ${successCount} team member${successCount > 1 ? 's' : ''}.` : 'You can invite team members from your dashboard.'}
                </p>
              </div>

              <h3>Next Steps:</h3>
              <ol>
                <li>Complete your agency profile</li>
                <li>Add your first property listing</li>
                <li>Invite additional team members</li>
                <li>Configure your branding preferences</li>
              </ol>

              <a href="${appUrl}/agency/dashboard" 
                 style="display: inline-block; background: #2563eb; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        font-weight: bold; margin: 20px 0;">
                Go to Dashboard
              </a>

              <p style="color: #666; margin-top: 30px;">
                Need help getting started? Contact our support team for assistance.
              </p>
            </div>
          `,
        });
        console.log(`✅ Welcome email sent to ${agency.email}`);
      } catch (error) {
        console.error(`❌ Failed to send welcome email:`, error);
      }
    }

    console.log(`✅ Checkout completed and processed: ${session.id}`);
  } catch (error) {
    console.error('❌ Error handling checkout session completed:', error);
    // Let Stripe retry if there's an error
    throw error;
  }
}
