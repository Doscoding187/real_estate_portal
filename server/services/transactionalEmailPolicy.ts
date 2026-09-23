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

export const LAUNCH_PRODUCT_EMAIL_TERMS: Record<PaidMvpLaunchAccessProductKey, {
  audience: string;
  price: string;
  actionPath: string;
}> = {
  agent_launch_access: { audience: 'Independent Agent', price: 'R499', actionPath: '/agent/select-package' },
  agency_launch_access: { audience: 'Agency', price: 'R999', actionPath: '/agency/billing' },
  developer_launch_access: { audience: 'Developer', price: 'R1,499', actionPath: '/developer/plans' },
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
  };
}): { subject: string; text: string; html: string } {
  const terms = LAUNCH_PRODUCT_EMAIL_TERMS[input.product];
  const actionUrl = input.purpose === 'agency_invitation'
    ? input.invitationUrl
    : `${input.publicOrigin}${terms.actionPath}`;
  if (!actionUrl) throw new Error('Invitation URL is required.');
  const invoiceDetails = input.purpose === 'invoice_issued' && input.invoice
    ? `\nInvoice: ${input.invoice.invoiceNumber}\nEFT payment reference: ${input.invoice.paymentReference}\nInvoice total: ${new Intl.NumberFormat('en-ZA', {
      style: 'currency', currency: input.invoice.currency, maximumFractionDigits: 0,
    }).format(input.invoice.amountDue / 100)}.`
    : '';
  const message: Record<LaunchEmailPurpose, string> = {
    invoice_issued: `Your ${terms.audience} Launch Access invoice is ready. The total is ${terms.price} once-off for 90 days with no automatic renewal. Pay by EFT using the invoice reference; access starts only after funds reconciliation and finance approval.`,
    payment_correction_requested: 'Your payment proof needs a correction. Open Launch Access to review the request and submit corrected evidence.',
    payment_rejected: 'Your payment proof was not approved. Open Launch Access to review the decision or contact support.',
    payment_approved: `Your ${terms.audience} Launch Access payment has been verified and access is active for 90 days. There is no automatic renewal.`,
    partial_payment: 'A partial payment was recorded. Open Launch Access to view the remaining amount and next step. Access is not active until finance approves the full payment.',
    launch_access_expiry_notice: 'Your Launch Access term is nearing its end. Open Launch Access to arrange another once-off term. There is no automatic renewal.',
    launch_access_expired: 'Your Launch Access term has ended. Existing business records and enquiries remain available; new paid publication and enquiry intake require another approved term.',
    agency_invitation: 'You have been invited to join an Agency on Property Listify. Accept the invitation using the link below.',
  };
  const subject: Record<LaunchEmailPurpose, string> = {
    invoice_issued: 'Property Listify Launch Access invoice',
    payment_correction_requested: 'Property Listify payment correction needed',
    payment_rejected: 'Property Listify payment review',
    payment_approved: 'Property Listify Launch Access activated',
    partial_payment: 'Property Listify partial payment recorded',
    launch_access_expiry_notice: 'Property Listify Launch Access ending soon',
    launch_access_expired: 'Property Listify Launch Access ended',
    agency_invitation: 'Property Listify Agency invitation',
  };
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
  const text = `${message[input.purpose]}${invoiceDetails}\n\n${actionUrl}\n\nProperty Listify (Pty) Ltd is not VAT registered and does not charge VAT.`;
  const escapedInvoiceDetails = invoiceDetails
    ? `<p>${invoiceDetails.trim().split('\n').map(escape).join('<br>')}</p>`
    : '';
  return {
    subject: subject[input.purpose],
    text,
    html: `<p>${escape(message[input.purpose])}</p>${escapedInvoiceDetails}<p><a href="${escape(actionUrl)}">Open Property Listify</a></p><p>Property Listify (Pty) Ltd is not VAT registered and does not charge VAT.</p>`,
  };
}
