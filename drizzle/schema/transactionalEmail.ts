import { index, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './core';

/** B10 provider delivery is separate from the commercial or in-app event. */
export const transactionalEmailDeliveries = mysqlTable(
  'transactional_email_deliveries',
  {
    id: int().autoincrement().primaryKey(),
    sourceType: mysqlEnum('source_type', ['billing_audit', 'term_notice', 'agency_invitation']).notNull(),
    sourceId: int('source_id').notNull(),
    sourceVersion: varchar('source_version', { length: 64 }),
    purpose: varchar({ length: 80 }).notNull(),
    recipientUserId: int('recipient_user_id').references(() => users.id, { onDelete: 'restrict' }),
    recipientEmail: varchar('recipient_email', { length: 320 }).notNull(),
    deliveryKey: varchar('delivery_key', { length: 160 }).notNull(),
    state: mysqlEnum('state', [
      'pending', 'claimed', 'accepted', 'retryable_failed', 'permanent_failed', 'unknown', 'cancelled',
    ]).default('pending').notNull(),
    attemptCount: int('attempt_count').default(0).notNull(),
    maxAttempts: int('max_attempts').default(3).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', { mode: 'string', fsp: 6 }).default(sql`CURRENT_TIMESTAMP(6)`).notNull(),
    claimToken: varchar('claim_token', { length: 64 }),
    claimExpiresAt: timestamp('claim_expires_at', { mode: 'string', fsp: 6 }),
    providerReference: varchar('provider_reference', { length: 255 }),
    lastErrorCode: varchar('last_error_code', { length: 80 }),
    lastError: varchar('last_error', { length: 500 }),
    acceptedAt: timestamp('accepted_at', { mode: 'string', fsp: 6 }),
    createdAt: timestamp('created_at', { mode: 'string', fsp: 6 }).default(sql`CURRENT_TIMESTAMP(6)`).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string', fsp: 6 }).default(sql`CURRENT_TIMESTAMP(6)`).onUpdateNow().notNull(),
  },
  table => [
    unique('uq_transactional_email_delivery_key').on(table.deliveryKey),
    index('idx_transactional_email_due').on(table.state, table.nextAttemptAt),
    index('idx_transactional_email_claim_expiry').on(table.state, table.claimExpiresAt),
    index('idx_transactional_email_source').on(table.sourceType, table.sourceId),
  ],
);

export const transactionalEmailAttempts = mysqlTable(
  'transactional_email_attempts',
  {
    id: int().autoincrement().primaryKey(),
    deliveryId: int('delivery_id').notNull().references(() => transactionalEmailDeliveries.id, { onDelete: 'restrict' }),
    attemptNumber: int('attempt_number').notNull(),
    claimToken: varchar('claim_token', { length: 64 }).notNull(),
    state: mysqlEnum('state', ['claimed', 'accepted', 'retryable_failed', 'permanent_failed', 'unknown']).notNull(),
    providerReference: varchar('provider_reference', { length: 255 }),
    errorCode: varchar('error_code', { length: 80 }),
    claimedAt: timestamp('claimed_at', { mode: 'string', fsp: 6 }).default(sql`CURRENT_TIMESTAMP(6)`).notNull(),
    finishedAt: timestamp('finished_at', { mode: 'string', fsp: 6 }),
  },
  table => [
    unique('uq_transactional_email_attempt_number').on(table.deliveryId, table.attemptNumber),
    unique('uq_transactional_email_attempt_token').on(table.claimToken),
  ],
);
