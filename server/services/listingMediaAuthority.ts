import { createHmac, timingSafeEqual } from 'node:crypto';

import type { MediaType } from '../../shared/listing-types';

const TOKEN_TTL_SECONDS = 60 * 60;
const DEVELOPMENT_SECRET = 'listing-media-upload-dev-only';

export type ListingMediaUploadTokenPayload = {
  v: 1;
  kind: 'listing-media-upload';
  key: string;
  mediaType: MediaType;
  contentType: string;
  fileName: string;
  userId: number;
  listingId: number | null;
  fileSize: number | null;
  confirmed: boolean;
  iat: number;
  exp: number;
};

function getSecret(secret?: string | null): string {
  const configured = secret ?? process.env.MEDIA_UPLOAD_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured && configured.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Listing media upload token secret is not configured.');
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

export function assertSupportedListingMediaContentType(
  mediaType: MediaType,
  contentType: string,
): string {
  const normalized = contentType.trim().toLowerCase();
  const isImage = /^image\/(jpeg|png|webp|gif|avif)$/.test(normalized);
  const isVideo = /^video\/(mp4|webm|quicktime|x-matroska)$/.test(normalized);
  const isPdf = normalized === 'application/pdf';

  if (mediaType === 'image' && !isImage) {
    throw new Error('Image media must use a supported image content type.');
  }
  if (mediaType === 'video' && !isVideo) {
    throw new Error('Video media must use a supported video content type.');
  }
  if ((mediaType === 'pdf' || mediaType === 'floorplan') && !isPdf && !isImage) {
    throw new Error('Document media must use PDF or image content type.');
  }

  return normalized;
}

function assertSafeMediaKey(key: string, scope: string): string {
  const normalized = key.trim();
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid listing media storage key.');
  }
  if (!normalized.startsWith(`properties/${scope}/`)) {
    throw new Error('Listing media storage key is outside the governed scope.');
  }
  return normalized;
}

export function createListingMediaUploadToken(
  input: {
    key: string;
    mediaType: MediaType;
    contentType: string;
    fileName: string;
    userId: number;
    listingId?: number | null;
    fileSize?: number | null;
    confirmed?: boolean;
  },
  options?: { secret?: string | null; now?: number; ttlSeconds?: number },
): string {
  const normalizedFileName = input.fileName.trim();
  if (!normalizedFileName || normalizedFileName.length > 255) {
    throw new Error('Invalid listing media filename.');
  }
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
    throw new Error('Invalid listing media owner.');
  }
  const listingId = input.listingId == null ? null : Number(input.listingId);
  if (listingId !== null && (!Number.isSafeInteger(listingId) || listingId <= 0)) {
    throw new Error('Invalid listing media listing id.');
  }
  const scope = listingId === null ? `draft-${input.userId}` : String(listingId);
  const contentType = assertSupportedListingMediaContentType(input.mediaType, input.contentType);
  const key = assertSafeMediaKey(input.key, scope);
  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  const payload: ListingMediaUploadTokenPayload = {
    v: 1,
    kind: 'listing-media-upload',
    key,
    mediaType: input.mediaType,
    contentType,
    fileName: normalizedFileName,
    userId: input.userId,
    listingId,
    fileSize: input.fileSize == null ? null : Number(input.fileSize),
    confirmed: Boolean(input.confirmed),
    iat: now,
    exp: now + (options?.ttlSeconds ?? TOKEN_TTL_SECONDS),
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, getSecret(options?.secret))}`;
}

export function verifyListingMediaUploadToken(
  token: string,
  options?: {
    secret?: string | null;
    now?: number;
    userId?: number;
    listingId?: number | null;
    key?: string;
    mediaType?: MediaType;
    contentType?: string;
    requireConfirmed?: boolean;
  },
): ListingMediaUploadTokenPayload {
  const [encoded, signature] = token.trim().split('.');
  if (!encoded || !signature) throw new Error('Invalid listing media upload token format.');
  const expected = sign(encoded, getSecret(options?.secret));
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid listing media upload token signature.');
  }

  let payload: ListingMediaUploadTokenPayload;
  try {
    payload = JSON.parse(decode(encoded)) as ListingMediaUploadTokenPayload;
  } catch {
    throw new Error('Invalid listing media upload token payload.');
  }

  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  if (
    payload.v !== 1 ||
    payload.kind !== 'listing-media-upload' ||
    !payload.key ||
    !payload.fileName ||
    !Number.isSafeInteger(payload.userId) ||
    payload.userId <= 0 ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= now
  ) {
    throw new Error('Invalid or expired listing media upload token.');
  }

  const scope = payload.listingId === null ? `draft-${payload.userId}` : String(payload.listingId);
  assertSupportedListingMediaContentType(payload.mediaType, payload.contentType);
  assertSafeMediaKey(payload.key, scope);

  if (options?.requireConfirmed && !payload.confirmed) {
    throw new Error('Listing media upload has not been confirmed.');
  }
  if (options?.userId !== undefined && payload.userId !== options.userId) {
    throw new Error('Listing media upload does not belong to this user.');
  }
  if (options?.listingId !== undefined) {
    const expectedListingId = options.listingId == null ? null : Number(options.listingId);
    if (payload.listingId !== expectedListingId) {
      throw new Error('Listing media upload is bound to a different listing.');
    }
  }
  if (options?.key !== undefined && payload.key !== options.key) {
    throw new Error('Listing media upload key does not match its confirmation.');
  }
  if (options?.mediaType !== undefined && payload.mediaType !== options.mediaType) {
    throw new Error('Listing media type does not match its upload confirmation.');
  }
  if (options?.contentType !== undefined) {
    if (payload.contentType !== options.contentType.trim().toLowerCase()) {
      throw new Error('Listing media content type does not match its upload confirmation.');
    }
  }

  return payload;
}

export function confirmListingMediaUploadToken(
  token: string,
  fileSize: number | null,
  options?: { secret?: string | null; now?: number },
): string {
  const payload = verifyListingMediaUploadToken(token, { ...options, requireConfirmed: false });
  return createListingMediaUploadToken(
    {
      ...payload,
      fileSize: fileSize == null ? payload.fileSize : fileSize,
      confirmed: true,
    },
    options,
  );
}

export function isExistingListingMediaToken(id: string): boolean {
  return id.startsWith('existing:');
}
