import { and, desc, eq } from 'drizzle-orm';
import { twilioVerifyClient } from './twilioVerifyClient';
import { getDb } from '../db-connection';
import { slVerifications } from '../../drizzle/schema';

/**
 * Shared Living trust ladder, rung 1: phone verification.
 *
 * Publishing floor for every Shared Living lister. Uses Twilio Verify when
 * configured; disposable/non-production environments may enable the explicit
 * dev-mode fallback (SL_PHONE_OTP_DEV_MODE=1) which accepts a fixed code so
 * journeys can be exercised without external providers. Dev mode is refused
 * outright in production.
 */

export type PhoneVerificationSendResult =
  | { status: 'sent' }
  | { status: 'dev_mode'; devCode: string }
  | { status: 'unconfigured' };

export type PhoneVerificationCheckResult =
  | { status: 'verified' }
  | { status: 'rejected'; reason: string };

const DEV_MODE_CODE = '000000';

function isDevModeEnabled(): boolean {
  return (
    process.env.SL_PHONE_OTP_DEV_MODE === '1' &&
    process.env.NODE_ENV !== 'production'
  );
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s()-]/g, '');
}

async function recordVerification(
  userId: number,
  evidenceRef: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(slVerifications).values({
    subjectType: 'user',
    subjectId: userId,
    rung: 'phone',
    status: 'verified',
    evidenceRef,
  });
}

export async function hasVerifiedPhone(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ id: slVerifications.id })
    .from(slVerifications)
    .where(
      and(
        eq(slVerifications.subjectType, 'user'),
        eq(slVerifications.subjectId, userId),
        eq(slVerifications.rung, 'phone'),
        eq(slVerifications.status, 'verified'),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Publishing-floor gate: throws when the user has no verified phone rung. */
export async function assertPhoneVerified(userId: number): Promise<void> {
  if (!(await hasVerifiedPhone(userId))) {
    throw Object.assign(new Error('Phone verification is required before publishing.'), {
      code: 'PHONE_VERIFICATION_REQUIRED',
    });
  }
}

export async function sendPhoneVerificationOtp(
  userId: number,
  phoneInput: string,
): Promise<PhoneVerificationSendResult> {
  const phone = normalizePhone(phoneInput);
  if (!/^\+?\d{8,15}$/.test(phone)) {
    throw Object.assign(new Error('Enter a valid mobile number.'), { code: 'INVALID_PHONE' });
  }

  if (isDevModeEnabled()) {
    return { status: 'dev_mode', devCode: DEV_MODE_CODE };
  }

  if (!twilioVerifyClient.isConfigured()) {
    return { status: 'unconfigured' };
  }

  await twilioVerifyClient.start(phone);
  return { status: 'sent' };
}

export async function verifyPhoneOtp(
  userId: number,
  phoneInput: string,
  code: string,
): Promise<PhoneVerificationCheckResult> {
  const phone = normalizePhone(phoneInput);
  const trimmedCode = code.trim();

  if (isDevModeEnabled()) {
    if (trimmedCode !== DEV_MODE_CODE) {
      return { status: 'rejected', reason: 'That code is not valid.' };
    }
  } else {
    if (!twilioVerifyClient.isConfigured()) {
      return { status: 'rejected', reason: 'Phone verification is not configured yet.' };
    }
    const check = await twilioVerifyClient.check(phone, trimmedCode);
    if (!check.valid) {
      return { status: 'rejected', reason: 'That code is not valid or has expired.' };
    }
  }

  await recordVerification(userId, `phone:${phone}`);
  return { status: 'verified' };
}

/** Latest phone number evidence recorded for a user (for display only). */
export async function latestPhoneEvidence(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ evidenceRef: slVerifications.evidenceRef })
    .from(slVerifications)
    .where(
      and(
        eq(slVerifications.subjectType, 'user'),
        eq(slVerifications.subjectId, userId),
        eq(slVerifications.rung, 'phone'),
        eq(slVerifications.status, 'verified'),
      ),
    )
    .orderBy(desc(slVerifications.createdAt))
    .limit(1);
  return row?.evidenceRef ?? null;
}
