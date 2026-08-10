import { describe, expect, it } from 'vitest';
import { validLocalityCandidate } from '../listingLocationResolver';

describe('listing location provider locality safeguards', () => {
  it('accepts a geographic locality candidate', () => {
    expect(validLocalityCandidate('Aqua Park')).toBe(true);
    expect(validLocalityCandidate('Foo Valley')).toBe(true);
  });

  it('rejects addresses, businesses, buildings and malformed locality names', () => {
    expect(validLocalityCandidate('10 Alice Lane')).toBe(false);
    expect(validLocalityCandidate('Steers Sandton')).toBe(false);
    expect(validLocalityCandidate('Building X')).toBe(false);
    expect(validLocalityCandidate('')).toBe(false);
  });
});
