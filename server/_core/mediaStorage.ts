import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  unlink,
  writeFile,
  link,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { ENV } from './env';

export type MediaStorageAdapter = 'local' | 's3';

export type LocalMediaObject = {
  path: string;
  contentType: string;
  contentLength: number;
};

const DEFAULT_LOCAL_MEDIA_ROOT = join(homedir(), '.local', 'share', 'property-listify', 'media');
const LOCAL_MEDIA_KEY_PATTERN = /^(?:properties\/(?:\d+|draft-\d+)|private\/land\/\d+)\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const LOCAL_MEDIA_MAX_BYTES = {
  image: 15 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  floorplan: 25 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
} as const;

function normalizeAdapter(value: string): MediaStorageAdapter | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'local' || normalized === 's3') return normalized;
  throw new Error('MEDIA_STORAGE_ADAPTER must be either local or s3.');
}

/**
 * Local development defaults to private disk storage. Production defaults to
 * S3 and explicitly refuses a local adapter so a missing deployment secret
 * cannot silently write application media to an ephemeral filesystem.
 */
export function getMediaStorageAdapter(): MediaStorageAdapter {
  const configured = normalizeAdapter(ENV.mediaStorageAdapter);
  const adapter = configured ?? (ENV.isProduction ? 's3' : 'local');

  if (ENV.isProduction && adapter === 'local') {
    throw new Error('Local media storage is not permitted in production. Configure S3 storage.');
  }

  return adapter;
}

export function isLocalMediaStorage(): boolean {
  return getMediaStorageAdapter() === 'local';
}

function getWorktreeNamespace(): string {
  const worktreePath = resolve(process.cwd());
  const digest = createHash('sha256').update(worktreePath).digest('hex').slice(0, 16);
  return `worktree-${digest}`;
}

export function getLocalMediaRoot(): string {
  const configuredRoot = ENV.mediaLocalStorageDir.trim();
  if (configuredRoot && !isAbsolute(configuredRoot)) {
    throw new Error('MEDIA_LOCAL_STORAGE_DIR must be an absolute path.');
  }

  const baseRoot = configuredRoot || DEFAULT_LOCAL_MEDIA_ROOT;
  return join(resolve(baseRoot), getWorktreeNamespace());
}

function assertSafeMediaScope(scope: string): string {
  const normalized = scope.trim();
  if (!/^(?:\d+|draft-\d+)$/.test(normalized)) {
    throw new Error('Invalid listing media storage scope.');
  }
  return normalized;
}

export function assertSafeLocalMediaKey(key: string): string {
  const normalized = key.trim();
  if (!LOCAL_MEDIA_KEY_PATTERN.test(normalized) || normalized.endsWith('.meta.json')) {
    throw new Error('Invalid local media storage key.');
  }
  return normalized;
}

function assertInsideRoot(root: string, candidate: string): string {
  const relativePath = relative(root, candidate);
  if (relativePath === '..' || relativePath.startsWith('../') || isAbsolute(relativePath)) {
    throw new Error('Local media path escapes the governed storage root.');
  }
  return candidate;
}

async function assertOwnedNonSymlink(pathname: string, description: string): Promise<void> {
  const stats = await lstat(pathname);
  if (stats.isSymbolicLink()) throw new Error(`${description} cannot be a symlink.`);

  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (uid !== null && stats.uid !== uid) {
    throw new Error(`${description} is not owned by the current user.`);
  }
}

async function ensureLocalMediaRoot(): Promise<string> {
  const root = getLocalMediaRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  await assertOwnedNonSymlink(root, 'Local media root');

  // Tighten an existing directory created by an older local run. This is an
  // exact, governed directory and does not touch any application data.
  await chmod(root, 0o700);
  return root;
}

async function ensureSafeDirectoryTree(
  root: string,
  directory: string,
  createMissing: boolean,
): Promise<void> {
  const relativeDirectory = relative(root, directory);
  const parts = relativeDirectory.split('/').filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    try {
      await assertOwnedNonSymlink(current, 'Local media directory');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (!createMissing) throw error;
      await mkdir(current, { mode: 0o700 });
      await assertOwnedNonSymlink(current, 'Local media directory');
    }
  }
}

async function resolveLocalMediaPath(
  key: string,
  createParents = false,
): Promise<{ root: string; path: string }> {
  const safeKey = assertSafeLocalMediaKey(key);
  const root = await ensureLocalMediaRoot();
  const pathname = assertInsideRoot(root, resolve(root, safeKey));
  const parent = dirname(pathname);
  await ensureSafeDirectoryTree(root, parent, createParents);

  const rootRealPath = await realpath(root);
  const parentRealPath = await realpath(parent);
  assertInsideRoot(rootRealPath, parentRealPath);

  const fileName = safeKey.split('/').pop();
  if (!fileName) throw new Error('Invalid local media storage key.');
  return { root: rootRealPath, path: join(parentRealPath, fileName) };
}

function safeFileExtension(filename: string): string {
  const extension = extname(filename.trim()).toLowerCase();
  return /^\.[a-z0-9]{1,12}$/.test(extension) ? extension : '.bin';
}

