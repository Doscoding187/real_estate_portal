import { describe, expect, it } from 'vitest';

import {
  getAdminDistributionReferralCopy,
  getAdminManualReadinessNotice,
  getAdminProgrammeSemanticsNotice,
  normalizeAdminDistributionTransactionLane,
} from './DistributionNetworkPage';

describe('admin distribution transaction lane copy', () => {
  it('normalizes sale, rental, and auction aliases', () => {
    expect(normalizeAdminDistributionTransactionLane('sale')).toBe('sale');
    expect(normalizeAdminDistributionTransactionLane('for_rent')).toBe('rent');
    expect(normalizeAdminDistributionTransactionLane('rental')).toBe('rent');
    expect(normalizeAdminDistributionTransactionLane('auction')).toBe('auction');
    expect(normalizeAdminDistributionTransactionLane('unexpected')).toBe('sale');
  });

  it('labels rental referrals with renter and reward language', () => {
    expect(getAdminDistributionReferralCopy('for_rent')).toMatchObject({
      laneLabel: 'Rental',
      referralLabel: 'Rental referral',
      participantLabel: 'Renter',
      unknownParticipant: 'Unknown Renter',
      rewardLabel: 'Rental reward',
      rewardStatusLabel: 'Reward status',
    });
  });

  it('labels auction referrals with bidder and auction reward language', () => {
    expect(getAdminDistributionReferralCopy('auction')).toMatchObject({
      laneLabel: 'Auction',
      referralLabel: 'Auction referral',
      participantLabel: 'Bidder',
      unknownParticipant: 'Unknown Bidder',
      rewardLabel: 'Auction reward',
      rewardStatusLabel: 'Reward status',
    });
  });

  it('keeps sale referrals on buyer and commission language', () => {
    expect(getAdminDistributionReferralCopy('sale')).toMatchObject({
      laneLabel: 'Sale',
      referralLabel: 'Sale referral',
      participantLabel: 'Buyer',
      unknownParticipant: 'Unknown Buyer',
      rewardLabel: 'Commission',
      rewardStatusLabel: 'Commission status',
    });
  });

  it('summarizes missing programme semantics without claiming automation is active', () => {
    expect(
      getAdminProgrammeSemanticsNotice({
        missingRoles: ['lease', 'payout'],
        wrongLaneWarnings: [],
        automationAllowed: false,
      }),
    ).toBe('Missing readiness: Lease, Payout Reward automation remains disabled.');
  });

  it('summarizes wrong-lane template warnings for admin review', () => {
    expect(
      getAdminProgrammeSemanticsNotice({
        missingRoles: ['auction_terms'],
        wrongLaneWarnings: [
          'Sale Agreement looks like a payout document for another transaction lane.',
        ],
        automationAllowed: false,
      }),
    ).toBe(
      'Missing readiness: Auction Terms Wrong-lane templates: Sale Agreement looks like a payout document for another transaction lane. Reward automation remains disabled.',
    );
  });

  it('summarizes transaction rule model triggers as read-only admin context', () => {
    expect(
      getAdminProgrammeSemanticsNotice({
        missingRoles: ['lease'],
        wrongLaneWarnings: [],
        automationAllowed: false,
        transactionRuleModel: {
          implementationStatus: 'transaction_specific_rules_required',
          payoutTriggers: ['lease_signed', 'deposit_received', 'first_rent_paid', 'manual_approval'],
          requiredConditions: [
            'Rental programme payout trigger is explicitly selected.',
            'Manager manual rental readiness review is accepted.',
          ],
          draftRule: {
            source: 'payout_milestone_notes',
            lane: 'rent',
            trigger: 'deposit_received',
            requiredConditions: ['Deposit evidence is verified.'],
            automationStatus: 'disabled',
          },
        },
      }),
    ).toBe(
      'Missing readiness: Lease Rule model: transaction-specific rules required; triggers: Lease Signed, Deposit Received, First Rent Paid, Manual Approval; required conditions: 2. Draft rule saved: Deposit Received; automation disabled. Reward automation remains disabled.',
    );
  });

  it('still returns read-only automation copy when roles are complete', () => {
    expect(
      getAdminProgrammeSemanticsNotice({
        missingRoles: [],
        wrongLaneWarnings: [],
        automationAllowed: false,
        transactionRuleModel: {
          implementationStatus: 'shared_sale_shell',
          payoutTriggers: ['contract_signed', 'bond_approved'],
          requiredConditions: ['Required buyer documents are verified.'],
        },
      }),
    ).toBe(
      'Programme semantics are read-only; reward automation remains disabled until explicit review rules exist. Rule model: shared Sale shell baseline; triggers: Contract Signed, Bond Approved; required conditions: 1.',
    );
  });

  it('summarizes pending manual readiness without claiming reward readiness', () => {
    expect(
      getAdminManualReadinessNotice([
        {
          label: 'Lease readiness review',
          status: 'pending',
          notes: null,
          reviewedBy: null,
        },
      ]),
    ).toBe(
      'Manual readiness: Lease readiness review pending. Reward automation remains disabled.',
    );
  });

  it('summarizes accepted manual readiness as review context only', () => {
    expect(
      getAdminManualReadinessNotice([
        {
          label: 'Bidder readiness review',
          status: 'accepted',
          notes: 'Bidder docs reviewed.',
          reviewedBy: { userId: 42, name: 'Admin Reviewer' },
        },
      ]),
    ).toBe(
      'Manual readiness: Bidder readiness review accepted by Admin Reviewer. Note: Bidder docs reviewed. Reward automation remains disabled.',
    );
  });
});
