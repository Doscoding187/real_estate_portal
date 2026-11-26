import { describe, expect, it } from 'vitest';
import { unitTypeAvailability, unitTypeBadge } from '../LocationTrendingFeedSection';

describe('suburb feed development unit type copy', () => {
  it('labels a unit type "New development · publisher" and states availability only when known', () => {
    const item = { unitType: { publisherName: 'Acme Dev', availableUnits: 3 } };
    expect(unitTypeBadge(item)).toBe('New development · Acme Dev');
    expect(unitTypeAvailability(item)).toBe('3 available');
    expect(unitTypeAvailability({ unitType: { availableUnits: null } })).toBeUndefined();
    expect(unitTypeAvailability({ unitType: { availableUnits: 0 } })).toBeUndefined();
  });

  it('adds nothing to an ordinary listing', () => {
    expect(unitTypeBadge({})).toBeUndefined();
    expect(unitTypeAvailability({})).toBeUndefined();
  });
});
