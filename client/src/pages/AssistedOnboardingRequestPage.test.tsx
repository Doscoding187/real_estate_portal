import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mutation: {
    isPending: false,
    error: null as Error | null,
  },
  mutate: vi.fn(),
  options: null as
    | {
        onSuccess?: (result: { registrationId: number }) => void;
      }
    | null,
}));

vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/seo', () => ({
  applySeo: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      submitTeamRegistration: {
        useMutation: (options: typeof state.options) => {
          state.options = options;
          return { ...state.mutation, mutate: state.mutate };
        },
      },
    },
  },
}));

import AssistedOnboardingRequestPage from './AssistedOnboardingRequestPage';

describe('assisted onboarding request page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.options = null;
    state.mutation = { isPending: false, error: null };
    window.history.replaceState({}, '', '/contact?area=developer_operations&topic=team-access');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('submits a persisted review request with the selected context and no access promise', () => {
    render(<AssistedOnboardingRequestPage />);

    expect(screen.getByText('Controlled team-access request')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('developer_operations');

    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Developer Applicant' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'applicant@example.com' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /what do you need to resolve/i }), {
      target: { value: 'Please help with controlled team access.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send assisted request' }));

    expect(state.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Developer Applicant',
        email: 'applicant@example.com',
        requestedArea: 'developer_operations',
        notes: expect.stringContaining('[assisted_onboarding_request]'),
      }),
    );
    expect(state.mutate.mock.calls[0][0].notes).toContain('Controlled team-access request');
    expect(state.mutate.mock.calls[0][0]).not.toHaveProperty('userId');

    act(() => {
      state.options?.onSuccess?.({ registrationId: 42 });
    });

    expect(screen.getByText(/reference #/i)).toHaveTextContent('Reference #42.');
    expect(screen.getByText(/does not create a membership/i)).toBeInTheDocument();
    expect(screen.getByText(/does not create a membership/i)).toHaveTextContent(
      /publishing|payment/i,
    );
  });

  it('fails closed on an unrecognised query-area value', () => {
    window.history.replaceState({}, '', '/contact?area=distribution_manager');
    render(<AssistedOnboardingRequestPage />);

    expect(screen.getByRole('combobox')).toHaveValue('other');
    expect(screen.getByText('Other onboarding or platform question')).toBeInTheDocument();
  });
});
