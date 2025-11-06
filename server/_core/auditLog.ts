import type { Request } from 'express';
import { getDb } from '../db';
import { auditLogs, type InsertAuditLog } from '../../drizzle/schema';

/**
 * Log super_admin and sensitive actions for audit trail
 */
export async function logAudit(params: {
  userId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  metadata?: Record<string, any>;
  req?: Request;
}) {
  const db = await getDb();
  if (!db) {
    console.warn('[AuditLog] Database not available');
    return;
  }

  const logEntry: InsertAuditLog = {
    userId: params.userId,
    action: params.action,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    ipAddress: params.req ? getClientIP(params.req) : null,
    userAgent: params.req?.headers['user-agent'] || null,
  };

  try {
    await db.insert(auditLogs).values(logEntry);
    console.log(`[AuditLog] ${params.action} by user ${params.userId}`);
  } catch (error) {
    console.error('[AuditLog] Failed to log action:', error);
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string | null {
  // Check various headers for proxied requests
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  return req.socket?.remoteAddress || null;
}

/**
 * Audit log action types (for consistency)
 */
export const AuditActions = {
  // Super admin actions
  IMPERSONATE_USER: 'impersonate_user',
  VIEW_ALL_USERS: 'view_all_users',
  VIEW_ALL_AGENCIES: 'view_all_agencies',
  VIEW_ALL_PROPERTIES: 'view_all_properties',
  UPDATE_USER_ROLE: 'update_user_role',
  DELETE_USER: 'delete_user',
  DELETE_AGENCY: 'delete_agency',
  APPROVE_PROPERTY: 'approve_property',
  REJECT_PROPERTY: 'reject_property',

  // Agency admin actions
  INVITE_AGENT: 'invite_agent',
  APPROVE_JOIN_REQUEST: 'approve_join_request',
  REJECT_JOIN_REQUEST: 'reject_join_request',
  REMOVE_SUBACCOUNT: 'remove_subaccount',

  // Sensitive actions
  UPDATE_SUBSCRIPTION: 'update_subscription',
  EXPORT_DATA: 'export_data',
} as const;
