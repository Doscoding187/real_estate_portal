import { createHash } from 'node:crypto';

/** No caller SQL, identifiers, arbitrary values, reference writes or DDL enter this API. */
export const REHEARSAL_PROBES = [
  'transaction.begin',
  'transaction.commit',
  'transaction.rollback',
  'transaction.savepoint',
  'transaction.rollback-savepoint',
  'user.insert',
  'user.delete',
  'onboarding.insert',
  'onboarding.read',
  'onboarding.lock',
  'onboarding.update',
  'onboarding.delete',
  'topic.insert',
  'topic.delete',
  'content-topic.insert',
  'content-topic.delete',
  'email.insert',
  'email.read',
  'email.claim',
  'email.delete',
  'attempt.insert',
  'attempt.delete',
  'check.reject',
  'json.insert',
  'json.read',
  'json.delete',
  'read.window',
  'read.identity',
  'read.one',
  'account.insert',
  'account.delete',
  'subscription.insert',
  'subscription.activate',
  'subscription.read',
  'subscription.delete',
  'invoice.insert',
  'invoice.delete',
  'payment.insert',
  'payment.read',
  'payment.verify',
  'read.entitlements',
] as const;
export type RehearsalProbe = (typeof REHEARSAL_PROBES)[number];
const numericId = (slot: number) => 1_900_000_000 + slot;
const textId = (nonce: string, slot: number) =>
  createHash('sha256').update(`${nonce}:${slot}`).digest('hex').slice(0, 36);

export function compileRehearsalProbe(
  probe: RehearsalProbe,
  slots: readonly number[],
  nonce: string,
): {
  sql: string;
  values: unknown[];
} {
  if (!/^[a-f0-9-]{36}$/.test(nonce) || slots.some(s => !Number.isInteger(s) || s < 0 || s >= 32)) {
    throw new Error('Rehearsal refused: bounded synthetic slots required.');
  }
  if (!REHEARSAL_PROBES.includes(probe)) throw new Error('Rehearsal refused: unknown probe.');
  const id = numericId(slots[0]);
  const key = textId(nonce, slots[0]);
  const controls: Record<string, string> = {
    'transaction.begin': 'START TRANSACTION',
    'transaction.commit': 'COMMIT',
    'transaction.rollback': 'ROLLBACK',
    'transaction.savepoint': 'SAVEPOINT rehearsal_probe',
    'transaction.rollback-savepoint': 'ROLLBACK TO SAVEPOINT rehearsal_probe',
    'read.window':
      'WITH p AS (SELECT 2 n UNION ALL SELECT 1) SELECT n,ROW_NUMBER() OVER (ORDER BY n) AS row_number_result FROM p',
    'read.entitlements':
      'SELECT p.name,e.feature_key,e.value_json FROM plans p JOIN plan_entitlements e ON e.plan_id=p.id ORDER BY p.id,e.id',
    'read.one': 'SELECT 1 AS ok',
    'read.identity':
      'SELECT VERSION() version,DATABASE() selected_database,@@session.time_zone time_zone,@@session.transaction_isolation isolation_level',
  };
  if (controls[probe] && slots.length === 0) return { sql: controls[probe], values: [] };
  const statements: Partial<Record<RehearsalProbe, [number, string, unknown[]]>> = {
    'account.insert': [
      1,
      "INSERT INTO billable_accounts(id,account_kind,user_id) VALUES (?,'agent',?)",
      [id, id],
    ],
    'account.delete': [1, 'DELETE FROM billable_accounts WHERE id=?', [id]],
    'subscription.insert': [
      1,
      "INSERT INTO subscriptions(id,owner_type,owner_id,billable_account_id,plan_id,status,current_period_end) SELECT ?,'agent',?,?,id,'pending_payment','2026-12-28 00:00:00' FROM plans WHERE name='agent_launch_access'",
      [id, id, id],
    ],
    'subscription.activate': [1, "UPDATE subscriptions SET status='active' WHERE id=?", [id]],
    'subscription.read': [
      1,
      'SELECT status,current_period_end FROM subscriptions WHERE id=?',
      [id],
    ],
    'subscription.delete': [1, 'DELETE FROM subscriptions WHERE id=?', [id]],
    'invoice.insert': [
      1,
      "INSERT INTO billing_invoices(id,owner_type,owner_id,billable_account_id,subscription_id,invoice_number,payment_reference,amount_due) VALUES (?,'agent',?,?,?,?,?,49900)",
      [id, id, id, id, key, key],
    ],
    'invoice.delete': [1, 'DELETE FROM billing_invoices WHERE id=?', [id]],
    'payment.insert': [
      1,
      "INSERT INTO billing_payments(id,invoice_id,subscription_id,owner_type,owner_id,billable_account_id,amount,payment_reference,idempotency_key) VALUES (?,?,?,'agent',?,?,49900,?,?)",
      [id, id, id, id, id, key, key],
    ],
    'payment.read': [
      1,
      'SELECT state,amount,subscription_id FROM billing_payments WHERE id=?',
      [id],
    ],
    'payment.verify': [1, "UPDATE billing_payments SET state='verified' WHERE id=?", [id]],
    'user.insert': [
      1,
      'INSERT INTO users (id,openId,email,name) VALUES (?,?,?,?)',
      [id, key, `${key}@example.test`, 'Azure rehearsal synthetic'],
    ],
    'user.delete': [1, 'DELETE FROM users WHERE id = ?', [id]],
    'onboarding.insert': [
      1,
      'INSERT INTO user_onboarding_state (user_id,consumer_dashboard_preferences) VALUES (?,?)',
      [id, JSON.stringify({ intent: 'buyer' })],
    ],
    'onboarding.read': [1, 'SELECT * FROM user_onboarding_state WHERE user_id = ?', [id]],
    'onboarding.lock': [
      1,
      'SELECT * FROM user_onboarding_state WHERE user_id = ? FOR UPDATE',
      [id],
    ],
    'onboarding.update': [
      1,
      'UPDATE user_onboarding_state SET content_view_count = content_view_count + 1 WHERE user_id = ?',
      [id],
    ],
    'onboarding.delete': [1, 'DELETE FROM user_onboarding_state WHERE user_id = ?', [id]],
    'topic.insert': [
      1,
      'INSERT INTO topics (id,name,slug) VALUES (?,?,?)',
      [key, 'Azure rehearsal synthetic', key],
    ],
    'topic.delete': [1, 'DELETE FROM topics WHERE id = ?', [key]],
    'content-topic.insert': [
      2,
      'INSERT INTO content_topics (content_id,topic_id) VALUES (?,?)',
      [key, textId(nonce, slots[1])],
    ],
    'content-topic.delete': [
      2,
      'DELETE FROM content_topics WHERE content_id = ? AND topic_id = ?',
      [key, textId(nonce, slots[1])],
    ],
    'email.insert': [
      2,
      "INSERT INTO transactional_email_deliveries (id,source_type,source_id,purpose,recipient_user_id,recipient_email,delivery_key) VALUES (?,'billing_audit',?,'rehearsal',?,?,?)",
      [id, id, numericId(slots[1]), `${key}@example.test`, key],
    ],
    'email.read': [
      1,
      "SELECT *,DATE_FORMAT(created_at,'%f') AS microseconds,DATE_FORMAT(claim_expires_at,'%f') AS claim_microseconds FROM transactional_email_deliveries WHERE id = ?",
      [id],
    ],
    'email.claim': [
      1,
      "UPDATE transactional_email_deliveries SET state='claimed',claim_token=?,claim_expires_at='2026-09-28 12:00:00.123456' WHERE id = ?",
      [key, id],
    ],
    'email.delete': [1, 'DELETE FROM transactional_email_deliveries WHERE id = ?', [id]],
    'attempt.insert': [
      3,
      "INSERT INTO transactional_email_attempts (id,delivery_id,attempt_number,claim_token,state) VALUES (?,?,?,?, 'claimed')",
      [id, numericId(slots[1]), slots[2] + 1, key],
    ],
    'attempt.delete': [1, 'DELETE FROM transactional_email_attempts WHERE id = ?', [id]],
    'check.reject': [1, "INSERT INTO billable_accounts (id,account_kind) VALUES (?,'agent')", [id]],
    'json.insert': [
      1,
      'INSERT INTO partner_tiers (id,name,slug,priceZar,features) VALUES (?,?,?,?,?)',
      [id, 'Azure rehearsal synthetic', key, 100, JSON.stringify({ nested: { value: 7 } })],
    ],
    'json.read': [
      1,
      "SELECT JSON_UNQUOTE(JSON_EXTRACT(features,'$.nested.value')) AS value FROM partner_tiers WHERE id = ?",
      [id],
    ],
    'json.delete': [1, 'DELETE FROM partner_tiers WHERE id = ?', [id]],
  };
  const entry = statements[probe];
  if (!entry || entry[0] !== slots.length)
    throw new Error('Rehearsal refused: unknown probe or parameter count.');
  return { sql: entry[1], values: entry[2] };
}

