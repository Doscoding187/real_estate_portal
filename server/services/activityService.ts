/**
 * Activity Logging Service for Mission Control Dashboard
 * Tracks and retrieves all developer activities
 * Requirements: 5.1, 5.2, 5.3
 */

import { db } from '../db';
import { activities, users } from '../../drizzle/schema';
import { eq, and, desc, gte, lte, inArray, sql } from 'drizzle-orm';

export type ActivityType =
  | 'lead_new'
  | 'lead_qualified'
  | 'lead_unqualified'
  | 'otp_generated'
  | 'viewing_scheduled'
  | 'viewing_completed'
  | 'media_uploaded'
  | 'price_updated'
  | 'unit_sold'
  | 'unit_reserved'
  | 'development_created'
  | 'development_updated'
  | 'campaign_launched'
  | 'campaign_paused'
  | 'team_member_added'
  | 'team_member_removed';

export type RelatedEntityType = 'development' | 'unit' | 'lead' | 'campaign' | 'team_member';

export interface LogActivityParams {
  developerId: number;
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: number;
  userId?: number;
}

export interface GetActivitiesParams {
  developerId: number;
  limit?: number;
  offset?: number;
  activityTypes?: ActivityType[];
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface Activity {
  id: number;
  developerId: number;
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: number;
  userId?: number;
  createdAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Log a new activity
 */
export async function logActivity(params: LogActivityParams): Promise<Activity> {
  const {
    developerId,
    activityType,
    title,
    description,
    metadata,
    relatedEntityType,
    relatedEntityId,
    userId,
  } = params;

  const [activity] = await db
    .insert(activities)
    .values({
      developerId,
      activityType,
      title,
      description: description || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || null,
      userId: userId || null,
      createdAt: new Date().toISOString(),
    })
    .$returningId();

  // Fetch the created activity with user info
  const [createdActivity] = await db
    .select({
      id: activities.id,
      developerId: activities.developerId,
      activityType: activities.activityType,
      title: activities.title,
      description: activities.description,
      metadata: activities.metadata,
      relatedEntityType: activities.relatedEntityType,
      relatedEntityId: activities.relatedEntityId,
      userId: activities.userId,
      createdAt: activities.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.id, activity.id))
    .limit(1);

  return {
    ...createdActivity,
    createdAt: new Date(createdActivity.createdAt),
    metadata: createdActivity.metadata ? JSON.parse(createdActivity.metadata as string) : undefined,
  } as Activity;
}

/**
 * Get activities with filtering and pagination
 */
export async function getActivities(params: GetActivitiesParams): Promise<Activity[]> {
  const {
    developerId,
    limit = 20,
    offset = 0,
    activityTypes,
    relatedEntityType,
    relatedEntityId,
    startDate,
    endDate,
  } = params;

  let query = db
    .select({
      id: activities.id,
      developerId: activities.developerId,
      activityType: activities.activityType,
      title: activities.title,
      description: activities.description,
      metadata: activities.metadata,
      relatedEntityType: activities.relatedEntityType,
      relatedEntityId: activities.relatedEntityId,
      userId: activities.userId,
      createdAt: activities.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .$dynamic();

  // Build where conditions
  const conditions = [eq(activities.developerId, developerId)];

  if (activityTypes && activityTypes.length > 0) {
    conditions.push(inArray(activities.activityType, activityTypes));
  }

  if (relatedEntityType) {
    conditions.push(eq(activities.relatedEntityType, relatedEntityType));
  }

  if (relatedEntityId) {
    conditions.push(eq(activities.relatedEntityId, relatedEntityId));
  }

  if (startDate) {
    conditions.push(gte(activities.createdAt, startDate.toISOString()));
  }

  if (endDate) {
    conditions.push(lte(activities.createdAt, endDate.toISOString()));
  }

  const results = await query
    .where(and(...conditions))
    .orderBy(desc(activities.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((activity) => ({
    ...activity,
    createdAt: new Date(activity.createdAt),
    metadata: activity.metadata ? JSON.parse(activity.metadata as string) : undefined,
  })) as Activity[];
}

/**
 * Get activity feed for dashboard (recent 20 activities)
 */
export async function getActivityFeed(developerId: number): Promise<Activity[]> {
  return getActivities({
    developerId,
    limit: 20,
    offset: 0,
  });
}

/**
 * Get activities by type
 */
export async function getActivitiesByType(
  developerId: number,
  activityTypes: ActivityType[],
  limit: number = 20
): Promise<Activity[]> {
  return getActivities({
    developerId,
    activityTypes,
    limit,
  });
}

/**
 * Get activities for a specific entity
 */
export async function getActivitiesForEntity(
  developerId: number,
  entityType: RelatedEntityType,
  entityId: number,
  limit: number = 20
): Promise<Activity[]> {
  return getActivities({
    developerId,
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    limit,
  });
}

/**
 * Get activity count by type for a time range
 */
export async function getActivityCountByType(
  developerId: number,
  startDate?: Date,
  endDate?: Date
): Promise<Record<ActivityType, number>> {
  const conditions = [eq(activities.developerId, developerId)];

  if (startDate) {
    conditions.push(gte(activities.createdAt, startDate.toISOString()));
  }

  if (endDate) {
    conditions.push(lte(activities.createdAt, endDate.toISOString()));
  }

  const results = await db
    .select({
      activityType: activities.activityType,
      count: sql<number>`COUNT(*)`,
    })
    .from(activities)
    .where(and(...conditions))
    .groupBy(activities.activityType);

  const counts: Record<string, number> = {};
  results.forEach((result) => {
    counts[result.activityType] = Number(result.count);
  });

  return counts as Record<ActivityType, number>;
}

/**
 * Delete old activities (cleanup)
 */
export async function deleteOldActivities(
  developerId: number,
  olderThanDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db
    .delete(activities)
    .where(
      and(
        eq(activities.developerId, developerId),
        lte(activities.createdAt, cutoffDate.toISOString())
      )
    );

  return result.rowsAffected || 0;
}

// Helper functions for common activity types

export async function logLeadActivity(
  developerId: number,
  leadId: number,
  activityType: 'lead_new' | 'lead_qualified' | 'lead_unqualified',
  leadName: string,
  userId?: number
): Promise<Activity> {
  const titles = {
    lead_new: `New lead: ${leadName}`,
    lead_qualified: `Lead qualified: ${leadName}`,
    lead_unqualified: `Lead unqualified: ${leadName}`,
  };

  return logActivity({
    developerId,
    activityType,
    title: titles[activityType],
    relatedEntityType: 'lead',
    relatedEntityId: leadId,
    userId,
    metadata: { leadName },
  });
}

export async function logUnitActivity(
  developerId: number,
  unitId: number,
  activityType: 'unit_sold' | 'unit_reserved',
  unitNumber: string,
  price: number,
  userId?: number
): Promise<Activity> {
  const titles = {
    unit_sold: `Unit ${unitNumber} sold for R${price.toLocaleString()}`,
    unit_reserved: `Unit ${unitNumber} reserved`,
  };

  return logActivity({
    developerId,
    activityType,
    title: titles[activityType],
    relatedEntityType: 'unit',
    relatedEntityId: unitId,
    userId,
    metadata: { unitNumber, price },
  });
}

export async function logDevelopmentActivity(
  developerId: number,
  developmentId: number,
  activityType: 'development_created' | 'development_updated',
  developmentName: string,
  userId?: number
): Promise<Activity> {
  const titles = {
    development_created: `New development created: ${developmentName}`,
    development_updated: `Development updated: ${developmentName}`,
  };

  return logActivity({
    developerId,
    activityType,
    title: titles[activityType],
    relatedEntityType: 'development',
    relatedEntityId: developmentId,
    userId,
    metadata: { developmentName },
  });
}

export async function logMediaActivity(
  developerId: number,
  developmentId: number,
  mediaCount: number,
  mediaType: 'image' | 'video',
  userId?: number
): Promise<Activity> {
  return logActivity({
    developerId,
    activityType: 'media_uploaded',
    title: `${mediaCount} ${mediaType}${mediaCount > 1 ? 's' : ''} uploaded`,
    relatedEntityType: 'development',
    relatedEntityId: developmentId,
    userId,
    metadata: { mediaCount, mediaType },
  });
}

export async function logPriceActivity(
  developerId: number,
  unitId: number,
  oldPrice: number,
  newPrice: number,
  unitNumber: string,
  userId?: number
): Promise<Activity> {
  const change = newPrice - oldPrice;
  const changePercent = ((change / oldPrice) * 100).toFixed(1);
  const direction = change > 0 ? 'increased' : 'decreased';

  return logActivity({
    developerId,
    activityType: 'price_updated',
    title: `Unit ${unitNumber} price ${direction} by ${Math.abs(Number(changePercent))}%`,
    description: `From R${oldPrice.toLocaleString()} to R${newPrice.toLocaleString()}`,
    relatedEntityType: 'unit',
    relatedEntityId: unitId,
    userId,
    metadata: { oldPrice, newPrice, unitNumber, change, changePercent },
  });
}
