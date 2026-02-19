/**
 * Activity Logging Service (stubbed)
 * Schema mismatches are present in activities; return safe defaults for compile.
 */

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
}

export async function logActivity(params: LogActivityParams): Promise<Activity> {
  return {
    id: 0,
    developerId: params.developerId,
    activityType: params.activityType,
    title: params.title,
    description: params.description,
    metadata: params.metadata,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
    userId: params.userId,
    createdAt: new Date(),
  };
}

export async function getActivities(_params: GetActivitiesParams): Promise<Activity[]> {
  return [];
}

export async function getActivityFeed(_developerId: number): Promise<Activity[]> {
  return [];
}

export async function getActivitiesByType(
  _developerId: number,
  _activityType: ActivityType,
): Promise<Activity[]> {
  return [];
}

export async function getActivitiesForEntity(
  _developerId: number,
  _relatedEntityType: RelatedEntityType,
  _relatedEntityId: number,
): Promise<Activity[]> {
  return [];
}

export async function getActivityCountByType(
  _developerId: number,
): Promise<Record<ActivityType, number>> {
  return {} as Record<ActivityType, number>;
}

export async function deleteOldActivities(_daysToKeep: number): Promise<void> {}

export async function logLeadActivity(
  _developerId: number,
  _leadId: number,
  _action: ActivityType,
  _title: string,
  _description?: string,
  _metadata?: Record<string, any>,
  _userId?: number,
): Promise<Activity> {
  return logActivity({
    developerId: _developerId,
    activityType: _action,
    title: _title,
    description: _description,
    metadata: _metadata,
    relatedEntityType: 'lead',
    relatedEntityId: _leadId,
    userId: _userId,
  });
}

export async function logUnitActivity(
  _developerId: number,
  _unitId: number,
  _action: ActivityType,
  _title: string,
  _description?: string,
  _metadata?: Record<string, any>,
  _userId?: number,
): Promise<Activity> {
  return logActivity({
    developerId: _developerId,
    activityType: _action,
    title: _title,
    description: _description,
    metadata: _metadata,
    relatedEntityType: 'unit',
    relatedEntityId: _unitId,
    userId: _userId,
  });
}

export async function logDevelopmentActivity(
  _developerId: number,
  _developmentId: number,
  _action: ActivityType,
  _title: string,
  _description?: string,
  _metadata?: Record<string, any>,
  _userId?: number,
): Promise<Activity> {
  return logActivity({
    developerId: _developerId,
    activityType: _action,
    title: _title,
    description: _description,
    metadata: _metadata,
    relatedEntityType: 'development',
    relatedEntityId: _developmentId,
    userId: _userId,
  });
}

export async function logMediaActivity(
  _developerId: number,
  _relatedEntityType: RelatedEntityType,
  _relatedEntityId: number,
  _action: ActivityType,
  _title: string,
  _description?: string,
  _metadata?: Record<string, any>,
  _userId?: number,
): Promise<Activity> {
  return logActivity({
    developerId: _developerId,
    activityType: _action,
    title: _title,
    description: _description,
    metadata: _metadata,
    relatedEntityType: _relatedEntityType,
    relatedEntityId: _relatedEntityId,
    userId: _userId,
  });
}

export async function logPriceActivity(
  _developerId: number,
  _relatedEntityType: RelatedEntityType,
  _relatedEntityId: number,
  _action: ActivityType,
  _title: string,
  _description?: string,
  _metadata?: Record<string, any>,
  _userId?: number,
): Promise<Activity> {
  return logActivity({
    developerId: _developerId,
    activityType: _action,
    title: _title,
    description: _description,
    metadata: _metadata,
    relatedEntityType: _relatedEntityType,
    relatedEntityId: _relatedEntityId,
    userId: _userId,
  });
}
