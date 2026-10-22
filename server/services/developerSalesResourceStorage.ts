import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetPublicAccessBlockCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, rm, type FileHandle } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export type DeveloperSalesResourceStorageAdapter = 'local' | 's3';

export type DeveloperSalesResourceStorageStatus = {
  adapter: DeveloperSalesResourceStorageAdapter;
  configured: boolean;
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

export const MAX_DEVELOPER_SALES_RESOURCE_BYTES = 9 * 1024 * 1024;
export const DEVELOPER_SALES_RESOURCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const KEY_PATTERN =
  /^private\/developer-sales-resources\/[1-9]\d*\/[0-9a-f-]{36}--[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/i;

export class DeveloperSalesResourceStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeveloperSalesResourceStorageError';
  }
}

function isHostedRuntime() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.APP_ENV === 'staging'
  );
}

function selectedAdapter(): { adapter: DeveloperSalesResourceStorageAdapter; invalid: boolean } {
  const configured = String(process.env.DEVELOPER_RESOURCE_STORAGE_ADAPTER || '')
    .trim()
    .toLowerCase();
  if (configured === 'local') return { adapter: 'local', invalid: false };
  if (configured === 's3') return { adapter: 's3', invalid: false };
  if (!configured) return { adapter: isHostedRuntime() ? 's3' : 'local', invalid: false };
  return { adapter: isHostedRuntime() ? 's3' : 'local', invalid: true };
}

function localRoot() {
  const configured = String(process.env.DEVELOPER_RESOURCE_PRIVATE_STORAGE_DIR || '').trim();
  if (configured && !path.isAbsolute(configured)) {
    throw new DeveloperSalesResourceStorageError(
      'DEVELOPER_RESOURCE_PRIVATE_STORAGE_DIR must be an absolute path.',
    );
  }
  return path.resolve(
    configured || path.join(homedir(), '.local', 'share', 'property-listify', 'private-developer-resources'),
  );
}

function rootsOverlap(left: string, right: string) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return a === b || a.startsWith(`${b}${path.sep}`) || b.startsWith(`${a}${path.sep}`);
}

function localStorageStatus(): DeveloperSalesResourceStorageStatus {
  if (isHostedRuntime()) {
    return {
      adapter: 'local',
      configured: false,
      missing: ['DEVELOPER_RESOURCE_STORAGE_ADAPTER=s3'],
      message: 'Hosted Developer sales resources require the dedicated private S3 adapter.',
    };
  }

  const configuredMediaRoot = String(process.env.MEDIA_LOCAL_STORAGE_DIR || '').trim();
  const publicMediaRoot = configuredMediaRoot || path.join(homedir(), '.local', 'share', 'property-listify', 'media');
  try {
    if (rootsOverlap(localRoot(), publicMediaRoot)) {
      return {
        adapter: 'local',
        configured: false,
        missing: ['DEVELOPER_RESOURCE_PRIVATE_STORAGE_DIR (must be separate from public media)'],
        message: 'Private Developer resources cannot share a directory with public media.',
      };
    }
  } catch (error) {
    return {
      adapter: 'local',
      configured: false,
      missing: ['DEVELOPER_RESOURCE_PRIVATE_STORAGE_DIR'],
      message: error instanceof Error ? error.message : 'Private local storage path is invalid.',
    };
  }

  return { adapter: 'local', configured: true, missing: [], message: null };
}

