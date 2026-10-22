import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES } from '../../shared/distributionReferralIntake';

export type DistributionReferralEvidenceStorageAdapter = 'local' | 's3';

export type DistributionReferralEvidenceStorageStatus = {
  adapter: DistributionReferralEvidenceStorageAdapter;
  configured: boolean;
  productionSafe: boolean;
  missing: string[];
  message: string | null;
};

type StorageConfig =
  | { adapter: 'local'; root: string }
  | {
      adapter: 's3';
      bucket: string;
      region: string;
      prefix: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };

const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;
const PRIVATE_EVIDENCE_KEY_PATTERN =
  /^private\/distribution-referrals\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i;

export class DistributionReferralEvidenceStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistributionReferralEvidenceStorageError';
  }
}

function isHostedRuntime() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.APP_ENV === 'staging'
  );
}

function selectedAdapter(): {
  adapter: DistributionReferralEvidenceStorageAdapter;
  invalidConfiguration: boolean;
} {
  const value = String(process.env.DISTRIBUTION_EVIDENCE_STORAGE_ADAPTER || '')
    .trim()
    .toLowerCase();
  if (value === 'local') return { adapter: 'local', invalidConfiguration: false };
  if (value === 's3') return { adapter: 's3', invalidConfiguration: false };
  if (value) {
    return {
      adapter: isHostedRuntime() ? 's3' : 'local',
      invalidConfiguration: true,
    };
  }
  return { adapter: isHostedRuntime() ? 's3' : 'local', invalidConfiguration: false };
}

function localRoot() {
  return path.resolve(
    process.env.DISTRIBUTION_EVIDENCE_PRIVATE_STORAGE_DIR ||
      path.resolve(process.cwd(), '.private', 'distribution-referral-evidence'),
  );
}

function localRootOverlapsPublicMedia() {
  const publicMediaRoot = String(process.env.MEDIA_LOCAL_STORAGE_DIR || '').trim();
  if (!publicMediaRoot) return false;
  const privateRoot = localRoot();
  const mediaRoot = path.resolve(publicMediaRoot);
  const contains = (parent: string, child: string) =>
    child === parent || child.startsWith(`${parent}${path.sep}`);
  return contains(privateRoot, mediaRoot) || contains(mediaRoot, privateRoot);
}

function normalizePrefix(value: string) {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (normalized && !normalized.split('/').every(segment => /^[a-zA-Z0-9_-]+$/.test(segment))) {
    throw new DistributionReferralEvidenceStorageError('Invalid private evidence storage prefix.');
  }
  return normalized;
}

function validateStorageKey(key: string) {
  if (!PRIVATE_EVIDENCE_KEY_PATTERN.test(key)) {
    throw new DistributionReferralEvidenceStorageError('Invalid private referral evidence key.');
  }
  return key;
}

function localPath(root: string, key: string) {
  const validatedKey = validateStorageKey(key);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, validatedKey);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new DistributionReferralEvidenceStorageError(
      'Private evidence path is outside its storage root.',
    );
  }
  return resolvedPath;
}

