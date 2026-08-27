import { describe, expect, it } from 'vitest';
import { dedicatedDatabaseUrl } from '../../scripts/run-listing-performance-e2e';

describe('Listing Performance E2E database safety', () => {
  it('fails closed until a registered worktree browser lifecycle exists', () => {
    expect(() => dedicatedDatabaseUrl()).toThrow(/retired.*registered worktree/i);
  });
});
