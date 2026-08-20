import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '../_core/env';

const TTL_SECONDS = 10 * 60;
const DELIVERY_TTL_SECONDS = 5 * 60;
const DEVELOPMENT_SECRET = 'land-evidence-storage-dev-only';

export type LandEvidenceUploadReservation = {
  v: 1;
  kind: 'land-evidence-upload';
  key: string;
  landAssetId: number;
  userId: number;
  contentType: string;
  fileName: string;
  iat: number;
  exp: number;
};

type DeliveryReservation = {
  v: 1;
  kind: 'land-evidence-delivery';
  key: string;
  evidenceDocumentId: number;
  actorUserId: number;
  iat: number;
  exp: number;
};

function secret() {
  const configured = process.env.MEDIA_UPLOAD_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured?.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') throw new Error('Private evidence token secret is not configured.');
  return DEVELOPMENT_SECRET;
}

function encode(value: unknown) { return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url'); }
function sign(encoded: string) { return createHmac('sha256', secret()).update(encoded).digest('base64url'); }
function token(value: unknown) { const encoded = encode(value); return `${encoded}.${sign(encoded)}`; }
function parse<T>(value: string): T {
  const [encoded, supplied] = value.trim().split('.');
  if (!encoded || !supplied) throw new Error('Invalid private evidence token.');
  const expected = sign(encoded);
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new Error('Invalid private evidence token.');
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}

function safeName(name: string) {
  const normalized = name.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  if (!normalized || normalized.length > 255 || normalized.startsWith('.')) throw new Error('Invalid evidence filename.');
  return normalized;
}

export function createLandEvidenceUploadReservation(input: { landAssetId: number; userId: number; fileName: string; contentType: string }) {
  const now = Math.floor(Date.now() / 1000);
  const contentType = input.contentType.trim().toLowerCase();
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(contentType)) throw new Error('Private evidence must be a PDF, JPEG, PNG, or WebP document.');
  const fileName = safeName(input.fileName);
  const payload: LandEvidenceUploadReservation = { v: 1, kind: 'land-evidence-upload', key: `private/land/${input.landAssetId}/${randomUUID()}-${fileName}`, landAssetId: input.landAssetId, userId: input.userId, contentType, fileName, iat: now, exp: now + TTL_SECONDS };
  return { token: token(payload), payload };
}

export function verifyLandEvidenceUploadReservation(value: string, expected?: { userId?: number; landAssetId?: number }): LandEvidenceUploadReservation {
  const payload = parse<LandEvidenceUploadReservation>(value);
  if (payload.v !== 1 || payload.kind !== 'land-evidence-upload' || payload.exp <= Math.floor(Date.now() / 1000) || !/^private\/land\/\d+\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(payload.key)) throw new Error('Invalid or expired private evidence upload token.');
  if (expected?.userId !== undefined && expected.userId !== payload.userId) throw new Error('Private evidence upload is not owned by this user.');
  if (expected?.landAssetId !== undefined && expected.landAssetId !== payload.landAssetId) throw new Error('Private evidence upload targets a different Land Asset.');
  return payload;
}

export function createLandEvidenceDeliveryToken(input: { evidenceDocumentId: number; actorUserId: number; key: string }) {
  const now = Math.floor(Date.now() / 1000);
  return token({ v: 1, kind: 'land-evidence-delivery', key: input.key, evidenceDocumentId: input.evidenceDocumentId, actorUserId: input.actorUserId, iat: now, exp: now + DELIVERY_TTL_SECONDS } satisfies DeliveryReservation);
}

export function verifyLandEvidenceDeliveryToken(value: string): DeliveryReservation {
  const payload = parse<DeliveryReservation>(value);
  if (payload.v !== 1 || payload.kind !== 'land-evidence-delivery' || payload.exp <= Math.floor(Date.now() / 1000) || !/^private\/land\/\d+\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(payload.key)) throw new Error('Invalid or expired private evidence delivery token.');
  return payload;
}

function privateS3Client() {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.s3BucketName) throw new Error('Private evidence storage is not configured.');
  return new S3Client({ region: ENV.awsRegion, credentials: { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey } });
}

export async function createPrivateEvidenceS3UploadUrl(reservation: LandEvidenceUploadReservation) {
  return getSignedUrl(privateS3Client(), new PutObjectCommand({ Bucket: ENV.s3BucketName, Key: reservation.key, ContentType: reservation.contentType }), { expiresIn: TTL_SECONDS });
}

export async function inspectPrivateEvidenceS3Object(reservation: LandEvidenceUploadReservation) {
  const object = await privateS3Client().send(new HeadObjectCommand({ Bucket: ENV.s3BucketName, Key: reservation.key }));
  if (object.ContentType?.toLowerCase() !== reservation.contentType || !object.ContentLength || object.ContentLength > 25 * 1024 * 1024) throw new Error('Uploaded private evidence did not satisfy its upload authority.');
  return { contentType: object.ContentType, contentLength: Number(object.ContentLength) };
}

export async function createPrivateEvidenceS3DeliveryUrl(key: string) {
  return getSignedUrl(privateS3Client(), new GetObjectCommand({ Bucket: ENV.s3BucketName, Key: key, ResponseCacheControl: 'private, no-store' }), { expiresIn: DELIVERY_TTL_SECONDS });
}
