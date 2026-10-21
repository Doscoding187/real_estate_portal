import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerProspectCheckFitPage from './PartnerProspectCheckFitPage';

const {
  mockListProspectCheckFits,
  mockGetProspectDocumentPacks,
  mockCreateProspectCheckFit,
  mockMutateAsync,
  mockSetLocation,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockListProspectCheckFits: vi.fn(),
  mockGetProspectDocumentPacks: vi.fn(),
  mockCreateProspectCheckFit: vi.fn(),
  mockMutateAsync: vi.fn(),
  mockSetLocation: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/distribution/partner/prospect-check-fit', mockSetLocation],
  };
});

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        listProspectCheckFits: {
          useQuery: (...args: unknown[]) => mockListProspectCheckFits(...args),
        },
        getProspectDocumentPacks: {
          useQuery: (...args: unknown[]) => mockGetProspectDocumentPacks(...args),
        },
        createProspectCheckFit: {
          useMutation: (options?: { onSuccess?: (value: any) => void }) => ({
            isPending: false,
            mutateAsync: async (input: unknown) => {
              const result = await mockMutateAsync(input);
              options?.onSuccess?.(result);
              return result;
            },
          }),
        },
      },
    },
  },
}));

const qualifyingCheckFit = {
  id: '11111111-1111-4111-8111-111111111111',
  prospectName: 'Thandi Mokoena',
  coApplicantName: null,
  grossIncomeMonthly: 50000,
  coApplicantGrossIncomeMonthly: null,
  combinedGrossIncomeMonthly: 50000,
  policyVersion: 'prospect_check_fit_v1',
  assumptions: {
    annualInterestRate: 10.5,
    termMonths: 240,
    repaymentAllowanceRatio: 0.3,
    rateSourceLabel: 'SARB prime rate (platform settings)',
    applicantCount: 1,
    jointAssessment: false,
  },
  outputs: {
    combinedGrossIncomeMonthly: 50000,
    repaymentAllowanceMonthly: 15000,
    estimatedLoanAmount: 1502434,
    estimatedPurchasePrice: 1502434,
    qualifiedDevelopmentCount: 1,
  },
  matches: [
    {
      developmentId: 42,
      programId: 7,
      developmentName: 'Soweto Ridge',
      city: 'Soweto',
      province: 'Gauteng',
      entryPrice: 1200000,
      currencyCode: 'ZAR',
      qualified: true,
      matchRank: 1,
    },
    {
      developmentId: 43,
      programId: 8,
      developmentName: 'Sandton Heights',
      city: 'Sandton',
      province: 'Gauteng',
      entryPrice: 4000000,
      currencyCode: 'ZAR',
      qualified: false,
      matchRank: 2,
    },
  ],
  lockedByDealId: null,
  createdAt: '2026-10-21 12:00:00',
};

describe('PartnerProspectCheckFitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProspectCheckFits.mockReturnValue({ data: [] });
    mockGetProspectDocumentPacks.mockReturnValue({ data: [] });
    mockMutateAsync.mockResolvedValue(qualifyingCheckFit);
  });

  it('asks for the prospect name and gross monthly income', async () => {
    render(<PartnerProspectCheckFitPage />);

    fireEvent.change(screen.getByLabelText('Prospect name'), {
      target: { value: 'Thandi Mokoena' },
    });
    fireEvent.change(screen.getByLabelText('Gross monthly income'), {
      target: { value: '50000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run the check fit' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        prospectName: 'Thandi Mokoena',
        grossIncomeMonthly: 50000,
      });
    });
  });

  it('shows one applicant until the joint application is ticked', async () => {
    render(<PartnerProspectCheckFitPage />);

    expect(screen.getByText('Prospect')).toBeInTheDocument();
    expect(screen.queryByText('Applicant 2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Joint application/));

    expect(screen.getByText('Applicant 1')).toBeInTheDocument();
    expect(screen.getByText('Applicant 2')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Prospect name')).toHaveLength(2);
  });

  it('records both applicants on a joint application', async () => {
    render(<PartnerProspectCheckFitPage />);

    fireEvent.change(screen.getAllByLabelText('Prospect name')[0], {
      target: { value: 'Thandi Mokoena' },
    });
    fireEvent.change(screen.getByLabelText('Gross monthly income'), {
      target: { value: '30000' },
    });
    fireEvent.click(screen.getByLabelText(/Joint application/));
    fireEvent.change(screen.getAllByLabelText('Prospect name')[1], {
      target: { value: 'Sipho Mokoena' },
    });
    fireEvent.change(screen.getByLabelText('Gross monthly income', { selector: '#check-fit-co-income' }), {
      target: { value: '20000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run the check fit' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        prospectName: 'Thandi Mokoena',
        grossIncomeMonthly: 30000,
        coApplicantName: 'Sipho Mokoena',
        coApplicantGrossIncomeMonthly: 20000,
      });
    });
  });

  it('refuses to run without a name or an income', async () => {
    render(<PartnerProspectCheckFitPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Run the check fit' }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });

  it('names the developments the prospect may qualify for and keeps the rest visible', () => {
    mockListProspectCheckFits.mockReturnValue({ data: [qualifyingCheckFit] });

    render(<PartnerProspectCheckFitPage />);

    expect(screen.getByText('Indicative purchase price')).toBeInTheDocument();
    expect(screen.getAllByText(/R\s*1[\s\u00a0]*502[\s\u00a0]*434/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/qualifies for properties priced up to about/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Thandi Mokoena')).toBeInTheDocument();
    expect(screen.getByText('Soweto Ridge')).toBeInTheDocument();
    expect(screen.getByText('Soweto, Gauteng')).toBeInTheDocument();
    expect(screen.getByText(/Sandton Heights/)).toBeInTheDocument();
    expect(screen.getByText(/May qualify/)).toBeInTheDocument();
  });

  it('shows the next step with the documents to download and sign', async () => {
    mockListProspectCheckFits.mockReturnValue({ data: [qualifyingCheckFit] });
    mockGetProspectDocumentPacks.mockReturnValue({
      data: [
        {
          developmentId: 42,
          downloads: [
            {
              key: 'required_document_9',
              label: 'Client info sheet',
              url: '/api/local-media/object?key=properties%2Fdraft-1%2Fclient-info-sheet.pdf',
              instructions: 'Complete it and upload the signed copy.',
            },
          ],
          uploads: [
            { evidenceType: 'identity_document', label: 'Identity document', instructions: null },
          ],
          signatureMethod: 'Signed electronic acknowledgement',
        },
      ],
    });

    render(<PartnerProspectCheckFitPage />);

    expect(await screen.findByText('Next step')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download Client info sheet' })).toHaveAttribute(
      'href',
      '/api/local-media/object?key=properties%2Fdraft-1%2Fclient-info-sheet.pdf',
    );
    expect(screen.getByText('Upload: Identity document')).toBeInTheDocument();
  });

  it('says plainly when the prospect does not qualify for any opportunity', () => {
    mockListProspectCheckFits.mockReturnValue({
      data: [
        {
          ...qualifyingCheckFit,
          outputs: { ...qualifyingCheckFit.outputs, qualifiedDevelopmentCount: 0 },
          matches: qualifyingCheckFit.matches.map(match => ({ ...match, qualified: false })),
        },
      ],
    });

    render(<PartnerProspectCheckFitPage />);

    expect(screen.getByText(/does not qualify for any current opportunity/)).toBeInTheDocument();
  });
});
