import { createHmac, timingSafeEqual } from 'node:crypto';

import { TRPCError } from '@trpc/server';

import type { MediaType } from '../../shared/listing-types';
import {
  buildLocalMediaPublicUrl,
  buildLocalMediaUploadUrl,
  createMediaStorageKey,
  getLocalMediaMaxBytes,
  getMediaStorageAdapter,
  resolveMediaDeliveryUrl,
} from '../_core/mediaStorage';
import { assertUploadedMediaObject, generatePresignedUploadUrl } from '../_core/imageUpload';
import { assertSupportedListingMediaContentType } from './listingMediaAuthority';

const TOKEN_TTL_SECONDS = 60 * 60;
const DEVELOPMENT_SECRET = 'developer-media-upload-dev-only';

export const DEVELOPER_MEDIA_CATEGORIES = [
  'development_image',
  'development_video',
  'development_document',
  'development_floorplan',
  'unit_gallery',
  'unit_floorplan',
] as const;

export type DeveloperMediaCategory = (typeof DEVELOPER_MEDIA_CATEGORIES)[number];

export type DeveloperMediaUploadReceipt = {
  v: 1;
  kind: 'developer-media-upload';
  key: string;
  mediaType: MediaType;
  contentType: string;
  fileName: string;
  userId: number;
  organisationId: number;
  publisherId: number;
  developmentId: number | null;
  unitId: string | null;
  category: DeveloperMediaCategory;
  fileSize: number | null;
  confirmed: boolean;
  iat: number;
  exp: number;
};

type ReceiptOptions = {
  secret?: string | null;
  now?: number;
  ttlSeconds?: number;
};

type VerifyOptions = ReceiptOptions & {
  userId?: number;
  organisationId?: number;
  publisherId?: number;
  developmentId?: number | null;
  unitId?: string | null;
  category?: DeveloperMediaCategory;
  mediaType?: MediaType;
  key?: string;
  requireConfirmed?: boolean;
};

function getSecret(secret?: string | null): string {
  const configured = secret ?? process.env.MEDIA_UPLOAD_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured && configured.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Developer media upload token secret is not configured.');
  }
  return DEVELOPMENT_SECRET;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function assertPositiveId(value: unknown, label: string): number {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(`Invalid Developer media ${label}.`);
  }
  return normalized;
}

function normalizeUnitId(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized.length > 36 || !/^[A-Za-z0-9-]+$/.test(normalized)) {
    throw new Error('Invalid Developer media unit scope.');
  }
  return normalized;
}

function categoryMediaType(category: DeveloperMediaCategory): MediaType {
  switch (category) {
    case 'development_image':
    case 'unit_gallery':
      return 'image';
    case 'development_video':
      return 'video';
    case 'development_document':
      return 'pdf';
    case 'development_floorplan':
    case 'unit_floorplan':
      return 'floorplan';
  }
}

function assertCategory(value: unknown): DeveloperMediaCategory {
  if (typeof value !== 'string' || !DEVELOPER_MEDIA_CATEGORIES.includes(value as DeveloperMediaCategory)) {
    throw new Error('Invalid Developer media category.');
  }
  return value as DeveloperMediaCategory;
}

function assertSafeKey(key: unknown, developmentId: number | null, userId: number): string {
  const normalized = typeof key === 'string' ? key.trim() : '';
  const expectedScope = developmentId === null ? `draft-${userId}` : String(developmentId);
  if (
    !normalized ||
    normalized.includes('..') ||
    normalized.startsWith('/') ||
    !normalized.startsWith(`properties/${expectedScope}/`)
  ) {
    throw new Error('Developer media storage key is outside its governed scope.');
  }
  return normalized;
}

function maxBytesFor(mediaType: MediaType): number {
  if (mediaType === 'image' || mediaType === 'video' || mediaType === 'pdf') {
    return getLocalMediaMaxBytes(mediaType);
  }
  return getLocalMediaMaxBytes('floorplan');
}

