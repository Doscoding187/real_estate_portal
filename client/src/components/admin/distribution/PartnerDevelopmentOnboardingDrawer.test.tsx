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
  mockOnboardDevelopmentToPartnerNetworkUseMutation,
  mockGetBrandOnboardingPresetUseQuery,
  mockSetBrandOnboardingPresetUseMutation,
  mockUseUtils,
} = vi.hoisted(() => ({
  mockGetProgramReadinessUseQuery: vi.fn(),
  mockSetProgramReferralEnabledUseMutation: vi.fn(),
  mockGetDevelopmentRequiredDocumentsUseQuery: vi.fn(),
  mockUpsertProgramUseMutation: vi.fn(),
  mockAssignManagerUseMutation: vi.fn(),
  mockSetDevelopmentRequiredDocumentsUseMutation: vi.fn(),
  mockOnboardDevelopmentToPartnerNetworkUseMutation: vi.fn(),
  mockGetBrandOnboardingPresetUseQuery: vi.fn(),
  mockSetBrandOnboardingPresetUseMutation: vi.fn(),
  mockUseUtils: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => mockUseUtils(),
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
        getBrandOnboardingPreset: {
          useQuery: (input: unknown) => mockGetBrandOnboardingPresetUseQuery(input),
        },
        upsertProgram: {
          useMutation: () => mockUpsertProgramUseMutation(),
        },
        onboardDevelopmentToPartnerNetwork: {
          useMutation: () => mockOnboardDevelopmentToPartnerNetworkUseMutation(),
        },
        assignManagerToDevelopment: {
          useMutation: () => mockAssignManagerUseMutation(),
        },
        setDevelopmentRequiredDocuments: {
          useMutation: () => mockSetDevelopmentRequiredDocumentsUseMutation(),
        },
        setBrandOnboardingPreset: {
          useMutation: () => mockSetBrandOnboardingPresetUseMutation(),
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
    mockUseUtils.mockReturnValue({
      distribution: {
        admin: {
          getProgramReadiness: {
            invalidate: vi.fn().mockResolvedValue(undefined),
          },
          getDevelopmentRequiredDocuments: {
            invalidate: vi.fn().mockResolvedValue(undefined),
          },
          getBrandOnboardingPreset: {
            invalidate: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    });

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
    mockOnboardDevelopmentToPartnerNetworkUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true, mode: 'existing', programId: 91 }),
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
    mockGetBrandOnboardingPresetUseQuery.mockReturnValue({
      data: { success: true, brandProfileId: 44, preset: null },
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
    mockSetBrandOnboardingPresetUseMutation.mockReturnValue({
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
    expect(screen.getByText('Configuring: Sky City')).toBeInTheDocument();
  });

  it('save config triggers readiness refetch', async () => {
    const readinessRefetch = vi.fn().mockResolvedValue(undefined);
    const docsRefetch = vi.fn().mockResolvedValue(undefined);
    const onboardMutateAsync = vi.fn().mockResolvedValue({ success: true, programId: 91 });
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
    mockOnboardDevelopmentToPartnerNetworkUseMutation.mockReturnValue({
      mutateAsync: onboardMutateAsync,
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

    await waitFor(() =>
      expect(onboardMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 1001,
        }),
      ),
    );
    await waitFor(() => expect(upsertMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readinessRefetch).toHaveBeenCalled());
  });

  it('applies selected onboarding defaults to other developments without enabling referrals', async () => {
    const onboardMutateAsync = vi.fn().mockResolvedValue({ success: true, programId: 91 });
    const upsertMutateAsync = vi.fn().mockResolvedValue({ success: true, programId: 91 });
    const setDocsMutateAsync = vi.fn().mockResolvedValue({ success: true });

    mockOnboardDevelopmentToPartnerNetworkUseMutation.mockReturnValue({
      mutateAsync: onboardMutateAsync,
      isPending: false,
    });
    mockUpsertProgramUseMutation.mockReturnValue({
      mutateAsync: upsertMutateAsync,
      isPending: false,
    });
    mockSetDevelopmentRequiredDocumentsUseMutation.mockReturnValue({
      mutateAsync: setDocsMutateAsync,
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

    fireEvent.click(screen.getByText('Apply Current Setup to Other 1 Development'));

    await waitFor(() =>
      expect(onboardMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 1002,
        }),
      ),
    );
    await waitFor(() =>
      expect(upsertMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 1002,
          isReferralEnabled: false,
        }),
      ),
    );
    await waitFor(() =>
      expect(setDocsMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 1002,
        }),
      ),
    );
  });

  it('shows explicit loading copy while readiness is still resolving', () => {
    mockGetProgramReadinessUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn().mockResolvedValue(undefined),
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

    expect(screen.getAllByText('Loading readiness')).not.toHaveLength(0);
    expect(
      screen.getByText('2 developments still loading readiness'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Checking program, manager, payout, currency, and document readiness...'),
    ).not.toHaveLength(0);
  });

  it('saves the current configuration as a brand preset', async () => {
    const savePresetMutateAsync = vi.fn().mockResolvedValue({ success: true });

    mockSetBrandOnboardingPresetUseMutation.mockReturnValue({
      mutateAsync: savePresetMutateAsync,
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

    fireEvent.click(screen.getByText('Save Current as Brand Preset'));

    await waitFor(() =>
      expect(savePresetMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          brandProfileId: 44,
          preset: expect.objectContaining({
            commissionModel: 'flat_percentage',
            currencyCode: 'ZAR',
          }),
        }),
      ),
    );
  });

  it('loads a saved brand preset into the current development form', async () => {
    const preset = {
      commissionModel: 'flat_amount',
      defaultCommissionPercent: null,
      defaultCommissionAmount: 12000,
      tierAccessPolicy: 'open',
      payoutMilestone: 'bond_approval',
      payoutMilestoneNotes: null,
      currencyCode: 'USD',
      isActive: true,
      primaryManagerUserId: 22,
      documents: [
        {
          documentCode: 'custom',
          documentLabel: 'Price Structure',
          isRequired: true,
          isActive: true,
          sortOrder: 0,
        },
      ],
    };
    const upsertMutateAsync = vi.fn().mockResolvedValue({ success: true, programId: 91 });
    const assignMutateAsync = vi.fn().mockResolvedValue({ success: true });
    const docsMutateAsync = vi.fn().mockResolvedValue({ success: true });

    mockGetBrandOnboardingPresetUseQuery.mockReturnValue({
      data: { success: true, brandProfileId: 44, preset },
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
    mockUpsertProgramUseMutation.mockReturnValue({
      mutateAsync: upsertMutateAsync,
      isPending: false,
    });
    mockAssignManagerUseMutation.mockReturnValue({
      mutateAsync: assignMutateAsync,
      isPending: false,
    });
    mockSetDevelopmentRequiredDocumentsUseMutation.mockReturnValue({
      mutateAsync: docsMutateAsync,
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
        managerOptions={[{ userId: 22, label: 'Manager Jane' }]}
        onRefreshCatalog={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Load Brand Preset'));
    fireEvent.click(screen.getByText('Save Configuration'));

    await waitFor(() =>
      expect(upsertMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 1001,
          commissionModel: 'flat_amount',
          defaultCommissionAmount: 12000,
          defaultCommissionPercent: null,
          tierAccessPolicy: 'open',
          payoutMilestone: 'bond_approval',
          currencyCode: 'USD',
        }),
      ),
    );
    await waitFor(() =>
      expect(assignMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          managerUserId: 22,
        }),
      ),
    );
    await waitFor(() =>
      expect(docsMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          documents: [
            expect.objectContaining({
              documentLabel: 'Price Structure',
              documentCode: 'custom',
            }),
          ],
        }),
      ),
    );
  });
});
