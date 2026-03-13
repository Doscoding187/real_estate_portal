import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PartnerDevelopmentOnboardingDrawer,
  ReadinessStatusChips,
} from './PartnerDevelopmentOnboardingDrawer';

const {
  mockGetProgramReadinessUseQuery,
  mockSetProgramReferralEnabledUseMutation,
  mockGetDevelopmentRequiredDocumentsUseQuery,
  mockUpsertProgramUseMutation,
  mockAssignManagerUseMutation,
  mockSetDevelopmentRequiredDocumentsUseMutation,
} = vi.hoisted(() => ({
  mockGetProgramReadinessUseQuery: vi.fn(),
  mockSetProgramReferralEnabledUseMutation: vi.fn(),
  mockGetDevelopmentRequiredDocumentsUseQuery: vi.fn(),
  mockUpsertProgramUseMutation: vi.fn(),
  mockAssignManagerUseMutation: vi.fn(),
  mockSetDevelopmentRequiredDocumentsUseMutation: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      admin: {
        getProgramReadiness: {
          useQuery: (input: unknown) => mockGetProgramReadinessUseQuery(input),
        },
        setProgramReferralEnabled: {
          useMutation: () => mockSetProgramReferralEnabledUseMutation(),
        },
        getDevelopmentRequiredDocuments: {
          useQuery: (input: unknown) => mockGetDevelopmentRequiredDocumentsUseQuery(input),
        },
        upsertProgram: {
          useMutation: () => mockUpsertProgramUseMutation(),
        },
        assignManagerToDevelopment: {
          useMutation: () => mockAssignManagerUseMutation(),
        },
        setDevelopmentRequiredDocuments: {
          useMutation: () => mockSetDevelopmentRequiredDocumentsUseMutation(),
        },
      },
    },
  },
}));

const readinessFixture = {
  canEnableReferral: false,
  blockers: [
    {
      code: 'MANAGER_MISSING',
      message: 'Assign an active primary manager to this development.',
    },
  ],
  state: {
    programExists: true,
    isActive: true,
    isReferralEnabled: false,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    defaultCommissionAmount: null,
    payoutMilestone: 'attorney_signing',
    currencyCode: 'ZAR',
    tierAccessPolicy: 'restricted',
    hasActivePrimaryManager: false,
    requiredDocsCount: 1,
    requiredRequiredDocsCount: 1,
  },
};

describe('PartnerDevelopmentOnboardingDrawer UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetProgramReadinessUseQuery.mockReturnValue({
      data: readinessFixture,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
    mockGetDevelopmentRequiredDocumentsUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
    mockSetProgramReferralEnabledUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
      isPending: false,
    });
    mockUpsertProgramUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true, programId: 91 }),
      isPending: false,
    });
    mockAssignManagerUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
      isPending: false,
    });
    mockSetDevelopmentRequiredDocumentsUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
      isPending: false,
    });
  });

  it('renders readiness chips from readiness.state', () => {
    render(<ReadinessStatusChips readiness={readinessFixture as any} />);

    expect(screen.getByText('Program: Exists')).toBeInTheDocument();
    expect(screen.getByText('Active: On')).toBeInTheDocument();
    expect(screen.getByText('Referral: Disabled')).toBeInTheDocument();
    expect(screen.getByText('Commission: Set')).toBeInTheDocument();
    expect(screen.getByText('Currency: Set')).toBeInTheDocument();
    expect(screen.getByText('Manager: Missing')).toBeInTheDocument();
    expect(screen.getByText('Docs: Configured')).toBeInTheDocument();
  });

  it('shows blockers inline when enabling referral is rejected by server', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      message: 'Program is not ready to enable referrals.',
      data: {
        errorCode: 'PROGRAM_NOT_READY',
        blockers: readinessFixture.blockers,
        state: readinessFixture.state,
      },
    });
    mockSetProgramReferralEnabledUseMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(
      <PartnerDevelopmentOnboardingDrawer
        open
        onOpenChange={vi.fn()}
        brandProfileId={44}
        brandProfileName="Cosmopolitan"
        developments={[
          {
            developmentId: 1001,
            developmentName: 'Sky City',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: {},
          },
        ]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        managerOptions={[]}
        onRefreshCatalog={vi.fn()}
      />,
    );

    const switchControl = screen.getAllByRole('switch')[0];
    fireEvent.click(switchControl);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Referral enable blocked')).toBeInTheDocument();
    expect(screen.getByText('Next action')).toBeInTheDocument();
    expect(
      screen.getAllByText('Assign an active primary manager to this development.').length,
    ).toBeGreaterThan(0);
  });

  it('shows readiness counts for the selected brand onboarding set', () => {
    const readyFixture = {
      ...readinessFixture,
      canEnableReferral: true,
      blockers: [],
      state: {
        ...readinessFixture.state,
        hasActivePrimaryManager: true,
      },
    };
    const readyResult = {
      data: readyFixture,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
    const blockedResult = {
      data: readinessFixture,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    mockGetProgramReadinessUseQuery.mockImplementation((input: any) => {
      if (input?.developmentId === 1001) {
        return readyResult;
      }

      return blockedResult;
    });

    render(
      <PartnerDevelopmentOnboardingDrawer
        open
        onOpenChange={vi.fn()}
        brandProfileId={44}
        brandProfileName="Cosmopolitan"
        developments={[
          {
            developmentId: 1001,
            developmentName: 'Sky City',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: {},
          },
          {
            developmentId: 1002,
            developmentName: 'Green Oaks',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: {},
          },
        ]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        managerOptions={[]}
        onRefreshCatalog={vi.fn()}
      />,
    );

    expect(screen.getByText('Referral live / ready')).toBeInTheDocument();
    expect(screen.getByText('Needs onboarding setup before submissions can open')).toBeInTheDocument();
    expect(screen.getByText('0 enabled, 1 ready to enable')).toBeInTheDocument();
  });

  it('save config triggers readiness refetch', async () => {
    const readinessRefetch = vi.fn().mockResolvedValue(undefined);
    const docsRefetch = vi.fn().mockResolvedValue(undefined);
    const upsertMutateAsync = vi.fn().mockResolvedValue({ success: true, programId: 91 });

    mockGetProgramReadinessUseQuery.mockReturnValue({
      data: readinessFixture,
      isLoading: false,
      refetch: readinessRefetch,
    });
    mockGetDevelopmentRequiredDocumentsUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: docsRefetch,
    });
    mockUpsertProgramUseMutation.mockReturnValue({
      mutateAsync: upsertMutateAsync,
      isPending: false,
    });

    render(
      <PartnerDevelopmentOnboardingDrawer
        open
        onOpenChange={vi.fn()}
        brandProfileId={44}
        brandProfileName="Cosmopolitan"
        developments={[
          {
            developmentId: 1001,
            developmentName: 'Sky City',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: {},
          },
        ]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        managerOptions={[]}
        onRefreshCatalog={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Save Configuration'));

    await waitFor(() => expect(upsertMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readinessRefetch).toHaveBeenCalled());
  });
});