function privateS3Status(): DeveloperSalesResourceStorageStatus {
  const production = isHostedRuntime();
  const bucket = String(process.env.DEVELOPER_RESOURCE_S3_BUCKET || '').trim();
  const region = String(
    process.env.DEVELOPER_RESOURCE_S3_REGION || (production ? '' : process.env.AWS_REGION) || '',
  ).trim();
  const dedicatedAccessKeyId = String(process.env.DEVELOPER_RESOURCE_AWS_ACCESS_KEY_ID || '').trim();
  const dedicatedSecretAccessKey = String(
    process.env.DEVELOPER_RESOURCE_AWS_SECRET_ACCESS_KEY || '',
  ).trim();
  const accessKeyId = production
    ? dedicatedAccessKeyId
    : dedicatedAccessKeyId || String(process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = production
    ? dedicatedSecretAccessKey
    : dedicatedSecretAccessKey || String(process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const prefix = String(process.env.DEVELOPER_RESOURCE_S3_PREFIX || 'developer-resources').trim();
  const prefixValid = prefix
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .every(segment => /^[A-Za-z0-9_-]+$/.test(segment));
  const publicAccessKeyId = String(process.env.AWS_ACCESS_KEY_ID || '').trim();
  const publicSecretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const missing = [
    !bucket ? 'DEVELOPER_RESOURCE_S3_BUCKET' : null,
    bucket &&
    [process.env.S3_BUCKET_NAME, process.env.AWS_S3_BUCKET]
      .some(publicBucket => Boolean(publicBucket && bucket === publicBucket.trim()))
      ? 'DEVELOPER_RESOURCE_S3_BUCKET (must differ from public media)'
      : null,
    bucket && bucket === process.env.BILLING_PROOF_S3_BUCKET
      ? 'DEVELOPER_RESOURCE_S3_BUCKET (must differ from billing proof storage)'
      : null,
    bucket && bucket === process.env.DISTRIBUTION_EVIDENCE_S3_BUCKET
      ? 'DEVELOPER_RESOURCE_S3_BUCKET (must differ from Distribution evidence storage)'
      : null,
    !region ? 'DEVELOPER_RESOURCE_S3_REGION' : null,
    production && region && region !== 'af-south-1'
      ? 'DEVELOPER_RESOURCE_S3_REGION=af-south-1 (South Africa)'
      : null,
    !prefixValid ? 'DEVELOPER_RESOURCE_S3_PREFIX (use letters, digits, underscores, or hyphens)' : null,
    !accessKeyId
      ? production
        ? 'DEVELOPER_RESOURCE_AWS_ACCESS_KEY_ID'
        : 'DEVELOPER_RESOURCE_AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID'
      : null,
    !secretAccessKey
      ? production
        ? 'DEVELOPER_RESOURCE_AWS_SECRET_ACCESS_KEY'
        : 'DEVELOPER_RESOURCE_AWS_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY'
      : null,
    production && dedicatedAccessKeyId && dedicatedAccessKeyId === publicAccessKeyId
      ? 'DEVELOPER_RESOURCE_AWS_ACCESS_KEY_ID (must differ from public media)'
      : null,
    production && dedicatedSecretAccessKey && dedicatedSecretAccessKey === publicSecretAccessKey
      ? 'DEVELOPER_RESOURCE_AWS_SECRET_ACCESS_KEY (must differ from public media)'
      : null,
  ].filter(Boolean) as string[];

  return {
    adapter: 's3',
    configured: missing.length === 0,
    missing,
    message: missing.length
      ? `Private Developer sales resource storage is not configured: ${missing.join(', ')}.`
      : null,
  };
}

export function getDeveloperSalesResourceStorageStatus(): DeveloperSalesResourceStorageStatus {
  const selection = selectedAdapter();
  if (selection.invalid) {
    return {
      adapter: selection.adapter,
      configured: false,
      missing: ['DEVELOPER_RESOURCE_STORAGE_ADAPTER (must be local or s3)'],
      message: 'Choose local development storage or the dedicated private S3 storage adapter.',
    };
  }
  return selection.adapter === 'local' ? localStorageStatus() : privateS3Status();
}

function resolveConfig(): StorageConfig {
  const status = getDeveloperSalesResourceStorageStatus();
  if (!status.configured) {
    throw new DeveloperSalesResourceStorageError(
      status.message || 'Private Developer sales resource storage is not configured.',
    );
  }
  if (status.adapter === 'local') return { adapter: 'local', root: localRoot() };

  const production = isHostedRuntime();
  const prefix = String(process.env.DEVELOPER_RESOURCE_S3_PREFIX || 'developer-resources')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  return {
    adapter: 's3',
    bucket: String(process.env.DEVELOPER_RESOURCE_S3_BUCKET || '').trim(),
    region: String(process.env.DEVELOPER_RESOURCE_S3_REGION || (production ? '' : process.env.AWS_REGION) || '').trim(),
    prefix,
    accessKeyId:
      String(process.env.DEVELOPER_RESOURCE_AWS_ACCESS_KEY_ID || '').trim() ||
      (production ? undefined : process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey:
      String(process.env.DEVELOPER_RESOURCE_AWS_SECRET_ACCESS_KEY || '').trim() ||
      (production ? undefined : process.env.AWS_SECRET_ACCESS_KEY),
  };
}

function validateKey(storageKey: string) {
  if (!KEY_PATTERN.test(storageKey)) {
    throw new DeveloperSalesResourceStorageError('Invalid private Developer resource key.');
  }
  return storageKey;
}

export function isPrivateDeveloperSalesResourceKey(storageKey: unknown): storageKey is string {
  return typeof storageKey === 'string' && KEY_PATTERN.test(storageKey);
}

function safeFilename(filename: string) {
  const normalized = path.basename(filename.trim()).replace(/[^A-Za-z0-9._-]/g, '-');
  const bounded = normalized.replace(/\.{2,}/g, '.').slice(0, 120);
  if (!bounded || !/^[A-Za-z0-9]/.test(bounded)) {
    throw new DeveloperSalesResourceStorageError('Invalid Developer resource filename.');
  }
  return bounded;
}

export function createDeveloperSalesResourceStorageKey(developmentId: number, filename: string) {
  if (!Number.isSafeInteger(developmentId) || developmentId <= 0) {
    throw new DeveloperSalesResourceStorageError('Invalid development scope for private resource.');
  }
  return `private/developer-sales-resources/${developmentId}/${randomUUID()}--${safeFilename(filename)}`;
}

function assertResourceFile(buffer: Buffer, mimeType: string) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1 || buffer.length > MAX_DEVELOPER_SALES_RESOURCE_BYTES) {
    throw new DeveloperSalesResourceStorageError(
      `Developer resources must be between 1 byte and ${MAX_DEVELOPER_SALES_RESOURCE_BYTES} bytes.`,
    );
  }
  if (!(DEVELOPER_SALES_RESOURCE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new DeveloperSalesResourceStorageError('Upload a PDF, JPEG, PNG, or WebP file.');
  }
  const valid =
    (mimeType === 'application/pdf' && buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) ||
    (mimeType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) {
    throw new DeveloperSalesResourceStorageError('File contents do not match the selected file type.');
  }
}

function localPath(root: string, storageKey: string) {
  const key = validateKey(storageKey);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, key);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new DeveloperSalesResourceStorageError('Private resource path escaped its storage root.');
  }
  return resolvedPath;
}

