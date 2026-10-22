import {
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { agencies } from './agencies';
import { users } from './core';

export const CONTACT_VISIBILITY_VALUES = ['private', 'agency_shared'] as const;

/**
 * The Agent Workplace's curated person and relationship authority.
 *
 * Source/capture records keep their own person-shaped fields. They are not
 * mirrored here; a future bounded linking workflow may make an explicit
 * relationship to this curated record.
 */
export const contacts = mysqlTable(
  'contacts',
  {
    id: int().autoincrement().primaryKey(),
    ownerUserId: int('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    agencyId: int('agency_id').references(() => agencies.id, { onDelete: 'restrict' }),
    visibility: mysqlEnum(
      'visibility',
      CONTACT_VISIBILITY_VALUES as unknown as [string, ...string[]],
    )
      .default('private')
      .notNull(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 50 }),
    company: varchar('company', { length: 200 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_contacts_owner_updated').on(table.ownerUserId, table.updatedAt),
    index('idx_contacts_agency_visibility_updated').on(
      table.agencyId,
      table.visibility,
      table.updatedAt,
    ),
    check(
      'chk_contacts_shared_requires_agency',
      sql`${table.visibility} = 'private' OR ${table.agencyId} IS NOT NULL`,
    ),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
