import { HelmetProvider } from 'react-helmet-async';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LocationSchema } from '../LocationSchema';

describe('LocationSchema neutral mode', () => {
  it('uses neutral metadata and geography-led canonical breadcrumbs', () => {
    render(
      <LocationSchema
        type="City"
        name="Pretoria"
        description="Explore Pretoria."
        url="/gauteng/pretoria"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Explore', url: '/' },
          { name: 'Gauteng', url: '/gauteng' },
          { name: 'Pretoria', url: '/gauteng/pretoria' },
        ]}
        stats={{ totalListings: 100, avgPrice: 1000000 }}
        neutralMode
      />,
      { wrapper: HelmetProvider },
    );

    return waitFor(() => {
      expect(document.title).toBe('Explore Pretoria | Property Listify');
      expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
        'content',
        'Discover properties, developments, local insights, suburbs, and agents in Pretoria.',
      );
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
        'href',
        expect.stringContaining('/gauteng/pretoria'),
      );
      expect(document.head.textContent).not.toContain('Properties for Sale & Rent');
    });
  });
});

it('omits unknown zero prices from structured data while preserving a genuine zero listing count', async () => {
  render(
    <LocationSchema
      type="Province"
      name="Gauteng"
      description="Guide to Gauteng."
      url="/gauteng"
      breadcrumbs={[]}
      stats={{ totalListings: 0, avgPrice: 0, avgRentalPrice: NaN }}
      neutralMode
    />,
    { wrapper: HelmetProvider },
  );
  await waitFor(() => {
    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      script => JSON.parse(script.textContent || '{}'),
    );
    const area = schemas.flat().find(schema => schema['@type'] === 'AdministrativeArea');
    expect(area).toBeDefined();
    expect(area.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Total Listings', value: 0 },
    ]);
  });
});
