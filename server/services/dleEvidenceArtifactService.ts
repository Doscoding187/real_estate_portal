import { TRPCError } from '@trpc/server';
import { sql } from 'drizzle-orm';
import { createHmac, randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  GetObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { db } from '../db';
import { ENV } from '../_core/env';

export const DLE_EVIDENCE_ARTIFACT_STATUSES = ['requested', 'submitted'] as const;
export type DleEvidenceArtifactStatus = (typeof DLE_EVIDENCE_ARTIFACT_STATUSES)[number];

export const DLE_EVIDENCE_ARTIFACT_REVIEW_STATUSES = [
  'under_review',
  'accepted',
  'rejected',
] as const;
export type DleEvidenceArtifactReviewStatus =
  (typeof DLE_EVIDENCE_ARTIFACT_REVIEW_STATUSES)[number];

export const DLE_EVIDENCE_ARTIFACT_TYPES = [
  'uploaded_file',
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

type RequiredEvidenceRole = {
  role: DleEvidenceArtifactRole;
  label: string;
};

const REQUIRED_RENTAL_EVIDENCE_ROLES: RequiredEvidenceRole[] = [
  { role: 'proof_of_income', label: 'Proof of income' },
  { role: 'deposit_readiness', label: 'Deposit readiness' },
  { role: 'signed_lease', label: 'Lease review' },
];

const REQUIRED_AUCTION_EVIDENCE_ROLES: RequiredEvidenceRole[] = [
  { role: 'legal_pack_acknowledgement', label: 'Legal-pack access' },
  { role: 'proof_of_funds', label: 'Proof of funds' },
  { role: 'bidder_registration', label: 'Registration review' },
];

const DLE_EVIDENCE_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const DLE_EVIDENCE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const DLE_EVIDENCE_UPLOAD_EXTENSIONS: Record<
  (typeof DLE_EVIDENCE_UPLOAD_MIME_TYPES)[number],
  string[]
> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

const evidenceS3Client =
  ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsRegion && ENV.s3BucketName
    ? new S3Client({
        region: ENV.awsRegion,
        credentials: {
          accessKeyId: ENV.awsAccessKeyId,
          secretAccessKey: ENV.awsSecretAccessKey,
        },
      })
    : null;

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
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdByUserId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DevelopmentEvidenceCoverageLeadInput = {
  leadId: number;
  acceptedRoles: string[];
};

export type DevelopmentEvidenceCoverageSummary = {
  transactionType: 'for_rent' | 'auction';
  title: string;
  statusLabel: string;
  totalActiveLeadCount: number;
  completeLeadCount: number;
  partialLeadCount: number;
  noAcceptedLeadCount: number;
  requiredRoles: RequiredEvidenceRole[];
  acceptedRoleCounts: Array<RequiredEvidenceRole & { count: number }>;
  missingRoleCounts: Array<RequiredEvidenceRole & { count: number }>;
  guardrail: string;
};

export type LeadEvidenceCoverageSummary = {
  leadId: number;
  transactionType: 'for_rent' | 'auction';
  title: string;
  statusLabel: string;
  acceptedCount: number;
  requiredCount: number;
  acceptedRoles: RequiredEvidenceRole[];
  missingRoles: RequiredEvidenceRole[];
  guardrail: string;
};

export type EvidenceUploadFileValidation = {
  sanitizedFilename: string;
  extension: string;
  contentType: (typeof DLE_EVIDENCE_UPLOAD_MIME_TYPES)[number];
  fileSizeBytes: number;
};

export type LeadEvidenceFileUploadIntent = {
  artifact: EvidenceArtifactRow;
  uploadToken: string;
  uploadUrl: string | null;
  uploadExpiresInSeconds: number | null;
  uploadUnavailableReason?: string;
};

export type LeadEvidenceFileDownloadUrl = {
  artifact: EvidenceArtifactRow;
  downloadUrl: string;
  downloadExpiresInSeconds: number;
};

type EvidenceUploadTokenClaims = {
  artifactId: number;
  leadId: number;
  developmentId: number;
  storageKey: string;
  nonce: string;
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

export function getEvidenceArtifactReviewEventType(
  status: DleEvidenceArtifactReviewStatus,
):
  | 'evidence_artifact_review_started'
  | 'evidence_artifact_accepted'
  | 'evidence_artifact_rejected' {
  if (status === 'under_review') return 'evidence_artifact_review_started';
  if (status === 'accepted') return 'evidence_artifact_accepted';
  return 'evidence_artifact_rejected';
}

export function getRequiredEvidenceRolesForTransaction(
  transactionType: 'for_rent' | 'auction',
): RequiredEvidenceRole[] {
  return transactionType === 'for_rent'
    ? REQUIRED_RENTAL_EVIDENCE_ROLES
    : REQUIRED_AUCTION_EVIDENCE_ROLES;
}

export function buildDevelopmentEvidenceCoverageSummary(params: {
  transactionType: 'for_rent' | 'auction';
  leads: DevelopmentEvidenceCoverageLeadInput[];
}): DevelopmentEvidenceCoverageSummary {
  const requiredRoles = getRequiredEvidenceRolesForTransaction(params.transactionType);
  const acceptedRoleCounts = requiredRoles.map(role => ({ ...role, count: 0 }));
  const missingRoleCounts = requiredRoles.map(role => ({ ...role, count: 0 }));
  let completeLeadCount = 0;
  let partialLeadCount = 0;
  let noAcceptedLeadCount = 0;

  for (const lead of params.leads) {
    const accepted = new Set(lead.acceptedRoles);
    const acceptedRequiredCount = requiredRoles.filter(role => accepted.has(role.role)).length;
    if (acceptedRequiredCount === requiredRoles.length && requiredRoles.length > 0) {
      completeLeadCount += 1;
    } else if (acceptedRequiredCount > 0) {
      partialLeadCount += 1;
    } else {
      noAcceptedLeadCount += 1;
    }

    for (const roleCount of acceptedRoleCounts) {
      if (accepted.has(roleCount.role)) roleCount.count += 1;
    }
    for (const roleCount of missingRoleCounts) {
      if (!accepted.has(roleCount.role)) roleCount.count += 1;
    }
  }

  const title =
    params.transactionType === 'for_rent'
      ? 'Rental evidence coverage'
      : 'Auction evidence coverage';
  const statusLabel =
    completeLeadCount > 0
      ? `${completeLeadCount} lead${completeLeadCount === 1 ? '' : 's'} with complete accepted coverage`
      : 'No leads have complete accepted coverage';
  const guardrail =
    params.transactionType === 'for_rent'
      ? 'Coverage is not verified lease readiness, inventory let status, or distribution payout readiness.'
      : 'Coverage is not verified bidder registration, proof-of-funds readiness, winning-bid status, or distribution payout readiness.';

  return {
    transactionType: params.transactionType,
    title,
    statusLabel,
    totalActiveLeadCount: params.leads.length,
    completeLeadCount,
    partialLeadCount,
    noAcceptedLeadCount,
    requiredRoles,
    acceptedRoleCounts,
    missingRoleCounts,
    guardrail,
  };
}

export function buildLeadEvidenceCoverageSummary(params: {
  leadId: number;
  transactionType: 'for_rent' | 'auction';
  acceptedRoles: string[];
}): LeadEvidenceCoverageSummary {
  const requiredRoles = getRequiredEvidenceRolesForTransaction(params.transactionType);
  const accepted = new Set(params.acceptedRoles);
  const acceptedRoles = requiredRoles.filter(role => accepted.has(role.role));
  const missingRoles = requiredRoles.filter(role => !accepted.has(role.role));
  const title =
    params.transactionType === 'for_rent'
      ? 'Rental evidence coverage'
      : 'Auction evidence coverage';
  const statusLabel =
    acceptedRoles.length >= requiredRoles.length && requiredRoles.length > 0
      ? params.transactionType === 'for_rent'
        ? 'Rental evidence roles accepted'
        : 'Auction evidence roles accepted'
      : acceptedRoles.length > 0
        ? 'Evidence partially accepted'
        : 'Evidence not accepted yet';
  const guardrail =
    params.transactionType === 'for_rent'
      ? 'Accepted evidence coverage is not lease readiness, inventory let status, or distribution payout readiness.'
      : 'Accepted evidence coverage is not bidder registration, proof-of-funds readiness, winning-bid status, or distribution payout readiness.';

  return {
    leadId: params.leadId,
    transactionType: params.transactionType,
    title,
    statusLabel,
    acceptedCount: acceptedRoles.length,
    requiredCount: requiredRoles.length,
    acceptedRoles,
    missingRoles,
    guardrail,
  };
}

function sanitizeEvidenceFilename(filename: string): string {
  const base = path.basename(filename || 'evidence-file');
  const sanitized = base
    .trim()
    .replace(/[^a-zA-Z0-9._ -]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160);
  return sanitized || 'evidence-file';
}

export function validateEvidenceUploadFile(params: {
  filename: string;
  contentType: string;
  fileSizeBytes: number;
}): EvidenceUploadFileValidation {
  const contentType = params.contentType.trim().toLowerCase();
  if (!(DLE_EVIDENCE_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Unsupported evidence file type.',
    });
  }

  const fileSizeBytes = Number(params.fileSizeBytes);
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence file size is required.',
    });
  }
  if (fileSizeBytes > DLE_EVIDENCE_UPLOAD_MAX_BYTES) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence file must be 10 MB or smaller.',
    });
  }

  const sanitizedFilename = sanitizeEvidenceFilename(params.filename);
  const extension = path.extname(sanitizedFilename).replace(/^\./, '').toLowerCase();
  const allowedExtensions =
    DLE_EVIDENCE_UPLOAD_EXTENSIONS[contentType as keyof typeof DLE_EVIDENCE_UPLOAD_EXTENSIONS];
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence file extension does not match the selected file type.',
    });
  }

  return {
    sanitizedFilename,
    extension,
    contentType: contentType as EvidenceUploadFileValidation['contentType'],
    fileSizeBytes,
  };
}