function assertReceiptShape(payload: DeveloperMediaUploadReceipt, now: number): void {
  if (
    payload.v !== 1 ||
    payload.kind !== 'developer-media-upload' ||
    !payload.fileName ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= now
  ) {
    throw new Error('Invalid or expired Developer media receipt.');
  }
  const category = assertCategory(payload.category);
  const mediaType = categoryMediaType(category);
  if (payload.mediaType !== mediaType) {
    throw new Error('Developer media category does not match its media type.');
  }
  const userId = assertPositiveId(payload.userId, 'uploader');
  const developmentId = payload.developmentId == null ? null : assertPositiveId(payload.developmentId, 'development');
  assertPositiveId(payload.organisationId, 'organisation');
  assertPositiveId(payload.publisherId, 'publisher');
  normalizeUnitId(payload.unitId);
  assertSupportedListingMediaContentType(mediaType, payload.contentType);
  assertSafeKey(payload.key, developmentId, userId);
  if (payload.fileSize !== null && (!Number.isSafeInteger(payload.fileSize) || payload.fileSize <= 0)) {
    throw new Error('Developer media receipt has an invalid file size.');
  }
}

export function createDeveloperMediaUploadReceipt(
  input: Omit<DeveloperMediaUploadReceipt, 'v' | 'kind' | 'iat' | 'exp'>,
  options?: ReceiptOptions,
): string {
  const category = assertCategory(input.category);
  const mediaType = categoryMediaType(category);
  if (input.mediaType !== mediaType) {
    throw new Error('Developer media category does not match its media type.');
  }
  const userId = assertPositiveId(input.userId, 'uploader');
  const organisationId = assertPositiveId(input.organisationId, 'organisation');
  const publisherId = assertPositiveId(input.publisherId, 'publisher');
  const developmentId = input.developmentId == null ? null : assertPositiveId(input.developmentId, 'development');
  const unitId = normalizeUnitId(input.unitId);
  const fileName = String(input.fileName || '').trim();
  if (!fileName || fileName.length > 255) throw new Error('Invalid Developer media filename.');
  const contentType = assertSupportedListingMediaContentType(mediaType, input.contentType);
  const key = assertSafeKey(input.key, developmentId, userId);
  const fileSize = input.fileSize == null ? null : Number(input.fileSize);
  if (fileSize !== null && (!Number.isSafeInteger(fileSize) || fileSize <= 0)) {
    throw new Error('Invalid Developer media file size.');
  }
  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  const payload: DeveloperMediaUploadReceipt = {
    v: 1,
    kind: 'developer-media-upload',
    key,
    mediaType,
    contentType,
    fileName,
    userId,
    organisationId,
    publisherId,
    developmentId,
    unitId,
    category,
    fileSize,
    confirmed: Boolean(input.confirmed),
    iat: now,
    exp: now + (options?.ttlSeconds ?? TOKEN_TTL_SECONDS),
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, getSecret(options?.secret))}`;
}

export function verifyDeveloperMediaUploadReceipt(
  receipt: string,
  options?: VerifyOptions,
): DeveloperMediaUploadReceipt {
  const [encoded, signature] = receipt.trim().split('.');
  if (!encoded || !signature) throw new Error('Invalid Developer media receipt format.');
  const expected = sign(encoded, getSecret(options?.secret));
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid Developer media receipt signature.');
  }

  let payload: DeveloperMediaUploadReceipt;
  try {
    payload = JSON.parse(decode(encoded)) as DeveloperMediaUploadReceipt;
  } catch {
    throw new Error('Invalid Developer media receipt payload.');
  }
  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  assertReceiptShape(payload, now);

  if (options?.requireConfirmed && !payload.confirmed) {
    throw new Error('Developer media upload has not been confirmed.');
  }
  const equal = (actual: unknown, expectedValue: unknown) => actual === expectedValue;
  if (options?.userId !== undefined && !equal(payload.userId, options.userId)) {
    throw new Error('Developer media upload does not belong to this user.');
  }
  if (options?.organisationId !== undefined && !equal(payload.organisationId, options.organisationId)) {
    throw new Error('Developer media upload belongs to another organisation.');
  }
  if (options?.publisherId !== undefined && !equal(payload.publisherId, options.publisherId)) {
    throw new Error('Developer media upload belongs to another publisher.');
  }
  if (options?.developmentId !== undefined && !equal(payload.developmentId, options.developmentId)) {
    throw new Error('Developer media upload is bound to a different development.');
  }
  if (options?.unitId !== undefined && !equal(payload.unitId, options.unitId)) {
    throw new Error('Developer media upload is bound to a different unit type.');
  }
  if (options?.category !== undefined && !equal(payload.category, options.category)) {
    throw new Error('Developer media upload category does not match the attachment.');
  }
  if (options?.mediaType !== undefined && !equal(payload.mediaType, options.mediaType)) {
    throw new Error('Developer media upload type does not match the attachment.');
  }
  if (options?.key !== undefined && !equal(payload.key, options.key)) {
    throw new Error('Developer media upload key does not match the attachment.');
  }
  return payload;
}

export function confirmDeveloperMediaUploadReceipt(
  receipt: string,
  fileSize: number,
  options?: ReceiptOptions,
): string {
  const payload = verifyDeveloperMediaUploadReceipt(receipt, options);
  return createDeveloperMediaUploadReceipt(
    { ...payload, fileSize, confirmed: true },
    options,
  );
}

/**
 * Confirmation is not a one-time trust grant. The shared development write
 * boundary calls this again so a receipt cannot attach an object that was
 * deleted or replaced after the upload confirmation response.
 */
export async function assertConfirmedDeveloperMediaAttachment(
  uploadReceipt: string,
  options: VerifyOptions,
): Promise<DeveloperMediaUploadReceipt> {
  const receipt = verifyDeveloperMediaUploadReceipt(uploadReceipt, {
    ...options,
    requireConfirmed: true,
  });
  const object = await assertUploadedMediaObject(receipt.key, receipt.contentType);
  const contentLength = Number(object.contentLength);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength !== receipt.fileSize ||
    contentLength > maxBytesFor(receipt.mediaType)
  ) {
    throw new Error('Developer media object no longer matches its confirmation.');
  }
  return receipt;
}

export async function reserveDeveloperMediaUpload(input: {
  userId: number;
  organisationId: number;
  publisherId: number;
  developmentId?: number | null;
  unitId?: string | null;
  category: DeveloperMediaCategory;
  fileName: string;
  contentType: string;
}) {
  const category = assertCategory(input.category);
  const mediaType = categoryMediaType(category);
  assertSupportedListingMediaContentType(mediaType, input.contentType);
  const developmentId = input.developmentId == null ? null : assertPositiveId(input.developmentId, 'development');
  const userId = assertPositiveId(input.userId, 'uploader');
  const storageScope = developmentId === null ? `draft-${userId}` : String(developmentId);
  const reservation =
    getMediaStorageAdapter() === 'local'
      ? { uploadUrl: null, key: createMediaStorageKey(input.fileName, storageScope) }
      : await generatePresignedUploadUrl(input.fileName, input.contentType, storageScope);
  const uploadReceipt = createDeveloperMediaUploadReceipt({
    key: reservation.key,
    mediaType,
    contentType: input.contentType,
    fileName: input.fileName,
    userId,
    organisationId: input.organisationId,
    publisherId: input.publisherId,
    developmentId,
    unitId: input.unitId ?? null,
    category,
    fileSize: null,
    confirmed: false,
  });

  return {
    uploadUrl:
      reservation.uploadUrl ?? buildLocalMediaUploadUrl(uploadReceipt),
    key: reservation.key,
    uploadReceipt,
  };
}

export async function confirmDeveloperMediaUpload(input: {
  uploadReceipt: string;
  userId: number;
  organisationId: number;
  publisherId: number;
}) {
  const reservation = verifyDeveloperMediaUploadReceipt(input.uploadReceipt, {
    userId: input.userId,
    organisationId: input.organisationId,
    publisherId: input.publisherId,
    requireConfirmed: false,
  });
  const object = await assertUploadedMediaObject(reservation.key, reservation.contentType);
  const size = Number(object.contentLength);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytesFor(reservation.mediaType)) {
    throw new Error('Developer media object has an invalid size.');
  }
  const confirmedReceipt = confirmDeveloperMediaUploadReceipt(input.uploadReceipt, size);
  const url =
    getMediaStorageAdapter() === 'local'
      ? buildLocalMediaPublicUrl(reservation.key)
      : resolveMediaDeliveryUrl(reservation.key);
  if (!url) throw new Error('Developer media delivery URL is unavailable.');
  return {
    uploadReceipt: confirmedReceipt,
    key: reservation.key,
    url,
    mediaType: reservation.mediaType,
    category: reservation.category,
    fileName: reservation.fileName,
    fileSize: size,
  };
}

export function developerMediaBadRequest(error: unknown): TRPCError {
  return new TRPCError({
    code: 'BAD_REQUEST',
    message: error instanceof Error ? error.message : 'Developer media upload is invalid.',
  });
}
