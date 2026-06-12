import { describe, expect, it } from 'vitest';
import { getLeadStageGuidance } from './leadStageGuidance';

describe('getLeadStageGuidance', () => {
  it('guides sale leads with buyer and sale proof language', () => {
    expect(getLeadStageGuidance('deal_in_progress', 'sale')).toEqual({
      title: 'Protect sale completion',
      nextProof: 'Track agreement, deposit, finance, and conveyancing handoff milestones.',
      caution: 'Keep public inventory truthful until the sold status is synced.',
    });
  });

  it('guides rental leads with lease application language', () => {
    expect(getLeadStageGuidance('offer_made', 'rent')).toEqual({
      title: 'Review application',
      nextProof: 'Collect application details, proof of income, deposit readiness, and occupation date.',
      caution: 'Do not mark inventory as let until the lease is accepted and signed.',
    });
  });

  it('guides auction leads without treating readiness as registration', () => {
    expect(getLeadStageGuidance('qualified', 'auction')).toEqual({
      title: 'Check bidder readiness',
      nextProof: 'Review cash contribution, bidding capacity, registration intent, and legal-pack access.',
      caution: 'Bidder readiness is not proof of funds or auction registration.',
    });
  });

  it('falls back to evidence-first guidance for unhandled stages', () => {
    expect(getLeadStageGuidance('archived', 'rent')).toEqual({
      title: 'Work the next verified step',
      nextProof: 'Confirm the lead context, record the next action, and keep the timeline up to date.',
      caution: 'Only move the lead when the current stage has real supporting evidence.',
    });
  });
});
