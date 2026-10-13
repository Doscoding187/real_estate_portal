import type { PaidMvpLaunchAccessProductKey } from '../../shared/commercialActivation';

export type LaunchEmailPurpose =
  | 'invoice_issued'
  | 'payment_correction_requested'
  | 'payment_rejected'
  | 'payment_approved'
  | 'partial_payment'
  | 'launch_access_expiry_notice'
  | 'launch_access_expired'
  | 'agency_invitation';

/** The audit event is canonical; notification text is never a template selector. */
export const BILLING_AUDIT_EMAIL_POLICY: Readonly<Record<string, LaunchEmailPurpose | null>> = {
  invoice_issued: 'invoice_issued',
  payment_request_correction: 'payment_correction_requested',
  payment_reject: 'payment_rejected',
  payment_approved_subscription_activated: 'payment_approved',
  payment_partially_approved: 'partial_payment',
  payment_proof_received: null,
  payment_approved_invoice_already_paid: null,
  subscription_lifecycle_updated: null,
  subscription_cancellation_requested: null,
  subscription_restored: null,
};

export const LAUNCH_PRODUCT_EMAIL_TERMS: Record<
  PaidMvpLaunchAccessProductKey,
  {
    audience: string;
    price: string;
    actionPath: string;
  }
> = {
  agent_launch_access: {
    audience: 'Independent Agent',
    price: 'R499',
    actionPath: '/agent/select-package',
  },
  agency_launch_access: { audience: 'Agency', price: 'R999', actionPath: '/agency/billing' },
  developer_launch_access: {
    audience: 'Developer',
    price: 'R1,499',
    actionPath: '/developer/plans',
  },
};

export function requiredBillingEmailPurpose(eventType: string): LaunchEmailPurpose | null {
  return BILLING_AUDIT_EMAIL_POLICY[eventType] ?? null;
}

export function renderLaunchEmail(input: {
  purpose: LaunchEmailPurpose;
  product: PaidMvpLaunchAccessProductKey;
  publicOrigin: string;
  invitationUrl?: string;
  invoice?: {
    invoiceNumber: string;
    paymentReference: string;
    amountDue: number;
    currency: string;
    legalBundleId?: string;
  };
}): { subject: string; text: string; html: string } {
  const terms = LAUNCH_PRODUCT_EMAIL_TERMS[input.product];
  const actionUrl =
    input.purpose === 'agency_invitation'
      ? input.invitationUrl
      : `${input.publicOrigin}${terms.actionPath}`;
  if (!actionUrl) throw new Error('Invitation URL is required.');
  const bundleQuery = input.invoice?.legalBundleId
    ? `?bundle=${encodeURIComponent(input.invoice.legalBundleId)}`
    : '';
  const termsUrl = `${input.publicOrigin}/legal/terms${bundleQuery}`;
  const privacyUrl = `${input.publicOrigin}/legal/privacy${bundleQuery}`;
  // Financial facts stay in the authenticated account backed by the domestic
  // canonical records. The foreign email processor gets only a notification.
  const message =
    input.purpose === 'agency_invitation'
      ? 'You have been invited to join an Agency on Property Listify. Accept the invitation using the link below.'
      : 'A new update is available in your Property Listify account. Sign in to review it. Payment instructions, invoices and decisions are available inside your account.';
  const subject =
    input.purpose === 'agency_invitation'
      ? 'Property Listify Agency invitation'
      : 'Property Listify account update';
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      char =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char]!,
    );
  const text = `${message}\n\n${actionUrl}\n\nTerms of Service: ${termsUrl}\nPrivacy Notice: ${privacyUrl}\nSupport and billing: support@propertylistifysa.co.za\n\nProperty Listify (Pty) Ltd is not VAT registered and does not charge VAT.`;
  return {
    subject,
    text,
    html: `<p>${escape(message)}</p><p><a href="${escape(actionUrl)}">Open Property Listify</a></p><p><a href="${escape(termsUrl)}">Terms of Service</a> · <a href="${escape(privacyUrl)}">Privacy Notice</a></p><p>Support and billing: <a href="mailto:support@propertylistifysa.co.za">support@propertylistifysa.co.za</a></p><p>Property Listify (Pty) Ltd is not VAT registered and does not charge VAT.</p>`,
  };
}
