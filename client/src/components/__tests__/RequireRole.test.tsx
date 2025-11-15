import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, test } from 'vitest';
import { RequireRole } from '@/components/RequireRole';

// Mock the useAuth hook
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock the useLocation hook from wouter
vi.mock('wouter', () => ({
  useLocation: vi.fn(),
}));

import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

const renderWithAuth = (authValue: any, role: string) => {
  return render(
    <RequireRole role={role}>
      <div data-testid="protected">Protected Content</div>
    </RequireRole>,
  );
};

describe('RequireRole', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
      },
      writable: true,
    });
  });

  test('renders protected children when user has required role', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'agency_admin' },
      loading: false,
    });

    mockUseLocation.mockReturnValue([null, vi.fn()]);

    renderWithAuth({}, 'agency_admin');

    expect(await screen.findByTestId('protected')).toBeInTheDocument();
  });

  test('redirects to /login when not authenticated', async () => {
    const setLocation = vi.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    mockUseLocation.mockReturnValue([null, setLocation]);

    renderWithAuth({}, 'agency_admin');

    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith('/login');
    });
  });

  test('redirects to /login when user does not have required role', async () => {
    const setLocation = vi.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'agent' },
      loading: false,
    });

    mockUseLocation.mockReturnValue([null, setLocation]);

    renderWithAuth({}, 'agency_admin');

    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith('/login');
    });
  });

  test('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: true,
    });

    mockUseLocation.mockReturnValue([null, vi.fn()]);

    renderWithAuth({}, 'agency_admin');

    expect(screen.getByText(/checking access/i)).toBeInTheDocument();
  });

  test('does not redirect when already on login page', async () => {
    // Set current path to login
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/login',
      },
      writable: true,
    });

    const setLocation = vi.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    mockUseLocation.mockReturnValue([null, setLocation]);

    renderWithAuth({}, 'agency_admin');

    // Wait a bit to ensure no redirect happens
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(setLocation).not.toHaveBeenCalled();
  });
});
