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
