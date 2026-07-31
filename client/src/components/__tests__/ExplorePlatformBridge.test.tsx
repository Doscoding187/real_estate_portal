import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExplorePlatformBridge } from '@/components/ExplorePlatformBridge';

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

describe('ExplorePlatformBridge', () => {
  it('connects standard Explore surfaces to the deterministic parent platform', () => {
    render(<ExplorePlatformBridge />);

    expect(screen.getByRole('link', { name: 'Back to Property Listify' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Explore' })).not.toBeInTheDocument();
  });

  it('keeps parent exit and internal Explore return as separate immersive actions', () => {
    render(<ExplorePlatformBridge variant="immersive" showExploreReturn />);

    expect(screen.getByRole('link', { name: 'Back to Property Listify' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });
});
