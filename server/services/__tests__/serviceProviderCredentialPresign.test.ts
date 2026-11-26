import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

vi.mock('../../_core/env', () => ({
  ENV: {
    awsAccessKeyId: 'AKIAFAKEFAKEFAKEFAKE',
    awsSecretAccessKey: 'fake-secret-fake-secret-fake-secret-00',
    s3BucketName: 'fake-bucket',
    awsRegion: 'af-south-1',
  },
}));

describe('credential presigned upload (real presigner, offline)', () => {
  beforeEach(() => vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', 'test-secret-for-presign'));
  afterEach(() => vi.unstubAllEnvs());

  it('signs content-length so S3 enforces the reserved size', async () => {
    const m = await import('../serviceProviderCredentialStorage');
    const r = m.createServiceProviderCredentialUploadReservation({
      providerId: 7,
      userId: 3,
      fileName: 'cert.pdf',
      contentType: 'application/pdf',
      byteSize: 1234,
    });
    const url = new URL(await m.createServiceProviderCredentialS3UploadUrl(r.payload));
    const signed = (url.searchParams.get('X-Amz-SignedHeaders') || '').split(';');
    expect(signed).toContain('content-length');
    // content-type is not a signed header; it is verified via HeadObject at confirmation.
  });
});

describe('credential confirmation is single-use', () => {
  it('enforces UNIQUE(private_storage_key) so a token cannot be confirmed twice', async () => {
    const { serviceProviderCredentials } = await import('../../../drizzle/schema/servicesEngine');
    const cfg = getTableConfig(serviceProviderCredentials);
    const unique = cfg.uniqueConstraints.find(u => u.columns.some(c => c.name === 'private_storage_key'));
    expect(unique).toBeTruthy();
    expect(unique!.columns).toHaveLength(1);
  });
});