export function buildPrivateEvidenceStorageKey(params: {
  environment?: string;
  developmentId: number;
  leadId: number;
  artifactId: number;
  extension: string;
  uuid?: string;
}): string {
  const environment = String(params.environment || process.env.NODE_ENV || 'development')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'development';
  return [
    'dle',
    'evidence',
    environment,
    `development-${Number(params.developmentId)}`,
    `lead-${Number(params.leadId)}`,
    `artifact-${Number(params.artifactId)}`,
    `${params.uuid || randomUUID()}.${params.extension.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase()}`,
  ].join('/');
}

function getEvidenceUploadTokenSecret(): string {
  return ENV.cookieSecret || 'dle-evidence-upload-token-development-secret';
}

function signEvidenceUploadTokenPayload(payload: string): string {
  return createHmac('sha256', getEvidenceUploadTokenSecret()).update(payload).digest('base64url');
}

export function buildEvidenceUploadToken(params: {
  artifactId: number;
  leadId: number;
  developmentId: number;
  storageKey: string;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      artifactId: params.artifactId,
      leadId: params.leadId,
      developmentId: params.developmentId,
      storageKey: params.storageKey,
      nonce: randomUUID(),
    }),
  ).toString('base64url');
  return `${payload}.${signEvidenceUploadTokenPayload(payload)}`;
}

