import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getRegistrationLegalDisclosure, legalReleaseContentDigest } from './legalAcceptancePolicy';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const fileSchema = z.object({ file: z.string(), sha256: hash });
const candidateSchema = z.object({
  formatVersion: z.literal(1),
  bundleId: z.string(),
  termsVersion: z.string(),
  privacyVersion: z.string(),
  effectiveAt: z.null(),
  sourceBusinessApproval: z.string().min(1),
  finalPrivacyApproval: z.string().min(1),
  documents: z.object({ 'terms.txt': fileSchema, 'privacy.txt': fileSchema }),
});
const approvalSchema = z.object({
  reference: z.string().min(1),
  recordedAt: z.string().datetime(),
  actor: z.string().min(1),
  answer: z.literal('Approve finalized Privacy wording'),
  sourceBusinessApproval: z.string().min(1),
  document: z.object({ file: z.literal('privacy.txt'), version: z.string(), sha256: hash }),
  termsAndPayment: z.object({ versions: z.object({ terms: z.string() }), termsSha256: hash }),
});
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

/** Offline compilation, not approval or an installation command. Planned time
 * must be reconciled to actual controlled release time before activation.
 * The caller reads reviewed Git artifacts, never browser input. */
export function prepareLegalRelease(input: {
  candidate: unknown;
  approval: unknown;
  terms: string;
  privacy: string;
  plannedEffectiveAt: string;
}) {
  const candidate = candidateSchema.parse(input.candidate);
  const approval = approvalSchema.parse(input.approval);
  const time = z.string().datetime().parse(input.plannedEffectiveAt);
  if (Date.parse(time) < Date.parse(approval.recordedAt))
    throw new Error('Cannot backdate release');
  if (
    candidate.finalPrivacyApproval !== approval.reference ||
    candidate.sourceBusinessApproval !== approval.sourceBusinessApproval
  )
    throw new Error('Approval references disagree');
  if (
    approval.document.version !== candidate.privacyVersion ||
    approval.termsAndPayment.versions.terms !== candidate.termsVersion
  )
    throw new Error('Approved document versions disagree');
  if (
    candidate.documents['terms.txt'].file !== 'terms.txt' ||
    candidate.documents['privacy.txt'].file !== 'privacy.txt'
  )
    throw new Error('Unexpected document paths');
  if (
    sha256(input.terms) !== candidate.documents['terms.txt'].sha256 ||
    sha256(input.terms) !== approval.termsAndPayment.termsSha256 ||
    sha256(input.privacy) !== candidate.documents['privacy.txt'].sha256 ||
    sha256(input.privacy) !== approval.document.sha256
  )
    throw new Error('Exact approved document bytes disagree');
  const content = {
    formatVersion: 1 as const,
    bundleId: candidate.bundleId,
    effectiveAt: time,
    terms: { version: candidate.termsVersion, content: input.terms },
    privacy: { version: candidate.privacyVersion, content: input.privacy },
  };
  const digest = legalReleaseContentDigest(content);
  const approvalMetadata = {
    reference: approval.reference,
    actor: approval.actor,
    approvedAt: approval.recordedAt,
    contentSha256: digest,
  };
  // Validate the format at its planned time; this is deliberately not a live read.
  const disclosure = getRegistrationLegalDisclosure(
    { ...content, status: 'approved', approval: approvalMetadata },
    new Date(time),
  );
  if (!disclosure) throw new Error('Canonical legal-release validation failed');
  return {
    executionState: 'prepared_not_installed' as const,
    timeStatus: 'planned_must_match_actual_controlled_release' as const,
    requiresNamedProtectedInstaller: true as const,
    sourceBusinessApproval: candidate.sourceBusinessApproval,
    databaseRow: {
      bundleId: content.bundleId,
      formatVersion: 1,
      effectiveAt: time,
      termsVersion: content.terms.version,
      termsContent: content.terms.content,
      privacyVersion: content.privacy.version,
      privacyContent: content.privacy.content,
      approvalReference: approvalMetadata.reference,
      approvalActor: approvalMetadata.actor,
      approvedAt: approvalMetadata.approvedAt,
      contentSha256: digest,
    },
    disclosure,
  };
}
