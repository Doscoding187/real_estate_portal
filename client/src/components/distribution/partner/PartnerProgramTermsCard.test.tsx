import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PartnerProgramTermsCard, type ProgramTermsItem } from './PartnerProgramTermsCard';
import {
  getPartnerProgramTermsCopy,
  normalizePartnerProgramTermsTransactionType,
} from './partnerProgramTermsCopy';

const itemFixture: ProgramTermsItem = {
  developmentId: 41,
  developmentName: 'Sky City',
  transactionType: 'for_sale',
  city: 'Johannesburg',
  province: 'Gauteng',
  brand: {
    brandProfileId: 17,
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
      sortOrder: 0,
    },
    {
      templateId: 202,
      documentCode: 'custom',
      documentLabel: 'Site map',
      fileUrl: null,
      fileName: null,
      sortOrder: 1,
    },
  ],
  computed: {
    commissionDisplay: '2.5% referral fee',
    payoutDisplay: 'Paid after transfer registration',
    requiredDocsSummary: '2 required documents',
  },
};

describe('PartnerProgramTermsCard', () => {
  it('normalizes sale, rental, and auction transaction aliases', () => {
    expect(normalizePartnerProgramTermsTransactionType('for_sale')).toBe('sale');
    expect(normalizePartnerProgramTermsTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerProgramTermsTransactionType('to-rent')).toBe('rent');
    expect(normalizePartnerProgramTermsTransactionType('on auction')).toBe('auction');
  });

  it('returns transaction-aware programme terms copy', () => {
    expect(getPartnerProgramTermsCopy('sale').supportingPackSummaryLabel).toBe('buyer-ready');
    expect(getPartnerProgramTermsCopy('for_rent').supportingPackSummaryLabel).toBe(
      'renter-ready',
    );
    expect(getPartnerProgramTermsCopy('on_auction').supportingPackSummaryLabel).toBe(
      'bidder-ready',
    );
  });

  it('renders commission, payout, and docs summary from computed server fields', () => {
    render(<PartnerProgramTermsCard item={itemFixture} />);

    expect(screen.getByText('Sky City')).toBeInTheDocument();
    expect(screen.getByText('2.5% referral fee')).toBeInTheDocument();
    expect(screen.getByText('Paid after transfer registration')).toBeInTheDocument();
    expect(screen.getByText('2 required documents')).toBeInTheDocument();
    expect(screen.getByText('2 buyer-ready files')).toBeInTheDocument();
    expect(screen.getByText('Referrals Enabled')).toBeInTheDocument();
  });

  it('opens requirements modal and shows required documents first in sorted order', () => {
    render(<PartnerProgramTermsCard item={itemFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /view requirements/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sky City Requirements')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Application documents are what the buyer must provide. Supporting files are what you can share with the buyer before submitting.',
      ),
    ).toBeInTheDocument();

    const orderedLabels = within(dialog)
      .getAllByText(/Proof of Address|ID Document|Optional Utility Bill/)
      .map(element => element.textContent);

    expect(orderedLabels).toEqual(['ID Document', 'Proof of Address', 'Optional Utility Bill']);
    expect(within(dialog).getByText('Supporting pack')).toBeInTheDocument();
    expect(within(dialog).getByText('Unit / house plans')).toBeInTheDocument();
    expect(within(dialog).getByText('Site map')).toBeInTheDocument();
    expect(within(dialog).getByText('Pending')).toBeInTheDocument();
  });

  it('labels rental programme requirements as renter-ready', () => {
    render(<PartnerProgramTermsCard item={{ ...itemFixture, transactionType: 'for_rent' }} />);

    expect(screen.getByText('2 renter-ready files')).toBeInTheDocument();
    expect(screen.queryByText('2 buyer-ready files')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view requirements/i }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(
        'Application documents are what the renter must provide. Supporting files are what you can share with the renter before submitting.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'These are the renter documents needed for qualification and programme progress.',
      ),
    ).toBeInTheDocument();
  });

  it('labels auction programme requirements as bidder-ready', () => {
    render(<PartnerProgramTermsCard item={{ ...itemFixture, transactionType: 'on_auction' }} />);

    expect(screen.getByText('2 bidder-ready files')).toBeInTheDocument();
    expect(screen.queryByText('2 buyer-ready files')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view requirements/i }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(
        'Application documents are what the bidder must provide. Supporting files are what you can share with the bidder before submitting.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'These are the bidder documents needed for registration readiness and programme progress.',
      ),
    ).toBeInTheDocument();
  });
});
