import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchMock, setLocationMock } = vi.hoisted(() => ({
  searchMock: vi.fn(() => ''),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/login', setLocationMock],
  useSearch: () => searchMock(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body?: unknown) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

import Login from '../Login';

describe('Login register role preselection', () => {
  beforeEach(() => {
    searchMock.mockReturnValue('');
  });

  it('preselects the Agency role card for the agency commercial entry link', () => {
    searchMock.mockReturnValue('?mode=register&role=agency_admin&next=%2Fagency%2Fsetup');
    render(<Login />);

    expect(screen.getByText('Owner name')).toBeInTheDocument();
    expect(screen.getByText('Work email')).toBeInTheDocument();
    expect(screen.queryByText('Phone number')).not.toBeInTheDocument();
  });

  it('preselects other available roles passed through the role parameter', () => {
    searchMock.mockReturnValue('?mode=register&role=agent');
    render(<Login />);

    expect(screen.getByText('Phone number')).toBeInTheDocument();
    expect(screen.queryByLabelText('Owner name')).not.toBeInTheDocument();
  });

  it('keeps the visitor card as the default register entry without a role parameter', () => {
    searchMock.mockReturnValue('?mode=register');
    render(<Login />);

    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Owner name')).not.toBeInTheDocument();
  });

  it('ignores unknown or unavailable role parameters and falls back to visitor', () => {
    searchMock.mockReturnValue('?mode=register&role=super_admin');
    render(<Login />);

    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Owner name')).not.toBeInTheDocument();
  });
});
