import { decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';
import { agencies, agents } from './agencies';
import { users } from './core';
import { listings } from './listings';

/** Private, point-in-time seller-review records. Editable listing data stays in the Listing Engine. */
export const agencyListingPerformanceReviews = mysqlTable('agency_listing_performance_reviews', {
  id: int().autoincrement().primaryKey(),
  agencyId: int('agency_id').notNull().references(() => agencies.id, { onDelete: 'cascade' }),
  listingId: int('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  responsibleAgentId: int('responsible_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  reviewStatus: mysqlEnum('review_status', ['scheduled', 'completed', 'cancelled']).default('scheduled').notNull(),
  /** When the seller interaction occurred; distinct from the review record timestamp. */
  contactDate: timestamp('contact_date', { mode: 'string' }),
  contactChannel: mysqlEnum('contact_channel', ['call', 'whatsapp', 'email', 'meeting', 'other']),
  reviewPeriodStart: timestamp('review_period_start', { mode: 'string' }),
  reviewPeriodEnd: timestamp('review_period_end', { mode: 'string' }),
  metricsSnapshot: json('metrics_snapshot').notNull(),
  healthFlagsSnapshot: json('health_flags_snapshot').notNull(),
  agentAssessment: text('agent_assessment'),
  buyerFeedbackThemes: text('buyer_feedback_themes'),
  recommendation: mysqlEnum('recommendation', ['keep_unchanged', 'improve_media', 'improve_description', 'correct_information', 'change_price', 'adjust_viewing_availability', 'increase_marketing', 'pause_listing', 'withdraw_listing', 'review_later']).default('review_later').notNull(),
  recommendationReason: text('recommendation_reason'),
  sellerFeedback: text('seller_feedback'),
  sellerDecision: mysqlEnum('seller_decision', ['pending', 'accepted', 'partially_accepted', 'rejected', 'deferred', 'unable_to_contact', 'unavailable']).default('pending').notNull(),
  proposedPrice: decimal('proposed_price', { precision: 15, scale: 2 }),
  effectiveDate: timestamp('effective_date', { mode: 'string' }),
  nextReviewAt: timestamp('next_review_at', { mode: 'string' }),
  revisionRequestedAt: timestamp('revision_requested_at', { mode: 'string' }),
  canonicalRevisionListingId: int('canonical_revision_listing_id').references(() => listings.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, table => [
  index('idx_listing_performance_review_agency_listing').on(table.agencyId, table.listingId),
  index('idx_listing_performance_review_due').on(table.agencyId, table.nextReviewAt),
  index('idx_listing_performance_review_agent').on(table.agencyId, table.responsibleAgentId),
]);

export const agencyListingPerformanceActivity = mysqlTable('agency_listing_performance_activity', {
  id: int().autoincrement().primaryKey(),
  agencyId: int('agency_id').notNull().references(() => agencies.id, { onDelete: 'cascade' }),
  reviewId: int('review_id').notNull().references(() => agencyListingPerformanceReviews.id, { onDelete: 'cascade' }),
  userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  description: text().notNull(),
  metadata: json(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, table => [index('idx_listing_performance_activity_review').on(table.agencyId, table.reviewId, table.createdAt)]);
