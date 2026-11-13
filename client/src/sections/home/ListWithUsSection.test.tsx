import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListWithUsSection } from './ListWithUsSection';

describe('ListWithUsSection', () => {
  it('has one h2 "List with Property Listify" and four role cards with real links', () => {
    const { container } = render(<ListWithUsSection />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'List with Property Listify' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /set up your agent profile/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getByRole('link', { name: /see agency details/i })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(screen.getByRole('link', { name: /see developer details/i })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(screen.getByRole('link', { name: /see service details/i })).toHaveAttribute(
      'href',
      '/advertise/services',
    );
    expect(screen.getAllByText('Opening soon')).toHaveLength(3);
    expect(
      screen.getByText(
        'Put your properties, your profile and your developments where buyers and renters search.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see all options/i })).toHaveAttribute(
      'href',
      '/advertise',
    );
    expect(container.textContent ?? '').not.toMatch(/preparation|activation/i);
  });

  it('gives owners a distinct card that points to /agents', () => {
    render(<ListWithUsSection />);
    const owner = screen.getByTestId('home-owner-card');
    expect(
      within(owner).getByRole('heading', { name: 'Selling or letting your own property?' }),
    ).toBeInTheDocument();
    expect(within(owner).getByRole('link', { name: /find an agent/i })).toHaveAttribute(
      'href',
      '/agents',
    );
  });
});
