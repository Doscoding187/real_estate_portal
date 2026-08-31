export const PUBLIC_LEAD_CONSENT_VERSION = '2026-08-02';

function fallbackUuidV4(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 version and variant bits keep the fallback compatible with
  // server procedures that treat the capture ID as a UUID capability token.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createLeadCaptureRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return fallbackUuidV4();
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
