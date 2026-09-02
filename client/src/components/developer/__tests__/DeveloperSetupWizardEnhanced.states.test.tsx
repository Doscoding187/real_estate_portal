import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const { setLocationMock, getProfileResult, authMeResult, createProfileMutateAsync, refetchMock } =
  vi.hoisted(() => ({
    setLocationMock: vi.fn(),
    getProfileResult: { current: null as unknown },
    authMeResult: { current: { data: { email: 'owner@example.com' } } as unknown },
    createProfileMutateAsync: vi.fn(),
    refetchMock: vi.fn(),
  }));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/setup', setLocationMock],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getProfile: {
        // Return a reference-stable query result so react-hook-form reset
        // effects cannot loop on freshly-created mock objects.
        useQuery: () =>
          typeof getProfileResult.current === 'object' && getProfileResult.current !== null
            ? getProfileResult.current
            : {
                data: undefined,
                isLoading: false,
                error: { message: 'Developer profile not found.' },
                isError: true,
              },
      },
      createProfile: {
        useMutation: () => ({ mutateAsync: createProfileMutateAsync, isPending: false }),
      },
    },
    auth: {
      me: {
        useQuery: () => authMeResult.current,
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/wizard/DraftManager', () => ({
  DraftManager: ({ open }: { open: boolean }) => (open ? <div>Resume draft dialog</div> : null),
}));

vi.mock('@/components/wizard/GradientProgressIndicator', () => ({
  GradientProgressIndicator: (): ReactNode => <div data-testid="progress" />,
}));

vi.mock('@/components/ui/GradientButton', () => ({
  GradientButton: ({
    children,
    ...props
  }: { children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/SkipLink', () => ({
  SkipLink: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/LiveRegion', () => ({
  LiveRegion: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => ({ lastSaved: null, isSaving: false, error: null }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('@/components/wizard/steps', () => ({
  BasicInfoStep: (): ReactNode => <div>Basic info step</div>,
  ContactInfoStep: (): ReactNode => <div>Contact info step</div>,
  PortfolioStep: (): ReactNode => <div>Portfolio step</div>,
  ReviewStep: (): ReactNode => <div>Review step</div>,
}));

import DeveloperSetupWizardEnhanced from '../DeveloperSetupWizardEnhanced';

function profileFixture(
  status: 'pending' | 'approved' | 'rejected',
  extra: Record<string, unknown> = {},
) {
  return {
    isLoading: false,
    isError: false,
    data: {
      name: 'Cape Developments',
      status,
      email: 'info@cape.co.za',
      description: null,
      category: 'residential',
      establishedYear: null,
      website: '',
      phone: '',
      address: '',
      city: 'Cape Town',
      province: 'Western Cape',
      logo: null,
      completedProjects: 0,
      currentProjects: 0,
      upcomingProjects: 0,
      specializations: [],
      rejectionReason: null,
      ...extra,
    },
  };
}

beforeEach(() => {
  localStorage.removeItem('developer-registration-draft');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Developer setup wizard identity states', () => {
  it('shows a truthful under-review state instead of an editable application for pending organisations', () => {
    getProfileResult.current = profileFixture('pending');

    render(<DeveloperSetupWizardEnhanced />);

    expect(screen.getByRole('heading', { name: 'Application under review' })).toBeInTheDocument();
    expect(screen.getByText(/waiting on Property Listify/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('Basic info step')).not.toBeInTheDocument();
  });

  it('surfaces the rejection reason and offers correction for rejected organisations', () => {
    getProfileResult.current = profileFixture('rejected', {
      rejectionReason: 'Company registration number could not be verified.',
    });

    render(<DeveloperSetupWizardEnhanced />);

    expect(screen.getByText('Your previous application was rejected')).toBeInTheDocument();
    expect(
      screen.getByText('Company registration number could not be verified.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Basic info step')).toBeInTheDocument();
  });

  it('never re-opens registration for approved organisations', () => {
    getProfileResult.current = profileFixture('approved');

    render(<DeveloperSetupWizardEnhanced />);

    expect(
      screen.getByRole('heading', { name: 'Developer Organisation approved' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Developer Workspace' })).toBeInTheDocument();
    expect(screen.queryByText('Basic info step')).not.toBeInTheDocument();
    expect(screen.queryByText('Submit Application')).not.toBeInTheDocument();
  });

  it('does not offer stale local registration drafts once an organisation exists', () => {
    localStorage.setItem(
      'developer-registration-draft',
      JSON.stringify({ step: 3, name: 'Half-finished Org', specializations: ['residential'] }),
    );
    getProfileResult.current = profileFixture('pending');

    render(<DeveloperSetupWizardEnhanced />);

    expect(screen.queryByText('Resume draft dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Application under review' })).toBeInTheDocument();
  });

  it('does not reopen registration when the organisation read fails unexpectedly', () => {
    getProfileResult.current = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { data: { code: 'INTERNAL_SERVER_ERROR' }, message: 'Database unavailable' },
      refetch: refetchMock,
    };

    render(<DeveloperSetupWizardEnhanced />);

    expect(
      screen.getByRole('heading', { name: 'Unable to verify your organisation' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Basic info step')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchMock).toHaveBeenCalledOnce();
  });
});
