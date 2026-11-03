import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PartnerProgramTermsCard, type ProgramTermsItem } from './PartnerProgramTermsCard';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        getReferralIntakeRequirements: {
          useQuery: () => ({ isLoading: false, error: null, data: null }),
        },
      },
    },
  },
}));

const itemFixture: ProgramTermsItem = {
  developmentId: 41,
  developmentName: 'Sky City',
  locationLabels: ['Johannesburg'],
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
  sourceDocuments: [
    {
      templateId: 201,
      documentCode: 'custom',
      documentLabel: 'Unit / house plans',
      fileUrl: 'https://cdn.example.test/unit-plans.pdf',
      fileName: 'unit-plans.pdf',
      sortOrder: 1,
    },
    {
      templateId: 202,
      documentCode: 'custom',
      documentLabel: 'Site map',
      fileUrl: 'https://cdn.example.test/site-map.pdf',
      fileName: 'site-map.pdf',
      sortOrder: 2,
    },
  ],
  computed: {
    commissionDisplay: '2.5% referral fee',
    payoutDisplay: 'Paid after transfer registration',
    requiredDocsSummary: '2 required documents',
  },
};

describe('PartnerProgramTermsCard', () => {
  it('renders commission, payout, and docs summary from computed server fields', () => {
    render(<PartnerProgramTermsCard item={itemFixture} />);

    expect(screen.getByText('Sky City')).toBeInTheDocument();
    expect(screen.getByText('2.5% referral fee')).toBeInTheDocument();
    expect(screen.getByText('Paid after transfer registration')).toBeInTheDocument();
    expect(screen.getByText('2 required documents')).toBeInTheDocument();
    expect(screen.getByText('2 developer-shared resources')).toBeInTheDocument();
    expect(screen.getByText('Referrals Enabled')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('opens the before-you-refer dialog with required documents first and property information', () => {
    render(<PartnerProgramTermsCard item={itemFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /view requirements/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sky City: Before you refer')).toBeInTheDocument();
    expect(within(dialog).getByText('2 required')).toBeInTheDocument();

    const orderedLabels = within(dialog)
      .getAllByText(/Proof of Address|ID Document|Optional Utility Bill/)
      .map(element => element.textContent);

    expect(orderedLabels).toEqual(['ID Document', 'Proof of Address', 'Optional Utility Bill']);

    expect(within(dialog).getByText('Property information')).toBeInTheDocument();
    expect(within(dialog).getByText('Unit / house plans')).toBeInTheDocument();
    expect(within(dialog).getByText('Site map')).toBeInTheDocument();
    expect(within(dialog).getByText('unit-plans.pdf')).toBeInTheDocument();
    expect(within(dialog).getByText('site-map.pdf')).toBeInTheDocument();
    const openLinks = within(dialog).getAllByRole('link', { name: /open/i });
    expect(openLinks.map(link => link.getAttribute('href'))).toEqual([
      'https://cdn.example.test/unit-plans.pdf',
      'https://cdn.example.test/site-map.pdf',
    ]);
  });
});
