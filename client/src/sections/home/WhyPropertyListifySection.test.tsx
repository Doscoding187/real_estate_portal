import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WhyPropertyListifySection } from './WhyPropertyListifySection';

const PANELS = [
  ['Buying or renting', 'Browse homes for sale', '/property-for-sale'],
  ['Selling or letting', 'Find an agent', '/agents'],
  ['Agents', 'Set up your agent profile', '/advertise/sell/agents'],
  ['Agencies', 'See agency details', '/advertise/sell/agencies'],
  ['Developers', 'See developer details', '/advertise/sell/developers'],
  ['Service providers', 'See service provider details', '/advertise/services'],
] as const;

describe('WhyPropertyListifySection', () => {
  it('has one h2 and a six-tab audience switch', () => {
    render(<WhyPropertyListifySection />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: /one place for every property move/i }));
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    expect(screen.getByRole('tab', { name: 'Buying or renting' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it.each(PANELS)(
    '%s tab shows its panel with three benefits and the right link',
    (tab, cta, href) => {
      render(<WhyPropertyListifySection />);
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getAllByRole('listitem')).toHaveLength(3);
      expect(within(panel).getByRole('link', { name: new RegExp(cta, 'i') })).toHaveAttribute(
        'href',
        href,
      );
      expect(within(panel).getByText(/what you can do today/i)).toBeInTheDocument();
    },
  );

  it('supports arrow, Home and End keys', () => {
    render(<WhyPropertyListifySection />);
    const first = screen.getByRole('tab', { name: 'Buying or renting' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Selling or letting' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Selling or letting' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Service providers' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Service providers' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('tab', { name: 'Buying or renting' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('is honest that agency and developer accounts are not open and avoids jargon', () => {
    const { container } = render(<WhyPropertyListifySection />);
    fireEvent.click(screen.getByRole('tab', { name: 'Agencies' }));
    expect(screen.getByText(/agency accounts are not open yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Developers' }));
    expect(screen.getByText(/developer accounts are not open yet/i)).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/preparation|activation|canonical/i);
  });

  it('links services from the home and owner panels and is honest about provider accounts', () => {
    render(<WhyPropertyListifySection />);
    expect(
      within(screen.getByRole('tabpanel')).getByRole('link', { name: 'Property services' }),
    ).toHaveAttribute('href', '/services');
    fireEvent.click(screen.getByRole('tab', { name: 'Service providers' }));
    const panel = screen.getByRole('tabpanel');
    expect(
      within(panel).getByText(/service provider accounts are not open yet/i),
    ).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/contact?area=other',
    );
    expect(within(panel).getByRole('link', { name: 'Browse the directory' })).toHaveAttribute(
      'href',
      '/services',
    );
  });
});
