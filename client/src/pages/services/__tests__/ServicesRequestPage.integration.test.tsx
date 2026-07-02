/**
 * Integration Test: ServicesRequestPage
 *
 * Asserts that completing all three steps of LeadRequestFlow and submitting
 * calls createLeadFromJourney and navigates to /services/results/{leadId}.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetLocation = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      createLeadFromJourney: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: (input: any) => {
            mockMutate(input);
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

import ServicesRequestPage from '../ServicesRequestPage';

describe('ServicesRequestPage integration', () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
    mockMutate.mockReset();
    sessionStorage.clear();
  });

  it('navigates to /services/results/{leadId} after successful submit', async () => {
    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

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
      expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('/services/results/99'));
    });
  });

  it('redirects with the submitted location and request context, not the initial query string', async () => {
    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'Rondebosch' } });
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Cape Town' } });
    fireEvent.change(screen.getByLabelText(/province/i), { target: { value: 'Western Cape' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Need a full plumbing inspection before transfer.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith(
        '/services/results/99?category=home_improvement&city=Cape%20Town&province=Western%20Cape&suburb=Rondebosch&intentStage=general&sourceSurface=directory&unmatched=0',
      );
    });

    expect(sessionStorage.getItem('service-lead-context-99')).toContain(
      'Need a full plumbing inspection before transfer.',
    );
  });

  it('renders the LeadRequestFlow with step 1 visible', () => {
    render(<ServicesRequestPage />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('passes intentStage and sourceSurface from query params to LeadRequestFlow', async () => {
    // Set query params before render
    const originalSearch = window.location.search;
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search:
          '?intentStage=buyer_offer_intent&sourceSurface=journey_injection&propertyId=42&reasonKey=bond_or_transfer',
      },
      writable: true,
    });

    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'home_improvement',
          intentStage: 'buyer_offer_intent',
          sourceSurface: 'journey_injection',
          propertyId: 42,
          context: expect.objectContaining({
            reasonKey: 'bond_or_transfer',
            sourceDetail: 'property_detail',
            propertyLinked: true,
          }),
        }),
      );
    });

    // Restore
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
    });
  });

  it('preserves normal request flow when no query params are present', async () => {
    const originalSearch = window.location.search;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
    });

    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          intentStage: 'general',
          sourceSurface: 'directory',
          propertyId: undefined,
        }),
      );
    });

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
    });
  });

  it('shows reasonKey banner when provided', () => {
    const originalSearch = window.location.search;
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '?reasonKey=bond_or_transfer&sourceSurface=journey_injection',
      },
      writable: true,
    });

    render(<ServicesRequestPage />);
    expect(screen.getByText('Recommended while viewing this property')).toBeInTheDocument();

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
    });
  });
});