export function parseEvidenceUploadToken(token: string): EvidenceUploadTokenClaims {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid evidence upload token.',
    });
  }

  const expectedSignature = signEvidenceUploadTokenPayload(payload);
  if (signature !== expectedSignature) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid evidence upload token.',
    });
  }

  let claims: Partial<EvidenceUploadTokenClaims>;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid evidence upload token.',
    });
  }

  const artifactId = Number(claims.artifactId);
  const leadId = Number(claims.leadId);
  const developmentId = Number(claims.developmentId);
  const storageKey = String(claims.storageKey || '');
  const nonce = String(claims.nonce || '');
  if (
    !Number.isFinite(artifactId) ||
    artifactId <= 0 ||
    !Number.isFinite(leadId) ||
    leadId <= 0 ||
    !Number.isFinite(developmentId) ||
    developmentId <= 0 ||
    !storageKey ||
    !nonce
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid evidence upload token.',
    });
  }

  return {
    artifactId,
    leadId,
    developmentId,
    storageKey,
    nonce,
  };
}

export function assertEvidenceArtifactReviewTransition(params: {
  fromStatus: string;
  toStatus: DleEvidenceArtifactReviewStatus;
}) {
  const fromStatus = String(params.fromStatus || '');
  const toStatus = params.toStatus;

  if (toStatus === 'under_review') {
    if (fromStatus === 'requested' || fromStatus === 'submitted') return;
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence review can only start from requested or submitted artifacts.',
    });
  }

  if (toStatus === 'accepted' || toStatus === 'rejected') {
    if (fromStatus === 'submitted' || fromStatus === 'under_review') return;
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence can only be accepted or rejected after submission or review start.',
    });
  }
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
    reviewedByUserId: row.reviewedByUserId == null ? null : Number(row.reviewedByUserId),
    reviewedAt: row.reviewedAt == null ? null : String(row.reviewedAt),
    reviewNote: row.reviewNote == null ? null : String(row.reviewNote),
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
      reviewed_by_user_id as reviewedByUserId,
      reviewed_at as reviewedAt,
      review_note as reviewNote,
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

