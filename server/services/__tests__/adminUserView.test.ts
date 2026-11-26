import { describe, expect, it } from 'vitest';
import { and, getTableColumns } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { users } from '../../../drizzle/schema';
import {
  SAFE_ADMIN_USER_FIELDS,
  buildAuditLogConditions,
  buildUserListConditions,
  escapeLike,
  toSafeAdminUser,
} from '../adminUserView';

const dialect = new MySqlDialect();
const render = (conditions: any[]) => dialect.sqlToQuery(and(...conditions)!);

// Query-builder-level tests: they render the generated SQL and parameters. They do not
// execute against a database (this repo's DB tests need a live database).
describe('toSafeAdminUser', () => {
  it('returns no secret, token, hash or session column from a full users row', () => {
    const fullRow: Record<string, unknown> = {};
    for (const key of Object.keys(getTableColumns(users))) fullRow[key] = `value-${key}`;
    const safe = toSafeAdminUser(fullRow);
    const forbidden = Object.keys(getTableColumns(users)).filter(
      key => /password|token|openid|sessionversion|founder/i.test(key),
    );
    expect(forbidden).toEqual(
      expect.arrayContaining([
        'passwordHash',
        'passwordResetToken',
        'emailVerificationToken',
        'openId',
        'sessionVersion',
      ]),
    );
    for (const key of forbidden) expect(safe).not.toHaveProperty(key);
    expect(Object.keys(safe).sort()).toEqual([...SAFE_ADMIN_USER_FIELDS].sort());
    expect(JSON.stringify(safe)).not.toMatch(/passwordHash|Token|openId/);
  });
});

describe('listUsers conditions', () => {
  it('filters by role and agency', () => {
    const q = render(buildUserListConditions({ role: 'agent', agencyId: 7 }));
    expect(q.sql).toContain('`role` = ?');
    expect(q.sql).toContain('`agencyId` = ?');
    expect(q.params).toEqual(['agent', 7]);
  });

  it('searches email and names with LIKE wildcards escaped', () => {
    const q = render(buildUserListConditions({ search: ' 100%_x ' }));
    expect(q.sql).toMatch(/like/i);
    expect(q.params).toEqual(['%100\\%\\_x%', '%100\\%\\_x%', '%100\\%\\_x%']);
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('adds no condition for empty input', () => {
    expect(buildUserListConditions({ search: '   ' })).toHaveLength(0);
  });
});

describe('getAuditLogs cursor conditions', () => {
  it('older pages use id < cursor, newer (no cursor) use none', () => {
    const older = render(buildAuditLogConditions({ beforeId: 8, action: 'approve_property' }));
    expect(older.sql).toContain('`id` < ?');
    expect(older.params).toEqual(['approve_property', 8]);
    // Newer = pop the cursor stack: the same input as the first page, hence the same rows.
    expect(buildAuditLogConditions({ action: 'approve_property' })).toHaveLength(1);
    expect(buildAuditLogConditions({})).toHaveLength(0);
  });
});
