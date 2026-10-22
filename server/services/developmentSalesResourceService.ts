import { and, asc, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import { developmentDocuments, developments, managerialAuditLogs } from '../../drizzle/schema';
import { developerIdentityService } from './developerIdentityService';
import {
  createDeveloperSalesResourceStorageKey,
  deleteDeveloperSalesResource,
  DeveloperSalesResourceStorageError,
  developerSalesResourceFileName,
  isPrivateDeveloperSalesResourceKey,
  readDeveloperSalesResource,
  storeDeveloperSalesResource,
  type DeveloperSalesResourceStorageAdapter,
} from './developerSalesResourceStorage';

const READ_ROLES = new Set([
  'owner',
  'admin',
  'sales_manager',
  'sales_consultant',
  'marketing',
  'finance',
  'viewer',
]);
const MANAGE_ROLES = new Set(['owner', 'admin', 'sales_manager']);

function fail(
  code: 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND' | 'PRECONDITION_FAILED',
  message: string,
): never {
  throw new TRPCError({ code, message });
}

function requiredText(value: unknown, label: string, max: number, min = 1): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length < min || normalized.length > max) {
    fail('BAD_REQUEST', `${label} must be between ${min} and ${max} characters.`);
  }
  return normalized;
}

function safeBase64Buffer(value: unknown): Buffer {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    fail('BAD_REQUEST', 'The uploaded file contents are invalid. Choose the file again.');
  }
  return Buffer.from(normalized, 'base64');
}

async function actorScope(userId: number, manage = false) {
  const profile = await developerIdentityService.getDeveloperByUserId(userId);
  if (!profile) fail('FORBIDDEN', 'Developer profile not found.');
  const role = String(profile.membership?.role || '');
  const allowed = manage ? MANAGE_ROLES : READ_ROLES;
  if (!allowed.has(role)) {
    fail(
      'FORBIDDEN',
      manage
        ? 'Only a developer owner, admin, or sales manager can manage partner sales resources.'
        : 'You do not have access to this development’s sales resources.',
    );
  }
  return { publisherId: Number(profile.publisherId), role };
}

async function lockOwnedDevelopment(tx: any, developmentId: number, publisherId: number) {
  const [development] = await tx
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(eq(developments.id, developmentId), eq(developments.cataloguePublisherId, publisherId)),
    )
    .limit(1)
    .for('update');
  if (!development) fail('NOT_FOUND', 'Development not found.');
  return development;
}

function resourceMetadata(row: any) {
  const secure = isPrivateDeveloperSalesResourceKey(row.storageKey) && !row.fileUrl;
  return {
    id: Number(row.id),
    documentLabel: String(row.title || ''),
    fileUrl: typeof row.fileUrl === 'string' ? row.fileUrl : null,
    fileName: secure
      ? developerSalesResourceFileName(String(row.storageKey))
      : typeof row.fileUrl === 'string'
        ? decodeFileName(row.fileUrl)
        : null,
    sortOrder: Number(row.id),
    recordActive: Number(row.isActive) === 1,
    isActive: Number(row.isActive) === 1 && row.visibility === 'referrer',
    privateCopy: secure,
    downloadable: secure && Number(row.downloadable) === 1 && Number(row.isActive) === 1,
    sharedAt: row.visibility === 'referrer' ? row.updatedAt || null : row.createdAt || null,
  };
}

function decodeFileName(href: string) {
  try {
    const pathname = new URL(href, 'https://property-listify.invalid').pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'Development resource').slice(0, 255);
  } catch {
    return 'Development resource';
  }
}