export async function listLeadEvidenceCoverageSummaries(params: {
  developerId: number;
  leadIds: number[];
}): Promise<{ items: LeadEvidenceCoverageSummary[] }> {
  const leadIds = Array.from(
    new Set(
      params.leadIds
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0),
    ),
  ).slice(0, 50);

  if (leadIds.length === 0) return { items: [] };

  const leadResult = await db.execute(sql`
    select
      l.id as leadId,
      d.transaction_type as transactionType
    from leads l
    inner join developments d on d.id = l.developmentId
    where l.id in (${sql.join(leadIds, sql`, `)})
      and d.developer_id = ${params.developerId}
      and d.transaction_type in ('for_rent', 'auction')
    order by l.id
  `);

  const leadRows = getRows(leadResult)
    .map(row => ({
      leadId: Number(row.leadId),
      transactionType: String(row.transactionType || '') as 'for_rent' | 'auction',
    }))
    .filter(
      row =>
        Number.isFinite(row.leadId) &&
        row.leadId > 0 &&
        (row.transactionType === 'for_rent' || row.transactionType === 'auction'),
    );

  if (leadRows.length === 0) return { items: [] };

  const ownedLeadIds = leadRows.map(row => row.leadId);
  const acceptedArtifactsResult = await db.execute(sql`
    select lead_id as leadId, artifact_role as artifactRole
    from dle_evidence_artifacts
    where lead_id in (${sql.join(ownedLeadIds, sql`, `)})
      and status = 'accepted'
  `);
  const acceptedByLead = new Map<number, Set<string>>();
  for (const lead of leadRows) {
    acceptedByLead.set(lead.leadId, new Set());
  }
  for (const row of getRows(acceptedArtifactsResult)) {
    const leadId = Number(row.leadId);
    if (!acceptedByLead.has(leadId)) continue;
    acceptedByLead.get(leadId)!.add(String(row.artifactRole || ''));
  }

  return {
    items: leadRows.map(lead =>
      buildLeadEvidenceCoverageSummary({
        leadId: lead.leadId,
        transactionType: lead.transactionType,
        acceptedRoles: Array.from(acceptedByLead.get(lead.leadId) || []),
      }),
    ),
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
      reviewed_by_user_id as reviewedByUserId,
      reviewed_at as reviewedAt,
      review_note as reviewNote,
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

export async function createLeadEvidenceFileUploadIntent(params: {
  developerId: number;
  userId: number;
  leadId: number;
  artifactRole: string;
  filename: string;
  contentType: string;
  fileSizeBytes: number;
  displayName?: string;
  description?: string;
}): Promise<LeadEvidenceFileUploadIntent> {
  const scope = await getLeadEvidenceScope(params);
  const artifactRole = assertEvidenceRoleForTransaction(scope.transactionType, params.artifactRole);
  const file = validateEvidenceUploadFile({
    filename: params.filename,
    contentType: params.contentType,
    fileSizeBytes: params.fileSizeBytes,
  });
  const reviewOwner = getDefaultReviewOwnerForEvidence(scope.transactionType);
  const displayName = (params.displayName?.trim() || file.sanitizedFilename).slice(0, 160);
  const description = params.description?.trim() || null;

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
      'uploaded_file',
      ${displayName},
      ${description},
      'requested',
      ${reviewOwner},
      ${params.userId},
      ${params.userId},
      ${JSON.stringify({
        source: 'developer_leads_manager',
        uploadStatus: 'pending_upload',
        originalFilename: file.sanitizedFilename,
        mimeType: file.contentType,
        fileSizeBytes: file.fileSizeBytes,
      })}
    )
  `);

  const artifactId = readInsertId(insertResult);
  if (!artifactId) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Evidence upload artifact was not created.',
    });
  }

  const storageKey = buildPrivateEvidenceStorageKey({
    developmentId: scope.developmentId,
    leadId: scope.leadId,
    artifactId,
    extension: file.extension,
  });
  const uploadToken = buildEvidenceUploadToken({
    artifactId,
    leadId: scope.leadId,
    developmentId: scope.developmentId,
    storageKey,
  });

  await db.execute(sql`
    update dle_evidence_artifacts
    set
      storage_key = ${storageKey},
      metadata = JSON_MERGE_PATCH(
        COALESCE(metadata, JSON_OBJECT()),
        CAST(${JSON.stringify({
          uploadStatus: 'pending_upload',
          storageNamespace: 'private_dle_evidence',
          storageKey,
          uploadTokenIssued: true,
          uploadTokenVersion: 1,
        })} AS JSON)
      ),
      updated_by_user_id = ${params.userId},
      updated_at = CURRENT_TIMESTAMP
    where id = ${artifactId}
  `);

  let uploadUrl: string | null = null;
  let uploadExpiresInSeconds: number | null = null;
  let uploadUnavailableReason: string | undefined;

  if (evidenceS3Client && ENV.s3BucketName) {
    uploadExpiresInSeconds = 900;
    uploadUrl = await getSignedUrl(
      evidenceS3Client,
      new PutObjectCommand({
        Bucket: ENV.s3BucketName,
        Key: storageKey,
        ContentType: file.contentType,
        Metadata: {
          artifactId: String(artifactId),
          developmentId: String(scope.developmentId),
          leadId: String(scope.leadId),
          originalFilename: file.sanitizedFilename,
          storageNamespace: 'private_dle_evidence',
        },
      }),
      { expiresIn: uploadExpiresInSeconds },
    );
  } else {
    uploadUnavailableReason =
      'Private evidence upload storage is not configured in this environment.';
  }

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
      reviewed_by_user_id as reviewedByUserId,
      reviewed_at as reviewedAt,
      review_note as reviewNote,
      created_by_user_id as createdByUserId,
      created_at as createdAt,
      updated_at as updatedAt
    from dle_evidence_artifacts
    where id = ${artifactId}
    limit 1
  `);

  return {
    artifact: normalizeArtifactRow(getRows(readback)[0]),
    uploadToken,
    uploadUrl,
    uploadExpiresInSeconds,
    uploadUnavailableReason,
  };
}

