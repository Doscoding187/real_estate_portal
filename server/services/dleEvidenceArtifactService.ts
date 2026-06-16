import { TRPCError } from '@trpc/server';
import { sql } from 'drizzle-orm';

import { db } from '../db';

export const DLE_EVIDENCE_ARTIFACT_STATUSES = ['requested', 'submitted'] as const;
export type DleEvidenceArtifactStatus = (typeof DLE_EVIDENCE_ARTIFACT_STATUSES)[number];

export const DLE_EVIDENCE_ARTIFACT_TYPES = [
  'manual_attestation',
  'system_note',
  'external_link',
] as const;
export type DleEvidenceArtifactType = (typeof DLE_EVIDENCE_ARTIFACT_TYPES)[number];

export const RENTAL_EVIDENCE_ROLES = [
  'rental_fit',
  'proof_of_income',
  'bank_statements',
  'employment_confirmation',
  'deposit_readiness',
  'lease_pack',
  'signed_lease',
  'occupation_timing',
] as const;

export const AUCTION_EVIDENCE_ROLES = [
  'bidder_intent',
  'legal_pack_acknowledgement',
  'auction_terms_acceptance',
  'bidder_registration',
  'proof_of_funds',
  'registration_deposit',
  'winning_bid_confirmation',
] as const;

export type RentalEvidenceRole = (typeof RENTAL_EVIDENCE_ROLES)[number];
export type AuctionEvidenceRole = (typeof AUCTION_EVIDENCE_ROLES)[number];
export type DleEvidenceArtifactRole = RentalEvidenceRole | AuctionEvidenceRole;

type LeadEvidenceScope = {
  leadId: number;
  developmentId: number;
  developerId: number;
  transactionType: 'for_rent' | 'auction';
};

type EvidenceArtifactRow = {
  id: number;
  developmentId: number;
  transactionType: 'for_rent' | 'auction';
  leadId: number | null;
  artifactRole: string;
  artifactType: string;
  displayName: string;
  description: string | null;
  status: string;
  reviewOwner: string;
  createdByUserId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function isRentalEvidenceRole(role: string): role is RentalEvidenceRole {
  return (RENTAL_EVIDENCE_ROLES as readonly string[]).includes(role);
}

export function isAuctionEvidenceRole(role: string): role is AuctionEvidenceRole {
  return (AUCTION_EVIDENCE_ROLES as readonly string[]).includes(role);
}

export function assertEvidenceRoleForTransaction(
  transactionType: 'for_rent' | 'auction',
  role: string,
): DleEvidenceArtifactRole {
  if (transactionType === 'for_rent' && isRentalEvidenceRole(role)) {
    return role;
  }
  if (transactionType === 'auction' && isAuctionEvidenceRole(role)) {
    return role;
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message:
      transactionType === 'for_rent'
        ? 'Selected evidence role is not valid for Rental leads.'
        : 'Selected evidence role is not valid for Auction leads.',
  });
}

export function getDefaultReviewOwnerForEvidence(
  transactionType: 'for_rent' | 'auction',
): 'leasing_team' | 'auction_team' {
  return transactionType === 'for_rent' ? 'leasing_team' : 'auction_team';
}

export function getEvidenceArtifactEventType(
  status: DleEvidenceArtifactStatus,
): 'evidence_artifact_requested' | 'evidence_artifact_submitted' {
  return status === 'requested' ? 'evidence_artifact_requested' : 'evidence_artifact_submitted';
}

function getRows(result: unknown): any[] {
  if (Array.isArray((result as any)?.[0])) return (result as any)[0];
  if (Array.isArray(result)) return result as any[];
  return [];
}

function readInsertId(result: unknown): number | null {
  const candidate = Array.isArray(result) ? result[0] : result;
  const id = Number((candidate as any)?.insertId || 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getLeadEvidenceScope(params: {
  developerId: number;
  leadId: number;
}): Promise<LeadEvidenceScope> {
  const result = await db.execute(sql`
    select
      l.id as leadId,
      l.developmentId as developmentId,
      d.developer_id as developerId,
      d.transaction_type as transactionType
    from leads l
    inner join developments d on d.id = l.developmentId
    where l.id = ${params.leadId}
      and d.developer_id = ${params.developerId}
    limit 1
  `);
  const row = getRows(result)[0];

  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Lead not found for this developer.',
    });
  }

  const transactionType = String(row.transactionType || '');
  if (transactionType !== 'for_rent' && transactionType !== 'auction') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Lead evidence artifacts are only enabled for Rental and Auction leads in this slice.',
    });
  }

  return {
    leadId: Number(row.leadId),
    developmentId: Number(row.developmentId),
    developerId: Number(row.developerId),
    transactionType,
  };
}

