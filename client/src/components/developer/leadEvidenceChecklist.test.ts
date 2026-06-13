import { describe, expect, it } from 'vitest';
import {
  getLeadEvidenceChecklist,
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
});
