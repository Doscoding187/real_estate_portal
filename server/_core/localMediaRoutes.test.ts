import express from 'express';
import { createServer, type Server } from 'node:http';
import { lstat, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TEST_SECRET = 'local-media-test-secret';

let tempRoot: string;
let server: Server;
let baseUrl: string;
let mediaStorage: Awaited<typeof import('./mediaStorage')>;
let createUploadToken: typeof import('../services/listingMediaAuthority').createListingMediaUploadToken;

async function startServer(): Promise<void> {
  const app = express();
  const { registerLocalMediaRoutes } = await import('./localMediaRoutes');
  registerLocalMediaRoutes(app);

  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Test server did not expose a port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve())),
  );
}

function makeToken(key: string, overrides: Partial<Parameters<typeof createUploadToken>[0]> = {}) {
  return createUploadToken({
    key,
    mediaType: 'image',
    contentType: 'image/png',
    fileName: 'house.png',
    userId: 42,
    listingId: null,
    ...overrides,
  });
}

describe('local listing media storage boundary', () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'property-listify-media-'));
    vi.stubEnv('MEDIA_STORAGE_ADAPTER', 'local');
    vi.stubEnv('MEDIA_LOCAL_STORAGE_DIR', tempRoot);
    vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', TEST_SECRET);
    vi.stubEnv('NODE_ENV', 'test');

    const env = await import('./env');
    env.ENV.mediaStorageAdapter = 'local';
    env.ENV.mediaLocalStorageDir = tempRoot;
    mediaStorage = await import('./mediaStorage');
    ({ createListingMediaUploadToken: createUploadToken } =
      await import('../services/listingMediaAuthority'));
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
    vi.unstubAllEnvs();
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('uses a namespaced private root and persists a verified upload', async () => {
    expect(mediaStorage.getMediaStorageAdapter()).toBe('local');
    expect(mediaStorage.getLocalMediaRoot()).toContain('worktree-');

    const key = mediaStorage.createLocalMediaKey('house.png', 'draft-42');
    const token = makeToken(key);
    const uploadResponse = await fetch(
      `${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(token)}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'image/png' },
        body: Buffer.from('png-test-data'),
      },
    );

    expect(uploadResponse.status).toBe(200);
    await expect(mediaStorage.inspectLocalMediaObject(key, 'image/png')).resolves.toMatchObject({
      contentType: 'image/png',
      contentLength: 13,
    });
    const { assertUploadedMediaObject } = await import('./imageUpload');
    await expect(assertUploadedMediaObject(key, 'image/png')).resolves.toMatchObject({
      contentType: 'image/png',
      contentLength: 13,
    });

    const deliveryResponse = await fetch(`${baseUrl}${mediaStorage.buildLocalMediaPublicUrl(key)}`);
    expect(deliveryResponse.status).toBe(200);
    expect(deliveryResponse.headers.get('content-type')).toContain('image/png');
    expect(Buffer.from(await deliveryResponse.arrayBuffer()).toString()).toBe('png-test-data');
  });

  it('rejects tampered, expired, and content-type-mismatched upload authorities', async () => {
    const missingTokenResponse = await fetch(`${baseUrl}/api/local-media/upload`, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: 'data',
    });
    expect(missingTokenResponse.status).toBe(400);

    const key = mediaStorage.createLocalMediaKey('house.png', 'draft-42');
    const token = makeToken(key);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    const tamperedResponse = await fetch(
      `${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(tampered)}`,
      { method: 'PUT', headers: { 'content-type': 'image/png' }, body: 'data' },
    );
    expect(tamperedResponse.status).toBe(400);

    const expired = createUploadToken(
      {
        key,
        mediaType: 'image',
        contentType: 'image/png',
        fileName: 'house.png',
        userId: 42,
        listingId: null,
      },
      { now: 1_000, ttlSeconds: 1 },
    );
    const expiredResponse = await fetch(
      `${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(expired)}`,
      { method: 'PUT', headers: { 'content-type': 'image/png' }, body: 'data' },
    );
    expect(expiredResponse.status).toBe(400);

    const mismatchResponse = await fetch(
      `${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(token)}`,
      { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: 'data' },
    );
    expect(mismatchResponse.status).toBe(400);

    const { verifyListingMediaUploadToken } = await import('../services/listingMediaAuthority');
    expect(() => verifyListingMediaUploadToken(token, { userId: 99 })).toThrow(/user/i);
  });

  it('rejects traversal, unsafe keys, oversized payloads, and duplicate writes', async () => {
    expect(() => mediaStorage.assertSafeLocalMediaKey('../etc/passwd')).toThrow();
    expect(() => mediaStorage.assertSafeLocalMediaKey('/etc/passwd')).toThrow();
    expect(() => mediaStorage.assertSafeLocalMediaKey('properties/draft-42/a.meta.json')).toThrow();
    expect(() => mediaStorage.createMediaStorageKey('house.png', '../../private')).toThrow();
    expect(() => mediaStorage.createMediaStorageKey('  ', 'draft-42')).toThrow();
    expect(mediaStorage.createMediaStorageKey('house.png', 'draft-42')).toMatch(
      /^properties\/draft-42\/[^/]+\.png$/,
    );

    const traversalResponse = await fetch(
      `${baseUrl}/api/local-media/object?key=${encodeURIComponent('../../etc/passwd')}`,
    );
    expect([400, 404]).toContain(traversalResponse.status);

    const key = mediaStorage.createLocalMediaKey('house.png', 'draft-42');
    const token = makeToken(key);
    const oversizedResponse = await fetch(
      `${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(token)}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'image/png',
          'content-length': String(mediaStorage.getLocalMediaMaxBytes('image') + 1),
        },
        body: Buffer.alloc(mediaStorage.getLocalMediaMaxBytes('image') + 1),
      },
    );
    expect(oversizedResponse.status).toBe(413);

    const firstUpload = await fetch(`${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(token)}`, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: 'first',
    });
    expect(firstUpload.status).toBe(200);
    const duplicateUpload = await fetch(
      `${baseUrl}${mediaStorage.buildLocalMediaUploadUrl(token)}`,
      { method: 'PUT', headers: { 'content-type': 'image/png' }, body: 'second' },
    );
    expect(duplicateUpload.status).toBe(409);
  });

  it('rejects symlinked objects and never serves arbitrary filesystem paths', async () => {
    const key = mediaStorage.createLocalMediaKey('house.png', 'draft-42');
    const root = mediaStorage.getLocalMediaRoot();
    const directory = join(root, 'properties', 'draft-42');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await symlink('/etc/passwd', join(directory, key.split('/').pop()!));

    await expect(mediaStorage.inspectLocalMediaObject(key, 'image/png')).rejects.toThrow(
      /symlink|unavailable|invalid/i,
    );
    const response = await fetch(
      `${baseUrl}/api/local-media/object?key=${encodeURIComponent(key)}`,
    );
    expect(response.status).toBe(404);
    await expect(lstat(join(directory, key.split('/').pop()!))).resolves.toBeTruthy();
  });

  it('does not mount local delivery when S3 is explicitly selected', async () => {
    const { ENV } = await import('./env');
    ENV.isProduction = true;
    ENV.mediaStorageAdapter = 'local';
    expect(() => mediaStorage.getMediaStorageAdapter()).toThrow(/not permitted in production/i);

    ENV.isProduction = false;
    ENV.mediaStorageAdapter = 's3';
    ENV.s3BucketName = 'test-media-bucket';
    ENV.awsRegion = 'af-south-1';
    expect(mediaStorage.resolveMediaDeliveryUrl('properties/42/house.png')).toBe(
      'https://test-media-bucket.s3.af-south-1.amazonaws.com/properties/42/house.png',
    );
    const app = express();
    const { registerLocalMediaRoutes } = await import('./localMediaRoutes');
    registerLocalMediaRoutes(app);
    const isolatedServer = createServer(app);
    await new Promise<void>(resolve => isolatedServer.listen(0, '127.0.0.1', resolve));
    const address = isolatedServer.address();
    if (!address || typeof address === 'string')
      throw new Error('Test server did not expose a port.');

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/local-media/object?key=properties%2Fdraft-42%2Fmissing.png`,
    );
    expect(response.status).toBe(404);
    await new Promise<void>((resolve, reject) =>
      isolatedServer.close(error => (error ? reject(error) : resolve())),
    );
    ENV.mediaStorageAdapter = 'local';
    ENV.isProduction = false;
    ENV.s3BucketName = '';
    ENV.awsRegion = 'us-east-1';
  });
});
