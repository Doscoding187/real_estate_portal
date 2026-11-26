import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '../_core/env';

const UPLOAD_TTL_SECONDS = 10 * 60;
const DELIVERY_TTL_SECONDS = 5 * 60;
const MAX_CREDENTIAL_BYTES = 25 * 1024 * 1024;
const DEVELOPMENT_SECRET = 'services-provider-credential-dev-only';
const MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;

export type ServiceProviderCredentialUploadReservation = {
  v: 1;
  kind: 'services-provider-credential-upload';
  key: string;
  providerId: number;
  userId: number;
  contentType: (typeof MIME_TYPES)[number];
  fileName: string;
  iat: number;
  exp: number;
};

type ServiceProviderCredentialDeliveryReservation = {
  v: 1;
  kind: 'services-provider-credential-delivery';
  key: string;
  credentialId: number;
  actorUserId: number;
  iat: number;
  exp: number;
};

function secret() {
  const configured = process.env.MEDIA_UPLOAD_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured?.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Private Services credential storage is not configured.');
  }
  return DEVELOPMENT_SECRET;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function sign(encoded: string) {
  return createHmac('sha256', secret()).update(encoded).digest('base64url');
}

function createToken(value: unknown) {
  const encoded = encode(value);
  return `${encoded}.${sign(encoded)}`;
}

function parseToken<T>(value: string): T {
  const [encoded, supplied] = value.trim().split('.');
  if (!encoded || !supplied) throw new Error('Invalid private Services credential token.');
  const expected = sign(encoded);
  if (
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    throw new Error('Invalid private Services credential token.');
  }
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}

function safeFileName(value: string) {
  const fileName = value.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  if (!fileName || fileName.length > 255 || fileName.startsWith('.')) {
    throw new Error('Invalid credential file name.');
  }
  return fileName;
}

function validKey(value: string, providerId?: number) {
  const match = /^private\/services\/credentials\/(\d+)\/[A-Za-z0-9][A-Za-z0-9._-]*$/.exec(value);
  return Boolean(match && (!providerId || Number(match[1]) === providerId));
}

export function createServiceProviderCredentialUploadReservation(input: {
  providerId: number;
  userId: number;
  fileName: string;
  contentType: string;
}) {
  const contentType = input.contentType.trim().toLowerCase();
  if (!(MIME_TYPES as readonly string[]).includes(contentType)) {
    throw new Error('Credentials must be a PDF, JPEG, PNG, or WebP file.');
  }
  const now = Math.floor(Date.now() / 1000);
  const fileName = safeFileName(input.fileName);
  const payload: ServiceProviderCredentialUploadReservation = {
    v: 1,
    kind: 'services-provider-credential-upload',
    key: `private/services/credentials/${input.providerId}/${randomUUID()}-${fileName}`,
    providerId: input.providerId,
    userId: input.userId,
    contentType: contentType as ServiceProviderCredentialUploadReservation['contentType'],
    fileName,
    iat: now,
    exp: now + UPLOAD_TTL_SECONDS,
  };
  return { token: createToken(payload), payload };
}

export function verifyServiceProviderCredentialUploadReservation(
  value: string,
  expected?: { userId?: number; providerId?: number },
): ServiceProviderCredentialUploadReservation {
  const payload = parseToken<ServiceProviderCredentialUploadReservation>(value);
  if (
    payload.v !== 1 ||
    payload.kind !== 'services-provider-credential-upload' ||
    payload.exp <= Math.floor(Date.now() / 1000) ||
    !Number.isInteger(payload.providerId) ||
    !Number.isInteger(payload.userId) ||
    !validKey(payload.key, payload.providerId) ||
    !(MIME_TYPES as readonly string[]).includes(payload.contentType)
  ) {
    throw new Error('Invalid or expired Services credential upload token.');
  }
  if (expected?.userId !== undefined && expected.userId !== payload.userId) {
    throw new Error('Credential upload belongs to another user.');
  }
  if (expected?.providerId !== undefined && expected.providerId !== payload.providerId) {
    throw new Error('Credential upload targets another provider.');
  }
  return payload;
}

export function createServiceProviderCredentialDeliveryToken(input: {
  credentialId: number;
  actorUserId: number;
  key: string;
}) {
  if (!validKey(input.key)) throw new Error('Invalid private Services credential key.');
  const now = Math.floor(Date.now() / 1000);
  return createToken({
    v: 1,
    kind: 'services-provider-credential-delivery',
    key: input.key,
    credentialId: input.credentialId,
    actorUserId: input.actorUserId,
    iat: now,
    exp: now + DELIVERY_TTL_SECONDS,
  } satisfies ServiceProviderCredentialDeliveryReservation);
}

export function verifyServiceProviderCredentialDeliveryToken(value: string) {
  const payload = parseToken<ServiceProviderCredentialDeliveryReservation>(value);
  if (
    payload.v !== 1 ||
    payload.kind !== 'services-provider-credential-delivery' ||
    payload.exp <= Math.floor(Date.now() / 1000) ||
    !Number.isInteger(payload.credentialId) ||
    !Number.isInteger(payload.actorUserId) ||
    !validKey(payload.key)
  ) {
    throw new Error('Invalid or expired Services credential delivery token.');
  }
  return payload;
}

function s3Client() {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.s3BucketName) {
    throw new Error('Private Services credential storage is not configured.');
  }
  return new S3Client({
    region: ENV.awsRegion,
    credentials: { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey },
  });
}

export async function createServiceProviderCredentialS3UploadUrl(
  reservation: ServiceProviderCredentialUploadReservation,
) {
  return getSignedUrl(
    s3Client(),
    new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: reservation.key,
      ContentType: reservation.contentType,
    }),
    { expiresIn: UPLOAD_TTL_SECONDS },
  );
}

export async function inspectServiceProviderCredentialS3Object(
  reservation: ServiceProviderCredentialUploadReservation,
) {
  const object = await s3Client().send(
    new HeadObjectCommand({ Bucket: ENV.s3BucketName, Key: reservation.key }),
  );
  const contentLength = Number(object.ContentLength || 0);
  if (
    object.ContentType?.toLowerCase() !== reservation.contentType ||
    contentLength < 1 ||
    contentLength > MAX_CREDENTIAL_BYTES
  ) {
    throw new Error('Uploaded credential did not satisfy its private storage authority.');
  }
  return { contentType: reservation.contentType, contentLength };
}

export async function createServiceProviderCredentialS3DeliveryUrl(key: string) {
  if (!validKey(key)) throw new Error('Invalid private Services credential key.');
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      ResponseCacheControl: 'private, no-store',
    }),
    { expiresIn: DELIVERY_TTL_SECONDS },
  );
}

export const SERVICE_PROVIDER_CREDENTIAL_MAX_BYTES = MAX_CREDENTIAL_BYTES;
export const SERVICE_PROVIDER_CREDENTIAL_MIME_TYPES = MIME_TYPES;
export const SERVICE_PROVIDER_CREDENTIAL_UPLOAD_TTL_SECONDS = UPLOAD_TTL_SECONDS;
