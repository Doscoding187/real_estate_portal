import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('provider-independent billing foundation contract', () => {
  const billingRouter = readRepoFile('server/billingRouter.ts');
  const billingService = readRepoFile('server/services/billingFoundationService.ts');
  const proofStorage = readRepoFile('server/services/billingProofStorage.ts');
  const billingSchema = readRepoFile('drizzle/schema/billing.ts');
  const agencyRouter = readRepoFile('server/agencyRouter.ts');
  const agentEntitlements = readRepoFile('server/services/agentEntitlementService.ts');

  it('keeps the billing router and foundation service independent from Stripe checkout', () => {
    expect(billingRouter).not.toMatch(/from ['"]stripe['"]/);
    expect(billingService).not.toMatch(/from ['"]stripe['"]/);
    expect(billingRouter).not.toContain('stripe.checkout.sessions.create');
    expect(billingRouter).toContain('startManualEftCheckout');
    expect(billingRouter).toContain("sessionId: `manual_eft:${result.invoice.id}`");
  });

  it('models the canonical billing lifecycle and audit tables', () => {
    for (const status of [
      'pending_payment',
      'payment_under_review',
      'active',
      'past_due',
      'grace_period',
      'suspended',
      'cancelled',
      'expired',
    ]) {
      expect(billingSchema).toContain(`'${status}'`);
    }

    expect(billingSchema).toContain('billing_invoices');
    expect(billingSchema).toContain('billing_payments');
    expect(billingSchema).toContain('billing_payment_documents');
    expect(billingSchema).toContain('billing_audit_events');
    expect(billingSchema).toContain("unique('uq_billing_invoices_invoice_number')");
    expect(billingSchema).toContain("unique('uq_billing_invoices_payment_reference')");
  });

  it('stores manual EFT proofs privately and never as public listing media', () => {
    expect(proofStorage).toContain('BILLING_PRIVATE_STORAGE_DIR');
    expect(proofStorage).toContain(".private', 'billing-proofs'");
    expect(proofStorage).toContain("adapter: 's3'");
    expect(proofStorage).toContain('BILLING_PROOF_S3_BUCKET');
    expect(proofStorage).toContain("ServerSideEncryption: 'AES256'");
    expect(billingService).toContain('const MAX_PROOF_BYTES = 10 * 1024 * 1024');
    expect(billingService).toContain('storeBillingProofDocument');
    expect(billingService).toContain('readBillingProofDocument');

    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']) {
      expect(billingService).toContain(`'${mimeType}'`);
    }

    expect(billingService).toContain("visibility: 'private'");
    expect(billingService).toContain('excluded_from_public_media: true');
    expect(proofStorage).toContain('await writeFile(absolutePath, input.buffer, { mode: 0o600 })');
    expect(billingService).not.toContain('publicUrl');
    expect(billingService).not.toContain('listingMedia');
  });

  it('does not activate access when proof is uploaded for review', () => {
    const uploadPath = billingService.slice(
      billingService.indexOf('export async function submitAgencyPaymentProof'),
      billingService.indexOf('export async function getAdminFinanceQueue'),
    );

    expect(uploadPath).toContain("status: 'submitted'");
    expect(uploadPath).toContain("let nextSubscriptionStatus: CanonicalSubscriptionStatus = 'payment_under_review'");
    expect(uploadPath).toContain("status: 'payment_under_review'");
    expect(uploadPath).not.toContain('activateSubscriptionForPaidInvoice');
    expect(uploadPath).not.toContain('payment_approved_subscription_activated');
  });

  it('activates only after full finance approval and treats duplicate approval as idempotent', () => {
    const reviewPath = billingService.slice(
      billingService.indexOf('export async function reviewManualPayment'),
      billingService.indexOf('export async function updateSubscriptionLifecycle'),
    );

    expect(reviewPath).toContain("beforePayment.state === 'verified' && input.decision === 'approve'");
    expect(reviewPath).toContain('idempotent: true');
    expect(reviewPath).toContain("const invoicePaid = amountPaid >= invoice.amountDue && input.decision !== 'partial_payment'");
    expect(reviewPath).toContain('overpaymentAmount');
    expect(reviewPath).toContain('partial_payment_does_not_activate');
    expect(reviewPath).toContain('activateSubscriptionForPaidInvoice');
    expect(reviewPath).toContain("eventType: invoicePaid ? 'payment_approved_subscription_activated' : 'payment_partially_approved'");
  });

  it('preserves invoice price snapshots and deterministic renewal period policy', () => {
    expect(billingService).toContain('buildInvoicePriceSnapshot');
    expect(billingService).toContain('price_snapshot: priceSnapshot');
    expect(billingService).toContain('period_policy: invoicePeriod.reason');
    expect(billingService).toContain('active_early_renewal');
    expect(billingService).toContain('grace_period_renewal');
    expect(billingService).toContain('activation_period_policy');
    expect(billingService).toContain('currentPeriodStart: periodStart');
    expect(billingService).toContain('currentPeriodEnd: periodEnd');
  });

  it('routes agency publishing and agent paid entitlements through paid subscription states', () => {
    const submitForReviewPath = agencyRouter.slice(
      agencyRouter.indexOf('submitListingForReview: agencyAdminProcedure'),
      agencyRouter.indexOf('archiveListing: agencyAdminProcedure'),
    );

    expect(agencyRouter).toContain('isPaidSubscriptionEntitled');
    expect(agencyRouter).toContain("'payment_under_review'");
    expect(submitForReviewPath).toContain('getAgencyAccessStateForUser');
    expect(submitForReviewPath).toContain('workspaceAccess.publishing');
    expect(submitForReviewPath).toContain("code: 'FORBIDDEN'");
    expect(agentEntitlements).toContain('isPaidSubscriptionEntitled');
    expect(agentEntitlements).toContain("user.plan === 'paid'");
  });
});