function normalizeArtifactRow(row: any): EvidenceArtifactRow {
  return {
    id: Number(row.id),
    developmentId: Number(row.developmentId),
    transactionType: row.transactionType,
    leadId: row.leadId == null ? null : Number(row.leadId),
    artifactRole: String(row.artifactRole || ''),
    artifactType: String(row.artifactType || ''),
    displayName: String(row.displayName || ''),
    description: row.description == null ? null : String(row.description),
    status: String(row.status || ''),
    reviewOwner: String(row.reviewOwner || ''),
    createdByUserId: row.createdByUserId == null ? null : Number(row.createdByUserId),
    createdAt: row.createdAt == null ? null : String(row.createdAt),
    updatedAt: row.updatedAt == null ? null : String(row.updatedAt),
  };
}

export async function listLeadEvidenceArtifacts(params: {
  developerId: number;
  leadId: number;
}): Promise<{ items: EvidenceArtifactRow[] }> {
  await getLeadEvidenceScope(params);

  const result = await db.execute(sql`
    select
      id,
      development_id as developmentId,
      transaction_type as transactionType,
      lead_id as leadId,
      artifact_role as artifactRole,
      artifact_type as artifactType,
      display_name as displayName,
      description,
      status,
      review_owner as reviewOwner,
      created_by_user_id as createdByUserId,
      created_at as createdAt,
      updated_at as updatedAt
    from dle_evidence_artifacts
    where lead_id = ${params.leadId}
    order by created_at desc, id desc
  `);

  return {
    items: getRows(result).map(normalizeArtifactRow),
  };
}

export async function createLeadEvidenceArtifact(params: {
  developerId: number;
  userId: number;
  leadId: number;
  artifactRole: string;
  artifactType?: DleEvidenceArtifactType;
  displayName: string;
  description?: string;
  status?: DleEvidenceArtifactStatus;
}): Promise<{ artifact: EvidenceArtifactRow }> {
  const scope = await getLeadEvidenceScope(params);
  const artifactRole = assertEvidenceRoleForTransaction(scope.transactionType, params.artifactRole);
  const artifactType = params.artifactType || 'manual_attestation';
  const status = params.status || 'submitted';
  const reviewOwner = getDefaultReviewOwnerForEvidence(scope.transactionType);
  const eventType = getEvidenceArtifactEventType(status);

  if (!(DLE_EVIDENCE_ARTIFACT_TYPES as readonly string[]).includes(artifactType)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Unsupported evidence artifact type for this slice.',
    });
  }

  if (!(DLE_EVIDENCE_ARTIFACT_STATUSES as readonly string[]).includes(status)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only requested/submitted evidence artifacts are enabled in this slice.',
    });
  }

  const displayName = params.displayName.trim();
  if (!displayName) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence display name is required.',
    });
  }

  const insertResult = await db.execute(sql`
    insert into dle_evidence_artifacts (
      development_id,
      transaction_type,
      lead_id,
      artifact_role,
      artifact_type,
      display_name,
      description,
      status,
      review_owner,
      created_by_user_id,
      updated_by_user_id,
      metadata
    )
    values (
      ${scope.developmentId},
      ${scope.transactionType},
      ${scope.leadId},
      ${artifactRole},
      ${artifactType},
      ${displayName},
      ${params.description?.trim() || null},
      ${status},
      ${reviewOwner},
      ${params.userId},
      ${params.userId},
      ${JSON.stringify({ source: 'developer_leads_manager', status })}
    )
  `);

  const artifactId = readInsertId(insertResult);
  if (!artifactId) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Evidence artifact was not created.',
    });
  }

  await db.execute(sql`
    insert into development_operating_events (
      development_id,
      lead_id,
      transaction_type,
      event_type,
      from_status,
      to_status,
      after_data,
      metadata,
      actor_user_id,
      source_surface
    )
    values (
      ${scope.developmentId},
      ${scope.leadId},
      ${scope.transactionType},
      ${eventType},
      null,
      ${status},
      ${JSON.stringify({ artifactId, artifactRole, artifactType, status, reviewOwner })},
      ${JSON.stringify({
        artifactId,
        artifactRole,
        displayName,
        reviewOwner,
        note: params.description?.trim() || null,
      })},
      ${params.userId},
      'developer_leads_manager'
    )
  `);

  const readback = await db.execute(sql`
    select
      id,
      development_id as developmentId,
      transaction_type as transactionType,
      lead_id as leadId,
      artifact_role as artifactRole,
      artifact_type as artifactType,
      display_name as displayName,
      description,
      status,
      review_owner as reviewOwner,
      created_by_user_id as createdByUserId,
      created_at as createdAt,
      updated_at as updatedAt
    from dle_evidence_artifacts
    where id = ${artifactId}
    limit 1
  `);

  return {
    artifact: normalizeArtifactRow(getRows(readback)[0]),
  };
}
