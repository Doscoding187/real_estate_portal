/**
 * Integration Test: ServicesRequestPage
 *
 * Asserts that completing all three steps of LeadRequestFlow and submitting
 * calls createLeadFromJourney and navigates to /services/results/{leadId}.
 *
 * Requirements: 4.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock tRPC
// ---------------------------------------------------------------------------

const mockSetLocation = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      createLeadFromJourney: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: (input: any) => {
            mockMutate(input);
            // Simulate successful mutation
            onSuccess({ leadIds: [99], providerIds: ['prov-1'], unmatched: false });
          },
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [true, { category: 'home_improvement' }],
    useLocation: () => ['/services/request/home_improvement', mockSetLocation],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 1, role: 'buyer' } }),
}));

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

// ---------------------------------------------------------------------------
// Import page after mocks
// ---------------------------------------------------------------------------

import ServicesRequestPage from '../ServicesRequestPage';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServicesRequestPage — integration', () => {
  it('navigates to /services/results/{leadId} after successful submit', async () => {
    render(<ServicesRequestPage />);

    // Step 1: category is pre-selected via defaultCategory — click Continue
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    // Step 2: location — click Continue
    const continueBtn2 = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn2);

    // Step 3: submit
    const submitBtn = screen.getByRole('button', { name: /submit request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'home_improvement',
          intentStage: 'general',
          sourceSurface: 'directory',
        }),
      );
    });

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith(
        expect.stringContaining('/services/results/99'),
      );
    });
  });

  it('renders the LeadRequestFlow with step 1 visible', () => {
    render(<ServicesRequestPage />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