function privateS3Status(): DistributionReferralEvidenceStorageStatus {
  const production = isHostedRuntime();
  const bucket = String(process.env.DISTRIBUTION_EVIDENCE_S3_BUCKET || '').trim();
  const region = String(
    process.env.DISTRIBUTION_EVIDENCE_S3_REGION || (production ? '' : process.env.AWS_REGION) || '',
  ).trim();
  const dedicatedAccessKeyId = String(
    process.env.DISTRIBUTION_EVIDENCE_AWS_ACCESS_KEY_ID || '',
  ).trim();
  const dedicatedSecretAccessKey = String(
    process.env.DISTRIBUTION_EVIDENCE_AWS_SECRET_ACCESS_KEY || '',
  ).trim();
  const accessKeyId = production
    ? dedicatedAccessKeyId
    : dedicatedAccessKeyId || String(process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = production
    ? dedicatedSecretAccessKey
    : dedicatedSecretAccessKey || String(process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const billingAccessKeyId = String(process.env.BILLING_PROOF_AWS_ACCESS_KEY_ID || '').trim();
  const billingSecretAccessKey = String(process.env.BILLING_PROOF_AWS_SECRET_ACCESS_KEY || '').trim();
  const publicSecretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  let invalidPrefix = false;
  try {
    normalizePrefix(process.env.DISTRIBUTION_EVIDENCE_S3_PREFIX || 'distribution-referral-evidence');
  } catch {
    invalidPrefix = true;
  }
  const missing = [
    invalidPrefix
      ? 'DISTRIBUTION_EVIDENCE_S3_PREFIX (use non-empty path segments with letters, digits, underscores, or hyphens)'
      : null,
    !bucket ? 'DISTRIBUTION_EVIDENCE_S3_BUCKET' : null,
    bucket && bucket === process.env.S3_BUCKET_NAME
      ? 'DISTRIBUTION_EVIDENCE_S3_BUCKET (must differ from public media)'
      : null,
    bucket && bucket === process.env.BILLING_PROOF_S3_BUCKET
      ? 'DISTRIBUTION_EVIDENCE_S3_BUCKET (must differ from billing proof storage)'
      : null,
    !region ? 'DISTRIBUTION_EVIDENCE_S3_REGION or AWS_REGION' : null,
    production && region && region !== 'af-south-1'
      ? 'DISTRIBUTION_EVIDENCE_S3_REGION=af-south-1 (South Africa)'
      : null,
    !accessKeyId
      ? production
        ? 'DISTRIBUTION_EVIDENCE_AWS_ACCESS_KEY_ID'
        : 'DISTRIBUTION_EVIDENCE_AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID'
      : null,
    !secretAccessKey
      ? production
        ? 'DISTRIBUTION_EVIDENCE_AWS_SECRET_ACCESS_KEY'
        : 'DISTRIBUTION_EVIDENCE_AWS_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY'
      : null,
    production && dedicatedAccessKeyId && dedicatedAccessKeyId === process.env.AWS_ACCESS_KEY_ID
      ? 'DISTRIBUTION_EVIDENCE_AWS_ACCESS_KEY_ID (must differ from public media)'
      : null,
    production && dedicatedSecretAccessKey && dedicatedSecretAccessKey === publicSecretAccessKey
      ? 'DISTRIBUTION_EVIDENCE_AWS_SECRET_ACCESS_KEY (must differ from public media)'
      : null,
    production &&
    dedicatedAccessKeyId &&
    billingAccessKeyId &&
    dedicatedAccessKeyId === billingAccessKeyId
      ? 'DISTRIBUTION_EVIDENCE_AWS_ACCESS_KEY_ID (must differ from billing proof storage)'
      : null,
    production &&
    dedicatedSecretAccessKey &&
    billingSecretAccessKey &&
    dedicatedSecretAccessKey === billingSecretAccessKey
      ? 'DISTRIBUTION_EVIDENCE_AWS_SECRET_ACCESS_KEY (must differ from billing proof storage)'
      : null,
  ].filter(Boolean) as string[];

  return {
    adapter: 's3',
    configured: missing.length === 0,
    productionSafe: missing.length === 0,
    missing,
    message: missing.length
      ? `Private Distribution referral evidence storage is not configured: ${missing.join(', ')}.`
      : null,
  };
}

export function getDistributionReferralEvidenceStorageStatus(): DistributionReferralEvidenceStorageStatus {
  const selection = selectedAdapter();
  const adapter = selection.adapter;
  if (selection.invalidConfiguration) {
    return {
      adapter,
      configured: false,
      productionSafe: false,
      missing: ['DISTRIBUTION_EVIDENCE_STORAGE_ADAPTER (must be local or s3)'],
      message: 'Choose local development storage or the dedicated private S3 storage adapter.',
    };
  }
  if (adapter === 'local') {
    const productionSafe = !isHostedRuntime() && !localRootOverlapsPublicMedia();
    const overlappingPublicRoot = !isHostedRuntime() && localRootOverlapsPublicMedia();
    return {
      adapter,
      configured: productionSafe,
      productionSafe,
      missing: productionSafe
        ? []
        : overlappingPublicRoot
          ? ['DISTRIBUTION_EVIDENCE_PRIVATE_STORAGE_DIR (must be separate from public media storage)']
          : ['DISTRIBUTION_EVIDENCE_STORAGE_ADAPTER=s3'],
      message: productionSafe
        ? null
        : overlappingPublicRoot
          ? 'Private Distribution referral evidence cannot share a directory with public media.'
          : 'Hosted Distribution referral evidence must use the dedicated private S3 bucket.',
    };
  }
  return privateS3Status();
}

function resolveConfig(): StorageConfig {
  const status = getDistributionReferralEvidenceStorageStatus();
  if (!status.configured) {
    throw new DistributionReferralEvidenceStorageError(
      status.message || 'Private Distribution referral evidence storage is not configured.',
    );
  }
  if (status.adapter === 'local') return { adapter: 'local', root: localRoot() };

  const production = isHostedRuntime();
  return {
    adapter: 's3',
    bucket: String(process.env.DISTRIBUTION_EVIDENCE_S3_BUCKET || '').trim(),
    region: String(
      process.env.DISTRIBUTION_EVIDENCE_S3_REGION ||
        (production ? '' : process.env.AWS_REGION) ||
        '',
    ).trim(),
    prefix: normalizePrefix(
      process.env.DISTRIBUTION_EVIDENCE_S3_PREFIX || 'distribution-referral-evidence',
    ),
    accessKeyId:
      String(process.env.DISTRIBUTION_EVIDENCE_AWS_ACCESS_KEY_ID || '').trim() ||
      (production ? undefined : process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey:
      String(process.env.DISTRIBUTION_EVIDENCE_AWS_SECRET_ACCESS_KEY || '').trim() ||
      (production ? undefined : process.env.AWS_SECRET_ACCESS_KEY),
  };
}

function createS3Client(config: Extract<StorageConfig, { adapter: 's3' }>) {
  return new S3Client({
    region: config.region,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
        : undefined,
  });
}

function objectKey(config: Extract<StorageConfig, { adapter: 's3' }>, key: string) {
  const validatedKey = validateStorageKey(key);
  return [config.prefix, validatedKey].filter(Boolean).join('/');
}

function assertDocumentSize(buffer: Buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1 || buffer.length > MAX_EVIDENCE_BYTES) {
    throw new DistributionReferralEvidenceStorageError(
      `Private referral evidence must be between 1 byte and ${MAX_EVIDENCE_BYTES} bytes.`,
    );
  }
}

function normalizedMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();
  if (!(DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES as readonly string[]).includes(normalized)) {
    throw new DistributionReferralEvidenceStorageError(
      'Private referral evidence must be a PDF, JPEG, PNG, or WebP document.',
    );
  }
  return normalized;
}

function assertFileSignature(buffer: Buffer, mimeType: string) {
  const valid =
    (mimeType === 'application/pdf' && buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) ||
    (mimeType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === 'image/png' &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === 'image/webp' &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) {
    throw new DistributionReferralEvidenceStorageError(
      'The private evidence file contents do not match its selected file type.',
    );
  }
}

export function createDistributionReferralEvidenceStorageKey(
  sessionId: string,
  evidenceId: string,
) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(sessionId) || !uuidPattern.test(evidenceId)) {
    throw new DistributionReferralEvidenceStorageError(
      'Invalid private referral evidence identifier.',
    );
  }
  return `private/distribution-referrals/${sessionId}/${evidenceId}`;
}

