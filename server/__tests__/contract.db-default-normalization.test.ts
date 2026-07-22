import { describe, expect, it } from 'vitest';

import { databaseDefaultMatches } from '../../scripts/db-contract-default-normalization.js';

describe('database contract default normalization', () => {
  it.each([
    ['now()', 'CURRENT_TIMESTAMP'],
    ['NOW()', 'CURRENT_TIMESTAMP()'],
    ['(now())', 'CURRENT_TIMESTAMP'],
    ['current_timestamp', 'CURRENT_TIMESTAMP()'],
    ['CURRENT_TIMESTAMP()', 'now()'],
  ])(
    'treats %s and %s as equivalent current-time defaults',
    (actual, expected) => {
      expect(databaseDefaultMatches(actual, expected)).toBe(true);
    },
  );

  it('preserves null default semantics', () => {
    expect(databaseDefaultMatches(null, null)).toBe(true);
    expect(databaseDefaultMatches(null, 'CURRENT_TIMESTAMP')).toBe(false);
  });

  it('retains exact matching for non-time defaults', () => {
    expect(databaseDefaultMatches('invited', 'invited')).toBe(true);
    expect(databaseDefaultMatches('invited', 'active')).toBe(false);
    expect(databaseDefaultMatches('1', 1)).toBe(false);
  });

  it('does not accept timestamp expressions with different precision', () => {
    expect(
      databaseDefaultMatches(
        'CURRENT_TIMESTAMP(6)',
        'CURRENT_TIMESTAMP',
      ),
    ).toBe(false);
  });
});
