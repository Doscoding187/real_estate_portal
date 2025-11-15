import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, test } from 'vitest';
import { RequireSuperAdmin } from '@/components/RequireSuperAdmin';

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

const renderWithAuth = (authValue: any) => {
  return render(
    <RequireSuperAdmin>
      <div data-testid="protected">Protected Content</div>
    </RequireSuperAdmin>,
  );
};

describe('RequireSuperAdmin', () => {
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

  test('renders protected children when user is super admin', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'super_admin' },
      loading: false,
    });

    mockUseLocation.mockReturnValue([null, vi.fn()]);

    renderWithAuth({});

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

    renderWithAuth({});

    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith('/login');
    });
  });

  test('redirects to /login when user is not super_admin', async () => {
    const setLocation = vi.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'agent' },
      loading: false,
    });

    mockUseLocation.mockReturnValue([null, setLocation]);

    renderWithAuth({});

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

    renderWithAuth({});

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

    renderWithAuth({});

    // Wait a bit to ensure no redirect happens
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(setLocation).not.toHaveBeenCalled();
  });
});
