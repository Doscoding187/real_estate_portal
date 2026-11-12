import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModernFooter } from '../ModernFooter';

describe('ModernFooter explore and professional links', () => {
  it('links to provinces and the national places page', () => {
    render(<ModernFooter />);
    const nav = screen.getByRole('navigation', { name: 'Explore by area footer navigation' });

    expect(within(nav).getByRole('link', { name: 'Gauteng' })).toHaveAttribute('href', '/gauteng');
    expect(within(nav).getByRole('link', { name: 'Western Cape' })).toHaveAttribute(
      'href',
      '/western-cape',
    );
    expect(within(nav).getByRole('link', { name: 'KwaZulu-Natal' })).toHaveAttribute(
      'href',
      '/kwazulu-natal',
    );
    expect(within(nav).getByRole('link', { name: 'All areas' })).toHaveAttribute(
      'href',
      '/south-africa',
    );
  });

  it('lists published city pages after the provinces', () => {
    render(<ModernFooter />);
    const nav = screen.getByRole('navigation', { name: 'Explore by area footer navigation' });
    const labels = within(nav)
      .getAllByRole('link')
      .map(link => link.textContent);

    expect(labels.slice(0, 3)).toEqual(['Gauteng', 'Western Cape', 'KwaZulu-Natal']);
    expect(labels.at(-1)).toBe('All areas');
    expect(within(nav).getByRole('link', { name: 'Johannesburg' })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    expect(within(nav).getByRole('link', { name: 'Pretoria' })).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
    expect(within(nav).getByRole('link', { name: 'Cape Town' })).toHaveAttribute(
      'href',
      '/western-cape/cape-town',
    );
    expect(within(nav).getByRole('link', { name: 'Durban' })).toHaveAttribute(
      'href',
      '/kwazulu-natal/durban',
    );
  });

  it('always links the role pages and referrals', () => {
    render(<ModernFooter />);
    const nav = screen.getByRole('navigation', { name: 'Professionals footer navigation' });

    expect(within(nav).getByRole('link', { name: 'For Agents' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(within(nav).getByRole('link', { name: 'For Agencies' })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(within(nav).getByRole('link', { name: 'For Developers' })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(within(nav).getByRole('link', { name: 'Referrals' })).toHaveAttribute(
      'href',
      '/distribution-network',
    );
  });
});
