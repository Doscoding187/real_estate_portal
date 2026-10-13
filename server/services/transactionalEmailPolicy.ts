import type { PaidMvpLaunchAccessProductKey } from '../../shared/commercialActivation';

export type LaunchEmailPurpose =
  | 'invoice_issued'
  | 'payment_correction_requested'
  | 'payment_rejected'
  | 'payment_approved'
  | 'payment_notice_received'
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
  payment_notice_received: 'payment_notice_received',
  payment_unmatched: 'payment_rejected',
  payment_duplicate: 'payment_rejected',
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
    status?: string;
    amountPaid?: number;
    bankDetails?: {
      accountName: string;
      bankName: string;
      accountNumber: string;
      branchCode: string;
      accountType: string;
    };
  };
  noticeReviewed?: boolean;
  term?: {
    start: string;
    end: string;
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
  // Customer-facing notices follow the founder's manual-EFT implementation brief.
  // Financial records remain canonical in the account; provider retention is separate.
  let message: string;
  let subject: string;
  switch (input.purpose) {
    case 'agency_invitation':
      subject = 'Property Listify Agency invitation';
      message =
        'You have been invited to join an Agency on Property Listify. Accept the invitation using the link below.';
      break;
    case 'invoice_issued': {
      subject = 'Property Listify invoice issued';
      const invoice = input.invoice;
      const bank = invoice?.bankDetails;
      message = invoice
        ? `Invoice: ${invoice.invoiceNumber}\nAmount: ${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: invoice.currency }).format(invoice.amountDue / 100)}\nPayment reference: ${invoice.paymentReference}`
        : 'Your invoice is ready in your account.';
      if (invoice?.status === 'paid') {
        message +=
          '\nThis invoice is already settled. Do not pay it again. Open your account for the recorded access term.';
        break;
      }
      if (invoice && Number(invoice.amountPaid) > 0) {
        message += `\nBalance still due: ${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: invoice.currency }).format(Math.max(0, invoice.amountDue - Number(invoice.amountPaid)) / 100)}`;
      }
      if (bank && Object.values(bank).every(value => typeof value === 'string' && value.trim())) {
        message += `\nPayee: ${bank.accountName}\nBank: ${bank.bankName}\nAccount number: ${bank.accountNumber}\nBranch code: ${bank.branchCode}\nAccount type: ${bank.accountType}`;
      } else {
        message += '\nOpen your signed-in account for the company bank details.';
      }
      message +=
        '\nPay by EFT from your banking app. Copy the invoice reference exactly into the transfer reference field. Then select “I’ve paid” in your account; no document is required. Access starts only after bank funds are matched and approved.';
      break;
    }
    case 'payment_notice_received':
      subject = input.noticeReviewed
        ? 'Property Listify payment notice — review update'
        : 'Property Listify payment notice — verification pending';
      message = input.noticeReviewed
        ? 'We received your payment notice and its review status has changed. Sign in for the current decision and any next steps. A customer notice alone does not confirm received bank funds or activate access.'
        : 'We received your payment notice. This is a customer notification, not confirmation of received bank funds. Verification is pending. Access begins only after the payment is matched to the bank receipt and approved. Sign in to review it.';
      break;
    case 'payment_approved':
      subject = 'Property Listify Launch Access activated';
      message =
        'Your bank payment was verified and your fully settled invoice was approved. Your 90-day Launch Access term was activated.';
      if (input.term)
        message += `\nPaid term start: ${input.term.start} UTC\nPaid term end: ${input.term.end} UTC`;
      else message += '\nOpen your account for the recorded start and end dates.';
      message +=
        '\nOpen your workspace to create or manage listings. Publication remains subject to moderation. There is no automatic renewal.';
      break;
    case 'payment_correction_requested':
    case 'payment_rejected':
      subject = 'Property Listify payment review — action needed';
      message =
        'Your payment could not be approved. Check the invoice reference and contact support for the next step. This notice does not activate paid access.';
      break;
    case 'partial_payment':
      subject = 'Property Listify partial payment recorded';
      message =
        'A bank-verified partial payment was recorded. New paid access remains pending until the invoice is fully settled and approved. Sign in to review the balance.';
      break;
    default:
      subject = 'Property Listify account update';
      message = 'A new update is available in your Property Listify account. Sign in to review it.';
  }
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
    html: `<p>${escape(message).replace(/\n/g, '<br />')}</p><p><a href="${escape(actionUrl)}">Open Property Listify</a></p><p><a href="${escape(termsUrl)}">Terms of Service</a> · <a href="${escape(privacyUrl)}">Privacy Notice</a></p><p>Support and billing: <a href="mailto:support@propertylistifysa.co.za">support@propertylistifysa.co.za</a></p><p>Property Listify (Pty) Ltd is not VAT registered and does not charge VAT.</p>`,
  };
}
