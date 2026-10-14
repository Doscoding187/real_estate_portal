import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';
const { getDatabase } = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock('../../db-connection', () => ({ getDb: getDatabase }));
import { listPublicCataloguePublishers } from '../developerIdentityService';
const chain = {
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ['from', 'leftJoin', 'where', 'orderBy', 'limit'] as const)
    chain[key].mockReturnValue(chain);
  chain.offset.mockResolvedValue([]);
  getDatabase.mockResolvedValue({ select: vi.fn(() => chain) });
});
describe('Directory project-province evidence', () => {
  it('matches province through eligible published projects, retaining the public guard and page boundaries', async () => {
    await listPublicCataloguePublishers({
      province: 'Gauteng',
      search: 'Homes',
      limit: 25,
      offset: 24,
    });
    const query = new MySqlDialect().sqlToQuery(chain.where.mock.calls[0][0] as SQL);
    expect(query.sql).toContain('EXISTS');
    expect(query.sql).toContain(
      '`developments`.`catalogue_publisher_id` = `catalogue_publishers`.`id`',
    );
    expect(query.sql).toContain('`developments`.`province`');
    expect(query.params).toContain('Gauteng');
    expect(query.sql).toContain('`developments`.`isPublished`');
    expect(query.sql).toContain('`developments`.`approval_status`');
    expect(query.params).toContain('approved');
    expect(query.sql).toContain('subscriptions');
    expect(query.sql).toContain('developer_organisation_memberships');
    expect(chain.limit).toHaveBeenCalledWith(25);
    expect(chain.offset).toHaveBeenCalledWith(24);
  });
  it('keeps the existing broader public directory when no project province was chosen', async () => {
    await listPublicCataloguePublishers({ limit: 25, offset: 0 });
    const query = new MySqlDialect().sqlToQuery(chain.where.mock.calls[0][0] as SQL);
    expect(query.sql).not.toContain('`developments`.`province`');
    expect(query.sql).toContain('`catalogue_publishers`.`is_visible`');
  });
});
