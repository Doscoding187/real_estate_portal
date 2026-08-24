import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROUTERS_SOURCE = readFileSync(path.resolve(process.cwd(), 'server/routers.ts'), 'utf8');

function procedureSource(procedure: string): string {
  const marker = `${procedure}: publicProcedure`;
  const start = ROUTERS_SOURCE.indexOf(marker);
  if (start < 0) throw new Error(`procedure ${procedure} not found`);
  const nextProcedure = ROUTERS_SOURCE.slice(start + 1).search(/\w+: publicProcedure/);
  return ROUTERS_SOURCE.slice(start, nextProcedure > 0 ? start + 1 + nextProcedure : undefined);
}

/**
 * The Developments catalogue must enforce the same journey-neutral public
 * search invariants as the Buy/Rent inventory journey: contradictory ranges
 * and mixed geography authorities are rejected at the boundary instead of
 * silently producing empty result sets.
 */
describe('developments search validation contract', () => {
  it('applies the shared public-search input validator', () => {
    expect(procedureSource('searchDevelopments')).toContain(
      'const issue = validatePublicSearchInput(input);',
    );
  });

  it('matches the inventory journey validator wiring', () => {
    expect(procedureSource('searchPublicInventory')).toContain(
      'const issue = validatePublicSearchInput(input);',
    );
  });

  it('rejects Search Areas explicitly instead of returning silent empty results', () => {
    expect(procedureSource('searchDevelopments')).toContain(
      'Search Areas are not available for the Developments journey yet.',
    );
  });
});
