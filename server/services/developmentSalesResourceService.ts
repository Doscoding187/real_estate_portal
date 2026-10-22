import { and, asc, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import {
  developmentDocuments,
  developments,
  managerialAuditLogs,
  unitTypes,
} from '../../drizzle/schema';
import { developerIdentityService } from './developerIdentityService';

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
  code: 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND',
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

function normalizeResourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 2048) return null;
  try {
    if (normalized.startsWith('/')) {
      if (normalized.startsWith('//')) return null;
      const parsed = new URL(normalized, 'https://property-listify.invalid');
      return parsed.origin === 'https://property-listify.invalid' ? normalized : null;
    }
    if (!/^https?:\/\//i.test(normalized)) return null;
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [value];
  }
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function resourceFileName(value: unknown, href: string): string {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of ['fileName', 'filename', 'name', 'title']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 255);
    }
  }
  try {
    const pathname = new URL(href, 'https://property-listify.invalid').pathname;
    const segments = pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] || 'Development resource').slice(
      0,
      255,
    );
  } catch {
    return 'Development resource';
  }
}

function addAttachedResources(target: Map<string, string>, value: unknown) {
  for (const item of parseCollection(value)) {
    const record =
      typeof item === 'object' && item !== null && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : null;
    const rawUrl =
      typeof item === 'string'
        ? item
        : (record?.url ?? record?.fileUrl ?? record?.processedUrl ?? record?.originalUrl);
    const href = normalizeResourceUrl(rawUrl);
    if (href) target.set(href, resourceFileName(item, href));
  }
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
      documentLabel: developmentDocuments.title,
      fileUrl: developmentDocuments.fileUrl,
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
    resources: rows.map(row => ({
      id: Number(row.id),
      documentLabel: String(row.documentLabel || ''),
      fileUrl: typeof row.fileUrl === 'string' ? row.fileUrl : null,
      fileName: typeof row.fileUrl === 'string' ? resourceFileName(null, row.fileUrl) : null,
      sortOrder: Number(row.id),
      isActive: Number(row.isActive) === 1 && row.visibility === 'referrer',
      sharedAt: row.visibility === 'referrer' ? row.updatedAt || null : row.createdAt || null,
    })),
  };
}

export async function shareDevelopmentSalesResource(input: {
  developmentId: number;
  fileUrl: string;
  documentLabel: string;
  reason: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await actorScope(input.userId, true);
  const fileUrl = normalizeResourceUrl(input.fileUrl);
  if (!fileUrl)
    fail('BAD_REQUEST', 'Choose a safe file link from this development’s project library.');
  const documentLabel = requiredText(input.documentLabel, 'Resource name', 160, 2);
  const reason = requiredText(input.reason, 'Reason', 500, 10);

  return db.transaction(async (tx: any) => {
    await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);

    const [development] = await tx
      .select({ brochures: developments.brochures, floorPlans: developments.floorPlans })
      .from(developments)
      .where(eq(developments.id, input.developmentId))
      .limit(1)
      .for('update');
    const unitTypeRows = await tx
      .select({ baseMedia: unitTypes.baseMedia })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, input.developmentId))
      .for('update');

    const attachedResources = new Map<string, string>();
    addAttachedResources(attachedResources, development?.brochures);
    addAttachedResources(attachedResources, development?.floorPlans);
    for (const unitType of unitTypeRows) {
      const baseMedia = parseRecord(unitType.baseMedia);
      addAttachedResources(attachedResources, baseMedia?.floorPlans);
    }
    const fileName = attachedResources.get(fileUrl);
    if (!fileName) {
      fail(
        'BAD_REQUEST',
        'That file is no longer attached to this development. Refresh the project library and choose another file.',
      );
    }

    const existingResources = await tx
      .select({
        id: developmentDocuments.id,
        title: developmentDocuments.title,
        fileUrl: developmentDocuments.fileUrl,
        isActive: developmentDocuments.isActive,
        visibility: developmentDocuments.visibility,
      })
      .from(developmentDocuments)
      .where(
        and(
          eq(developmentDocuments.developmentId, input.developmentId),
          eq(developmentDocuments.category, 'sales_asset'),
        ),
      )
      .orderBy(asc(developmentDocuments.id))
      .for('update');
    if (
      existingResources.some(
        row =>
          Number(row.isActive) === 1 &&
          (row.visibility === 'referrer' || row.visibility === 'public') &&
          row.fileUrl === fileUrl,
      )
    ) {
      fail('CONFLICT', 'This file is already available to a public or partner audience.');
    }

    const existing = existingResources.find(row => row.fileUrl === fileUrl);
    let resourceId: number;
    if (existing) {
      await tx
        .update(developmentDocuments)
        .set({
          title: documentLabel,
          documentType: 'other',
          category: 'sales_asset',
          visibility: 'referrer',
          downloadable: 1,
          isActive: 1,
          uploadedBy: input.userId,
        })
        .where(eq(developmentDocuments.id, existing.id));
      resourceId = Number(existing.id);
    } else {
      const [insertResult] = await tx.insert(developmentDocuments).values({
        developmentId: input.developmentId,
        title: documentLabel,
        documentType: 'other',
        category: 'sales_asset',
        storageKey: null,
        fileUrl,
        visibility: 'referrer',
        downloadable: 1,
        isActive: 1,
        version: 1,
        uploadedBy: input.userId,
      });
      resourceId = Number((insertResult as any)?.insertId || 0);
    }
    if (!Number.isSafeInteger(resourceId) || resourceId <= 0) {
      throw new Error('Could not identify the shared sales resource.');
    }

    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.sales_resource.shared',
      targetType: 'development_document',
      targetId: resourceId,
      beforeData: existing
        ? {
            title: existing.title,
            fileUrl: existing.fileUrl,
            visibility: existing.visibility,
            isActive: Number(existing.isActive) === 1,
          }
        : null,
      afterData: {
        title: documentLabel,
        fileName,
        fileUrl,
        documentType: 'other',
        category: 'sales_asset',
        visibility: 'referrer',
        isActive: true,
      },
      metadata: {
        developmentId: input.developmentId,
        reason,
        actorRole: actor.role,
      },
    });

    return { resourceId, documentLabel, fileName, fileUrl, isActive: true };
  });
}

export async function unshareDevelopmentSalesResource(input: {
  developmentId: number;
  resourceId: number;
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
    if (Number(resource.isActive) !== 1 || resource.visibility !== 'referrer')
      fail('CONFLICT', 'This resource is already no longer shared.');

    await tx
      .update(developmentDocuments)
      .set({ visibility: 'internal' })
      .where(
        and(
          eq(developmentDocuments.id, input.resourceId),
          eq(developmentDocuments.developmentId, input.developmentId),
          eq(developmentDocuments.visibility, 'referrer'),
          eq(developmentDocuments.isActive, 1),
        ),
      );
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.sales_resource.unshared',
      targetType: 'development_document',
      targetId: input.resourceId,
      beforeData: {
        documentLabel: resource.title,
        fileName: typeof resource.fileUrl === 'string' ? resourceFileName(null, resource.fileUrl) : null,
        fileUrl: resource.fileUrl,
        visibility: resource.visibility,
        isActive: true,
      },
      afterData: { visibility: 'internal', isActive: Number(resource.isActive) === 1 },
      metadata: {
        developmentId: input.developmentId,
        reason,
        actorRole: actor.role,
      },
    });

    return { resourceId: input.resourceId, isActive: false };
  });
}
