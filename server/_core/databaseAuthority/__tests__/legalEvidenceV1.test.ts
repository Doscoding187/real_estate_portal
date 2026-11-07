import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_EVIDENCE_PATH } from '../legalReleaseInstallation';
import { prepareLegalRelease } from '../../../services/legalReleasePreparation';

const dir = resolve(process.cwd(), LEGAL_EVIDENCE_PATH);
const text = (file: string) => readFileSync(resolve(dir, file), 'utf8');
const json = (file: string) => JSON.parse(text(file));
const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const terms = text('terms.txt');
const privacy = text('privacy.txt');
const plannedEffectiveAt = '2099-01-01T00:00:00Z';

describe('legal v1 evidence folder', () => {
  it('release-candidate and approval hashes match the committed texts', () => {
    const candidate = json('release-candidate.json');
    const approval = json('final-privacy-approval.json');
    expect(candidate.documents['terms.txt'].sha256).toBe(sha(terms));
    expect(candidate.documents['privacy.txt'].sha256).toBe(sha(privacy));
    expect(approval.termsAndPayment.termsSha256).toBe(sha(terms));
    expect(approval.document.sha256).toBe(sha(privacy));
    expect(approval.document.version).toBe(candidate.privacyVersion);
    expect(approval.termsAndPayment.versions.terms).toBe(candidate.termsVersion);
  });

  it('prepare refuses the committed unsigned template', () => {
    expect(() =>
      prepareLegalRelease({
        candidate: json('release-candidate.json'),
        approval: json('final-privacy-approval.json'),
        terms,
        privacy,
        plannedEffectiveAt,
      }),
    ).toThrow();
  });

  it('prepare succeeds with a clearly fake filled fixture', () => {
    const candidate = {
      ...json('release-candidate.json'),
      sourceBusinessApproval: 'TEST-FIXTURE-FAKE-COPY-APPROVAL',
      finalPrivacyApproval: 'TEST-FIXTURE-FAKE-PRIVACY-APPROVAL',
    };
    const approval = {
      ...json('final-privacy-approval.json'),
      reference: 'TEST-FIXTURE-FAKE-PRIVACY-APPROVAL',
      sourceBusinessApproval: 'TEST-FIXTURE-FAKE-COPY-APPROVAL',
      recordedAt: '2098-12-31T00:00:00Z',
      actor: 'TEST FIXTURE ONLY (not a real approval)',
      answer: 'Approve finalized Privacy wording',
    };
    const prepared = prepareLegalRelease({
      candidate,
      approval,
      terms,
      privacy,
      plannedEffectiveAt,
    });
    expect(prepared.databaseRow.bundleId).toBe(candidate.bundleId);
    expect(prepared.executionState).toBe('prepared_not_installed');
  });
});
