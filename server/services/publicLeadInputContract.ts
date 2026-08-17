/**
 * Canonical limits for untrusted public lead-capture payloads. These mirror
 * the durable lead model where it has bounded columns and put a practical
 * ceiling on text fields before any database or ownership work begins.
 */
export const PUBLIC_LEAD_INPUT_LIMITS = Object.freeze({
  name: 200,
  email: 320,
  phone: 50,
  message: 5000,
  source: 100,
  referrerUrl: 2048,
  utm: 100,
  honeypot: 200,
  unitId: 36,
  unitName: 255,
  captureRequestIdMin: 8,
  captureRequestId: 128,
  consentVersion: 64,
  consentSource: 100,
  calculatedAt: 64,
} as const);
