import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExploreCities } from './ExploreCities';

describe('ExploreCities', () => {
  it('routes homepage city discovery to its canonical SEO page', () => {
    render(
      <ExploreCities
        basePath=""
        customLocations={[
          {
            name: 'Johannesburg',
            province: 'Gauteng',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
            propertyCount: '24 Properties',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /johannesburg/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    expect(screen.queryByRole('link', { name: /johannesburg/i })).not.toHaveAttribute(
      'href',
      expect.stringContaining('/property-for-sale'),
    );
  });

  it('preserves configurable search links outside the homepage discovery surface', () => {
    render(
      <ExploreCities
        basePath="/property-for-sale"
        customLocations={[
          {
            name: 'Johannesburg',
            province: 'Gauteng',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /johannesburg/i })).toHaveAttribute(
      'href',
      '/property-for-sale?province=gauteng&city=johannesburg',
    );
  });

  it('uses the shared homepage rail without nesting another container', () => {
    render(
      <ExploreCities
        withinContentRail
        basePath=""
        customLocations={[
          {
            name: 'Johannesburg',
            province: 'Gauteng',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
          },
        ]}
      />,
    );

    expect(
      screen
        .getByRole('heading', { name: 'Explore property by city' })
        .closest('.home-section-content'),
    ).toBeInTheDocument();
  });
});
