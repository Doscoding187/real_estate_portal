import { describe, expect, it } from 'vitest';
import { prospectJourneyDatabaseUrl } from '../../scripts/run-prospect-journey-e2e';

describe('Prospect Journey disposable database guard', () => {
  it('fails closed until a registered worktree browser lifecycle exists', () => {
    expect(() => prospectJourneyDatabaseUrl()).toThrow(/retired.*registered worktree/i);
  });
});
