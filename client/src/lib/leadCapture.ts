export const PUBLIC_LEAD_CONSENT_VERSION = '2026-08-02';

export function createLeadCaptureRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function publicLeadConsent(source: string) {
  return {
    accepted: true as const,
    version: PUBLIC_LEAD_CONSENT_VERSION,
    source,
  };
}

type PublicLeadCaptureAuthorityResult = {
  deliveryStatus?: unknown;
  leadCustody?: unknown;
  recipientType?: unknown;
  recipientId?: unknown;
};

function asAuthorityResult(value: unknown): PublicLeadCaptureAuthorityResult {
  return value && typeof value === 'object' ? (value as PublicLeadCaptureAuthorityResult) : {};
}

export function hasVerifiedPublicLeadRecipient(value: unknown): boolean {
  const result = asAuthorityResult(value);
  return (
    result.deliveryStatus === 'delivered' &&
    result.leadCustody === 'verified_customer_recipient' &&
    (result.recipientType === 'agent' ||
      result.recipientType === 'agency' ||
      result.recipientType === 'developer') &&
    Number.isSafeInteger(Number(result.recipientId)) &&
    Number(result.recipientId) > 0
  );
}

export function publicLeadCaptureAcknowledgement(
  value: unknown,
  verifiedRecipientMessage: string,
): string {
  const result = asAuthorityResult(value);

  if (hasVerifiedPublicLeadRecipient(result)) return verifiedRecipientMessage;
  if (result.leadCustody === 'platform_managed') {
    return 'Your enquiry was captured by Property Listify. Our team will review the request.';
  }
  if (
    result.leadCustody === 'attention_required' ||
    result.deliveryStatus === 'attention_required'
  ) {
    return 'Your enquiry was captured by Property Listify. Recipient verification is required before direct contact.';
  }
  return 'Your enquiry was captured by Property Listify. Direct recipient contact is not yet authorized.';
}