export async function completeLeadEvidenceFileUpload(params: {
  developerId: number;
  userId: number;
  artifactId: number;
  uploadToken: string;
  checksumSha256?: string;
}): Promise<{ artifact: EvidenceArtifactRow }> {
  const claims = parseEvidenceUploadToken(params.uploadToken);
  if (claims.artifactId !== params.artifactId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence upload token does not match this artifact.',
    });
  }

  const currentResult = await db.execute(sql`
    select
      a.id,
      a.development_id as developmentId,
      a.transaction_type as transactionType,
      a.lead_id as leadId,
      a.artifact_role as artifactRole,
      a.artifact_type as artifactType,
      a.storage_key as storageKey,
      a.external_url as externalUrl,
      a.display_name as displayName,
      a.description,
      a.status,
      a.review_owner as reviewOwner,
      a.reviewed_by_user_id as reviewedByUserId,
      a.reviewed_at as reviewedAt,
      a.review_note as reviewNote,
      a.metadata as metadata,
      a.created_by_user_id as createdByUserId,
      a.created_at as createdAt,
      a.updated_at as updatedAt
    from dle_evidence_artifacts a
    inner join developments d on d.id = a.development_id
    where a.id = ${params.artifactId}
      and d.developer_id = ${params.developerId}
      and a.lead_id is not null
    limit 1
  `);
  const row = getRows(currentResult)[0];

  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Evidence artifact not found for this developer.',
    });
  }

  const artifact = normalizeArtifactRow(row);
  const storageKey = String(row.storageKey || '');
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as {
    uploadStatus?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  };

  if (artifact.artifactType !== 'uploaded_file') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only uploaded-file evidence artifacts can be completed.',
    });
  }
  if (artifact.status !== 'requested' || metadata.uploadStatus !== 'pending_upload') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence upload has already been completed or is not pending upload.',
    });
  }
  if (
    claims.developmentId !== artifact.developmentId ||
    claims.leadId !== artifact.leadId ||
    claims.storageKey !== storageKey
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence upload token does not match this artifact.',
    });
  }
  if (!storageKey.startsWith('dle/evidence/')) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence artifact storage key is not in the private evidence namespace.',
    });
  }
  if (!evidenceS3Client || !ENV.s3BucketName) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Private evidence upload storage is not configured; upload completion cannot be verified.',
    });
  }

  let objectHead: HeadObjectCommandOutput;
  try {
    objectHead = await evidenceS3Client.send(
      new HeadObjectCommand({
        Bucket: ENV.s3BucketName,
        Key: storageKey,
      }),
    );
  } catch {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Evidence upload was not found in private storage.',
    });
  }

  const uploadedAt = new Date().toISOString();
  const verifiedMimeType = objectHead.ContentType || metadata.mimeType || null;
  const verifiedFileSizeBytes =
    typeof objectHead.ContentLength === 'number'
      ? objectHead.ContentLength
      : metadata.fileSizeBytes || null;
  const checksumSha256 = params.checksumSha256?.trim() || objectHead.ChecksumSHA256 || null;
  const completionMetadata = {
    uploadStatus: 'uploaded',
    uploadedAt,
    uploadedByUserId: params.userId,
    verifiedMimeType,
    verifiedFileSizeBytes,
    checksumSha256,
    storageNamespace: 'private_dle_evidence',
  };

  await db.execute(sql`
    update dle_evidence_artifacts
    set
      status = 'submitted',
      external_url = null,
      metadata = JSON_MERGE_PATCH(
        COALESCE(metadata, JSON_OBJECT()),
        CAST(${JSON.stringify(completionMetadata)} AS JSON)
      ),
      updated_by_user_id = ${params.userId},
      updated_at = CURRENT_TIMESTAMP
    where id = ${params.artifactId}
  `);

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
      ${artifact.developmentId},
      ${artifact.leadId},
      ${artifact.transactionType},
      'evidence_artifact_submitted',
      ${artifact.status},
      'submitted',
      ${JSON.stringify({
        artifactId: artifact.id,
        artifactRole: artifact.artifactRole,
        artifactType: artifact.artifactType,
        status: 'submitted',
        reviewOwner: artifact.reviewOwner,
      })},
      ${JSON.stringify({
        artifactId: artifact.id,
        artifactRole: artifact.artifactRole,
        displayName: artifact.displayName,
        mimeType: verifiedMimeType,
        fileSizeBytes: verifiedFileSizeBytes,
        checksumSha256,
        storageNamespace: 'private_dle_evidence',
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
      reviewed_by_user_id as reviewedByUserId,
      reviewed_at as reviewedAt,
      review_note as reviewNote,
      created_by_user_id as createdByUserId,
      created_at as createdAt,
      updated_at as updatedAt
    from dle_evidence_artifacts
    where id = ${params.artifactId}
    limit 1
  `);

  return {
    artifact: normalizeArtifactRow(getRows(readback)[0]),
  };
}

export async function getLeadEvidenceFileDownloadUrl(params: {
  developerId: number;
  userId: number;
  artifactId: number;
}): Promise<LeadEvidenceFileDownloadUrl> {
  const currentResult = await db.execute(sql`
    select
      a.id,
      a.development_id as developmentId,
      a.transaction_type as transactionType,
      a.lead_id as leadId,
      a.artifact_role as artifactRole,
      a.artifact_type as artifactType,
      a.storage_key as storageKey,
      a.external_url as externalUrl,
      a.display_name as displayName,
      a.description,
      a.status,
      a.review_owner as reviewOwner,
      a.reviewed_by_user_id as reviewedByUserId,
      a.reviewed_at as reviewedAt,
      a.review_note as reviewNote,
      a.metadata as metadata,
      a.created_by_user_id as createdByUserId,
      a.created_at as createdAt,
      a.updated_at as updatedAt
    from dle_evidence_artifacts a
    inner join developments d on d.id = a.development_id
    where a.id = ${params.artifactId}
      and d.developer_id = ${params.developerId}
      and a.lead_id is not null
    limit 1
  `);
  const row = getRows(currentResult)[0];

  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Evidence artifact not found for this developer.',
    });
  }

  const artifact = normalizeArtifactRow(row);
  const storageKey = String(row.storageKey || '');
  const externalUrl = row.externalUrl == null ? null : String(row.externalUrl);
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as {
    uploadStatus?: string;
    mimeType?: string;
    originalFilename?: string;
    downloadCount?: number;
  };

  if (artifact.transactionType !== 'for_rent' && artifact.transactionType !== 'auction') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence file download is only enabled for Rental and Auction leads in this slice.',
    });
  }
  if (artifact.artifactType !== 'uploaded_file') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only uploaded evidence files can be downloaded through this endpoint.',
    });
  }
  if (artifact.status !== 'submitted' || metadata.uploadStatus !== 'uploaded') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence file is not available for download until upload completion is verified.',
    });
  }
  if (!storageKey.startsWith('dle/evidence/')) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence artifact storage key is not in the private evidence namespace.',
    });
  }
  if (externalUrl) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Uploaded evidence artifacts must not use public external URLs.',
    });
  }
  if (!evidenceS3Client || !ENV.s3BucketName) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Private evidence download storage is not configured; download URL cannot be issued.',
    });
  }

  const expiresInSeconds = 300;
  const downloadUrl = await getSignedUrl(
    evidenceS3Client,
    new GetObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: storageKey,
      ResponseContentType: metadata.mimeType,
      ResponseContentDisposition: `attachment; filename="${(metadata.originalFilename || artifact.displayName)
        .replace(/[^a-zA-Z0-9._ -]+/g, '-')
        .slice(0, 160)}"`,
    }),
    { expiresIn: expiresInSeconds },
  );

  await db.execute(sql`
    update dle_evidence_artifacts
    set
      metadata = JSON_MERGE_PATCH(
        COALESCE(metadata, JSON_OBJECT()),
        CAST(${JSON.stringify({
          lastDownloadUrlIssuedAt: new Date().toISOString(),
          lastDownloadRequestedByUserId: params.userId,
          downloadCount: Number(metadata.downloadCount || 0) + 1,
        })} AS JSON)
      ),
      updated_by_user_id = ${params.userId},
      updated_at = CURRENT_TIMESTAMP
    where id = ${params.artifactId}
  `);

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
      ${artifact.developmentId},
      ${artifact.leadId},
      ${artifact.transactionType},
      'evidence_artifact_downloaded',
      ${artifact.status},
      ${artifact.status},
      ${JSON.stringify({
        artifactId: artifact.id,
        artifactRole: artifact.artifactRole,
        artifactType: artifact.artifactType,
        status: artifact.status,
        reviewOwner: artifact.reviewOwner,
      })},
      ${JSON.stringify({
        artifactId: artifact.id,
        artifactRole: artifact.artifactRole,
        displayName: artifact.displayName,
        storageNamespace: 'private_dle_evidence',
        downloadExpiresInSeconds: expiresInSeconds,
        downloadCount: Number(metadata.downloadCount || 0) + 1,
      })},
      ${params.userId},
      'developer_leads_manager'
    )
  `);

  return {
    artifact,
    downloadUrl,
    downloadExpiresInSeconds: expiresInSeconds,
  };
}

export async function updateLeadEvidenceArtifactReviewStatus(params: {
  developerId: number;
  userId: number;
  artifactId: number;
  status: DleEvidenceArtifactReviewStatus;
  reviewNote?: string;
}): Promise<{ artifact: EvidenceArtifactRow }> {
  if (!(DLE_EVIDENCE_ARTIFACT_REVIEW_STATUSES as readonly string[]).includes(params.status)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Unsupported evidence review status for this slice.',
    });
  }

  const currentResult = await db.execute(sql`
    select
      a.id,
      a.development_id as developmentId,
      a.transaction_type as transactionType,
      a.lead_id as leadId,
      a.artifact_role as artifactRole,
      a.artifact_type as artifactType,
      a.display_name as displayName,
      a.description,
      a.status,
      a.review_owner as reviewOwner,
      a.reviewed_by_user_id as reviewedByUserId,
      a.reviewed_at as reviewedAt,
      a.review_note as reviewNote,
      a.created_by_user_id as createdByUserId,
      a.created_at as createdAt,
      a.updated_at as updatedAt
    from dle_evidence_artifacts a
    inner join developments d on d.id = a.development_id
    where a.id = ${params.artifactId}
      and d.developer_id = ${params.developerId}
      and a.lead_id is not null
    limit 1
  `);
  const currentRow = getRows(currentResult)[0];

  if (!currentRow) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Evidence artifact not found for this developer.',
    });
  }

  const currentArtifact = normalizeArtifactRow(currentRow);
  if (
    currentArtifact.transactionType !== 'for_rent' &&
    currentArtifact.transactionType !== 'auction'
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Evidence artifact review is only enabled for Rental and Auction leads in this slice.',
    });
  }

  assertEvidenceRoleForTransaction(
    currentArtifact.transactionType,
    currentArtifact.artifactRole,
  );
  assertEvidenceArtifactReviewTransition({
    fromStatus: currentArtifact.status,
    toStatus: params.status,
  });

  const reviewNote = params.reviewNote?.trim() || null;
  if (params.status === 'rejected' && !reviewNote) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Rejected evidence requires a review note.',
    });
  }

  await db.execute(sql`
    update dle_evidence_artifacts
    set
      status = ${params.status},
      reviewed_by_user_id = ${
        params.status === 'accepted' || params.status === 'rejected' ? params.userId : null
      },
      reviewed_at = ${
        params.status === 'accepted' || params.status === 'rejected' ? sql`CURRENT_TIMESTAMP` : null
      },
      review_note = ${reviewNote},
      updated_by_user_id = ${params.userId},
      updated_at = CURRENT_TIMESTAMP,
      metadata = JSON_MERGE_PATCH(
        COALESCE(metadata, JSON_OBJECT()),
        CAST(${JSON.stringify({
          reviewSource: 'developer_leads_manager',
          reviewStatus: params.status,
        })} AS JSON)
      )
    where id = ${params.artifactId}
  `);

  const eventType = getEvidenceArtifactReviewEventType(params.status);
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
      ${currentArtifact.developmentId},
      ${currentArtifact.leadId},
      ${currentArtifact.transactionType},
      ${eventType},
      ${currentArtifact.status},
      ${params.status},
      ${JSON.stringify({
        artifactId: currentArtifact.id,
        artifactRole: currentArtifact.artifactRole,
        artifactType: currentArtifact.artifactType,
        status: params.status,
        reviewOwner: currentArtifact.reviewOwner,
      })},
      ${JSON.stringify({
        artifactId: currentArtifact.id,
        artifactRole: currentArtifact.artifactRole,
        displayName: currentArtifact.displayName,
        reviewOwner: currentArtifact.reviewOwner,
        note: reviewNote,
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
      reviewed_by_user_id as reviewedByUserId,
      reviewed_at as reviewedAt,
      review_note as reviewNote,
      created_by_user_id as createdByUserId,
      created_at as createdAt,
      updated_at as updatedAt
    from dle_evidence_artifacts
    where id = ${params.artifactId}
    limit 1
  `);

  return {
    artifact: normalizeArtifactRow(getRows(readback)[0]),
  };
}

