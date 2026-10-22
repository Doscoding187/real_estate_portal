import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PartnerProgramTermsCard, type ProgramTermsItem } from './PartnerProgramTermsCard';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        downloadDeveloperSalesResource: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
  },
}));

const itemFixture: ProgramTermsItem = {
  developmentId: 41,
  developmentName: 'Sky City',
  city: 'Johannesburg',
  province: 'Gauteng',
  brand: {
    cataloguePublisherId: 17,
    brandName: 'Cosmopolitan Projects',
  },
  program: {
    programId: 9,
    isActive: true,
    isReferralEnabled: true,
    tierAccessPolicy: 'restricted',
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    defaultCommissionAmount: null,
    currencyCode: 'ZAR',
    payoutMilestone: 'transfer_registration',
    payoutMilestoneNotes: null,
  },
  requiredDocuments: [
    {
      templateId: 101,
      documentCode: 'custom',
      documentLabel: 'Optional Utility Bill',
      category: 'client_required_document',
      isRequired: false,
      sortOrder: 0,
    },
    {
      templateId: 102,
      documentCode: 'proof_of_address',
      documentLabel: 'Proof of Address',
      category: 'client_required_document',
      isRequired: true,
      sortOrder: 2,
    },
    {
      templateId: 103,
      documentCode: 'id_document',
      documentLabel: 'ID Document',
      category: 'client_required_document',
      isRequired: true,
      sortOrder: 1,
    },
  ],
  sourceDocuments: [],
  computed: {
    commissionDisplay: '2.5% referral payout; basis and conditions are set by the program',
    payoutDisplay: 'Paid after transfer registration',
    requiredDocsSummary: '2 required documents',
  },
};

describe('PartnerProgramTermsCard', () => {
  it('renders referral payout, payment, and document terms from computed server fields', () => {
    render(<PartnerProgramTermsCard item={itemFixture} />);

    expect(screen.getByText('Sky City')).toBeInTheDocument();
    expect(screen.getByText('2.5% referral payout; basis and conditions are set by the program')).toBeInTheDocument();
    expect(screen.getByText('Paid after transfer registration')).toBeInTheDocument();
    expect(screen.getByText('2 required documents')).toBeInTheDocument();
    expect(screen.getByText('No Developer shared resources listed')).toBeInTheDocument();
    expect(screen.getByText('Referrals Enabled')).toBeInTheDocument();
  });

  it('opens requirements modal and shows required documents first in sorted order', () => {
    render(<PartnerProgramTermsCard item={itemFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /view requirements/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sky City Requirements')).toBeInTheDocument();

    const orderedLabels = within(dialog)
      .getAllByText(/Proof of Address|ID Document|Optional Utility Bill/)
      .map(element => element.textContent);

    expect(orderedLabels).toEqual(['ID Document', 'Proof of Address', 'Optional Utility Bill']);
    expect(within(dialog).getByText('Supporting pack')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'No partner-visible Developer resources are listed for this development.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/Unit \/ house plans|Site map/)).not.toBeInTheDocument();
  });
});
