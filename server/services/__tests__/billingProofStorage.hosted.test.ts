import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBillingProofStorageStatus,
  readBillingProofDocument,
  storeBillingProofDocument,
} from '../billingProofStorage';

afterEach(() => vi.unstubAllEnvs());

describe('hosted private billing proof storage', () => {
  function configure(region = 'af-south-1') {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('BILLING_PROOF_STORAGE_ADAPTER', 's3');
    vi.stubEnv('BILLING_PROOF_S3_BUCKET', 'private-proofs-sa');
    vi.stubEnv('S3_BUCKET_NAME', 'public-media');
    vi.stubEnv('BILLING_PROOF_S3_REGION', region);
    vi.stubEnv('BILLING_PROOF_AWS_ACCESS_KEY_ID', 'private-key');
    vi.stubEnv('BILLING_PROOF_AWS_SECRET_ACCESS_KEY', 'private-secret');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'public-key');
  }

  it('contains overseas proof uploads before an object-store call', async () => {
    configure('eu-north-1');
    expect(getBillingProofStorageStatus().productionSafe).toBe(false);
    await expect(
      storeBillingProofDocument({
        storageKey: 'invoice/proof.pdf',
        buffer: Buffer.from('synthetic'),
        mimeType: 'application/pdf',
        originalFileName: 'proof.pdf',
      }),
    ).rejects.toThrow('South Africa');
  });

  it('requires an explicit proof region independent of public media configuration', () => {
    configure('');
    vi.stubEnv('AWS_REGION', 'af-south-1');
    expect(getBillingProofStorageStatus().configured).toBe(false);
    configure();
    vi.stubEnv('AWS_REGION', 'eu-north-1');
    expect(getBillingProofStorageStatus().configured).toBe(true);
  });

  it.each([
    { storage_adapter: 's3', storage_bucket: 'old-private-proofs', storage_region: 'eu-north-1' },
    { storage_adapter: 's3', storage_bucket: 'public-media', storage_region: 'af-south-1' },
    {
      storage_adapter: 's3',
      storage_bucket: 'another-private-bucket',
      storage_region: 'af-south-1',
    },
  ])('does not follow retained metadata into an unadmitted location: %s', async metadata => {
    configure();
    await expect(
      readBillingProofDocument({ storageKey: 'billing-proofs/proof.pdf', metadata }),
    ).rejects.toThrow('dedicated South African bucket');
  });

  it('refuses public media credentials as the private storage fallback', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('BILLING_PROOF_STORAGE_ADAPTER', 's3');
    vi.stubEnv('BILLING_PROOF_S3_BUCKET', 'private-proofs');
    vi.stubEnv('BILLING_PROOF_S3_REGION', 'af-south-1');
    vi.stubEnv('BILLING_PROOF_AWS_ACCESS_KEY_ID', '');
    vi.stubEnv('BILLING_PROOF_AWS_SECRET_ACCESS_KEY', '');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'public-key');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'public-secret');

    expect(getBillingProofStorageStatus()).toMatchObject({
      configured: false,
      productionSafe: false,
      missing: ['BILLING_PROOF_AWS_ACCESS_KEY_ID', 'BILLING_PROOF_AWS_SECRET_ACCESS_KEY'],
    });
    await expect(
      readBillingProofDocument({ storageKey: 'billing-proofs/example.pdf' }),
    ).rejects.toThrow('Private billing proof S3 retrieval is not configured.');
    await expect(
      readBillingProofDocument({
        storageKey: 'billing-proofs/example.pdf',
        metadata: { storage_adapter: 'local' },
      }),
    ).rejects.toThrow('Hosted billing proof retrieval cannot use local storage.');
  });

  it('rejects a private proof bucket that equals the public media bucket', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('BILLING_PROOF_STORAGE_ADAPTER', 's3');
    vi.stubEnv('BILLING_PROOF_S3_BUCKET', 'public-media');
    vi.stubEnv('S3_BUCKET_NAME', 'public-media');
    vi.stubEnv('BILLING_PROOF_S3_REGION', 'af-south-1');
    vi.stubEnv('BILLING_PROOF_AWS_ACCESS_KEY_ID', 'private-key');
    vi.stubEnv('BILLING_PROOF_AWS_SECRET_ACCESS_KEY', 'private-secret');

    expect(getBillingProofStorageStatus()).toMatchObject({
      configured: false,
      missing: ['BILLING_PROOF_S3_BUCKET (must differ from public media)'],
    });
  });
});
