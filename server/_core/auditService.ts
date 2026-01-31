/**
 * Audit Service
 *
 * Minimal audit logging for emulator actions.
 * Tracks create/update/delete operations performed by super admins in emulator mode.
 */

// TODO: Import db once audit_logs table is added
// import { db } from '../db';

// ============================================================================
// Types
// ============================================================================

export interface AuditEntry {
  superAdminUserId: number;
  brandProfileId: number;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: number;
  details?: string;
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log an emulator action for audit trail.
 * Currently logs to console; can be extended to write to DB.
 */
export async function logEmulatorAction(entry: AuditEntry): Promise<void> {
  const timestamp = new Date().toISOString();

  // Console log for immediate visibility
  console.log(
    `[AUDIT] ${timestamp} | ${entry.action.toUpperCase()} ${entry.entity} #${entry.entityId} ` +
      `| Admin: ${entry.superAdminUserId} | Brand: ${entry.brandProfileId}` +
      (entry.details ? ` | ${entry.details}` : ''),
  );

  // TODO: Write to audit_logs table once migration is applied
  // await db.insert(auditLogs).values({
  //   superAdminUserId: entry.superAdminUserId,
  //   brandProfileId: entry.brandProfileId,
  //   action: entry.action,
  //   entity: entry.entity,
  //   entityId: entry.entityId,
  //   details: entry.details,
  //   timestamp: new Date(),
  // });
}

/**
 * Log brand context change for debugging.
 */
export function logBrandContextChange(
  userId: number,
  action: 'enter' | 'exit',
  brandProfileId?: number,
  brandName?: string,
): void {
  if (action === 'enter' && brandProfileId) {
    console.log(
      `[BRAND_CONTEXT] User ${userId} entering emulator mode as brand "${brandName}" (ID: ${brandProfileId})`,
    );
  } else if (action === 'exit') {
    console.log(`[BRAND_CONTEXT] User ${userId} exiting emulator mode`);
  }
}

// ============================================================================
// Audit Helpers
// ============================================================================

/**
 * Create audit entry for development operations.
 */
export function auditDevelopmentAction(
  superAdminUserId: number,
  brandProfileId: number,
  action: 'create' | 'update' | 'delete',
  developmentId: number,
  developmentName?: string,
): Promise<void> {
  return logEmulatorAction({
    superAdminUserId,
    brandProfileId,
    action,
    entity: 'development',
    entityId: developmentId,
    details: developmentName ? `name: ${developmentName}` : undefined,
  });
}

/**
 * Create audit entry for listing operations.
 */
export function auditListingAction(
  superAdminUserId: number,
  brandProfileId: number,
  action: 'create' | 'update' | 'delete',
  listingId: number,
): Promise<void> {
  return logEmulatorAction({
    superAdminUserId,
    brandProfileId,
    action,
    entity: 'listing',
    entityId: listingId,
  });
}

/**
 * Create audit entry for brand profile operations.
 */
export function auditBrandAction(
  superAdminUserId: number,
  brandProfileId: number,
  action: 'create' | 'update' | 'delete',
): Promise<void> {
  return logEmulatorAction({
    superAdminUserId,
    brandProfileId,
    action,
    entity: 'brand_profile',
    entityId: brandProfileId,
  });
}
