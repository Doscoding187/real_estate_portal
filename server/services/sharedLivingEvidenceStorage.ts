import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '../_core/env';

const UPLOAD_TTL_SECONDS = 10 * 60;
const DELIVERY_TTL_SECONDS = 5 * 60;
const DEVELOPMENT_SECRET = 'shared-living-evidence-dev-only';
const KEY_PATTERN = /^private\/shared-living\/[1-9][0-9]*\/[a-f0-9-]{36}-[A-Za-z0-9][A-Za-z0-9._-]*$/i;

export type SharedLivingEvidenceUploadReservation = {
  v: 1;
  kind: 'shared-living-authority-upload';
  key: string;
  placeId: number;
  userId: number;
  contentType: string;
  fileName: string;
  iat: number;
  exp: number;
};

type SharedLivingEvidenceDeliveryReservation = {
  v: 1;
  kind: 'shared-living-authority-delivery';
  key: string;
  evidenceId: number;
  actorUserId: number;
  iat: number;
  exp: number;
};

function secret() {
  const configured = process.env.MEDIA_UPLOAD_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured?.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Private Shared Living evidence token secret is not configured.');
  }
  return DEVELOPMENT_SECRET;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function sign(encoded: string) {
  return createHmac('sha256', secret()).update(encoded).digest('base64url');
}

function issue(value: unknown) {
  const encoded = encode(value);
  return `${encoded}.${sign(encoded)}`;
}

function parse<T>(value: string): T {
  const [encoded, supplied] = value.trim().split('.');
  if (!encoded || !supplied) throw new Error('Invalid Shared Living evidence token.');
  const expected = sign(encoded);
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    throw new Error('Invalid Shared Living evidence token.');
  }
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}

function safeFileName(value: string) {
  const result = value.trim().replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');
  if (!result || result.length > 255 || result.startsWith('.')) {
    throw new Error('Choose a valid mandate evidence filename.');
  }
  return result;
}

export function createSharedLivingEvidenceUploadReservation(input: {
  placeId: number;
  userId: number;
  fileName: string;
  contentType: string;
}) {
  if (!Number.isSafeInteger(input.placeId) || input.placeId <= 0) throw new Error('Invalid residence.');
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) throw new Error('Invalid uploader.');
  const contentType = input.contentType.trim().toLowerCase();
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(contentType)) {
    throw new Error('Mandate evidence must be a PDF, JPEG, PNG, or WebP document.');
  }
  const fileName = safeFileName(input.fileName);
  const now = Math.floor(Date.now() / 1000);
  const payload: SharedLivingEvidenceUploadReservation = {
    v: 1,
    kind: 'shared-living-authority-upload',
    key: `private/shared-living/${input.placeId}/${randomUUID()}-${fileName}`,
    placeId: input.placeId,
    userId: input.userId,
    contentType,
    fileName,
    iat: now,
    exp: now + UPLOAD_TTL_SECONDS,
  };
  return { token: issue(payload), payload };
}

export function verifySharedLivingEvidenceUploadReservation(
  value: string,
  expected?: { userId?: number; placeId?: number },
): SharedLivingEvidenceUploadReservation {
  const payload = parse<SharedLivingEvidenceUploadReservation>(value);
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.v !== 1 ||
    payload.kind !== 'shared-living-authority-upload' ||
    payload.exp <= now ||
    !Number.isSafeInteger(payload.placeId) ||
    payload.placeId <= 0 ||
    !Number.isSafeInteger(payload.userId) ||
    payload.userId <= 0 ||
    !KEY_PATTERN.test(payload.key) ||
    !/^(application\/pdf|image\/(jpeg|png|webp))$/.test(payload.contentType)
  ) {
    throw new Error('Invalid or expired Shared Living mandate upload token.');
  }
  if (expected?.userId !== undefined && payload.userId !== expected.userId) {
    throw new Error('Mandate upload belongs to another agent.');
  }
  if (expected?.placeId !== undefined && payload.placeId !== expected.placeId) {
    throw new Error('Mandate upload targets another residence.');
  }
  return payload;
}

function privateS3Client() {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.s3BucketName) {
    throw new Error('Private Shared Living evidence storage is not configured.');
  }
  return new S3Client({
    region: ENV.awsRegion,
    credentials: { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey },
  });
}

export async function createSharedLivingEvidenceS3UploadUrl(
  reservation: SharedLivingEvidenceUploadReservation,
) {
  return getSignedUrl(
    privateS3Client(),
    new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: reservation.key,
      ContentType: reservation.contentType,
      ServerSideEncryption: 'AES256',
    }),
    { expiresIn: UPLOAD_TTL_SECONDS },
  );
}

export async function inspectSharedLivingEvidenceS3Object(
  reservation: SharedLivingEvidenceUploadReservation,
) {
  const object = await privateS3Client().send(
    new HeadObjectCommand({ Bucket: ENV.s3BucketName, Key: reservation.key }),
  );
  const contentType = object.ContentType?.toLowerCase() || '';
  const contentLength = Number(object.ContentLength || 0);
  if (
    contentType !== reservation.contentType ||
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > 25 * 1024 * 1024
  ) {
    throw new Error('Uploaded mandate evidence did not satisfy its private upload authority.');
  }
  return { contentType, contentLength };
}

export function createSharedLivingEvidenceDeliveryToken(input: {
  evidenceId: number;
  actorUserId: number;
  key: string;
}) {
  if (!Number.isSafeInteger(input.evidenceId) || input.evidenceId <= 0) throw new Error('Invalid evidence.');
  if (!Number.isSafeInteger(input.actorUserId) || input.actorUserId <= 0) throw new Error('Invalid actor.');
  if (!KEY_PATTERN.test(input.key)) throw new Error('Invalid private Shared Living evidence key.');
  const now = Math.floor(Date.now() / 1000);
  const payload: SharedLivingEvidenceDeliveryReservation = {
    v: 1,
    kind: 'shared-living-authority-delivery',
    key: input.key,
    evidenceId: input.evidenceId,
    actorUserId: input.actorUserId,
    iat: now,
    exp: now + DELIVERY_TTL_SECONDS,
  };
  return issue(payload);
}

export function verifySharedLivingEvidenceDeliveryToken(value: string) {
  const payload = parse<SharedLivingEvidenceDeliveryReservation>(value);
  if (
    payload.v !== 1 ||
    payload.kind !== 'shared-living-authority-delivery' ||
    payload.exp <= Math.floor(Date.now() / 1000) ||
    !Number.isSafeInteger(payload.evidenceId) ||
    payload.evidenceId <= 0 ||
    !Number.isSafeInteger(payload.actorUserId) ||
    payload.actorUserId <= 0 ||
    !KEY_PATTERN.test(payload.key)
  ) {
    throw new Error('Invalid or expired Shared Living evidence delivery token.');
  }
  return payload;
}

export async function createSharedLivingEvidenceS3DeliveryUrl(key: string) {
  if (!KEY_PATTERN.test(key)) throw new Error('Invalid private Shared Living evidence key.');
  return getSignedUrl(
    privateS3Client(),
    new GetObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      ResponseCacheControl: 'private, no-store',
    }),
    { expiresIn: DELIVERY_TTL_SECONDS },
  );
}
