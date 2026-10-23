import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerSubmitReferralPage from './PartnerSubmitReferralPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockListEligible,
  mockRequirements,
  mockSession,
  mockCreateSession,
  mockUploadEvidence,
  mockSubmitReferral,
  mockUseUtils,
  state,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockListEligible: vi.fn(),
  mockRequirements: vi.fn(),
  mockSession: vi.fn(),
  mockCreateSession: vi.fn(),
  mockUploadEvidence: vi.fn(),
  mockSubmitReferral: vi.fn(),
  mockUseUtils: vi.fn(),
  state: {
    sessionStarted: false,
    sessionComplete: false,
    lastStartPayload: null as unknown,
    lastSubmitPayload: null as unknown,
    submitError: null as string | null,
    submitDealId: null as number | null,
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/distribution/partner/DevelopmentBrochureDialog', async () => {
  const React = await import('react');
  return {
    DevelopmentBrochureDialog: ({
      open,
      onOpenChange,
      onDownload,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onDownload?: () => void;
    }) =>
      open
        ? React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => {
                onDownload?.();
                onOpenChange(false);
              },
            },
            'Print or save PDF',
          )
        : null,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => mockUseUtils(),
    distribution: {
      partner: {
        listEligibleDevelopmentsForSubmission: {
          useQuery: (...args: unknown[]) => mockListEligible(...args),
        },
        getReferralIntakeRequirements: {
          useQuery: (...args: unknown[]) => mockRequirements(...args),
        },
        getReferralIntakeSession: {
          useQuery: (...args: unknown[]) => mockSession(...args),
        },
        createReferralIntakeSession: {
          useMutation: (opts: unknown) => mockCreateSession(opts),
        },
        uploadReferralIntakeEvidence: {
          useMutation: (opts: unknown) => mockUploadEvidence(opts),
        },
        getProspectDocumentPacks: {
          useQuery: () => ({
            isSuccess: true,
            isError: false,
            isLoading: false,
            data: [
              {
                developmentId: 101,
                downloads: [
                  {
                    key: 'required_document_1',
                    label: 'Client info sheet',
                    url: '/api/local-media/object?key=properties%2Fdraft-1%2Fclient-info-sheet.pdf',
                    instructions: 'Complete it and upload the signed copy.',
                    category: 'information_sheet',
                    developmentId: 101,
                  },
                  {
                    key: 'permission_to_share_101',
                    label: 'Permission to share details',
                    url: '/api/local-media/object?key=properties%2Fdraft-1%2Fpermission.pdf',
                    instructions: 'Ask the person to sign it.',
                    category: 'consent',
                    developmentId: 101,
                  },
                  {
                    key: 'privacy_notice_101',
                    label: 'Privacy notice',
                    url: '/api/local-media/object?key=properties%2Fdraft-1%2Fprivacy-notice.pdf',
                    instructions: 'Share this notice before their details are shared.',
                    category: 'privacy_notice',
                    developmentId: 101,
                  },
                ],
                uploads: [],
                signatureMethod: 'Signed electronic acknowledgement',
              },
            ],
          }),
        },
        submitReferral: {
          useMutation: (opts: unknown) => mockSubmitReferral(opts),
        },
      },
    },
  },
}));

function eligibleItem(overrides: Record<string, unknown> = {}) {
  return {
    developmentId: 101,
    developmentName: 'Sky City',
    campaign: { visible: true },
    inventory: {
      modes: {
        sale: { availableCount: 3, priceFrom: 1000000, priceTo: 1500000 },
        rent: null,
      },
    },
    opportunity: { openForReferral: true },
    ...overrides,
  };
}