function assertUploadFilename(filename: string): string {
  const normalized = filename.trim();
  if (!normalized || normalized.length > 255) {
    throw new Error('Invalid listing media filename.');
  }
  return normalized;
}

/**
 * Create an object key for either supported media adapter. The scope is
 * server-authorized before this helper is reached; validating it here keeps a
 * later adapter change from turning a client-supplied path into storage
 * authority.
 */
export function createMediaStorageKey(filename: string, scope: string): string {
  const safeScope = assertSafeMediaScope(scope);
  const safeFilename = assertUploadFilename(filename);
  return `properties/${safeScope}/${Date.now()}-${randomUUID()}${safeFileExtension(safeFilename)}`;
}

/** @deprecated Use createMediaStorageKey so local and S3 keys share a boundary. */
export function createLocalMediaKey(filename: string, scope: string): string {
  return createMediaStorageKey(filename, scope);
}

export function getLocalMediaMaxBytes(mediaType: keyof typeof LOCAL_MEDIA_MAX_BYTES): number {
  return LOCAL_MEDIA_MAX_BYTES[mediaType];
}

export function buildLocalMediaUploadUrl(uploadToken: string): string {
  return `/api/local-media/upload?uploadToken=${encodeURIComponent(uploadToken)}`;
}

export function buildLocalMediaPublicUrl(key: string): string {
  if (key.startsWith('private/')) throw new Error('Private evidence cannot be assigned a public media URL.');
  return `/api/local-media/object?key=${encodeURIComponent(assertSafeLocalMediaKey(key))}`;
}

export function resolveMediaDeliveryUrl(rawUrl: string | null | undefined): string | null {
  const value = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  if (isLocalMediaStorage()) {
    if (value.startsWith('/api/local-media/object?')) return value;
    return buildLocalMediaPublicUrl(value);
  }

  if (!ENV.cloudFrontUrl && !ENV.s3BucketName) return null;

  const baseUrl = (
    ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`
  ).replace(/\/$/, '');
  return `${baseUrl}/${value.replace(/^\/+/, '')}`;
}

export async function writeLocalMediaObject(
  key: string,
  contentType: string,
  body: AsyncIterable<Buffer | Uint8Array | string>,
  maxBytes: number,
): Promise<{ contentLength: number }> {
  const { path: finalPath } = await resolveLocalMediaPath(key, true);
  const tempPath = `${finalPath}.upload-${randomUUID()}`;
  const metadataPath = `${finalPath}.meta.json`;
  const metadataTempPath = `${metadataPath}.upload-${randomUUID()}`;
  let objectCreated = false;

  const file = await open(tempPath, 'wx', 0o600);
  let contentLength = 0;
  try {
    for await (const chunk of body) {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk);
      contentLength += buffer.length;
      if (contentLength > maxBytes) {
        throw new Error('Uploaded media exceeds the permitted size.');
      }
      await file.write(buffer);
    }

    if (contentLength <= 0) throw new Error('Uploaded media is empty.');
    await file.sync();
    await file.close();

    await link(tempPath, finalPath);
    objectCreated = true;
    await unlink(tempPath);

    await writeFile(
      metadataTempPath,
      JSON.stringify({ contentType: contentType.trim().toLowerCase(), contentLength }),
      { encoding: 'utf8', mode: 0o600, flag: 'wx' },
    );
    await link(metadataTempPath, metadataPath);
    await unlink(metadataTempPath);

    return { contentLength };
  } catch (error) {
    await file.close().catch(() => undefined);
    await unlink(tempPath).catch(() => undefined);
    await unlink(metadataTempPath).catch(() => undefined);
    if (objectCreated) await unlink(finalPath).catch(() => undefined);
    await unlink(metadataPath).catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('Local media object already exists.');
    }
    throw error;
  }
}

async function inspectLocalMediaObjectInternal(
  key: string,
  expectedContentType?: string,
): Promise<LocalMediaObject> {
  const { path: objectPath } = await resolveLocalMediaPath(key);
  const metadataPath = `${objectPath}.meta.json`;
  await assertOwnedNonSymlink(objectPath, 'Local media object');
  const objectStats = await lstat(objectPath);
  if (!objectStats.isFile()) throw new Error('Local media object is not a regular file.');

  await assertOwnedNonSymlink(metadataPath, 'Local media metadata');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
    contentType?: unknown;
    contentLength?: unknown;
  };
  const contentType = typeof metadata.contentType === 'string' ? metadata.contentType : '';
  const contentLength = Number(metadata.contentLength);
  if (!contentType || !Number.isSafeInteger(contentLength) || contentLength !== objectStats.size) {
    throw new Error('Local media metadata is invalid.');
  }
  if (expectedContentType && contentType !== expectedContentType.trim().toLowerCase()) {
    throw new Error('Uploaded media content type does not match its confirmation.');
  }

  return { path: objectPath, contentType, contentLength };
}

export async function inspectLocalMediaObject(
  key: string,
  expectedContentType?: string,
): Promise<LocalMediaObject> {
  try {
    return await inspectLocalMediaObjectInternal(key, expectedContentType);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('Local media object was not uploaded.');
    }
    throw error;
  }
}

export const getLocalMediaObjectForDelivery = inspectLocalMediaObject;
