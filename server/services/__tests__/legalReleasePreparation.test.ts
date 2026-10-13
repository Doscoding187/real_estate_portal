import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prepareLegalRelease } from '../legalReleasePreparation';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const terms = 'Synthetic Terms, test only.\n';
const privacy = 'Synthetic Privacy, test only.\n';
const candidate = {
  formatVersion: 1,
  bundleId: 'synthetic-preparation',
  termsVersion: 'test-terms',
  privacyVersion: 'test-privacy',
  effectiveAt: null,
  sourceBusinessApproval: 'synthetic-business',
  finalPrivacyApproval: 'synthetic-final',
  documents: {
    'terms.txt': { file: 'terms.txt', sha256: sha(terms) },
    'privacy.txt': { file: 'privacy.txt', sha256: sha(privacy) },
  },
};
const approval = {
  reference: 'synthetic-final',
  actor: 'Synthetic reviewer',
  recordedAt: '2026-01-01T00:00:00Z',
  answer: 'Approve finalized Privacy wording',
  sourceBusinessApproval: 'synthetic-business',
  document: { file: 'privacy.txt', version: 'test-privacy', sha256: sha(privacy) },
  termsAndPayment: { versions: { terms: 'test-terms' }, termsSha256: sha(terms) },
};
const input = { candidate, approval, terms, privacy, plannedEffectiveAt: '2026-01-02T00:00:00Z' };

describe('Offline exact-copy release preparation', () => {
  it('compiles a deterministic canonical row without installation authority', () => {
    const result = prepareLegalRelease(input);
    expect(result).toEqual(prepareLegalRelease(input));
    expect(result.executionState).toBe('prepared_not_installed');
    expect(result.requiresNamedProtectedInstaller).toBe(true);
    expect(result.disclosure.terms.sha256).toBe(sha(terms));
    expect(result.databaseRow.privacyContent).toBe(privacy);
  });
  it.each(['terms', 'privacy'] as const)(
    'rejects an edited %s document even when only whitespace changed',
    field => {
      expect(() => prepareLegalRelease({ ...input, [field]: input[field] + ' ' })).toThrow(
        'bytes disagree',
      );
    },
  );
  it('rejects backdating', () => {
    expect(() =>
      prepareLegalRelease({ ...input, plannedEffectiveAt: '2025-12-31T00:00:00Z' }),
    ).toThrow('backdate');
  });
  it('requires the exact final approval reference', () => {
    expect(() =>
      prepareLegalRelease({ ...input, approval: { ...approval, reference: 'other' } }),
    ).toThrow('references disagree');
  });
  it('requires approved versions', () => {
    expect(() =>
      prepareLegalRelease({ ...input, candidate: { ...candidate, privacyVersion: 'other' } }),
    ).toThrow('versions disagree');
  });
  it('does not turn a prepared placeholder into valid public copy', () => {
    const text = 'Privacy content should explain <PROVIDER_SCHEDULE>';
    expect(() =>
      prepareLegalRelease({
        ...input,
        privacy: text,
        candidate: {
          ...candidate,
          documents: {
            ...candidate.documents,
            'privacy.txt': { file: 'privacy.txt', sha256: sha(text) },
          },
        },
        approval: { ...approval, document: { ...approval.document, sha256: sha(text) } },
      }),
    ).toThrow('Canonical legal-release validation failed');
  });
  it('requires the same source business approval', () => {
    expect(() =>
      prepareLegalRelease({ ...input, approval: { ...approval, sourceBusinessApproval: 'other' } }),
    ).toThrow('references disagree');
  });
  it('rejects an unrecorded or changed answer', () => {
    expect(() =>
      prepareLegalRelease({ ...input, approval: { ...approval, answer: 'pending' } }),
    ).toThrow();
  });
});
