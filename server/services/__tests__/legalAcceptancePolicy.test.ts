import { describe, expect, it } from 'vitest';
import {
  getRegistrationLegalDisclosure,
  legalReleaseContentDigest,
  validateRegistrationLegalAcceptance,
  type LegalRelease,
  type LegalReleaseContent,
} from '../legalAcceptancePolicy';

const now = new Date('2026-10-12T10:00:00.000Z');

// Synthetic policy fixture only. It is never a public legal release.
function fixture(): LegalRelease {
  const content: LegalReleaseContent = {
    formatVersion: 1,
    bundleId: 'test-only-legal-bundle-1',
    effectiveAt: '2026-10-12T09:00:00.000Z',
    terms: { version: 'test-terms-1', content: 'Synthetic account terms for policy tests.' },
    privacy: {
      version: 'test-privacy-1',
      content: 'Synthetic collection notice for policy tests.',
    },
  };
  return {
    ...content,
    status: 'approved',
    approval: {
      reference: 'test-only-approval',
      actor: 'Test reviewer',
      approvedAt: '2026-10-12T08:00:00.000Z',
      contentSha256: legalReleaseContentDigest(content),
    },
  };
}

function choice(bundleId = fixture().bundleId) {
  return { bundleId, termsAccepted: true };
}

describe('registration legal acceptance policy (no database or provider)', () => {
  it('identifies the current released documents using canonical links', () => {
    expect(getRegistrationLegalDisclosure(fixture(), now)).toEqual({
      bundleId: 'test-only-legal-bundle-1',
      effectiveAt: '2026-10-12T09:00:00.000Z',
      terms: {
        version: 'test-terms-1',
        path: '/legal/terms',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      privacy: {
        version: 'test-privacy-1',
        path: '/legal/privacy',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
  });

  it('constructs evidence from trusted copy and server time without marketing permission', () => {
    const release = fixture();
    const result = validateRegistrationLegalAcceptance(choice(), release, now);
    expect(result).toEqual({
      ok: true,
      acceptance: {
        bundleId: release.bundleId,
        termsVersion: release.terms.version,
        privacyNoticeVersion: release.privacy.version,
        termsSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        privacyNoticeSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        releaseContentSha256: release.approval.contentSha256,
        acceptedAt: now.toISOString(),
        source: 'account_registration',
      },
    });
  });

  it.each([
    undefined,
    null,
    {},
    { bundleId: fixture().bundleId },
    { ...choice(), termsAccepted: false },
    { ...choice(), termsAccepted: 'true' },
    { ...choice(), termsAccepted: 1 },
    { ...choice(), termsAccepted: null },
  ])('rejects missing, false or coerced choice: %j', input => {
    expect(validateRegistrationLegalAcceptance(input, fixture(), now)).toEqual({
      ok: false,
      code: 'TERMS_ACCEPTANCE_REQUIRED',
    });
  });

  it.each([
    { acceptedAt: '2000-01-01T00:00:00.000Z' },
    { userId: 8 },
    { source: 'invitation' },
    { termsSha256: 'a'.repeat(64) },
    { marketingConsent: true },
    { approval: fixture().approval },
  ])('refuses browser-supplied evidence or bundled permissions: %j', extras => {
    expect(validateRegistrationLegalAcceptance({ ...choice(), ...extras }, fixture(), now)).toEqual(
      { ok: false, code: 'TERMS_ACCEPTANCE_REQUIRED' },
    );
  });

  it('requires a fresh explicit choice when the displayed bundle is stale', () => {
    expect(
      validateRegistrationLegalAcceptance(choice('test-only-legal-bundle-0'), fixture(), now),
    ).toEqual({ ok: false, code: 'LEGAL_VERSION_STALE' });
  });

  it.each([
    'missing',
    'draft',
    'altered-terms',
    'altered-privacy',
    'altered-version',
    'altered-identity',
    'future-effective',
    'approval-after-effective',
    'blank-approval',
    'bad-digest',
  ])('does not display or accept an unavailable release: %s', reason => {
    const release = fixture();
    let input: unknown = release;
    if (reason === 'missing') input = undefined;
    if (reason === 'draft') release.status = 'draft';
    if (reason === 'altered-terms') release.terms.content += ' Changed.';
    if (reason === 'altered-privacy') release.privacy.content += ' Changed.';
    if (reason === 'altered-version') release.privacy.version = 'test-privacy-2';
    if (reason === 'altered-identity') release.bundleId = 'test-only-legal-bundle-2';
    if (reason === 'future-effective') {
      release.effectiveAt = '2026-10-13T09:00:00.000Z';
      const { status: _status, approval: _approval, ...content } = release;
      release.approval.contentSha256 = legalReleaseContentDigest(content);
    }
    if (reason === 'approval-after-effective') release.approval.approvedAt = now.toISOString();
    if (reason === 'blank-approval') release.approval.reference = ' ';
    if (reason === 'bad-digest') release.approval.contentSha256 = '0'.repeat(64);
    expect(getRegistrationLegalDisclosure(input, now)).toBeUndefined();
    expect(validateRegistrationLegalAcceptance(choice(), input, now)).toEqual({
      ok: false,
      code: 'LEGAL_RELEASE_UNAVAILABLE',
    });
  });

  it.each([
    '<RETENTION_SCHEDULE>',
    '[PENDING FOUNDER CONFIRMATION]',
    'Terms should define responsible use',
    'Privacy content should explain accounts',
    'until full legal copy is finalized',
  ])('rejects unresolved draft copy even with a matching digest: %s', content => {
    const release = fixture();
    release.terms.content = content;
    const { status: _status, approval: _approval, ...identity } = release;
    release.approval.contentSha256 = legalReleaseContentDigest(identity);
    expect(validateRegistrationLegalAcceptance(choice(), release, now)).toEqual({
      ok: false,
      code: 'LEGAL_RELEASE_UNAVAILABLE',
    });
  });

  it('fails closed for invalid server time', () => {
    expect(validateRegistrationLegalAcceptance(choice(), fixture(), new Date('invalid'))).toEqual({
      ok: false,
      code: 'LEGAL_RELEASE_UNAVAILABLE',
    });
  });

  it('rejects whitespace-only documents instead of offering empty legal pages', () => {
    const release = fixture();
    release.privacy.content = '  \n  ';
    expect(getRegistrationLegalDisclosure(release, now)).toBeUndefined();
  });

  it('binds approval to exact copy bytes rather than normalized line endings', () => {
    const release = fixture();
    release.terms.content = 'First line\nSecond line';
    const { status: _status, approval: _approval, ...content } = release;
    release.approval.contentSha256 = legalReleaseContentDigest(content);
    expect(validateRegistrationLegalAcceptance(choice(), release, now).ok).toBe(true);
    release.terms.content = 'First line\r\nSecond line';
    expect(validateRegistrationLegalAcceptance(choice(), release, now).ok).toBe(false);
  });
});