export async function getDevelopmentSalesResources(input: {
  developmentId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await actorScope(input.userId);
  const [development] = await db
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(
        eq(developments.id, input.developmentId),
        eq(developments.cataloguePublisherId, actor.publisherId),
      ),
    )
    .limit(1);
  if (!development) fail('NOT_FOUND', 'Development not found.');

  const rows = await db
    .select({
      id: developmentDocuments.id,
      title: developmentDocuments.title,
      storageKey: developmentDocuments.storageKey,
      fileUrl: developmentDocuments.fileUrl,
      downloadable: developmentDocuments.downloadable,
      isActive: developmentDocuments.isActive,
      visibility: developmentDocuments.visibility,
      createdAt: developmentDocuments.createdAt,
      updatedAt: developmentDocuments.updatedAt,
    })
    .from(developmentDocuments)
    .where(
      and(
        eq(developmentDocuments.developmentId, input.developmentId),
        eq(developmentDocuments.category, 'sales_asset'),
        inArray(developmentDocuments.visibility, ['internal', 'referrer']),
      ),
    )
    .orderBy(asc(developmentDocuments.createdAt), asc(developmentDocuments.id));

  return {
    canManage: MANAGE_ROLES.has(actor.role),
    resources: rows.map(resourceMetadata),
  };
}

export async function uploadDevelopmentSalesResource(input: {
  developmentId: number;
  documentLabel: string;
  fileName: string;
  mimeType: string;
  fileContentBase64: string;
  reason: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await actorScope(input.userId, true);
  const documentLabel = requiredText(input.documentLabel, 'Resource name', 160, 2);
  const fileName = requiredText(input.fileName, 'File name', 255, 1);
  const reason = requiredText(input.reason, 'Reason', 500, 10);
  const buffer = safeBase64Buffer(input.fileContentBase64);
  const storageKey = createDeveloperSalesResourceStorageKey(input.developmentId, fileName);
  let stored: Awaited<ReturnType<typeof storeDeveloperSalesResource>> | null = null;

  try {
    try {
      stored = await storeDeveloperSalesResource({
        storageKey,
        buffer,
        mimeType: input.mimeType,
      });
    } catch (error) {
      if (error instanceof DeveloperSalesResourceStorageError) throw error;
      throw new DeveloperSalesResourceStorageError('Private resource storage is unavailable. Please try again.');
    }

    const result = await db.transaction(async (tx: any) => {
      await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
      const [insertResult] = await tx.insert(developmentDocuments).values({
        developmentId: input.developmentId,
        title: documentLabel,
        documentType: 'other',
        category: 'sales_asset',
        storageKey: stored!.storageKey,
        fileUrl: null,
        mimeType: stored!.mimeType,
        fileSizeBytes: stored!.byteSize,
        visibility: 'referrer',
        downloadable: 1,
        isActive: 1,
        version: 1,
        uploadedBy: input.userId,
      });
      const resourceId = Number((insertResult as any)?.insertId || 0);
      if (!Number.isSafeInteger(resourceId) || resourceId <= 0) {
        throw new Error('Could not identify the uploaded sales resource.');
      }

      await tx.insert(managerialAuditLogs).values({
        actorUserId: input.userId,
        action: 'developer.sales_resource.uploaded_and_shared',
        targetType: 'development_document',
        targetId: resourceId,
        beforeData: null,
        afterData: {
          title: documentLabel,
          fileName: developerSalesResourceFileName(stored!.storageKey),
          mimeType: stored!.mimeType,
          fileSizeBytes: stored!.byteSize,
          storageAdapter: 'private',
          visibility: 'referrer',
          downloadable: true,
        },
        metadata: {
          developmentId: input.developmentId,
          reason,
          actorRole: actor.role,
        },
      });

      return { resourceId, documentLabel, fileName: developerSalesResourceFileName(stored!.storageKey) };
    });

    return { ...result, isActive: true, downloadable: true };
  } catch (error) {
    if (stored) await deleteDeveloperSalesResource(storageKey).catch(() => undefined);
    if (error instanceof TRPCError) throw error;
    const message = error instanceof DeveloperSalesResourceStorageError
      ? error.message
      : 'Could not save the resource record and audit history. Please try again.';
    fail('PRECONDITION_FAILED', message);
  }
}

export async function setDevelopmentSalesResourceSharing(input: {
  developmentId: number;
  resourceId: number;
  shared: boolean;
  reason: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await actorScope(input.userId, true);
  const reason = requiredText(input.reason, 'Reason', 500, 10);

  return db.transaction(async (tx: any) => {
    await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    const [resource] = await tx
      .select()
      .from(developmentDocuments)
      .where(
        and(
          eq(developmentDocuments.id, input.resourceId),
          eq(developmentDocuments.developmentId, input.developmentId),
          eq(developmentDocuments.category, 'sales_asset'),
        ),
      )
      .limit(1)
      .for('update');
    if (!resource) fail('NOT_FOUND', 'Partner sales resource not found.');
    const isPrivateStored = isPrivateDeveloperSalesResourceKey(resource.storageKey) && !resource.fileUrl;
    if (input.shared && !isPrivateStored) {
      fail(
        'PRECONDITION_FAILED',
        'This file uses a direct URL and cannot be safely shared. Upload a private copy first.',
      );
    }
    if (input.shared && Number(resource.isActive) !== 1) {
      fail('PRECONDITION_FAILED', 'Inactive resources cannot be shared. Upload an active private copy first.');
    }
    const nextVisibility = input.shared ? 'referrer' : 'internal';
    if (resource.visibility === nextVisibility) {
      fail('CONFLICT', input.shared ? 'This resource is already shared.' : 'This resource is already private.');
    }

    await tx
      .update(developmentDocuments)
      .set({ visibility: nextVisibility, downloadable: input.shared && isPrivateStored ? 1 : 0 })
      .where(eq(developmentDocuments.id, input.resourceId));
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: input.shared ? 'developer.sales_resource.shared' : 'developer.sales_resource.unshared',
      targetType: 'development_document',
      targetId: input.resourceId,
      beforeData: {
        title: resource.title,
        visibility: resource.visibility,
        isActive: Number(resource.isActive) === 1,
      },
      afterData: {
        title: resource.title,
        visibility: nextVisibility,
        downloadable: input.shared && isPrivateStored,
        isActive: Number(resource.isActive) === 1,
      },
      metadata: {
        developmentId: input.developmentId,
        reason,
        actorRole: actor.role,
      },
    });

    return {
      resourceId: input.resourceId,
      documentLabel: String(resource.title || ''),
      isActive: input.shared,
      downloadable: input.shared && isPrivateStored,
    };
  });
}

