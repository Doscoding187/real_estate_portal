import { describe, expect, it } from 'vitest';
import {
  getLeadEvidenceArtifactCoverageSummary,
  getLeadEvidenceArtifactOptions,
  getLeadEvidenceChecklist,
  getLeadEvidenceReadinessSummary,
  getLeadEvidenceReviewNote,
  getLeadEvidenceStatusLabel,
} from './leadEvidenceChecklist';

describe('lead evidence checklist', () => {
  it('uses sale evidence without implying sold status is automatic', () => {
    const checklist = getLeadEvidenceChecklist('sale');

    expect(checklist.title).toBe('Sale evidence checklist');
    expect(checklist.items.map(item => item.label)).toContain('Finance path');
    expect(checklist.items).toContainEqual({
      label: 'Sale completion proof',
      description: 'Agreement, deposit, and sold-status evidence before public inventory changes.',
      status: 'manual_review',
    });
  });

  it('uses rental evidence for proof-of-income, deposit, and lease review', () => {
    const checklist = getLeadEvidenceChecklist('rent');

    expect(checklist.title).toBe('Rental evidence checklist');
    expect(checklist.items.map(item => item.label)).toEqual([
      'Rental fit',
      'Proof of income',
      'Deposit readiness',
      'Lease review',
    ]);
    expect(checklist.items[3].status).toBe('manual_review');
  });

  it('uses auction evidence for legal pack, proof of funds, and registration review', () => {
    const checklist = getLeadEvidenceChecklist('auction');

    expect(checklist.title).toBe('Auction evidence checklist');
    expect(checklist.items.map(item => item.label)).toEqual([
      'Bidder intent',
      'Legal-pack access',
      'Proof of funds',
      'Registration review',
    ]);
    expect(checklist.items[3]).toMatchObject({
      status: 'manual_review',
      description: expect.stringContaining('auction-term acceptance'),
    });
  });

  it('formats checklist status labels', () => {
    expect(getLeadEvidenceStatusLabel('capture')).toBe('Capture');
    expect(getLeadEvidenceStatusLabel('manual_review')).toBe('Manual review');
    expect(getLeadEvidenceStatusLabel('optional')).toBe('Optional');
  });

  it('builds an evidence review note without claiming readiness is complete', () => {
    expect(getLeadEvidenceReviewNote('auction')).toBe(
      [
        'Auction evidence checklist review',
        '- Bidder intent (Capture): Target lot/unit, intended bid range, and auction attendance path.',
        '- Legal-pack access (Capture): Confirm the bidder has received or reviewed the required legal pack.',
        '- Proof of funds (Capture): Cash contribution, finance route, or funds evidence before bidder readiness.',
        '- Registration review (Manual review): Manual registration and auction-term acceptance before calling the bidder ready.',
        'Decision: pending manual review.',
      ].join('\n'),
    );
  });

  it('summarizes rental evidence as a manual lease readiness model', () => {
    expect(getLeadEvidenceReadinessSummary('rent')).toEqual({
      title: 'Rental readiness model',
      statusLabel: 'Manual lease review required',
      summary: '3 rental evidence items to capture before lease readiness can be reviewed.',
      guardrail:
        'Do not mark inventory as let or distribution-ready until proof of income, deposit readiness, and lease review are manually accepted.',
      captureCount: 3,
      manualReviewCount: 1,
      optionalCount: 0,
    });
  });

  it('summarizes auction evidence as a manual bidder readiness model', () => {
    expect(getLeadEvidenceReadinessSummary('auction')).toEqual({
      title: 'Auction readiness model',
      statusLabel: 'Manual bidder review required',
      summary: '3 bidder evidence items to capture before auction readiness can be reviewed.',
      guardrail:
        'Do not treat the bidder as registered or funds-ready until legal-pack access, proof of funds, and registration terms are manually accepted.',
      captureCount: 3,
      manualReviewCount: 1,
      optionalCount: 0,
    });
  });

  it('maps rental evidence prompts to persisted artifact roles', () => {
    expect(getLeadEvidenceArtifactOptions('rent')).toEqual([
      expect.objectContaining({ label: 'Proof of income', role: 'proof_of_income' }),
      expect.objectContaining({ label: 'Deposit readiness', role: 'deposit_readiness' }),
      expect.objectContaining({ label: 'Lease review', role: 'signed_lease' }),
    ]);
  });

  it('maps auction evidence prompts to persisted artifact roles', () => {
    expect(getLeadEvidenceArtifactOptions('auction')).toEqual([
      expect.objectContaining({
        label: 'Legal-pack access',
        role: 'legal_pack_acknowledgement',
      }),
      expect.objectContaining({ label: 'Proof of funds', role: 'proof_of_funds' }),
      expect.objectContaining({ label: 'Registration review', role: 'bidder_registration' }),
    ]);
  });

  it('summarizes accepted rental evidence coverage without claiming lease readiness', () => {
    expect(
      getLeadEvidenceArtifactCoverageSummary('rent', [
        { artifactRole: 'proof_of_income', status: 'accepted' },
        { artifactRole: 'deposit_readiness', status: 'submitted' },
      ]),
    ).toEqual({
      title: 'Rental evidence coverage',
      statusLabel: 'Evidence partially accepted',
      acceptedCount: 1,
      requiredCount: 3,
      acceptedRoles: [{ label: 'Proof of income', role: 'proof_of_income' }],
      missingRoles: [
        { label: 'Deposit readiness', role: 'deposit_readiness' },
        { label: 'Lease review', role: 'signed_lease' },
      ],
      guardrail:
        'Accepted evidence coverage is not lease readiness, inventory let status, or distribution payout readiness.',
    });
  });

  it('summarizes accepted auction evidence coverage without claiming bidder readiness', () => {
    expect(
      getLeadEvidenceArtifactCoverageSummary('auction', [
        { artifactRole: 'legal_pack_acknowledgement', status: 'accepted' },
        { artifactRole: 'proof_of_funds', status: 'accepted' },
        { artifactRole: 'bidder_registration', status: 'rejected' },
      ]),
    ).toEqual({
      title: 'Auction evidence coverage',
      statusLabel: 'Evidence partially accepted',
      acceptedCount: 2,
      requiredCount: 3,
      acceptedRoles: [
        { label: 'Legal-pack access', role: 'legal_pack_acknowledgement' },
        { label: 'Proof of funds', role: 'proof_of_funds' },
      ],
      missingRoles: [{ label: 'Registration review', role: 'bidder_registration' }],
      guardrail:
        'Accepted evidence coverage is not bidder registration, proof-of-funds readiness, winning-bid status, or distribution payout readiness.',
    });
  });
});
