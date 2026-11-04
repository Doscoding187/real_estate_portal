import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../routers';

const ROUTERS_SOURCE = readFileSync(path.resolve(process.cwd(), 'server/routers.ts'), 'utf8');
const publicCaller = appRouter.createCaller({
  req: { headers: {} },
  res: {},
  user: null,
} as never);

function procedureSource(procedure: string): string {
  const marker = `${procedure}: publicProcedure`;
  const start = ROUTERS_SOURCE.indexOf(marker);
  if (start < 0) throw new Error(`procedure ${procedure} not found`);
  const nextProcedure = ROUTERS_SOURCE.slice(start + 1).search(/\w+: publicProcedure/);
  return ROUTERS_SOURCE.slice(start, nextProcedure > 0 ? start + 1 + nextProcedure : undefined);
}

/**
 * Development search accepts one validated canonical Place. It does not
 * accept Search Areas, typed geography, or mixed geography authority inputs.
 */
describe('developments search validation contract', () => {
  it('validates canonical Place identifiers and contradictory ranges at the boundary', async () => {
    await expect(
      publicCaller.properties.searchDevelopments({ canonicalPlaceId: 'gauteng' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    await expect(
      publicCaller.properties.searchDevelopments({ minPrice: 2_000_000, maxPrice: 1_000_000 }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('keeps shared public-search validation on the property inventory journey', () => {
    expect(procedureSource('searchPublicInventory')).toContain(
      'const issue = validatePublicSearchInput(input);',
    );
  });

  it('rejects Search Areas and typed geography instead of widening Development search', async () => {
    await expect(
      publicCaller.properties.searchDevelopments({
        canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
        searchAreaId: 'johannesburg-sandton',
      } as never),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    await expect(
      publicCaller.properties.searchDevelopments({ city: 'Sandton' } as never),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
