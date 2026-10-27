import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CityDiscoveryMenu, locationHref } from '@/components/CityDiscoveryMenu';

const { selectSuggestion } = vi.hoisted(() => ({ selectSuggestion: vi.fn() }));

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: ({
    onSelect,
    placeholder,
  }: {
    onSelect?: (location: {
      canonicalPlaceId: string;
      canonicalPath: string;
      name: string;
      slug: string;
      type: 'province' | 'city' | 'suburb';
    }) => void;
    placeholder: string;
  }) => (
    <div>
      <input aria-label="Place search" placeholder={placeholder} />
      <button type="button" onClick={() => onSelect?.(selectSuggestion())}>
        Select admitted place
      </button>
    </div>
  ),
}));

const canonicalPlace = {
  canonicalPlaceId: 'pl-place-01-000000000000000000000001',
  canonicalPath: '/gauteng/johannesburg/sandton',
  name: 'Display text is never used to build this path',
  slug: 'untrusted-display-slug',
  type: 'suburb' as const,
};

describe('CityDiscoveryMenu canonical Place navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the exact path supplied with a canonical Place identity', () => {
    expect(locationHref(canonicalPlace)).toBe('/gauteng/johannesburg/sandton');
  });

  it('fails closed when the Place identity or projected path is invalid', () => {
    expect(locationHref({ ...canonicalPlace, canonicalPlaceId: 'city:12' })).toBe('/');
    expect(locationHref({ ...canonicalPlace, canonicalPath: '' })).toBe('/');
    expect(locationHref({ ...canonicalPlace, canonicalPath: 'gauteng/johannesburg/sandton' })).toBe(
      '/',
    );
  });

  it('shows canonical discovery and navigates with the selected Place path', () => {
    const onNavigate = vi.fn();
    selectSuggestion.mockReturnValue(canonicalPlace);
    render(<CityDiscoveryMenu onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: 'Find a place' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse all locations/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('textbox', { name: 'Place search' })).toHaveAttribute(
      'placeholder',
      'Search South African places',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select admitted place' }));
    expect(onNavigate).toHaveBeenCalledWith('/gauteng/johannesburg/sandton');
  });

  it('uses the neutral discovery entry when a selected result has no valid Place identity', () => {
    const onNavigate = vi.fn();
    selectSuggestion.mockReturnValue({
      ...canonicalPlace,
      canonicalPlaceId: 'city:12',
    });
    render(<CityDiscoveryMenu onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Select admitted place' }));
    expect(onNavigate).toHaveBeenCalledWith('/');
  });
});
