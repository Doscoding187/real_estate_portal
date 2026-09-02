import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setLocation: vi.fn(),
  refetch: vi.fn(),
  query: {
    isLoading: false,
    error: null as Error | null,
    data: {
      organisation: {
        name: 'Actual Developments',
        status: 'approved',
        category: 'mixed_use',
        email: 'team@actual.example',
        phone: '+27 10 555 0000',
        city: 'Cape Town',
        province: 'Western Cape',
        website: 'https://actual.example',
        establishedYear: 2012,
        specializations: ['Apartments', 'Retail'],
      },
      membership: { role: 'owner', status: 'active' },
      publisher: {
        name: 'Actual Developments',
        slug: 'actual-developments',
        isVisible: 1,
      },
    } as unknown,
  },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getProfile: {
        useQuery: () => ({ ...state.query, refetch: state.refetch }),
      },
    },
  },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/settings', state.setLocation],
}));

import SettingsPanel from './SettingsPanel';

describe('SettingsPanel identity truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = {
      isLoading: false,
      error: null,
      data: {
        organisation: {
          name: 'Actual Developments',
          status: 'approved',
          category: 'mixed_use',
          email: 'team@actual.example',
          phone: '+27 10 555 0000',
          city: 'Cape Town',
          province: 'Western Cape',
          website: 'https://actual.example',
          establishedYear: 2012,
          specializations: ['Apartments', 'Retail'],
        },
        membership: { role: 'owner', status: 'active' },
        publisher: {
          name: 'Actual Developments',
          slug: 'actual-developments',
          isVisible: 1,
        },
      },
    };
  });

  it('renders the server identity and explains the controlled team boundary', () => {
    render(<SettingsPanel />);

    expect(screen.getAllByText('Actual Developments')).not.toHaveLength(0);
    expect(screen.getByText('Cape Town, Western Cape')).toBeInTheDocument();
    expect(screen.getByText('Apartments, Retail')).toBeInTheDocument();
    expect(
      screen.getByText(/Self-service invitations, role changes, and removals are not enabled/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Skyline Developments')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Request controlled team access' }));
    expect(state.setLocation).toHaveBeenCalledWith('/contact');
  });

  it('does not disguise an unavailable profile as editable settings', () => {
    state.query = { isLoading: false, error: new Error('Profile unavailable'), data: null };

    render(<SettingsPanel />);

    expect(
      screen.getByRole('heading', { name: 'Unable to load organisation settings' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
});
