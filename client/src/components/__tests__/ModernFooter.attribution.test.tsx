import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModernFooter } from '../ModernFooter';

describe('ModernFooter data attribution', () => {
  it('credits GeoNames (CC BY 4.0) and Wikidata with a noopener link', () => {
    render(<ModernFooter />);
    expect(screen.getByTestId('footer-data-attribution')).toHaveTextContent(
      'Place data includes GeoNames (geonames.org, CC BY 4.0) and Wikidata.',
    );
    const link = screen.getByRole('link', { name: /GeoNames/ });
    expect(link).toHaveAttribute('href', 'https://www.geonames.org');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