export async function getDevelopmentEvidenceCoverageSummary(params: {
  developerId: number;
  developmentId: number;
}): Promise<DevelopmentEvidenceCoverageSummary | null> {
  const developmentResult = await db.execute(sql`
    select id, transaction_type as transactionType
    from developments
    where id = ${params.developmentId}
      and developer_id = ${params.developerId}
    limit 1
  `);
  const development = getRows(developmentResult)[0];

  if (!development) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Development not found for this developer.',
    });
  }

  const transactionType = String(development.transactionType || '');
  if (transactionType !== 'for_rent' && transactionType !== 'auction') {
    return null;
  }

  const activeLeadResult = await db.execute(sql`
    select id
    from leads
    where developmentId = ${params.developmentId}
      and status in ('qualified', 'viewing_scheduled', 'offer_sent', 'converted')
    order by id
  `);
  const leadIds = getRows(activeLeadResult)
    .map(row => Number(row.id))
    .filter(id => Number.isFinite(id) && id > 0);

  if (leadIds.length === 0) {
    return buildDevelopmentEvidenceCoverageSummary({
      transactionType: transactionType as 'for_rent' | 'auction',
      leads: [],
    });
  }

  const acceptedArtifactsResult = await db.execute(sql`
    select lead_id as leadId, artifact_role as artifactRole
    from dle_evidence_artifacts
    where development_id = ${params.developmentId}
      and status = 'accepted'
      and lead_id in (${sql.join(leadIds, sql`, `)})
  `);
  const acceptedByLead = new Map<number, Set<string>>();
  for (const leadId of leadIds) {
    acceptedByLead.set(leadId, new Set());
  }
  for (const row of getRows(acceptedArtifactsResult)) {
    const leadId = Number(row.leadId);
    const role = String(row.artifactRole || '');
    if (!acceptedByLead.has(leadId)) continue;
    acceptedByLead.get(leadId)!.add(role);
  }

  return buildDevelopmentEvidenceCoverageSummary({
    transactionType: transactionType as 'for_rent' | 'auction',
    leads: leadIds.map(leadId => ({
      leadId,
      acceptedRoles: Array.from(acceptedByLead.get(leadId) || []),
    })),
  });
}
