import { describe, expect, it } from 'vitest';
import { evaluatePayoutMilestone } from '../services/distributionPayoutMilestoneService';

describe('distribution payout milestone evaluation', () => {
  it('requires a verified attorney instruction letter for attorney_instruction', () => {
    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'attorney_instruction',
        currentStage: 'contract_signed',
        documents: [{ documentCode: 'attorney_instruction_letter', status: 'received' }],
      }),
    ).toMatchObject({
      supported: true,
      satisfied: false,
    });

    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'attorney_instruction',
        currentStage: 'contract_signed',
        documents: [{ documentCode: 'attorney_instruction_letter', status: 'verified' }],
      }),
    ).toMatchObject({
      supported: true,
      satisfied: true,
      blockers: [],
    });
  });

  it('requires deal stage bond_approved or later for bond_approval', () => {
    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'bond_approval',
        currentStage: 'contract_signed',
        documents: [],
      }),
    ).toMatchObject({
      supported: true,
      satisfied: false,
    });

    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'bond_approval',
        currentStage: 'bond_approved',
        documents: [],
      }),
    ).toMatchObject({
      supported: true,
      satisfied: true,
      blockers: [],
    });
  });

  it('requires verified transfer documents for transfer_registration', () => {
    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'transfer_registration',
        currentStage: 'commission_pending',
        documents: [{ documentCode: 'transfer_documents', status: 'received' }],
      }),
    ).toMatchObject({
      supported: true,
      satisfied: false,
    });

    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'transfer_registration',
        currentStage: 'commission_pending',
        documents: [{ documentCode: 'transfer_documents', status: 'verified' }],
      }),
    ).toMatchObject({
      supported: true,
      satisfied: true,
      blockers: [],
    });
  });

  it('leaves unsupported milestones on manual fallback', () => {
    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'attorney_signing',
        currentStage: 'contract_signed',
        documents: [],
      }),
    ).toMatchObject({
      supported: false,
      satisfied: true,
      blockers: [],
    });

    expect(
      evaluatePayoutMilestone({
        payoutMilestone: 'custom',
        currentStage: 'commission_pending',
        documents: [],
      }),
    ).toMatchObject({
      supported: false,
      satisfied: true,
      blockers: [],
    });
  });
});