export async function unshareDevelopmentSalesResource(input: {
  developmentId: number;
  resourceId: number;
  reason: string;
  userId: number;
}) {
  return setDevelopmentSalesResourceSharing({ ...input, shared: false });
}

/** Internal Distribution handoff. Distribution must authorize the actor before calling this. */
export async function readSharedDevelopmentSalesResource(input: {
  developmentId: number;
  resourceId: number;
}): Promise<{ title: string; fileName: string; mimeType: string; buffer: Buffer } | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [resource] = await db
    .select({
      id: developmentDocuments.id,
      title: developmentDocuments.title,
      storageKey: developmentDocuments.storageKey,
      fileUrl: developmentDocuments.fileUrl,
      mimeType: developmentDocuments.mimeType,
      downloadable: developmentDocuments.downloadable,
      isActive: developmentDocuments.isActive,
      visibility: developmentDocuments.visibility,
      category: developmentDocuments.category,
    })
    .from(developmentDocuments)
    .where(
      and(
        eq(developmentDocuments.id, input.resourceId),
        eq(developmentDocuments.developmentId, input.developmentId),
        eq(developmentDocuments.category, 'sales_asset'),
        eq(developmentDocuments.visibility, 'referrer'),
        eq(developmentDocuments.isActive, 1),
        eq(developmentDocuments.downloadable, 1),
      ),
    )
    .limit(1);

  if (
    !resource ||
    !isPrivateDeveloperSalesResourceKey(resource.storageKey) ||
    resource.fileUrl
  ) return null;
  const mimeType = String(resource.mimeType || '').trim().toLowerCase();
  if (!mimeType) return null;
  let buffer: Buffer;
  try {
    buffer = await readDeveloperSalesResource(String(resource.storageKey), mimeType);
  } catch (error) {
    console.error('[DeveloperSalesResource] private resource read failed', {
      developmentId: input.developmentId,
      resourceId: input.resourceId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return null;
  }
  return {
    title: String(resource.title || 'Development resource'),
    fileName: developerSalesResourceFileName(String(resource.storageKey)),
    mimeType,
    buffer,
  };
}

// Keep the adapter type imported in this module's public surface for audit/admin callers.
export type { DeveloperSalesResourceStorageAdapter };
