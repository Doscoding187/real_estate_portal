import {
  check,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './core';
import { cities, provinces, suburbs } from './locations';
import { listings } from './listings';

/** Canonical commercial inventory. Marketing listings are deliberately linked, never embedded. */
export const commercialAssets = mysqlTable(
  'commercial_assets',
  {
    id: int().autoincrement().primaryKey(),
    assetKind: mysqlEnum('asset_kind', [
      'office_building',
      'industrial_park',
      'retail_centre',
      'standalone_premises',
      'mixed_use',
      'other',
    ]).notNull(),
    name: varchar({ length: 255 }).notNull(),
    address: text(),
    provinceId: int('province_id').references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int('city_id').references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int('suburb_id').references(() => suburbs.id, { onDelete: 'set null' }),
    lifecycleStatus: mysqlEnum('lifecycle_status', ['active', 'retired']).default('active').notNull(),
    createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_commercial_assets_geography').on(table.provinceId, table.cityId, table.suburbId),
    index('idx_commercial_assets_kind_status').on(table.assetKind, table.lifecycleStatus),
  ],
);

export const commercialSpaces = mysqlTable(
  'commercial_spaces',
  {
    id: int().autoincrement().primaryKey(),
    commercialAssetId: int('commercial_asset_id')
      .notNull()
      .references(() => commercialAssets.id, { onDelete: 'restrict' }),
    spaceClass: mysqlEnum('space_class', [
      'office',
      'industrial_logistics',
      'retail',
      'mixed_use',
      'other',
    ]).notNull(),
    spaceKind: mysqlEnum('space_kind', [
      'office_suite',
      'warehouse',
      'retail_unit',
      'whole_building',
      'yard',
      'other',
    ]).notNull(),
    identifier: varchar({ length: 255 }).notNull(),
    rentableAreaM2: decimal('rentable_area_m2', { precision: 14, scale: 2 }),
    usableAreaM2: decimal('usable_area_m2', { precision: 14, scale: 2 }),
    lifecycleStatus: mysqlEnum('lifecycle_status', ['active', 'retired']).default('active').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_commercial_spaces_asset_identifier').on(table.commercialAssetId, table.identifier),
    index('idx_commercial_spaces_class_status').on(table.spaceClass, table.lifecycleStatus),
  ],
);

/** Typed, extensible class-specific facts; an ungoverned JSON metadata bag is not Commercial authority. */
export const commercialSpaceSpecifications = mysqlTable(
  'commercial_space_specifications',
  {
    id: int().autoincrement().primaryKey(),
    commercialSpaceId: int('commercial_space_id')
      .notNull()
      .references(() => commercialSpaces.id, { onDelete: 'cascade' }),
    specificationCode: mysqlEnum('specification_code', [
      'building_grade',
      'fit_out_condition',
      'backup_power',
      'backup_water',
      'fibre_connectivity',
      'parking_bays',
      'eaves_height_m',
      'yard_hardstand',
      'truck_access',
      'roller_doors',
      'loading_docks',
      'power_capacity_kva',
      'floor_loading',
      'sprinklers',
      'crane_capacity',
      'frontage_visibility',
      'footfall_context',
      'extraction_capability',
      'tenant_mix_context',
      'delivery_access',
    ]).notNull(),
    valueState: mysqlEnum('value_state', ['known', 'unknown', 'unavailable', 'not_applicable'])
      .notNull(),
    numericValue: decimal('numeric_value', { precision: 16, scale: 2 }),
    textValue: varchar('text_value', { length: 500 }),
    booleanValue: int('boolean_value'),
    sourceLabel: varchar('source_label', { length: 255 }),
    suppliedAt: timestamp('supplied_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_commercial_space_specifications_space_code').on(
      table.commercialSpaceId,
      table.specificationCode,
    ),
    check(
      'chk_commercial_space_specifications_boolean',
      sql.raw('`boolean_value` IS NULL OR `boolean_value` IN (0,1)'),
    ),
  ],
);

export const commercialAvailabilities = mysqlTable(
  'commercial_availabilities',
  {
    id: int().autoincrement().primaryKey(),
    commercialSpaceId: int('commercial_space_id')
      .notNull()
      .references(() => commercialSpaces.id, { onDelete: 'restrict' }),
    transactionType: mysqlEnum('transaction_type', ['lease', 'sale']).notNull(),
    availabilityState: mysqlEnum('availability_state', [
      'available_confirmed',
      'available_upcoming',
      'under_offer',
      'needs_reconfirmation',
      'occupied',
      'withdrawn',
    ]).notNull(),
    occupationDate: date('occupation_date', { mode: 'string' }),
    lastConfirmedAt: timestamp('last_confirmed_at', { mode: 'string' }),
    confirmationSource: mysqlEnum('confirmation_source', [
      'broker',
      'landlord',
      'owner',
      'asset_manager',
      'property_fund',
      'other',
    ]),
    confirmationSourceLabel: varchar('confirmation_source_label', { length: 255 }),
    confirmedByUserId: int('confirmed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reconfirmationDueAt: timestamp('reconfirmation_due_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_commercial_availabilities_space_state').on(
      table.commercialSpaceId,
      table.availabilityState,
    ),
    index('idx_commercial_availabilities_reconfirmation').on(table.reconfirmationDueAt),
    check(
      'chk_commercial_availabilities_confirmed_freshness',
      sql.raw(
        "(`availability_state` <> 'available_confirmed') OR (`last_confirmed_at` IS NOT NULL AND `confirmation_source` IS NOT NULL AND `reconfirmation_due_at` IS NOT NULL)",
      ),
    ),
    check(
      'chk_commercial_availabilities_freshness_order',
      sql.raw(
        "((`availability_state` <> 'available_upcoming') OR (`occupation_date` IS NOT NULL)) AND ((`last_confirmed_at` IS NULL) OR (`reconfirmation_due_at` IS NOT NULL AND `reconfirmation_due_at` >= `last_confirmed_at`))",
      ),
    ),
  ],
);

/** Supplied and estimated cost inputs. Calculated occupancy totals are derived read models, never marketing copy. */
export const commercialAvailabilityEconomics = mysqlTable(
  'commercial_availability_economics',
  {
    id: int().autoincrement().primaryKey(),
    commercialAvailabilityId: int('commercial_availability_id')
      .notNull()
      .references(() => commercialAvailabilities.id, { onDelete: 'cascade' }),
    componentCode: mysqlEnum('component_code', [
      'base_rent',
      'operating_costs',
      'rates_recoveries',
      'parking',
      'fixed_levies',
      'utilities',
      'security_service',
      'other_recovery',
      'deposit',
      'incentive',
    ]).notNull(),
    valueState: mysqlEnum('value_state', ['supplied', 'estimated', 'unknown', 'not_applicable'])
      .notNull(),
    chargeBasis: mysqlEnum('charge_basis', [
      'per_m2_month',
      'per_bay_month',
      'fixed_monthly',
      'annual',
      'once',
    ]),
    amountMinor: int('amount_minor'),
    rangeMaximumMinor: int('range_maximum_minor'),
    currency: varchar({ length: 3 }).default('ZAR').notNull(),
    vatTreatment: mysqlEnum('vat_treatment', ['included', 'excluded', 'not_applicable', 'unknown'])
      .default('unknown')
      .notNull(),
    annualEscalationPercent: decimal('annual_escalation_percent', { precision: 5, scale: 2 }),
    sourceLabel: varchar('source_label', { length: 255 }),
    suppliedAt: timestamp('supplied_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_commercial_availability_economics_component').on(
      table.commercialAvailabilityId,
      table.componentCode,
    ),
    check(
      'chk_commercial_availability_economics_range',
      sql.raw(
        '(`range_maximum_minor` IS NULL) OR ((`amount_minor` IS NOT NULL) AND (`range_maximum_minor` >= `amount_minor`))',
      ),
    ),
    check(
      'chk_commercial_availability_economics_value_state',
      sql.raw(
        "((`value_state` IN ('supplied','estimated')) AND (`amount_minor` IS NOT NULL) AND (`charge_basis` IS NOT NULL)) OR ((`value_state` IN ('unknown','not_applicable')) AND (`amount_minor` IS NULL) AND (`range_maximum_minor` IS NULL) AND (`charge_basis` IS NULL) AND (`annual_escalation_percent` IS NULL))",
      ),
    ),
  ],
);

/** Existing Listing Engine owns marketing lifecycle; this link never transfers Asset, Space, or Availability authority. */
export const commercialAvailabilityListingLinks = mysqlTable(
  'commercial_availability_listing_links',
  {
    id: int().autoincrement().primaryKey(),
    commercialAvailabilityId: int('commercial_availability_id')
      .notNull()
      .references(() => commercialAvailabilities.id, { onDelete: 'restrict' }),
    listingId: int('listing_id').notNull().references(() => listings.id, { onDelete: 'restrict' }),
    linkStatus: mysqlEnum('link_status', ['active', 'ended']).default('active').notNull(),
    linkedAt: timestamp('linked_at', { mode: 'string' }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { mode: 'string' }),
  },
  table => [
    unique('uq_commercial_availability_listing_links_listing').on(table.listingId),
    index('idx_commercial_availability_listing_links_availability').on(
      table.commercialAvailabilityId,
      table.linkStatus,
    ),
  ],
);
