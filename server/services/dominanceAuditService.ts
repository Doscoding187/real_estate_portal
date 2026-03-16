import { sql } from 'drizzle-orm';
import { getDb } from '../db';

type DbLike = {
  execute: (query: any) => Promise<any>;
};

type ValidationStatus = 'passed' | 'failed' | 'not_run' | 'unknown';

export type DominanceChangeType =
  | 'pricing_floor_update'
  | 'cap_logic_update'
  | 'ranking_weight_update'
  | 'rule_create'
  | 'rule_status_update'
  | 'rule_update';

type DominanceLayer =
  | 'experience'
  | 'delivery_engine'
  | 'monetization_core'
  | 'data_persistence'
  | 'economic_intelligence'
  | 'market_control';

type LogDominanceAuditInput = {
  changeType: DominanceChangeType;
  dominanceLayer: DominanceLayer;
  entityType: string;
  entityId?: number | null;
  actorUserId?: number | null;
  approvedByUserId?: number | null;
  validationStatus?: ValidationStatus;
  validationReference?: Record<string, any> | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};

type ListDominanceAuditInput = {
  limit?: number;
  changeType?: DominanceChangeType;
  entityType?: string;
  entityId?: number;
};

let tableEnsured = false;

function normalizeJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) return result[0];
    if (result.length > 0 && typeof result[0] === 'object') return result;
    return [];
  }
  if (Array.isArray((result as any).rows)) return (result as any).rows;
  if (Array.isArray((result as any)[0])) return (result as any)[0];
  return [];
}

async function ensureDominanceAuditTable(db: DbLike) {
  if (tableEnsured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dominance_audit_log (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      change_type VARCHAR(64) NOT NULL,
      dominance_layer VARCHAR(64) NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id BIGINT NULL,
      actor_user_id BIGINT NULL,
      approved_by_user_id BIGINT NULL,
      validation_status ENUM('passed', 'failed', 'not_run', 'unknown') NOT NULL DEFAULT 'unknown',
      validation_reference JSON NULL,
      before_state JSON NULL,
      after_state JSON NULL,
      metadata JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_dal_change_created (change_type, created_at),
      KEY idx_dal_entity (entity_type, entity_id, created_at),
      KEY idx_dal_actor_created (actor_user_id, created_at)
    )
  `);

  tableEnsured = true;
}

export async function logDominanceAudit(input: LogDominanceAuditInput): Promise<void> {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return;
  await ensureDominanceAuditTable(db);

  await db.execute(sql`
    INSERT INTO dominance_audit_log (
      change_type,
      dominance_layer,
      entity_type,
      entity_id,
      actor_user_id,
      approved_by_user_id,
      validation_status,
      validation_reference,
      before_state,
      after_state,
      metadata
    )
    VALUES (
      ${input.changeType},
      ${input.dominanceLayer},
      ${input.entityType},
      ${input.entityId ?? null},
      ${input.actorUserId ?? null},
      ${input.approvedByUserId ?? null},
      ${input.validationStatus ?? 'unknown'},
      ${normalizeJson(input.validationReference)},
      ${normalizeJson(input.beforeState)},
      ${normalizeJson(input.afterState)},
      ${normalizeJson(input.metadata)}
    )
  `);
}

export async function listDominanceAudit(input?: ListDominanceAuditInput) {
  const db = await getDb();
  if (!db || typeof db.execute !== 'function') return [];
  await ensureDominanceAuditTable(db);

  const limit = Math.max(1, Math.min(200, Number(input?.limit || 50)));
  const whereChangeType = input?.changeType ? sql`AND change_type = ${input.changeType}` : sql``;
  const whereEntityType = input?.entityType ? sql`AND entity_type = ${input.entityType}` : sql``;
  const whereEntityId =
    typeof input?.entityId === 'number' && Number.isFinite(input.entityId)
      ? sql`AND entity_id = ${input.entityId}`
      : sql``;

  const result = await db.execute(sql`
    SELECT
      id,
      change_type AS changeType,
      dominance_layer AS dominanceLayer,
      entity_type AS entityType,
      entity_id AS entityId,
      actor_user_id AS actorUserId,
      approved_by_user_id AS approvedByUserId,
      validation_status AS validationStatus,
      validation_reference AS validationReference,
      before_state AS beforeState,
      after_state AS afterState,
      metadata,
      created_at AS createdAt
    FROM dominance_audit_log
    WHERE 1=1
      ${whereChangeType}
      ${whereEntityType}
      ${whereEntityId}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `);

  return extractRows(result).map((row: any) => ({
    id: Number(row.id || 0),
    changeType: String(row.changeType || ''),
    dominanceLayer: String(row.dominanceLayer || ''),
    entityType: String(row.entityType || ''),
    entityId: row.entityId === null ? null : Number(row.entityId || 0),
    actorUserId: row.actorUserId === null ? null : Number(row.actorUserId || 0),
    approvedByUserId: row.approvedByUserId === null ? null : Number(row.approvedByUserId || 0),
    validationStatus: String(row.validationStatus || 'unknown'),
    validationReference: row.validationReference || {},
    beforeState: row.beforeState || {},
    afterState: row.afterState || {},
    metadata: row.metadata || {},
    createdAt: row.createdAt ? String(row.createdAt) : null,
  }));
}
