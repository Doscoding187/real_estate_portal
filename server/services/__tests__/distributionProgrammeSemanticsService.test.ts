import { describe, expect, it } from 'vitest';
import { buildDistributionProgrammeSemanticsReadModel } from '../distributionProgrammeSemanticsService';

describe('distributionProgrammeSemanticsService', () => {
  it('derives rental readiness roles without enabling automation', () => {
    const readModel = buildDistributionProgrammeSemanticsReadModel({
      transactionType: 'for_rent',
      documents: [
        {
          templateId: 1,
          documentCode: 'id_document',
          documentLabel: 'ID Document',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 2,
          documentCode: 'proof_of_income',
          documentLabel: 'Proof of Income',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 3,
          documentCode: 'custom',
          documentLabel: 'Signed Lease Agreement',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 4,
          documentCode: 'custom',
          documentLabel: 'Deposit Confirmation',
          category: 'client_required_document',
          isRequired: true,
        },
      ],
    });

    expect(readModel.transactionLane).toBe('rent');
    expect(readModel.configuredRoles).toEqual([
      'submission',
      'qualification',
      'lease',
      'payout',
    ]);
    expect(readModel.missingRoles).toEqual([]);
    expect(readModel.automationAllowed).toBe(false);
    expect(readModel.transactionRuleModel).toMatchObject({
      implementationStatus: 'transaction_specific_rules_required',
      payoutTriggers: ['lease_signed', 'deposit_received', 'first_rent_paid', 'manual_approval'],
      requiredConditions: [
        'Rental programme payout trigger is explicitly selected.',
        'Rental document templates define renter, lease, and payout readiness roles.',
        'Lease, deposit, or first-rent evidence is verified when required by the selected trigger.',
        'Manager manual rental readiness review is accepted.',
        'DLE let outcome is linked as review context or explicitly configured as a required condition.',
      ],
    });
    expect(readModel.documentRoles.find(role => role.templateId === 4)).toMatchObject({
      readinessRole: 'payout',
      appliesToLane: true,
      blocksPayoutAutomation: true,
    });
  });

  it('derives auction readiness roles and missing payout context', () => {
    const readModel = buildDistributionProgrammeSemanticsReadModel({
      transactionType: 'auction',
      documents: [
        {
          templateId: 10,
          documentCode: 'id_document',
          documentLabel: 'Bidder ID Document',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 11,
          documentCode: 'custom',
          documentLabel: 'Proof of Funds',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 12,
          documentCode: 'custom',
          documentLabel: 'Auction Registration Confirmation',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 13,
          documentCode: 'custom',
          documentLabel: 'Auction Terms Acceptance',
          category: 'client_required_document',
          isRequired: true,
        },
      ],
    });

    expect(readModel.transactionLane).toBe('auction');
    expect(readModel.configuredRoles).toEqual([
      'submission',
      'qualification',
      'auction_registration',
      'auction_terms',
    ]);
    expect(readModel.missingRoles).toEqual(['payout']);
    expect(readModel.automationAllowed).toBe(false);
    expect(readModel.transactionRuleModel).toMatchObject({
      implementationStatus: 'transaction_specific_rules_required',
      payoutTriggers: [
        'winning_bidder_confirmed',
        'auction_terms_signed',
        'deposit_paid',
        'settlement_confirmed',
        'manual_approval',
      ],
      requiredConditions: [
        'Auction programme payout trigger is explicitly selected.',
        'Auction document templates define bidder, registration, terms, and payout readiness roles.',
        'Winning-bidder, auction-terms, deposit, or settlement evidence is verified when required by the selected trigger.',
        'Manager manual auction bidder readiness review is accepted.',
        'DLE auction sold outcome is linked as review context or explicitly configured as a required condition.',
      ],
    });
  });

  it('documents the existing sale shell as the only shared automation baseline', () => {
    const readModel = buildDistributionProgrammeSemanticsReadModel({
      transactionType: 'for_sale',
      documents: [
        {
          templateId: 40,
          documentCode: 'id_document',
          documentLabel: 'Buyer ID Document',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 41,
          documentCode: 'sale_agreement',
          documentLabel: 'Sale Agreement',
          category: 'client_required_document',
          isRequired: true,
        },
      ],
    });

    expect(readModel.transactionLane).toBe('sale');
    expect(readModel.transactionRuleModel).toEqual({
      implementationStatus: 'shared_sale_shell',
      payoutTriggers: ['contract_signed', 'bond_approved', 'transfer_registered', 'manual_approval'],
      requiredConditions: [
        'Required buyer documents are verified.',
        'Configured distribution payout milestone is satisfied.',
        'Manager or admin review accepts the deal for reward movement.',
        'Commission entry creation uses the configured programme amount model.',
      ],
    });
  });

  it('warns when a required template looks like the wrong transaction lane', () => {
    const readModel = buildDistributionProgrammeSemanticsReadModel({
      transactionType: 'for_rent',
      documents: [
        {
          templateId: 20,
          documentCode: 'id_document',
          documentLabel: 'ID Document',
          category: 'client_required_document',
          isRequired: true,
        },
        {
          templateId: 21,
          documentCode: 'sale_agreement',
          documentLabel: 'Sale Agreement',
          category: 'client_required_document',
          isRequired: true,
        },
      ],
    });

    expect(readModel.configuredRoles).toEqual(['submission']);
    expect(readModel.missingRoles).toEqual(['qualification', 'lease', 'payout']);
    expect(readModel.wrongLaneWarnings).toEqual([
      'Sale Agreement looks like a payout document for another transaction lane.',
    ]);
    expect(readModel.documentRoles.find(role => role.templateId === 21)).toMatchObject({
      readinessRole: 'payout',
      appliesToLane: false,
      blocksPayoutAutomation: false,
    });
  });

  it('uses explicit template metadata before label inference', () => {
    const readModel = buildDistributionProgrammeSemanticsReadModel({
      transactionType: 'for_rent',
      documents: [
        {
          templateId: 30,
          documentCode: 'custom',
          documentLabel: 'Occupancy Pack',
          category: 'client_required_document',
          transactionType: 'rent',
          participantType: 'renter',
          readinessRole: 'lease',
          blocksPayout: true,
          isRequired: true,
        },
        {
          templateId: 31,
          documentCode: 'custom',
          documentLabel: 'Payout Approval',
          category: 'client_required_document',
          transactionType: 'sale',
          participantType: 'buyer',
          readinessRole: 'payout',
          blocksPayout: true,
          isRequired: true,
        },
      ],
    });

    expect(readModel.configuredRoles).toEqual(['lease']);
    expect(readModel.missingRoles).toEqual(['submission', 'qualification', 'payout']);
    expect(readModel.wrongLaneWarnings).toEqual([
      'Payout Approval looks like a payout document for another transaction lane.',
    ]);
    expect(readModel.documentRoles.find(role => role.templateId === 30)).toMatchObject({
      readinessRole: 'lease',
      appliesToLane: true,
      blocksPayoutAutomation: true,
    });
    expect(readModel.documentRoles.find(role => role.templateId === 31)).toMatchObject({
      readinessRole: 'payout',
      appliesToLane: false,
      blocksPayoutAutomation: false,
    });
  });
});
