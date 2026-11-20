import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../Footer';
import { ModernFooter } from '../ModernFooter';

describe.each([
  ['ModernFooter', ModernFooter],
  ['Footer', Footer],
])('%s data attribution', (_name, Component) => {
  it('credits GeoNames (CC BY 4.0) and Wikidata with a noopener link', () => {
    render(<Component />);
    expect(screen.getByTestId('footer-data-attribution')).toHaveTextContent(
      'Place data includes GeoNames (geonames.org, CC BY 4.0) and Wikidata.',
    );
    const link = screen.getByRole('link', { name: /GeoNames/ });
    expect(link).toHaveAttribute('href', 'https://www.geonames.org');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
