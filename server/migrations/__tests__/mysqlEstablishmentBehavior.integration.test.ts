import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function rows(result: unknown): Record<string, unknown>[] {
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Record<string, unknown>[]
    : [];
}

describeDatabase('B08 local MySQL establishment behavior', () => {
  let first: AuthoritySqlConnection;
  let second: AuthoritySqlConnection;

  beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    first = await createAuthoritySqlConnection(authority, decision);
    second = await createAuthoritySqlConnection(authority, decision);
  });

  afterAll(async () => {
    await second?.end();
    await first?.end();
  });

  it('enforces FK, CHECK, uniqueness, JSON, microseconds, rollback, FOR UPDATE, and GET_LOCK', async () => {
    const nonce = randomUUID();
    const slug = `b08-json-${nonce}`;
    const deliveryKey = `b08-unique-${nonce}`;
    const lockName = `b08-behavior-${nonce}`;

    expect(rows(await first.query('SELECT @@session.transaction_isolation AS isolation_level'))[0]
      ?.isolation_level).toBe('REPEATABLE-READ');

    await first.query('START TRANSACTION');
    try {
      await first.query(
        'INSERT INTO `partner_tiers` (`name`, `slug`, `priceZar`, `features`) VALUES (?, ?, ?, ?)',
        ['B08 JSON', slug, 100, JSON.stringify({ source: 'b08', nested: { value: 7 } })],
      );
      const persisted = rows(await first.query(
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(`features`, '$.nested.value')) AS nested_value FROM `partner_tiers` WHERE `slug` = ? FOR UPDATE",
        [slug],
      ));
      expect(persisted[0]?.nested_value).toBe('7');

      await expect(first.query(
        "INSERT INTO `billable_accounts` (`account_kind`) VALUES ('agent')",
      )).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
      await expect(first.query(
        "INSERT INTO `transactional_email_attempts` (`delivery_id`, `attempt_number`, `claim_token`, `state`) VALUES (2147483647, 1, ?, 'claimed')",
        [`b08-fk-${nonce}`],
      )).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });

      await first.query(
        "INSERT INTO `transactional_email_deliveries` (`source_type`, `source_id`, `purpose`, `recipient_email`, `delivery_key`) VALUES ('billing_audit', 1, 'b08-proof', 'b08@example.test', ?)",
        [deliveryKey],
      );
      const time = rows(await first.query(
        "SELECT DATE_FORMAT(`created_at`, '%f') AS microseconds FROM `transactional_email_deliveries` WHERE `delivery_key` = ?",
        [deliveryKey],
      ));
      expect(String(time[0]?.microseconds)).toMatch(/^\d{6}$/);
      await expect(first.query(
        "INSERT INTO `transactional_email_deliveries` (`source_type`, `source_id`, `purpose`, `recipient_email`, `delivery_key`) VALUES ('billing_audit', 2, 'b08-proof', 'b08@example.test', ?)",
        [deliveryKey],
      )).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    } finally {
      await first.query('ROLLBACK');
    }

    expect(rows(await first.query('SELECT `id` FROM `partner_tiers` WHERE `slug` = ?', [slug])))
      .toHaveLength(0);
    expect(rows(await first.query(
      'SELECT `id` FROM `transactional_email_deliveries` WHERE `delivery_key` = ?',
      [deliveryKey],
    ))).toHaveLength(0);

    expect(rows(await first.query('SELECT GET_LOCK(?, 0) AS acquired', [lockName]))[0]?.acquired)
      .toBe(1);
    try {
      expect(rows(await second.query('SELECT GET_LOCK(?, 0) AS acquired', [lockName]))[0]?.acquired)
        .toBe(0);
    } finally {
      expect(rows(await first.query('SELECT RELEASE_LOCK(?) AS released', [lockName]))[0]?.released)
        .toBe(1);
    }
  });
});
