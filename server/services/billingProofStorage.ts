import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type BillingProofStorageAdapter = 'local' | 's3';

export type BillingProofStorageStatus = {
  adapter: BillingProofStorageAdapter;
  configured: boolean;
  productionSafe: boolean;
  missing: string[];
  message: string | null;
};

type BillingProofStorageConfig =
  | {
      adapter: 'local';
      root: string;
    }
  | {
      adapter: 's3';
      bucket: string;
      region: string;
      prefix: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };

export class BillingProofStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingProofStorageConfigurationError';
  }
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production';
}

function normalizeAdapter(value?: string | null): BillingProofStorageAdapter {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 's3') return 's3';
  if (normalized === 'local') return 'local';
  return isProductionRuntime() ? 's3' : 'local';
}

function normalizeKey(key: string) {
  return key.replace(/\\/g, '/').replace(/^\/+/, '');
}

function getLocalRoot() {
  return (
    process.env.BILLING_PRIVATE_STORAGE_DIR ||
    path.resolve(process.cwd(), '.private', 'billing-proofs')
  );
}

export function getBillingProofStorageStatus(): BillingProofStorageStatus {
  const adapter = normalizeAdapter(process.env.BILLING_PROOF_STORAGE_ADAPTER);
  const production = isProductionRuntime();

  if (adapter === 'local') {
    const productionSafe = !production;
    return {
      adapter,
      configured: productionSafe,
      productionSafe,
      missing: productionSafe ? [] : ['BILLING_PROOF_STORAGE_ADAPTER=s3'],
      message: productionSafe
        ? null
        : 'Production billing proof storage must use private durable object storage.',
    };
  }

  const bucket = process.env.BILLING_PROOF_S3_BUCKET || '';
  const region = process.env.BILLING_PROOF_S3_REGION || process.env.AWS_REGION || '';
  const accessKeyId = process.env.BILLING_PROOF_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey =
    process.env.BILLING_PROOF_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
  const missing = [
    !bucket ? 'BILLING_PROOF_S3_BUCKET' : null,
    !region ? 'BILLING_PROOF_S3_REGION or AWS_REGION' : null,
    !accessKeyId ? 'BILLING_PROOF_AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID' : null,
    !secretAccessKey ? 'BILLING_PROOF_AWS_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY' : null,
  ].filter(Boolean) as string[];

  return {
    adapter,
    configured: missing.length === 0,
    productionSafe: missing.length === 0,
    missing,
    message: missing.length
      ? `Private billing proof S3 storage is not configured: ${missing.join(', ')}.`
      : null,
  };
}

function resolveStorageConfig(): BillingProofStorageConfig {
  const status = getBillingProofStorageStatus();
  if (!status.configured) {
    throw new BillingProofStorageConfigurationError(
      status.message || 'Private billing proof storage is not configured.',
    );
  }

  if (status.adapter === 'local') {
    return {
      adapter: 'local',
      root: getLocalRoot(),
    };
  }

  return {
    adapter: 's3',
    bucket: process.env.BILLING_PROOF_S3_BUCKET || '',
    region: process.env.BILLING_PROOF_S3_REGION || process.env.AWS_REGION || '',
    prefix: normalizeKey(process.env.BILLING_PROOF_S3_PREFIX || 'billing-proofs'),
    accessKeyId: process.env.BILLING_PROOF_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.BILLING_PROOF_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  };
}

function createS3Client(config: Extract<BillingProofStorageConfig, { adapter: 's3' }>) {
  return new S3Client({
    region: config.region,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
  });
}

async function bodyToBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function storeBillingProofDocument(input: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
}) {
  const config = resolveStorageConfig();
  const normalizedStorageKey = normalizeKey(input.storageKey);

  if (config.adapter === 'local') {
    const absolutePath = path.join(config.root, normalizedStorageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer, { mode: 0o600 });
    return {
      adapter: 'local' as const,
      storageKey: normalizedStorageKey,
      durable: false,
      metadata: {
        storage_adapter: 'local',
        durable: false,
      },
    };
  }

  const s3Key = normalizeKey(path.posix.join(config.prefix, normalizedStorageKey));
  const client = createS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
      Body: input.buffer,
      ContentType: input.mimeType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        originalFileName: input.originalFileName.slice(0, 255),
        billingProofId: randomUUID(),
      },
    }),
  );

  return {
    adapter: 's3' as const,
    storageKey: s3Key,
    durable: true,
    metadata: {
      storage_adapter: 's3',
      storage_bucket: config.bucket,
      storage_region: config.region,
      durable: true,
    },
  };
}

export async function readBillingProofDocument(input: {
  storageKey: string;
  metadata?: Record<string, any> | null;
}) {
  const adapter = normalizeAdapter(input.metadata?.storage_adapter);
  const normalizedStorageKey = normalizeKey(input.storageKey);

  if (adapter === 'local') {
    const absolutePath = path.join(getLocalRoot(), normalizedStorageKey);
    return readFile(absolutePath);
  }

  const bucket = String(input.metadata?.storage_bucket || process.env.BILLING_PROOF_S3_BUCKET || '');
  const region = String(
    input.metadata?.storage_region || process.env.BILLING_PROOF_S3_REGION || process.env.AWS_REGION || '',
  );
  const accessKeyId = process.env.BILLING_PROOF_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.BILLING_PROOF_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new BillingProofStorageConfigurationError(
      'Private billing proof S3 retrieval is not configured.',
    );
  }

  const client = createS3Client({
    adapter: 's3',
    bucket,
    region,
    prefix: '',
    accessKeyId,
    secretAccessKey,
  });
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: normalizedStorageKey,
    }),
  );

  return bodyToBuffer(response.Body);
}
