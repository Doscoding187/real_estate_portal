import { createHash } from 'node:crypto';
import { z } from 'zod';

const identity = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const documentSchema = z
  .object({ version: identity, content: z.string().refine(content => content.trim().length > 0) })
  .strict();
const releaseContentSchema = z
  .object({
    formatVersion: z.literal(1),
    bundleId: identity,
    effectiveAt: z.string().datetime(),
    terms: documentSchema,
    privacy: documentSchema,
  })
  .strict();

const releaseSchema = releaseContentSchema.extend({
  status: z.enum(['draft', 'approved']),
  approval: z
    .object({
      reference: z.string().trim().min(1).max(200),
      actor: z.string().trim().min(1).max(200),
      approvedAt: z.string().datetime(),
      contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
});

export type LegalReleaseContent = z.infer<typeof releaseContentSchema>;
export type LegalRelease = z.infer<typeof releaseSchema>;

/** Only these two fields cross the browser's acceptance boundary. */
export const registrationLegalAcceptanceSchema = z
  .object({ bundleId: identity, termsAccepted: z.literal(true) })
  .strict();

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Fixed v1 serialization binds approval to exact copy bytes and identity.
 * No whitespace or line-ending normalization is performed on either document.
 */
export function legalReleaseContentDigest(input: LegalReleaseContent): string {
  const content = releaseContentSchema.parse(input);
  return sha256(
    JSON.stringify([
      content.formatVersion,
      content.bundleId,
      content.effectiveAt,
      content.terms.version,
      content.terms.content,
      content.privacy.version,
      content.privacy.content,
    ]),
  );
}

function hasUnresolvedCopy(content: string): boolean {
  return (
    /<[A-Z][A-Z0-9_]*>/.test(content) ||
    /\[(?:PENDING|TODO|TBC)[^\]]*\]|Terms should define|Privacy content should explain|full legal copy is finalized/i.test(
      content,
    )
  );
}

function approvedRelease(input: unknown, now: Date): LegalRelease | undefined {
  const parsed = releaseSchema.safeParse(input);
  if (!parsed.success || !Number.isFinite(now.getTime())) return undefined;
  const release = parsed.data;
  if (release.status !== 'approved') return undefined;
  const effectiveAt = Date.parse(release.effectiveAt);
  const approvedAt = Date.parse(release.approval.approvedAt);
  if (
    !Number.isFinite(approvedAt) ||
    !Number.isFinite(effectiveAt) ||
    approvedAt > effectiveAt ||
    effectiveAt > now.getTime()
  )
    return undefined;
  if (hasUnresolvedCopy(release.terms.content) || hasUnresolvedCopy(release.privacy.content)) {
    return undefined;
  }
  const { status: _status, approval: _approval, ...content } = release;
  if (legalReleaseContentDigest(content) !== release.approval.contentSha256) return undefined;
  return release;
}

export interface RegistrationLegalDisclosure {
  bundleId: string;
  effectiveAt: string;
  terms: { version: string; path: '/legal/terms'; sha256: string };
  privacy: { version: string; path: '/legal/privacy'; sha256: string };
}

/**
 * The release must come from a reviewed server-owned registry, never req.body.
 * This policy verifies integrity; it cannot grant founder approval or establish
 * retention/persistence. No production release is selected by this module.
 */
export function getRegistrationLegalDisclosure(
  trustedRelease: unknown,
  now: Date,
): RegistrationLegalDisclosure | undefined {
  const release = approvedRelease(trustedRelease, now);
  if (!release) return undefined;
  return {
    bundleId: release.bundleId,
    effectiveAt: release.effectiveAt,
    terms: {
      version: release.terms.version,
      path: '/legal/terms',
      sha256: sha256(release.terms.content),
    },
    privacy: {
      version: release.privacy.version,
      path: '/legal/privacy',
      sha256: sha256(release.privacy.content),
    },
  };
}

export interface RegistrationLegalAcceptance {
  bundleId: string;
  termsVersion: string;
  privacyNoticeVersion: string;
  termsSha256: string;
  privacyNoticeSha256: string;
  releaseContentSha256: string;
  acceptedAt: string;
  source: 'account_registration';
}

type AcceptanceResult =
  | { ok: true; acceptance: RegistrationLegalAcceptance }
  | {
      ok: false;
      code: 'LEGAL_RELEASE_UNAVAILABLE' | 'TERMS_ACCEPTANCE_REQUIRED' | 'LEGAL_VERSION_STALE';
    };

/**
 * Call before account writes, then persist the result in the same transaction
 * as account creation. A successful validation alone is not recorded acceptance.
 * Privacy notice version is evidence of the displayed notice, not blanket
 * processing consent. Marketing permission is never produced here.
 */
export function validateRegistrationLegalAcceptance(
  input: unknown,
  trustedRelease: unknown,
  now: Date,
): AcceptanceResult {
  const release = approvedRelease(trustedRelease, now);
  if (!release) return { ok: false, code: 'LEGAL_RELEASE_UNAVAILABLE' };
  const choice = registrationLegalAcceptanceSchema.safeParse(input);
  if (!choice.success) return { ok: false, code: 'TERMS_ACCEPTANCE_REQUIRED' };
  if (choice.data.bundleId !== release.bundleId) return { ok: false, code: 'LEGAL_VERSION_STALE' };
  return {
    ok: true,
    acceptance: {
      bundleId: release.bundleId,
      termsVersion: release.terms.version,
      privacyNoticeVersion: release.privacy.version,
      termsSha256: sha256(release.terms.content),
      privacyNoticeSha256: sha256(release.privacy.content),
      releaseContentSha256: release.approval.contentSha256,
      acceptedAt: now.toISOString(),
      source: 'account_registration',
    },
  };
}
