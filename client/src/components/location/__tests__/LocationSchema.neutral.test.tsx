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
