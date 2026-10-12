import { datetime, index, int, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { users } from './core';

/** Approved copy is immutable. There is no runtime draft or approval endpoint. */
export const legalReleases = mysqlTable('legal_releases', {
  bundleId: varchar('bundle_id', { length: 100 }).primaryKey(),
  formatVersion: int('format_version').notNull(),
  effectiveAt: varchar('effective_at', { length: 40 }).notNull(),
  termsVersion: varchar('terms_version', { length: 100 }).notNull(),
  termsContent: text('terms_content').notNull(),
  privacyVersion: varchar('privacy_version', { length: 100 }).notNull(),
  privacyContent: text('privacy_content').notNull(),
  approvalReference: varchar('approval_reference', { length: 200 }).notNull(),
  approvalActor: varchar('approval_actor', { length: 200 }).notNull(),
  approvedAt: varchar('approved_at', { length: 40 }).notNull(),
  contentSha256: varchar('content_sha256', { length: 64 }).notNull(),
});

/** One registration policy pointer; switching it never overwrites released text. */
export const legalActiveRelease = mysqlTable('legal_active_release', {
  purpose: mysqlEnum('purpose', ['account_registration']).primaryKey(),
  bundleId: varchar('bundle_id', { length: 100 })
    .notNull()
    .references(() => legalReleases.bundleId, { onDelete: 'restrict', onUpdate: 'restrict' }),
});

/** No marketing permission, IP, email, password or profile payload belongs here. */
export const userLegalAcceptances = mysqlTable(
  'user_legal_acceptances',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: int('user_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'restrict',
    }),
    bundleId: varchar('bundle_id', { length: 100 })
      .notNull()
      .references(() => legalReleases.bundleId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    termsSha256: varchar('terms_sha256', { length: 64 }).notNull(),
    privacyNoticeSha256: varchar('privacy_notice_sha256', { length: 64 }).notNull(),
    releaseContentSha256: varchar('release_content_sha256', { length: 64 }).notNull(),
    acceptedAt: datetime('accepted_at', { mode: 'string', fsp: 3 }).notNull(),
    source: mysqlEnum('source', ['account_registration']).notNull(),
  },
  table => [
    index('idx_user_legal_acceptances_user').on(table.userId),
    index('idx_user_legal_acceptances_due').on(table.acceptedAt),
  ],
);
