import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
const getSignedUrl = vi.fn(async (_client: unknown, command: { input: Record<string, unknown> }) => {
  return `https://signed.example/${JSON.stringify(command.input)}`;
});

vi.mock('@aws-sdk/client-s3', () => {
  class Cmd {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  class PutObjectCommand extends Cmd {}
  class GetObjectCommand extends Cmd {}
  class HeadObjectCommand extends Cmd {}
  class DeleteObjectCommand extends Cmd {}
  class S3Client {
    send = send;
  }
  return { PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, S3Client };
});
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));
vi.mock('../../_core/env', () => ({
  ENV: { awsAccessKeyId: 'k', awsSecretAccessKey: 's', s3BucketName: 'bucket', awsRegion: 'af-south-1' },
}));

const base = { providerId: 7, userId: 3, fileName: 'cert.pdf', contentType: 'application/pdf' };

describe('serviceProviderCredentialStorage', () => {
  beforeEach(() => {
    send.mockReset();
    getSignedUrl.mockClear();
    vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', 'test-secret-for-credential-storage');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('throws "not configured" when no secret is set (no hardcoded fallback)', async () => {
    vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'test');
    const m = await import('../serviceProviderCredentialStorage');
    expect(() => m.createServiceProviderCredentialUploadReservation({ ...base, byteSize: 10 })).toThrow(
      /not configured/,
    );
  });

  it('rejects declared sizes above the cap or below 1', async () => {
    const m = await import('../serviceProviderCredentialStorage');
    expect(() =>
      m.createServiceProviderCredentialUploadReservation({
        ...base,
        byteSize: m.SERVICE_PROVIDER_CREDENTIAL_MAX_BYTES + 1,
      }),
    ).toThrow(/25 MB/);
    expect(() => m.createServiceProviderCredentialUploadReservation({ ...base, byteSize: 0 })).toThrow();
  });

  it('binds ContentLength into the presigned PUT', async () => {
    const m = await import('../serviceProviderCredentialStorage');
    const r = m.createServiceProviderCredentialUploadReservation({ ...base, byteSize: 1234 });
    await m.createServiceProviderCredentialS3UploadUrl(r.payload);
    const command = getSignedUrl.mock.calls[0][1];
    expect(command.input.ContentLength).toBe(1234);
    expect(command.input.ContentType).toBe('application/pdf');
  });

  it('deletes the object when the uploaded size does not match', async () => {
    const m = await import('../serviceProviderCredentialStorage');
    const r = m.createServiceProviderCredentialUploadReservation({ ...base, byteSize: 100 });
    send.mockResolvedValueOnce({ ContentType: 'application/pdf', ContentLength: 999 });
    send.mockResolvedValueOnce({});
    await expect(m.inspectServiceProviderCredentialS3Object(r.payload)).rejects.toThrow(/storage authority/);
    expect(send).toHaveBeenCalledTimes(2);
    expect((send.mock.calls[1][0] as { input: Record<string, unknown> }).input.Key).toBe(r.payload.key);
  });

  it('accepts a matching upload without deleting', async () => {
    const m = await import('../serviceProviderCredentialStorage');
    const r = m.createServiceProviderCredentialUploadReservation({ ...base, byteSize: 100 });
    send.mockResolvedValueOnce({ ContentType: 'application/pdf', ContentLength: 100 });
    await expect(m.inspectServiceProviderCredentialS3Object(r.payload)).resolves.toMatchObject({
      contentLength: 100,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
