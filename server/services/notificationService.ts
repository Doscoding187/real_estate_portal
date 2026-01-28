/**
 * Notification Service for Mission Control Dashboard
 * Manages developer notifications with real-time delivery support
 * Requirements: 6.2, 6.3, 6.4
 */

import { db } from '../db';
import { developerNotifications, users } from '../../drizzle/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import type { NotificationType, NotificationSeverity } from '../../shared/types';

type NotificationRow = {
  id: number;
  developerId: number;
  userId: number | null;
  title: string;
  body: string;
  type: NotificationType;
  severity: NotificationSeverity;
  read: number;
  actionUrl: string | null;
  metadata: unknown;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
};

const READ_FALSE = 0 as const;
const READ_TRUE = 1 as const;

export interface CreateNotificationParams {
  developerId: number;
  userId?: number;
  title: string;
  body: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface DeveloperNotification {
  id: number;
  developerId: number;
  userId?: number;
  title: string;
  body: string;
  type: NotificationType;
  severity: NotificationSeverity;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface GetNotificationsParams {
  developerId: number;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
  types?: NotificationType[];
}

/**
 * Create a new notification
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<DeveloperNotification> {
  const { developerId, userId, title, body, type, severity = 'info', actionUrl, metadata } = params;

  const [notification] = await db
    .insert(developerNotifications)
    .values({
      developerId,
      userId: userId || null,
      title,
      body,
      type,
      severity,
      read: READ_FALSE,
      actionUrl: actionUrl || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date().toISOString(),
    })
    .$returningId();

  // Fetch the created notification with user info
  const [createdNotification] = await db
    .select({
      id: developerNotifications.id,
      developerId: developerNotifications.developerId,
      userId: developerNotifications.userId,
      title: developerNotifications.title,
      body: developerNotifications.body,
      type: developerNotifications.type,
      severity: developerNotifications.severity,
      read: developerNotifications.read,
      actionUrl: developerNotifications.actionUrl,
      metadata: developerNotifications.metadata,
      createdAt: developerNotifications.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(developerNotifications)
    .leftJoin(users, eq(developerNotifications.userId, users.id))
    .where(eq(developerNotifications.id, notification.id))
    .limit(1);

  // TODO: Trigger WebSocket event for real-time delivery
  // This will be implemented when WebSocket support is added

  return {
    ...createdNotification,
    read: Boolean(createdNotification.read),
    createdAt: new Date(createdNotification.createdAt),
    metadata: createdNotification.metadata
      ? JSON.parse(createdNotification.metadata as string)
      : undefined,
  } as DeveloperNotification;
}

/**
 * Get notifications with filtering and pagination
 */
export async function getNotifications(
  params: GetNotificationsParams,
): Promise<DeveloperNotification[]> {
  const { developerId, unreadOnly = false, limit = 20, offset = 0, types } = params;

  let query = db
    .select({
      id: developerNotifications.id,
      developerId: developerNotifications.developerId,
      userId: developerNotifications.userId,
      title: developerNotifications.title,
      body: developerNotifications.body,
      type: developerNotifications.type,
      severity: developerNotifications.severity,
      read: developerNotifications.read,
      actionUrl: developerNotifications.actionUrl,
      metadata: developerNotifications.metadata,
      createdAt: developerNotifications.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(developerNotifications)
    .leftJoin(users, eq(developerNotifications.userId, users.id))
    .$dynamic();

  // Build where conditions
  const conditions = [eq(developerNotifications.developerId, developerId)];

  if (unreadOnly) {
    conditions.push(eq(developerNotifications.read, READ_FALSE));
  }

  if (types && types.length > 0) {
    conditions.push(sql`${developerNotifications.type} IN ${types}`);
  }

  const results = await query
    .where(and(...conditions))
    .orderBy(desc(developerNotifications.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((notification: NotificationRow) => ({
    ...notification,
    read: Boolean(notification.read),
    createdAt: new Date(notification.createdAt),
    metadata: notification.metadata ? JSON.parse(notification.metadata as string) : undefined,
  })) as DeveloperNotification[];
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(developerId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(developerNotifications)
    .where(
      and(
        eq(developerNotifications.developerId, developerId),
        eq(developerNotifications.read, READ_FALSE),
      ),
    );

  return Number(result[0]?.count || 0);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: number, developerId: number): Promise<boolean> {
  const result = await db
    .update(developerNotifications)
    .set({ read: READ_TRUE })
    .where(
      and(
        eq(developerNotifications.id, notificationId),
        eq(developerNotifications.developerId, developerId),
      ),
    );

  return (result.rowsAffected || 0) > 0;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(developerId: number): Promise<number> {
  const result = await db
    .update(developerNotifications)
    .set({ read: READ_TRUE })
    .where(
      and(
        eq(developerNotifications.developerId, developerId),
        eq(developerNotifications.read, READ_FALSE),
      ),
    );

  return result.rowsAffected || 0;
}

/**
 * Delete a notification
 */
export async function dismissNotification(
  notificationId: number,
  developerId: number,
): Promise<boolean> {
  const result = await db
    .delete(developerNotifications)
    .where(
      and(
        eq(developerNotifications.id, notificationId),
        eq(developerNotifications.developerId, developerId),
      ),
    );

  return (result.rowsAffected || 0) > 0;
}

/**
 * Delete old read notifications (cleanup)
 */
export async function deleteOldNotifications(
  developerId: number,
  olderThanDays: number = 30,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db
    .delete(developerNotifications)
    .where(
      and(
        eq(developerNotifications.developerId, developerId),
        eq(developerNotifications.read, READ_TRUE),
        sql`${developerNotifications.createdAt} < ${cutoffDate.toISOString()}`,
      ),
    );

  return result.rowsAffected || 0;
}

// Helper functions for common notification types

/**
 * Notify about a new lead
 */
export async function notifyNewLead(
  developerId: number,
  leadName: string,
  leadEmail: string,
  developmentName: string,
  leadId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'New Lead Received',
    body: `${leadName} (${leadEmail}) is interested in ${developmentName}`,
    type: 'lead_new',
    severity: 'success',
    actionUrl: `/developer/leads/${leadId}`,
    metadata: { leadName, leadEmail, developmentName, leadId },
  });
}

/**
 * Notify about a qualified lead
 */
export async function notifyQualifiedLead(
  developerId: number,
  leadName: string,
  developmentName: string,
  leadId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Lead Qualified',
    body: `${leadName} has been qualified for ${developmentName}`,
    type: 'lead_qualified',
    severity: 'success',
    actionUrl: `/developer/leads/${leadId}`,
    metadata: { leadName, developmentName, leadId },
  });
}

/**
 * Notify about a scheduled viewing
 */
export async function notifyViewingScheduled(
  developerId: number,
  leadName: string,
  developmentName: string,
  viewingDate: Date,
  leadId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Viewing Scheduled',
    body: `${leadName} scheduled a viewing for ${developmentName} on ${viewingDate.toLocaleDateString()}`,
    type: 'viewing_scheduled',
    severity: 'info',
    actionUrl: `/developer/leads/${leadId}`,
    metadata: { leadName, developmentName, viewingDate: viewingDate.toISOString(), leadId },
  });
}

/**
 * Notify about a completed viewing
 */
export async function notifyViewingCompleted(
  developerId: number,
  leadName: string,
  developmentName: string,
  leadId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Viewing Completed',
    body: `${leadName} completed viewing of ${developmentName}`,
    type: 'viewing_completed',
    severity: 'info',
    actionUrl: `/developer/leads/${leadId}`,
    metadata: { leadName, developmentName, leadId },
  });
}

