import express from 'express';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';

const TEST_SECRET = 'upload-router-local-test-secret';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type UploadPresignTarget = {
  url: string;
  key: string;
  publicUrl: string;
  uploadToken?: string;
};

type UploadCaller = {
  presign(input: { filename: string; contentType: string }): Promise<UploadPresignTarget>;
};

let tempRoot: string;
let server: Server;
let baseUrl: string;
let caller: UploadCaller;
let env: Awaited<typeof import('./_core/env')>;

async function closeServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve())),
  );
}

describe('legacy upload.presign local adapter convergence', () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'property-listify-upload-router-'));
    vi.stubEnv('MEDIA_STORAGE_ADAPTER', 'local');
    vi.stubEnv('MEDIA_LOCAL_STORAGE_DIR', tempRoot);
    vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', TEST_SECRET);
    vi.stubEnv('NODE_ENV', 'test');

    env = await import('./_core/env');
    env.ENV.mediaStorageAdapter = 'local';
    env.ENV.mediaLocalStorageDir = tempRoot;
    env.ENV.isProduction = false;

    const { uploadRouter } = await import('./uploadRouter');
    caller = uploadRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 42, role: 'property_developer' },
      requestId: 'upload-router-local-test',
    } as unknown as TrpcContext) as unknown as UploadCaller;

    const app = express();
    const { registerLocalMediaRoutes } = await import('./_core/localMediaRoutes');
    registerLocalMediaRoutes(app);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Test server did not expose a port.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await closeServer();
    vi.unstubAllEnvs();
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('returns a governed local target that uploads and delivers through the Wizard-compatible contract', async () => {
    const target = await caller.presign({ filename: 'ridge.png', contentType: 'image/png' });

    expect(target).toMatchObject({
      key: expect.stringMatching(/^properties\/draft-42\/[^/]+\.png$/),
      publicUrl: expect.stringContaining('/api/local-media/object?key='),
      uploadToken: expect.any(String),
    });
    expect(target.url).toContain('/api/local-media/upload?uploadToken=');

    const uploadResponse = await fetch(`${baseUrl}${target.url}`, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: ONE_PIXEL_PNG,
    });
    expect(uploadResponse.status).toBe(200);

    const deliveryResponse = await fetch(`${baseUrl}${target.publicUrl}`);
    expect(deliveryResponse.status).toBe(200);
    expect(deliveryResponse.headers.get('content-type')).toContain('image/png');
    expect(Buffer.from(await deliveryResponse.arrayBuffer())).toEqual(ONE_PIXEL_PNG);
  });

  it('does not permit local storage when production is selected', async () => {
    env.ENV.isProduction = true;
    env.ENV.mediaStorageAdapter = 'local';

    await expect(
      caller.presign({ filename: 'ridge.png', contentType: 'image/png' }),
    ).rejects.toThrow(/Failed to generate upload URL/i);

    env.ENV.isProduction = false;
    env.ENV.mediaStorageAdapter = 'local';
  });

  it('rejects unsupported content types before issuing an upload target', async () => {
    await expect(
      caller.presign({ filename: 'unexpected.txt', contentType: 'text/plain' }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Media uploads require an image, video, or PDF content type.',
    });
  });
});