/** These deletes can only address slots reserved after the empty-fixture preflight. */
export function rehearsalCleanup(nonce: string): Array<{ sql: string; values: unknown[] }> {
  const out: Array<{ sql: string; values: unknown[] }> = [];
  for (let slot = 0; slot < 32; slot++) {
    out.push({
      sql: 'DELETE FROM content_topics WHERE content_id = ?',
      values: [textId(nonce, slot)],
    });
    for (const table of [
      'transactional_email_attempts',
      'transactional_email_deliveries',
      'billing_payments',
      'billing_invoices',
      'subscriptions',
      'billable_accounts',
      'user_onboarding_state',
      'partner_tiers',
      'users',
    ]) {
      out.push({
        sql: `DELETE FROM ${table} WHERE ${table === 'user_onboarding_state' ? 'user_id' : 'id'} = ?`,
        values: [numericId(slot)],
      });
    }
    out.push({ sql: 'DELETE FROM topics WHERE id = ?', values: [textId(nonce, slot)] });
  }
  // Children must be deleted across ALL slots before their parents.
  const order = [
    'content_topics',
    'transactional_email_attempts',
    'transactional_email_deliveries',
    'billing_payments',
    'billing_invoices',
    'subscriptions',
    'billable_accounts',
    'user_onboarding_state',
    'partner_tiers',
    'topics',
    'users',
  ];
  return out.sort(
    (a, b) => order.indexOf(a.sql.split(' ')[2]) - order.indexOf(b.sql.split(' ')[2]),
  );
}
