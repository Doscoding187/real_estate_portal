import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CTASection } from './CTASection';

describe('CTASection', () => {
  it('offers two doors: find a home and list a property', () => {
    const { container } = render(<CTASection />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Looking for a home?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Have a property to list?' })).toBeInTheDocument();

    const links: Array<[string, string]> = [
      ['Browse homes for sale', '/property-for-sale'],
      ['Homes to rent', '/property-to-rent'],
      ['List with us', '/advertise'],
      ['Find an agent', '/agents'],
    ];
    for (const [name, href] of links) {
      expect(within(container).getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(container.textContent ?? '').not.toMatch(/preparation|activation/i);
  });

  it('keeps the in-app browse action when provided', () => {
    const onBrowse = vi.fn();
    render(<CTASection onBrowse={onBrowse} />);
    fireEvent.click(screen.getByRole('link', { name: 'Browse homes for sale' }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });
});
