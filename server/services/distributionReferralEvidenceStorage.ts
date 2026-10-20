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
const REFERRAL_EVIDENCE_KEY_PATTERN =
  /^private\/distribution-referrals\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i;
const DEAL_DOCUMENT_KEY_PATTERN =
  /^private\/distribution-deal-documents\/[1-9][0-9]*\/[0-9a-f-]{36}$/i;
const DEAL_DOCUMENT_REFERENCE_PREFIX = 'private-deal-document:v1:';

type PrivateStorageScope = {
  keyPattern: RegExp;
  invalidKeyMessage: string;
  outsideRootMessage: string;
  sizeMessage: string;
  mimeMessage: string;
  signatureMessage: string;
  purpose: string;
  hostedReadMessage: string;
  hostedDeleteMessage: string;
  missingMessage: string;
  emptyMessage: string;
  exceedsMessage: string;
  adapterMismatchMessage: string;
};

const REFERRAL_EVIDENCE_SCOPE: PrivateStorageScope = {
  keyPattern: REFERRAL_EVIDENCE_KEY_PATTERN,
  invalidKeyMessage: 'Invalid private referral evidence key.',
  outsideRootMessage: 'Private evidence path is outside its storage root.',
  sizeMessage: `Private referral evidence must be between 1 byte and ${MAX_EVIDENCE_BYTES} bytes.`,
  mimeMessage: 'Private referral evidence must be a PDF, JPEG, PNG, or WebP document.',
  signatureMessage: 'The private evidence file contents do not match its selected file type.',
  purpose: 'distribution-referral-evidence',
  hostedReadMessage: 'Hosted Distribution referral evidence retrieval cannot use local storage.',
  hostedDeleteMessage: 'Hosted Distribution referral evidence deletion cannot use local storage.',
  missingMessage: 'Private evidence file is missing or exceeds the storage limit.',
  emptyMessage: 'Private evidence file is empty.',
  exceedsMessage: 'Private evidence file exceeds the storage limit.',
  adapterMismatchMessage:
    'Distribution referral evidence is stored in S3 but S3 storage is not selected.',
};

const DEAL_DOCUMENT_SCOPE: PrivateStorageScope = {
  keyPattern: DEAL_DOCUMENT_KEY_PATTERN,
  invalidKeyMessage: 'Invalid private deal-document key.',
  outsideRootMessage: 'Private deal-document path is outside its storage root.',
  sizeMessage: `Private deal document must be between 1 byte and ${MAX_EVIDENCE_BYTES} bytes.`,
  mimeMessage: 'Private deal document must be a PDF, JPEG, PNG, or WebP document.',
  signatureMessage: 'The private deal-document contents do not match its selected file type.',
  purpose: 'distribution-deal-document',
  hostedReadMessage: 'Hosted Distribution deal-document retrieval cannot use local storage.',
  hostedDeleteMessage: 'Hosted Distribution deal-document deletion cannot use local storage.',
  missingMessage: 'Private deal document is missing or exceeds the storage limit.',
  emptyMessage: 'Private deal document is empty.',
  exceedsMessage: 'Private deal document exceeds the storage limit.',
  adapterMismatchMessage:
    'Distribution deal document is stored in S3 but S3 storage is not selected.',
};

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

function validateStorageKey(key: string, scope: PrivateStorageScope) {
  if (!scope.keyPattern.test(key)) {
    throw new DistributionReferralEvidenceStorageError(scope.invalidKeyMessage);
  }
  return key;
}

function localPath(root: string, key: string, scope: PrivateStorageScope) {
  const validatedKey = validateStorageKey(key, scope);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, validatedKey);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new DistributionReferralEvidenceStorageError(scope.outsideRootMessage);
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

function objectKey(
  config: Extract<StorageConfig, { adapter: 's3' }>,
  key: string,
  scope: PrivateStorageScope,
) {
  const validatedKey = validateStorageKey(key, scope);
  return [config.prefix, validatedKey].filter(Boolean).join('/');
}

function assertDocumentSize(buffer: Buffer, scope: PrivateStorageScope) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1 || buffer.length > MAX_EVIDENCE_BYTES) {
    throw new DistributionReferralEvidenceStorageError(scope.sizeMessage);
  }
}

function normalizedMimeType(mimeType: string, scope: PrivateStorageScope) {
  const normalized = mimeType.trim().toLowerCase();
  if (!(DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES as readonly string[]).includes(normalized)) {
    throw new DistributionReferralEvidenceStorageError(scope.mimeMessage);
  }
  return normalized;
}

function assertFileSignature(buffer: Buffer, mimeType: string, scope: PrivateStorageScope) {
  const valid =
    (mimeType === 'application/pdf' && buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) ||
    (mimeType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === 'image/png' &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === 'image/webp' &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) {
    throw new DistributionReferralEvidenceStorageError(scope.signatureMessage);
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

async function storePrivateDocument(
  input: {
    storageKey: string;
    buffer: Buffer;
    mimeType: string;
  },
  scope: PrivateStorageScope,
) {
  assertDocumentSize(input.buffer, scope);
  const mimeType = normalizedMimeType(input.mimeType, scope);
  assertFileSignature(input.buffer, mimeType, scope);
  const config = resolveConfig();
  const storageKey = validateStorageKey(input.storageKey, scope);

  if (config.adapter === 'local') {
    const absolutePath = localPath(config.root, storageKey, scope);
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
      Key: objectKey(config, storageKey, scope),
      Body: input.buffer,
      ContentLength: input.buffer.length,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
      Metadata: { purpose: scope.purpose },
    }),
  );
  return { adapter: 's3' as const, storageKey, byteSize: input.buffer.length };
}