export async function storeDistributionReferralEvidence(input: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
}) {
  assertDocumentSize(input.buffer);
  const mimeType = normalizedMimeType(input.mimeType);
  assertFileSignature(input.buffer, mimeType);
  const config = resolveConfig();
  const storageKey = validateStorageKey(input.storageKey);

  if (config.adapter === 'local') {
    const absolutePath = localPath(config.root, storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
    const file = await open(absolutePath, 'wx', 0o600);
    let complete = false;
    try {
      await file.writeFile(input.buffer);
      complete = true;
    } finally {
      await file.close();
      if (!complete) await rm(absolutePath, { force: true });
    }
    return { adapter: 'local' as const, storageKey, byteSize: input.buffer.length };
  }

  await createS3Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey(config, storageKey),
      Body: input.buffer,
      ContentLength: input.buffer.length,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
      Metadata: { purpose: 'distribution-referral-evidence' },
    }),
  );
  return { adapter: 's3' as const, storageKey, byteSize: input.buffer.length };
}

export async function readDistributionReferralEvidence(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  const storageKey = validateStorageKey(input.storageKey);
  if (input.storageAdapter === 'local') {
    if (isHostedRuntime()) {
      throw new DistributionReferralEvidenceStorageError(
        'Hosted Distribution referral evidence retrieval cannot use local storage.',
      );
    }
    const absolutePath = localPath(localRoot(), storageKey);
    const file = await stat(absolutePath);
    if (!file.isFile() || file.size < 1 || file.size > MAX_EVIDENCE_BYTES) {
      throw new DistributionReferralEvidenceStorageError(
        'Private evidence file is missing or exceeds the storage limit.',
      );
    }
    return readFile(absolutePath);
  }

  const config = resolveConfig();
  if (config.adapter !== 's3') {
    throw new DistributionReferralEvidenceStorageError(
      'Distribution referral evidence is stored in S3 but S3 storage is not selected.',
    );
  }
  const response = await createS3Client(config).send(
    new GetObjectCommand({ Bucket: config.bucket, Key: objectKey(config, storageKey) }),
  );
  if (!response.Body)
    throw new DistributionReferralEvidenceStorageError('Private evidence file is empty.');
  const contentLength = Number(response.ContentLength);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > MAX_EVIDENCE_BYTES
  ) {
    throw new DistributionReferralEvidenceStorageError(
      'Private evidence file exceeds the storage limit.',
    );
  }
  if (typeof response.Body.transformToByteArray === 'function') {
    const buffer = Buffer.from(await response.Body.transformToByteArray());
    assertDocumentSize(buffer);
    return buffer;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  assertDocumentSize(buffer);
  return buffer;
}

/** Delete is idempotent so retention retries cannot restore or duplicate evidence. */
export async function deleteDistributionReferralEvidence(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  const storageKey = validateStorageKey(input.storageKey);
  if (input.storageAdapter === 'local') {
    if (isHostedRuntime()) {
      throw new DistributionReferralEvidenceStorageError(
        'Hosted Distribution referral evidence deletion cannot use local storage.',
      );
    }
    await rm(localPath(localRoot(), storageKey), { force: true });
    return { deleted: true as const, adapter: 'local' as const };
  }

  const config = resolveConfig();
  if (config.adapter !== 's3') {
    throw new DistributionReferralEvidenceStorageError(
      'Distribution referral evidence is stored in S3 but S3 storage is not selected.',
    );
  }
  await createS3Client(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey(config, storageKey) }),
  );
  return { deleted: true as const, adapter: 's3' as const };
}