async function ensurePrivateLocalDirectoryTree(root: string, directory: string) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  const rootStats = await lstat(root);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new DeveloperSalesResourceStorageError('Private Developer resource storage root is unsafe.');
  }
  await chmod(root, 0o700);

  const relativeDirectory = path.relative(root, directory);
  const parts = relativeDirectory.split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      await mkdir(current, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    const stats = await lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new DeveloperSalesResourceStorageError('Private Developer resource directory is unsafe.');
    }
    await chmod(current, 0o700);
  }
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

function s3ObjectKey(config: Extract<StorageConfig, { adapter: 's3' }>, storageKey: string) {
  return `${config.prefix}/${validateKey(storageKey)}`;
}

async function assertS3BucketBlocksPublicAccess(
  client: S3Client,
  config: Extract<StorageConfig, { adapter: 's3' }>,
) {
  const response = await client.send(new GetPublicAccessBlockCommand({ Bucket: config.bucket }));
  const settings = response.PublicAccessBlockConfiguration;
  if (
    settings?.BlockPublicAcls !== true ||
    settings?.IgnorePublicAcls !== true ||
    settings?.BlockPublicPolicy !== true ||
    settings?.RestrictPublicBuckets !== true
  ) {
    throw new DeveloperSalesResourceStorageError(
      'The private Developer resource bucket must enable all four S3 Block Public Access settings.',
    );
  }
}

