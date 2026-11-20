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
      'Place data includes GeoNames (geonames.org, CC BY 4.0) and Wikidata (CC0).',
    );
    for (const [name, href] of [
      ['GeoNames', 'https://www.geonames.org'],
      ['Wikidata', 'https://www.wikidata.org'],
    ]) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});