/**
 * Notify about a unit sale
 */
export async function notifyUnitSold(
  developerId: number,
  unitNumber: string,
  developmentName: string,
  price: number,
  unitId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Unit Sold!',
    body: `Unit ${unitNumber} in ${developmentName} sold for R${price.toLocaleString()}`,
    type: 'unit_sold',
    severity: 'success',
    actionUrl: `/developer/developments/${unitId}`,
    metadata: { unitNumber, developmentName, price, unitId },
  });
}

/**
 * Notify about a unit reservation
 */
export async function notifyUnitReserved(
  developerId: number,
  unitNumber: string,
  developmentName: string,
  leadName: string,
  unitId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Unit Reserved',
    body: `Unit ${unitNumber} in ${developmentName} reserved by ${leadName}`,
    type: 'unit_reserved',
    severity: 'info',
    actionUrl: `/developer/developments/${unitId}`,
    metadata: { unitNumber, developmentName, leadName, unitId },
  });
}

/**
 * Notify about subscription expiring
 */
export async function notifySubscriptionExpiring(
  developerId: number,
  daysRemaining: number,
  tier: string,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Subscription Expiring Soon',
    body: `Your ${tier} subscription expires in ${daysRemaining} days`,
    type: 'subscription_expiring',
    severity: 'warning',
    actionUrl: '/developer/settings/subscription',
    metadata: { daysRemaining, tier },
  });
}

/**
 * Notify about subscription limit reached
 */
export async function notifySubscriptionLimitReached(
  developerId: number,
  limitType: string,
  currentValue: number,
  maxValue: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Subscription Limit Reached',
    body: `You've reached your ${limitType} limit (${currentValue}/${maxValue}). Upgrade to continue.`,
    type: 'subscription_limit_reached',
    severity: 'warning',
    actionUrl: '/developer/settings/subscription',
    metadata: { limitType, currentValue, maxValue },
  });
}

/**
 * Notify about a new team member
 */
export async function notifyTeamMemberJoined(
  developerId: number,
  memberName: string,
  memberEmail: string,
  role: string,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'New Team Member',
    body: `${memberName} (${memberEmail}) joined as ${role}`,
    type: 'team_member_joined',
    severity: 'info',
    actionUrl: '/developer/settings/team',
    metadata: { memberName, memberEmail, role },
  });
}

/**
 * Notify about campaign performance
 */
export async function notifyCampaignPerformance(
  developerId: number,
  campaignName: string,
  metric: string,
  value: number,
  campaignId: number,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: 'Campaign Update',
    body: `${campaignName}: ${metric} reached ${value}`,
    type: 'campaign_performance',
    severity: 'info',
    actionUrl: `/developer/campaigns/${campaignId}`,
    metadata: { campaignName, metric, value, campaignId },
  });
}

/**
 * Notify about system updates
 */
export async function notifySystemUpdate(
  developerId: number,
  updateTitle: string,
  updateDescription: string,
): Promise<DeveloperNotification> {
  return createNotification({
    developerId,
    title: updateTitle,
    body: updateDescription,
    type: 'system_update',
    severity: 'info',
    metadata: { updateTitle, updateDescription },
  });
}