async function readPrivateDocument(
  input: {
    storageAdapter: DistributionReferralEvidenceStorageAdapter;
    storageKey: string;
  },
  scope: PrivateStorageScope,
) {
  const storageKey = validateStorageKey(input.storageKey, scope);
  if (input.storageAdapter === 'local') {
    if (isHostedRuntime()) {
      throw new DistributionReferralEvidenceStorageError(scope.hostedReadMessage);
    }
    const absolutePath = localPath(localRoot(), storageKey, scope);
    const file = await stat(absolutePath);
    if (!file.isFile() || file.size < 1 || file.size > MAX_EVIDENCE_BYTES) {
      throw new DistributionReferralEvidenceStorageError(scope.missingMessage);
    }
    return readFile(absolutePath);
  }

  const config = resolveConfig();
  if (config.adapter !== 's3') {
    throw new DistributionReferralEvidenceStorageError(scope.adapterMismatchMessage);
  }
  const response = await createS3Client(config).send(
    new GetObjectCommand({ Bucket: config.bucket, Key: objectKey(config, storageKey, scope) }),
  );
  if (!response.Body) {
    throw new DistributionReferralEvidenceStorageError(scope.emptyMessage);
  }
  const contentLength = Number(response.ContentLength);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > MAX_EVIDENCE_BYTES
  ) {
    throw new DistributionReferralEvidenceStorageError(scope.exceedsMessage);
  }
  if (typeof response.Body.transformToByteArray === 'function') {
    const buffer = Buffer.from(await response.Body.transformToByteArray());
    assertDocumentSize(buffer, scope);
    return buffer;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  assertDocumentSize(buffer, scope);
  return buffer;
}

async function deletePrivateDocument(
  input: {
    storageAdapter: DistributionReferralEvidenceStorageAdapter;
    storageKey: string;
  },
  scope: PrivateStorageScope,
) {
  const storageKey = validateStorageKey(input.storageKey, scope);
  if (input.storageAdapter === 'local') {
    if (isHostedRuntime()) {
      throw new DistributionReferralEvidenceStorageError(scope.hostedDeleteMessage);
    }
    await rm(localPath(localRoot(), storageKey, scope), { force: true });
    return { deleted: true as const, adapter: 'local' as const };
  }

  const config = resolveConfig();
  if (config.adapter !== 's3') {
    throw new DistributionReferralEvidenceStorageError(scope.adapterMismatchMessage);
  }
  await createS3Client(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey(config, storageKey, scope) }),
  );
  return { deleted: true as const, adapter: 's3' as const };
}

export async function storeDistributionReferralEvidence(input: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
}) {
  return storePrivateDocument(input, REFERRAL_EVIDENCE_SCOPE);
}

export async function readDistributionReferralEvidence(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  return readPrivateDocument(input, REFERRAL_EVIDENCE_SCOPE);
}

/** Delete is idempotent so retention retries cannot restore or duplicate evidence. */
export async function deleteDistributionReferralEvidence(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  return deletePrivateDocument(input, REFERRAL_EVIDENCE_SCOPE);
}

export function createDistributionDealDocumentStorageKey(dealId: number, documentUuid: string) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!Number.isSafeInteger(dealId) || dealId < 1 || !uuidPattern.test(documentUuid)) {
    throw new DistributionReferralEvidenceStorageError(
      'Invalid private deal-document identifier.',
    );
  }
  return `private/distribution-deal-documents/${dealId}/${documentUuid}`;
}

export function createDistributionDealDocumentReference(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  const storageKey = validateStorageKey(input.storageKey, DEAL_DOCUMENT_SCOPE);
  return `${DEAL_DOCUMENT_REFERENCE_PREFIX}${input.storageAdapter}:${storageKey}`;
}

export function parseDistributionDealDocumentReference(reference: string | null | undefined): {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
} | null {
  const value = String(reference || '').trim();
  if (!value.startsWith(DEAL_DOCUMENT_REFERENCE_PREFIX)) return null;
  const remainder = value.slice(DEAL_DOCUMENT_REFERENCE_PREFIX.length);
  const separator = remainder.indexOf(':');
  if (separator < 1) return null;
  const storageAdapter = remainder.slice(0, separator);
  const storageKey = remainder.slice(separator + 1);
  if (storageAdapter !== 'local' && storageAdapter !== 's3') return null;
  if (!DEAL_DOCUMENT_KEY_PATTERN.test(storageKey)) return null;
  return { storageAdapter, storageKey };
}

export async function storeDistributionDealDocument(input: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
}) {
  return storePrivateDocument(input, DEAL_DOCUMENT_SCOPE);
}

export async function readDistributionDealDocument(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  return readPrivateDocument(input, DEAL_DOCUMENT_SCOPE);
}

export async function deleteDistributionDealDocument(input: {
  storageAdapter: DistributionReferralEvidenceStorageAdapter;
  storageKey: string;
}) {
  return deletePrivateDocument(input, DEAL_DOCUMENT_SCOPE);
}
