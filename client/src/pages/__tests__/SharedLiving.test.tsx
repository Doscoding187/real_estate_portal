import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import SharedLiving from '../SharedLiving';

describe('SharedLiving canonical Place gate', () => {
  it('shows the exact assignment dependency and keeps the listing handoff available', () => {
    render(<SharedLiving />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'sl_places.canonical_place_id and reviewed Place assignments',
    );
    expect(screen.getByRole('link', { name: 'List a space' })).toHaveAttribute(
      'href',
      '/shared-living/list',
    );
  });
});
