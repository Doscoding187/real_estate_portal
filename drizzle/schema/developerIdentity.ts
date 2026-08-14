import {
  check,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
  tinyint,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './core';

/**
 * Developer Engine identity authority.
 *
 * These tables deliberately do not depend on the historical `developers` or
 * `developer_brand_profiles` tables. A user is admitted to the Developer
 * Engine through an organisation membership, and public marketplace identity
 * is represented by a Catalogue Publisher whose authority kind is immutable.
 */
export const developerOrganisations = mysqlTable(
  'developer_organisations',
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }),
    description: text(),
    logo: text(),
    website: varchar({ length: 255 }),
    email: varchar({ length: 320 }),
    phone: varchar({ length: 50 }),
    address: text(),
    city: varchar({ length: 100 }),
    province: varchar({ length: 100 }),
    category: mysqlEnum(['residential', 'commercial', 'mixed_use', 'industrial'])
      .default('residential')
      .notNull(),
    establishedYear: int('established_year'),
    trackRecord: text('track_record'),
    status: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
    rejectionReason: text('rejection_reason'),
    approvedBy: int('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { mode: 'string' }),
    rejectedBy: int('rejected_by').references(() => users.id, { onDelete: 'set null' }),
    rejectedAt: timestamp('rejected_at', { mode: 'string' }),
    specializations: json(),
    isVerified: tinyint('is_verified').default(0).notNull(),
    isTrusted: tinyint('is_trusted').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_developer_organisations_slug').on(table.slug),
    index('idx_developer_organisations_status').on(table.status),
    index('idx_developer_organisations_name').on(table.name),
  ],
);

export const developerOrganisationMemberships = mysqlTable(
  'developer_organisation_memberships',
  {
    id: int().autoincrement().primaryKey(),
    organisationId: int('organisation_id')
      .notNull()
      .references(() => developerOrganisations.id, { onDelete: 'cascade' }),
    userId: int('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: mysqlEnum([
      'owner',
      'admin',
      'sales_manager',
      'sales_consultant',
      'marketing',
      'finance',
      'viewer',
    ])
      .default('owner')
      .notNull(),
    status: mysqlEnum(['active', 'invited', 'suspended']).default('active').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_developer_membership_organisation_user').on(table.organisationId, table.userId),
    index('idx_developer_membership_user_status').on(table.userId, table.status),
    index('idx_developer_membership_organisation_status').on(table.organisationId, table.status),
  ],
);

export const cataloguePublishers = mysqlTable(
  'catalogue_publishers',
  {
    id: int().autoincrement().primaryKey(),
    authorityKind: mysqlEnum('authority_kind', [
      'platform_reference',
      'developer_first_party',
    ]).notNull(),
    publisherType: mysqlEnum('publisher_type', ['developer', 'marketing_agency', 'hybrid'])
      .default('developer')
      .notNull(),
    developerOrganisationId: int('developer_organisation_id').references(
      () => developerOrganisations.id,
      { onDelete: 'restrict' },
    ),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    logoUrl: text('logo_url'),
    about: text(),
    foundedYear: int('founded_year'),
    headOfficeLocation: varchar('head_office_location', { length: 255 }),
    operatingProvinces: json('operating_provinces'),
    propertyFocus: json('property_focus'),
    websiteUrl: varchar('website_url', { length: 500 }),
    publicContactEmail: varchar('public_contact_email', { length: 320 }),
    brandTier: mysqlEnum('brand_tier', ['national', 'regional', 'boutique']).default('regional'),
    sourceAttribution: varchar('source_attribution', { length: 255 }),
    isVisible: tinyint('is_visible').default(1).notNull(),
    isContactVerified: tinyint('is_contact_verified').default(0).notNull(),
    createdByUserId: int('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_catalogue_publishers_slug').on(table.slug),
    unique('uq_catalogue_publishers_first_party_organisation').on(
      table.developerOrganisationId,
    ),
    index('idx_catalogue_publishers_authority_visible').on(
      table.authorityKind,
      table.isVisible,
    ),
    index('idx_catalogue_publishers_organisation').on(table.developerOrganisationId),
    check(
      'chk_catalogue_publishers_authority_shape',
      sql`(
        (${table.authorityKind} = 'platform_reference' AND ${table.developerOrganisationId} IS NULL)
        OR
        (${table.authorityKind} = 'developer_first_party' AND ${table.developerOrganisationId} IS NOT NULL)
      )`,
    ),
    check(
      'chk_catalogue_publishers_platform_source',
      sql`${table.authorityKind} <> 'platform_reference' OR CHAR_LENGTH(TRIM(COALESCE(${table.sourceAttribution},''))) > 0`,
    ),
  ],
);

export type DeveloperOrganisation = typeof developerOrganisations.$inferSelect;
export type DeveloperOrganisationMembership = typeof developerOrganisationMemberships.$inferSelect;
export type CataloguePublisher = typeof cataloguePublishers.$inferSelect;
