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