const requirementsFixture = {
  sharingPermissionDocument: {
    title: 'Permission to share details',
    version: 'v2',
    content: 'Permission content.',
  },
  privacyNoticeDocument: {
    title: 'Privacy notice',
    version: 'v1',
    content: 'Privacy content.',
  },
  sharingPurpose: 'To introduce the person to the developer team.',
  namedRecipients: [
    { name: 'A. Manager', organization: 'Property Listify', role: 'Referral manager' },
  ],
  signatureMethod: 'Wet signature on the printed form.',
  maxUploadBytes: 5 * 1024 * 1024,
  identityEvidence: { allowedMimeTypes: ['application/pdf'] },
  creditReport: { enabled: false, providerName: null, authorizationDocument: null },
};

describe('PartnerSubmitReferralPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/distribution/partner/submit');
    vi.stubGlobal('open', vi.fn());
    state.sessionStarted = false;
    state.sessionComplete = false;
    state.lastStartPayload = null;
    state.lastSubmitPayload = null;
    state.submitError = null;
    state.submitDealId = null;

    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/submit', mockSetLocation]);
    mockListEligible.mockReturnValue({
      isLoading: false,
      error: null,
      data: { items: [eligibleItem()] },
    });
    mockRequirements.mockReturnValue({
      isLoading: false,
      error: null,
      data: requirementsFixture,
    });
    mockSession.mockImplementation(() => ({
      isLoading: false,
      error: null,
      data: state.sessionStarted
        ? {
            requiredEvidenceComplete: state.sessionComplete,
            evidence: state.sessionComplete
              ? [
                  { evidenceType: 'sharing_permission' },
                  { evidenceType: 'privacy_notice' },
                  { evidenceType: 'identity_document' },
                ]
              : [],
          }
        : null,
    }));
    mockCreateSession.mockImplementation((opts: any) => ({
      isPending: false,
      mutate: (payload: unknown) => {
        state.lastStartPayload = payload;
        state.sessionStarted = true;
        opts?.onSuccess?.({ sessionUuid: 'session-1' });
      },
    }));
    mockUploadEvidence.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockSubmitReferral.mockImplementation((opts: any) => ({
      isPending: false,
      mutate: (payload: unknown) => {
        state.lastSubmitPayload = payload;
        if (state.submitError) {
          opts?.onError?.({ message: state.submitError });
        } else if (state.submitDealId) {
          opts?.onSuccess?.({ dealId: state.submitDealId });
        }
      },
    }));
    mockUseUtils.mockReturnValue({
      distribution: {
        partner: {
          getReferralIntakeSession: { invalidate: vi.fn(async () => undefined) },
        },
      },
    });
  });

  function downloadPreparationPack() {
    fireEvent.click(screen.getByRole('button', { name: 'Download brochure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print or save PDF' }));
    fireEvent.click(screen.getByTitle('Client info sheet'));
    fireEvent.click(screen.getByTitle('Permission to share details'));
    fireEvent.click(screen.getByTitle('Privacy notice'));
  }

  function stepperStates() {
    return within(screen.getByRole('list', { name: 'Referral progress' }))
      .getAllByRole('listitem')
      .map(item => item.getAttribute('data-state'));
  }

  it('shows the paused state when no opportunity is open for referral', () => {
    mockListEligible.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          eligibleItem({
            campaign: { visible: false },
            opportunity: { openForReferral: false },
          }),
        ],
      },
    });

    render(<PartnerSubmitReferralPage />);

    expect(screen.getByText('This opportunity is not ready for a referral')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Continue to add documents')).not.toBeInTheDocument();
  });

  it('guides permission, documents, and contact details in order', () => {
    const rendered = render(<PartnerSubmitReferralPage />);

    expect(screen.getByText('Introduce a prospect to property opportunities')).toBeInTheDocument();
    expect(screen.getByText('Documents to prepare')).toBeInTheDocument();
    expect(screen.getByText('POPIA consent form')).toBeInTheDocument();
    expect(screen.getByText('Prepare documents')).toBeInTheDocument();
    expect(stepperStates()).toEqual(['active', 'upcoming', 'upcoming', 'upcoming']);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Sky City' }));
    expect(stepperStates()).toEqual(['complete', 'active', 'upcoming', 'upcoming']);

    fireEvent.click(screen.getByRole('button', { name: 'Download brochure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print or save PDF' }));
    fireEvent.click(screen.getByTitle('Client info sheet'));
    expect(stepperStates()).toEqual(['complete', 'active', 'upcoming', 'upcoming']);

    expect(screen.getByText('2 files')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Permission to share details'));
    expect(stepperStates()).toEqual(['complete', 'active', 'upcoming', 'upcoming']);
    expect(screen.getByTitle('Privacy notice')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Privacy notice'));
    expect(stepperStates()).toEqual(['complete', 'complete', 'active', 'upcoming']);
    expect(screen.getByText('Prepare the introduction')).toBeInTheDocument();
    expect(window.open).toHaveBeenCalledTimes(3);
    expect(window.open).toHaveBeenNthCalledWith(
      2,
      '/api/local-media/object?key=properties%2Fdraft-1%2Fpermission.pdf',
      '_blank',
      'noopener',
    );
    expect(window.open).toHaveBeenNthCalledWith(
      3,
      '/api/local-media/object?key=properties%2Fdraft-1%2Fprivacy-notice.pdf',
      '_blank',
      'noopener',
    );

    fireEvent.click(screen.getByRole('button', { name: /Buy/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /person agreed/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to add documents' }));

    expect(state.lastStartPayload).toEqual({
      developmentId: 101,
      confirmedPermission: true,
      confirmedPrivacyNotice: true,
    });

    rendered.rerender(<PartnerSubmitReferralPage />);
    expect(screen.getByText('Add the signed documents')).toBeInTheDocument();
    expect(screen.getByText('Permission to share their details')).toBeInTheDocument();
    expect(screen.getByText('Privacy notice acknowledgement')).toBeInTheDocument();
    expect(screen.getByText('Identity document')).toBeInTheDocument();
    expect(screen.getByText('Add all three required documents to continue.')).toBeInTheDocument();

    state.sessionComplete = true;
    rendered.rerender(<PartnerSubmitReferralPage />);

    expect(screen.getByText('Submit the introduction')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send introduction' }));

    expect(state.lastSubmitPayload).toMatchObject({
      developmentId: 101,
      marketMode: 'sale',
      intakeSessionUuid: 'session-1',
      buyerName: 'Jane Buyer',
    });
  });

  it('carries the prospect check fit into the referral', () => {
    window.history.pushState(
      {},
      '',
      '/distribution/partner/submit?developmentId=101&marketMode=sale&checkFitId=11111111-1111-4111-8111-111111111111',
    );
    const rendered = render(<PartnerSubmitReferralPage />);

    downloadPreparationPack();
    fireEvent.click(screen.getByRole('button', { name: /Buy/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /person agreed/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to add documents' }));

    state.sessionComplete = true;
    rendered.rerender(<PartnerSubmitReferralPage />);

    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Jane Buyer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send introduction' }));

    expect(state.lastSubmitPayload).toMatchObject({
      checkFitId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('offers the prospect documents to download before the documents are confirmed', () => {
    render(<PartnerSubmitReferralPage />);

    expect(screen.getByText('Development brochures')).toBeInTheDocument();
    expect(screen.getByText('Prospect information sheet')).toBeInTheDocument();
    expect(screen.getByText('POPIA consent form')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Download/ }).length).toBeGreaterThan(0);
  });

  it('shows the server message when submission is blocked, then follows the deal on success', () => {
    state.sessionStarted = true;
    state.sessionComplete = true;
    state.submitError = 'Referrals are currently closed for this opportunity.';

    render(<PartnerSubmitReferralPage />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Sky City' }));
    downloadPreparationPack();
    fireEvent.click(screen.getByRole('button', { name: /Buy/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /person agreed/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to add documents' }));
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John Buyer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send introduction' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Referrals are currently closed for this opportunity.',
    );

    state.submitError = null;
    state.submitDealId = 99;
    fireEvent.click(screen.getByRole('button', { name: 'Send introduction' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals/99');
  });
});
