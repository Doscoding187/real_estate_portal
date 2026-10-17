import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBillingProofDocument, storeBillingProofDocument } from '../billingProofStorage';

type CapturedRequest = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

const BUCKET = 'rehearsal-private-proofs';
const activeServers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    activeServers
      .splice(0)
      .map(server => new Promise<void>(resolve => server.close(() => resolve()))),
  );
});

describe('S3 billing proof storage HTTP rehearsal', () => {
  async function startS3CompatibleListener() {
    const objects = new Map<string, Buffer>();
    const requests: CapturedRequest[] = [];
    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', chunk => chunks.push(chunk as Buffer));
      request.on('end', () => {
        const url = (request.url || '').split('?')[0]!;
        requests.push({
          method: request.method || '',
          url,
          headers: request.headers,
          body: Buffer.concat(chunks),
        });
        const key = url.replace(/^\/+/, '');
        if (request.method === 'GET') {
          const body = objects.get(key);
          if (!body) {
            response.statusCode = 404;
            response.end();
            return;
          }
          response.setHeader('content-length', String(body.length));
          response.statusCode = 200;
          response.end(body);
          return;
        }
        if (request.method === 'PUT') {
          objects.set(key, Buffer.concat(chunks));
          response.statusCode = 200;
          response.end();
          return;
        }
        response.statusCode = 405;
        response.end();
      });
    });
    activeServers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APP_ENV', 'test');
    vi.stubEnv('BILLING_PROOF_STORAGE_ADAPTER', 's3');
    vi.stubEnv('BILLING_PROOF_S3_BUCKET', BUCKET);
    vi.stubEnv('BILLING_PROOF_S3_REGION', 'af-south-1');
    vi.stubEnv('BILLING_PROOF_AWS_ACCESS_KEY_ID', 'rehearsal-key');
    vi.stubEnv('BILLING_PROOF_AWS_SECRET_ACCESS_KEY', 'rehearsal-secret');
    vi.stubEnv('BILLING_PROOF_S3_ENDPOINT', `http://127.0.0.1:${port}`);
    return requests;
  }

  it('stores a private proof through a signed path-style PUT and reads it back', async () => {
    const requests = await startS3CompatibleListener();
    const buffer = Buffer.from('s3 rehearsal private proof bytes');

    const stored = await storeBillingProofDocument({
      storageKey: 'invoices/2026/proof.pdf',
      buffer,
      mimeType: 'application/pdf',
      originalFileName: 'proof.pdf',
    });

    expect(stored).toMatchObject({
      adapter: 's3',
      storageKey: `billing-proofs/invoices/2026/proof.pdf`,
      durable: true,
      metadata: {
        storage_adapter: 's3',
        storage_bucket: BUCKET,
        storage_region: 'af-south-1',
        durable: true,
      },
    });
    expect(requests).toHaveLength(1);
    const put = requests[0]!;
    expect(put.method).toBe('PUT');
    expect(put.url).toBe(`/${BUCKET}/billing-proofs/invoices/2026/proof.pdf`);
    expect(put.headers['content-type']).toBe('application/pdf');
    expect(put.headers['x-amz-server-side-encryption']).toBe('AES256');
    expect(put.headers['x-amz-meta-originalfilename']).toBe('proof.pdf');
    expect(String(put.headers['x-amz-meta-billingproofid'])).toMatch(/^[0-9a-f-]{36}$/);
    expect(String(put.headers.authorization)).toContain('Credential=rehearsal-key/');
    expect(put.body.equals(buffer)).toBe(true);

    const readBack = await readBillingProofDocument({
      storageKey: stored.storageKey,
      metadata: stored.metadata,
    });
    expect(readBack.equals(buffer)).toBe(true);
    expect(requests).toHaveLength(2);
    const get = requests[1]!;
    expect(get.method).toBe('GET');
    expect(get.url).toBe(`/${BUCKET}/billing-proofs/invoices/2026/proof.pdf`);
    expect(String(get.headers.authorization)).toContain('Credential=rehearsal-key/');
  });
});
