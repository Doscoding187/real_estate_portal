import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { searchValue, setLocationMock } = vi.hoisted(() => ({
  searchValue: { current: '' },
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/login', setLocationMock],
  useSearch: () => searchValue.current,
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import Login from '../Login';

function setSearch(search: string) {
  searchValue.current = search;
}

describe('Login registration audience preselection', () => {
  afterEach(() => {
    cleanup();
    setLocationMock.mockClear();
  });

  it.each(['property_developer', 'agency_admin'])(
    'ignores a %s preselect and keeps the public role chooser open',
    role => {
      setSearch(`?mode=register&role=${role}&next=%2Fdeveloper%2Fplans`);
      render(<Login />);

      expect(screen.getByRole('heading', { name: /Choose your role/i })).toBeInTheDocument();
      expect(screen.getByTestId('unavailable-role-notice')).toHaveTextContent(
        'Agency and developer registrations are not open yet. Buyers, agents and service providers can register now.',
      );
      expect(screen.queryByRole('heading', { name: 'Create your account' })).not.toBeInTheDocument();
      expect(screen.getAllByText('Buyer / User').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Real Estate Agent').length).toBeGreaterThan(0);
    },
  );

  it('keeps the neutral role chooser open for buyer, agent and service provider', () => {
    setSearch('?mode=register');
    render(<Login />);

    expect(screen.getByRole('heading', { name: /Choose your role/i })).toBeInTheDocument();
    expect(screen.getAllByText('Buyer / User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Real Estate Agent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Service Provider').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('unavailable-role-notice')).not.toBeInTheDocument();
    expect(screen.queryByText('Developer')).not.toBeInTheDocument();
    expect(screen.queryByText('Agency')).not.toBeInTheDocument();
    expect(screen.queryByText('Your name')).not.toBeInTheDocument();
  });

  it('preselects service-provider registration and explains private review', () => {
    setSearch('?mode=register&role=service_provider');
    render(<Login />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your profile stays private until an authorized reviewer approves publication/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Business name')).toBeInTheDocument();
  });

  it('lets a global registration visitor choose their own account path', async () => {
    setSearch('?mode=register&next=%2F');
    render(<Login />);

    await userEvent.setup().click(screen.getByRole('button', { name: /Real Estate Agent/i }));

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText('Phone number')).toBeInTheDocument();
    expect(screen.getByText('Set up Agent OS')).toBeInTheDocument();
  });

  it('keeps the neutral role chooser open for an unknown requested role', () => {
    setSearch('?mode=register&role=unknown_role');
    render(<Login />);

    expect(screen.getAllByText('Buyer / User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Real Estate Agent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Service Provider').length).toBeGreaterThan(0);
    expect(screen.queryByText('Developer')).not.toBeInTheDocument();
    expect(screen.queryByText('Your name')).not.toBeInTheDocument();
  });
});
