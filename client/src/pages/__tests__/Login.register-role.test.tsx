import { cleanup, render, screen } from '@testing-library/react';
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

  it('preselects the Developer registration dialog for the developer commercial entry', () => {
    setSearch('?mode=register&role=property_developer&next=%2Fdeveloper%2Fplans');
    render(<Login />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getAllByText('Developer').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Register your owner account, then continue into company and development onboarding.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Continue to company onboarding')).toBeInTheDocument();
    expect(screen.getByText('Your name')).toBeInTheDocument();
  });

  it('preselects the matching role card for other commercial audiences', () => {
    setSearch('?mode=register&role=agency_admin');
    render(<Login />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getAllByText('Agency').length).toBeGreaterThan(0);
    expect(screen.getByText('Owner name')).toBeInTheDocument();
  });

  it('falls back to the visitor path when no role is requested', () => {
    setSearch('?mode=register');
    render(<Login />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getAllByText('Buyer / User').length).toBeGreaterThan(0);
    expect(screen.getByText('Create free account')).toBeInTheDocument();
    expect(screen.queryByText('Continue to company onboarding')).not.toBeInTheDocument();
  });

  it('falls back to the visitor path for an unknown requested role', () => {
    setSearch('?mode=register&role=unknown_role');
    render(<Login />);

    expect(screen.getAllByText('Buyer / User').length).toBeGreaterThan(0);
    expect(screen.getByText('Create free account')).toBeInTheDocument();
    expect(screen.queryByText('Continue to company onboarding')).not.toBeInTheDocument();
  });
});
