import { describe, expect, it } from 'vitest';
import { placePageDescription, placePageTitle } from '../placePageSeo';

describe('place page search-engine text', () => {
  it('names the place and its province for cities and suburbs', () => {
    expect(placePageDescription('Johannesburg', 'Gauteng')).toBe(
      'Find homes for sale and to rent in Johannesburg, Gauteng: houses, apartments and new developments, with the agents who list them, on Property Listify.',
    );
  });

  it('does not repeat the name for a province page', () => {
    expect(placePageDescription('Gauteng', 'Gauteng')).toContain('in Gauteng, South Africa:');
    expect(placePageDescription('Gauteng', '')).toContain('in Gauteng, South Africa:');
  });

  it('keeps the existing title format', () => {
    expect(placePageTitle('Cape Town')).toBe('Cape Town property search | Property Listify');
  });
});
