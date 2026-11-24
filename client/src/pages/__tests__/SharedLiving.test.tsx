import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { searchQuery } = vi.hoisted(() => ({ searchQuery: vi.fn() }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    sharedLiving: { search: { useQuery: (...args: unknown[]) => searchQuery(...args) } },
    placeAuthority: { discover: { useQuery: () => ({ data: undefined, isFetching: false, isError: false }) } },
  },
}));
vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('wouter', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
  useRoute: () => [false, undefined],
}));

import SharedLiving from '../SharedLiving';

describe('Shared Living public marketplace', () => {
  it('shows an honest empty state and preserves student discovery as the same inventory filter', () => {
    searchQuery.mockReturnValue({ isLoading: false, isFetching: false, error: null, data: { items: [], hasMore: false, page: 0 } });
    render(<SharedLiving />);

    expect(screen.getByRole('heading', { name: 'Find a place to live, your way.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No accommodation is available just yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore student accommodation' })).toHaveAttribute('href', '/student-accommodation');
    expect(screen.getByRole('link', { name: /Find Shared Living accommodation/ })).toHaveAttribute('href', '#space-search');
    expect(screen.getByRole('link', { name: /Student Accommodation/ })).toHaveAttribute('href', '/student-accommodation');
    expect(screen.getByRole('link', { name: /List your accommodation/ })).toHaveAttribute('href', '/shared-living/list');
    expect(screen.getByText(/Preview examples · not live inventory/i)).toBeInTheDocument();
    expect(searchQuery).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }), { retry: false });
  });

  it('shows the student accommodation entry as a filtered view of the same marketplace', () => {
    searchQuery.mockReturnValue({ isLoading: false, isFetching: false, error: null, data: { items: [], hasMore: false, page: 0 } });
    render(<SharedLiving studentMode />);

    expect(screen.getByRole('heading', { name: 'Student accommodation that feels like home.' })).toBeInTheDocument();
    expect(searchQuery).toHaveBeenCalledWith(expect.objectContaining({ marketTag: 'student' }), { retry: false });
  });
});
