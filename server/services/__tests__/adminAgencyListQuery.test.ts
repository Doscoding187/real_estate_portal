import { describe, expect, it } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { buildAgencyListWhere } from '../adminAgencyListQuery';

const dialect = new MySqlDialect();
const render = (input: Parameters<typeof buildAgencyListWhere>[0]) => {
  const where = buildAgencyListWhere(input);
  return where ? dialect.sqlToQuery(where) : null;
};

// Query-builder-level: renders SQL and parameters, does not execute against a database.
describe('agency.list where', () => {
  it('has no where clause without filters', () => {
    expect(render({})).toBeNull();
    expect(render({ search: '  ' })).toBeNull();
  });

  it('AND-s filters together (they used to be OR-ed)', () => {
    const q = render({ search: 'acme', subscriptionPlan: 'premium', isVerified: true })!;
    expect(q.sql).toMatch(/\) and /i);
    expect(q.params).toEqual(['%acme%', '%acme%', 'premium', 1]);
  });

  it('escapes LIKE wildcards in the search', () => {
    expect(render({ search: '50%_off' })!.params).toEqual(['%50\\%\\_off%', '%50\\%\\_off%']);
  });

  it('filters unverified agencies as 0', () => {
    expect(render({ isVerified: false })!.params).toEqual([0]);
  });
});
