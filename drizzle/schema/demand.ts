import {
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { users, notifications } from './core';
import { agents } from './agencies';
import { properties } from './listings';
import { leads } from './leads';

export const demandCampaigns = mysqlTable(
  'demand_campaigns',
  {
    id: int('id').autoincrement().primaryKey(),
    ownerType: mysqlEnum('owner_type', ['agent', 'agency', 'developer', 'private'])
      .default('agent')
      .notNull(),
    ownerId: int('owner_id').notNull(),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    status: mysqlEnum('status', ['draft', 'active', 'paused', 'archived'])
      .default('draft')
      .notNull(),
    sourceChannel: mysqlEnum('source_channel', ['google', 'meta', 'tiktok', 'internal', 'manual'])
      .default('manual')
      .notNull(),
    distributionMode: mysqlEnum('distribution_mode', ['shared', 'exclusive', 'mixed'])
      .default('shared')
      .notNull(),
    sharedRecipientCount: int('shared_recipient_count').default(3).notNull(),
    city: varchar('city', { length: 100 }),
    suburb: varchar('suburb', { length: 100 }),
    province: varchar('province', { length: 100 }),
    propertyType: mysqlEnum('property_type', [
      'apartment',
      'house',
      'villa',
      'plot',
      'commercial',
      'townhouse',
      'cluster_home',
      'farm',
      'shared_living',
    ]),
    minBedrooms: int('min_bedrooms'),
    maxPrice: int('max_price'),
    minPrice: int('min_price'),
    criteria: json('criteria'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_demand_campaigns_owner').on(table.ownerType, table.ownerId),
    index('idx_demand_campaigns_status').on(table.status),
    index('idx_demand_campaigns_source').on(table.sourceChannel),
  ],
);

export const demandLeads = mysqlTable(
  'demand_leads',
  {
    id: int('id').autoincrement().primaryKey(),
    campaignId: int('campaign_id').references(() => demandCampaigns.id, { onDelete: 'set null' }),
    sourceChannel: varchar('source_channel', { length: 100 }).notNull(),
    status: mysqlEnum('status', ['captured', 'assigned', 'unmatched']).default('captured').notNull(),
    buyerName: varchar('buyer_name', { length: 200 }).notNull(),
    buyerEmail: varchar('buyer_email', { length: 320 }).notNull(),
    buyerPhone: varchar('buyer_phone', { length: 50 }),
    message: text('message'),
    criteria: json('criteria'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_demand_leads_campaign').on(table.campaignId),
    index('idx_demand_leads_status').on(table.status),
    index('idx_demand_leads_source').on(table.sourceChannel),
  ],
);

export const demandLeadMatches = mysqlTable(
  'demand_lead_matches',
  {
    id: int('id').autoincrement().primaryKey(),
    demandLeadId: int('demand_lead_id').references(() => demandLeads.id, { onDelete: 'set null' }),
    campaignId: int('campaign_id').references(() => demandCampaigns.id, { onDelete: 'set null' }),
    leadId: int('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    propertyId: int('property_id').references(() => properties.id, { onDelete: 'set null' }),
    agentId: int('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    ownerType: mysqlEnum('owner_type', ['agent', 'agency', 'developer', 'private'])
      .default('agent')
      .notNull(),
    ownerId: int('owner_id').notNull(),
    matchScore: decimal('match_score', { precision: 10, scale: 4 }).default('0.0000').notNull(),
    confidence: mysqlEnum('confidence', ['low', 'medium', 'high']).default('medium').notNull(),
    tierWeight: decimal('tier_weight', { precision: 8, scale: 4 }).default('1.0000').notNull(),
    performanceMultiplier: decimal('performance_multiplier', { precision: 8, scale: 4 })
      .default('1.0000')
      .notNull(),
    listingQualityMultiplier: decimal('listing_quality_multiplier', { precision: 8, scale: 4 })
      .default('1.0000')
      .notNull(),
    fairnessMultiplier: decimal('fairness_multiplier', { precision: 8, scale: 4 })
      .default('1.0000')
      .notNull(),
    scoringInputs: json('scoring_inputs'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_demand_lead_matches_demand_lead').on(table.demandLeadId),
    index('idx_demand_lead_matches_lead').on(table.leadId),
    index('idx_demand_lead_matches_campaign').on(table.campaignId),
    index('idx_demand_lead_matches_agent').on(table.agentId),
    index('idx_demand_lead_matches_score').on(table.matchScore),
  ],
);

export const demandLeadAssignments = mysqlTable(
  'demand_lead_assignments',
  {
    id: int('id').autoincrement().primaryKey(),
    demandLeadId: int('demand_lead_id').references(() => demandLeads.id, { onDelete: 'set null' }),
    campaignId: int('campaign_id').references(() => demandCampaigns.id, { onDelete: 'set null' }),
    leadId: int('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    assignmentGroupId: varchar('assignment_group_id', { length: 64 }).notNull(),
    assignmentType: mysqlEnum('assignment_type', ['shared', 'exclusive']).default('shared').notNull(),
    assignedAgentId: int('assigned_agent_id').references(() => agents.id, { onDelete: 'set null' }),
    ownerType: mysqlEnum('owner_type', ['agent', 'agency', 'developer', 'private'])
      .default('agent')
      .notNull(),
    ownerId: int('owner_id').notNull(),
    rankPosition: int('rank_position').default(1).notNull(),
    deliveryChannels: json('delivery_channels'),
    status: mysqlEnum('status', ['assigned', 'delivered', 'accepted', 'declined', 'expired'])
      .default('assigned')
      .notNull(),
    reason: text('reason'),
    assignedAt: timestamp('assigned_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    deliveredAt: timestamp('delivered_at', { mode: 'string' }),
    respondedAt: timestamp('responded_at', { mode: 'string' }),
  },
  table => [
    index('idx_demand_lead_assignments_demand_lead').on(table.demandLeadId),
    index('idx_demand_lead_assignments_lead').on(table.leadId),
    index('idx_demand_lead_assignments_campaign').on(table.campaignId),
    index('idx_demand_lead_assignments_agent').on(table.assignedAgentId),
    index('idx_demand_lead_assignments_group').on(table.assignmentGroupId),
    index('idx_demand_lead_assignments_status').on(table.status),
  ],
);

export const demandUnmatchedLeads = mysqlTable(
  'demand_unmatched_leads',
  {
    id: int('id').autoincrement().primaryKey(),
    campaignId: int('campaign_id').references(() => demandCampaigns.id, { onDelete: 'set null' }),
    sourceChannel: varchar('source_channel', { length: 100 }),
    buyerName: varchar('buyer_name', { length: 200 }).notNull(),
    buyerEmail: varchar('buyer_email', { length: 320 }).notNull(),
    buyerPhone: varchar('buyer_phone', { length: 50 }),
    criteria: json('criteria'),
    payload: json('payload'),
    status: mysqlEnum('status', ['open', 'resolved']).default('open').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    resolvedAt: timestamp('resolved_at', { mode: 'string' }),
  },
  table => [
    index('idx_demand_unmatched_campaign').on(table.campaignId),
    index('idx_demand_unmatched_status').on(table.status),
    index('idx_demand_unmatched_created').on(table.createdAt),
  ],
);

// Re-exported to keep schema surface stable for demand notifications.
export { notifications };