export async function storeDeveloperSalesResource(input: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const storageKey = validateKey(input.storageKey);
  const mimeType = input.mimeType.trim().toLowerCase();
  assertResourceFile(input.buffer, mimeType);
  const config = resolveConfig();

  if (config.adapter === 'local') {
    const absolutePath = localPath(config.root, storageKey);
    await ensurePrivateLocalDirectoryTree(config.root, path.dirname(absolutePath));
    const file = await open(absolutePath, 'wx', 0o600);
    let complete = false;
    try {
      await file.writeFile(input.buffer);
      await file.sync();
      complete = true;
    } finally {
      await file.close();
      if (!complete) await rm(absolutePath, { force: true });
    }
  } else {
    const client = createS3Client(config);
    await assertS3BucketBlocksPublicAccess(client, config);
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: s3ObjectKey(config, storageKey),
        Body: input.buffer,
        ContentLength: input.buffer.length,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: { purpose: 'developer-sales-resource' },
      }),
    );
  }

  return { storageKey, mimeType, byteSize: input.buffer.length };
}

export async function readDeveloperSalesResource(storageKey: string, expectedMimeType: string) {
  const key = validateKey(storageKey);
  const mimeType = expectedMimeType.trim().toLowerCase();
  const config = resolveConfig();
  if (config.adapter === 'local') {
    const absolutePath = localPath(config.root, key);
    await ensurePrivateLocalDirectoryTree(config.root, path.dirname(absolutePath));
    let file: FileHandle | undefined;
    try {
      file = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      const fileStats = await file.stat();
      if (
        !fileStats.isFile() ||
        fileStats.size < 1 ||
        fileStats.size > MAX_DEVELOPER_SALES_RESOURCE_BYTES
      ) {
        throw new DeveloperSalesResourceStorageError('Private Developer resource is missing or invalid.');
      }
      await file.chmod(0o600);
      const buffer = await file.readFile();
      assertResourceFile(buffer, mimeType);
      return buffer;
    } catch (error) {
      if (error instanceof DeveloperSalesResourceStorageError) throw error;
      throw new DeveloperSalesResourceStorageError('Private Developer resource is missing or invalid.');
    } finally {
      await file?.close();
    }
  }

  const client = createS3Client(config);
  await assertS3BucketBlocksPublicAccess(client, config);
  const response = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: s3ObjectKey(config, key) }),
  );
  const length = Number(response.ContentLength);
  if (!response.Body || !Number.isSafeInteger(length) || length < 1 || length > MAX_DEVELOPER_SALES_RESOURCE_BYTES) {
    throw new DeveloperSalesResourceStorageError('Private Developer resource is missing or invalid.');
  }
  if (typeof response.Body.transformToByteArray === 'function') {
    const bytes = Buffer.from(await response.Body.transformToByteArray());
    if (String(response.ContentType || '').trim().toLowerCase() !== mimeType) {
      throw new DeveloperSalesResourceStorageError('Private Developer resource type is invalid.');
    }
    assertResourceFile(bytes, mimeType);
    return bytes;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  if (buffer.length !== length) {
    throw new DeveloperSalesResourceStorageError('Private Developer resource length is invalid.');
  }
  if (String(response.ContentType || '').trim().toLowerCase() !== mimeType) {
    throw new DeveloperSalesResourceStorageError('Private Developer resource type is invalid.');
  }
  assertResourceFile(buffer, mimeType);
  return buffer;
}

export async function deleteDeveloperSalesResource(storageKey: string) {
  const key = validateKey(storageKey);
  const config = resolveConfig();
  if (config.adapter === 'local') {
    const absolutePath = localPath(config.root, key);
    await ensurePrivateLocalDirectoryTree(config.root, path.dirname(absolutePath));
    await rm(absolutePath, { force: true });
    return;
  }
  const client = createS3Client(config);
  await assertS3BucketBlocksPublicAccess(client, config);
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: s3ObjectKey(config, key) }),
  );
}

export function developerSalesResourceFileName(storageKey: string) {
  const key = validateKey(storageKey);
  const name = key.split('/').pop() || 'resource';
  return name.replace(/^[0-9a-f-]{36}--/i, '');
}

export function assertDeveloperSalesResourceFile(buffer: Buffer, mimeType: string) {
  assertResourceFile(buffer, mimeType.trim().toLowerCase());
}
