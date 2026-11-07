import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_EVIDENCE_PATH, assertNoUnsignedPlaceholders } from '../legalReleaseInstallation';
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

  it('commits exactly the founder approval values given on 2026-11-07', () => {
    const candidate = json('release-candidate.json');
    const approval = json('final-privacy-approval.json');
    expect(approval.reference).toBe('legal-release-20261107-edward-go');
    expect(approval.recordedAt).toBe('2026-11-07T18:05:00Z');
    expect(approval.actor).toBe('Lehlohonolo Banda');
    expect(approval.answer).toBe('Approve finalized Privacy wording');
    expect(approval.sourceBusinessApproval).toBe('LEGAL-V1-COPY-APPROVAL-20261107-01');
    expect(candidate.sourceBusinessApproval).toBe(approval.sourceBusinessApproval);
    expect(candidate.finalPrivacyApproval).toBe(approval.reference);
    expect(candidate.bundleId).toBe('property-listify-legal-2026-11-07.1');
    expect(candidate.effectiveAt).toBeNull();
    expect(privacy).not.toContain('backup copies');
  });

  it('prepare accepts the committed approval and refuses backdating before recordedAt', () => {
    const candidate = json('release-candidate.json');
    const approval = json('final-privacy-approval.json');
    assertNoUnsignedPlaceholders(candidate, 'candidate');
    assertNoUnsignedPlaceholders(approval, 'approval');
    const prepared = prepareLegalRelease({ candidate, approval, terms, privacy, plannedEffectiveAt });
    expect(prepared.executionState).toBe('prepared_not_installed');
    expect(() =>
      prepareLegalRelease({
        candidate,
        approval,
        terms,
        privacy,
        plannedEffectiveAt: '2026-11-07T18:04:59Z',
      }),
    ).toThrow('Cannot backdate release');
  });

  const unsignedTemplate = () => {
    const marker = 'UNSIGNED-PLACEHOLDER-TEMPLATE';
    return {
      candidate: {
        ...json('release-candidate.json'),
        sourceBusinessApproval: marker,
        finalPrivacyApproval: marker,
      },
      approval: {
        ...json('final-privacy-approval.json'),
        reference: marker,
        recordedAt: marker,
        actor: marker,
        answer: marker,
        sourceBusinessApproval: marker,
      },
    };
  };

  it('prepare refuses an unsigned template', () => {
    const { candidate, approval } = unsignedTemplate();
    expect(() =>
      prepareLegalRelease({ candidate, approval, terms, privacy, plannedEffectiveAt }),
    ).toThrow();
  });

  const filled = () => ({
    candidate: {
      ...json('release-candidate.json'),
      sourceBusinessApproval: 'TEST-FIXTURE-FAKE-COPY-APPROVAL',
      finalPrivacyApproval: 'TEST-FIXTURE-FAKE-PRIVACY-APPROVAL',
    },
    approval: {
      ...json('final-privacy-approval.json'),
      reference: 'TEST-FIXTURE-FAKE-PRIVACY-APPROVAL',
      sourceBusinessApproval: 'TEST-FIXTURE-FAKE-COPY-APPROVAL',
      recordedAt: '2098-12-31T00:00:00Z',
      actor: 'TEST FIXTURE ONLY (not a real approval)',
      answer: 'Approve finalized Privacy wording',
    },
  });

  it('refuses an unsigned template and any single placeholder left in place', () => {
    const template = unsignedTemplate();
    expect(() => assertNoUnsignedPlaceholders(template.candidate)).toThrow(/unsigned/);
    expect(() => assertNoUnsignedPlaceholders(template.approval)).toThrow(/unsigned/);
    const marker = 'UNSIGNED-PLACEHOLDER-LEFT';
    const cases: Array<['candidate' | 'approval', string]> = [
      ['approval', 'reference'],
      ['approval', 'actor'],
      ['candidate', 'finalPrivacyApproval'],
      ['candidate', 'sourceBusinessApproval'],
    ];
    for (const [side, field] of cases) {
      const f = filled();
      (f[side] as Record<string, unknown>)[field] = marker;
      expect(() => assertNoUnsignedPlaceholders(f[side], side)).toThrow(/unsigned/);
    }
    const nested = filled();
    nested.approval.document.version = marker;
    expect(() => assertNoUnsignedPlaceholders(nested.approval)).toThrow(/unsigned/);
  });

  it('prepare succeeds with a clearly fake filled fixture', () => {
    const { candidate, approval } = filled();
    assertNoUnsignedPlaceholders(candidate);
    assertNoUnsignedPlaceholders(approval);
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
