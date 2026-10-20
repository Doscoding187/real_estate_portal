/* global Buffer */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const s3 = require('@aws-sdk/client-s3');
const { decryptExport, runtimeProbe } = require('../aws-finance-runtime-verify.cjs');
const ACCOUNT = '914683204061';
const PRIMARY = 'listify-finance-914683204061-af-south-1';
const BACKUP = 'listify-finance-af-south-1-financebackup-kce1wayc2h2e';
const MEDIA = 'listify-properties-sa';
const USER = 'listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx';
const ARN = `arn:aws:iam::${ACCOUNT}:user/${USER}`;
const env = {
  BILLING_PROOF_AWS_ACCESS_KEY_ID: 'AKIA' + 'A'.repeat(16),
  BILLING_PROOF_AWS_SECRET_ACCESS_KEY: 'A'.repeat(40),
};
const DENIED = [
  'bucket-list',
  'bucket-versioning',
  'bucket-policy',
  'bucket-encryption',
  'version-read',
  'outside-prefix-write',
  'object-delete',
  'backup-read',
  'backup-write',
  'cross-media-write',
];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function keyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}

function validResult(keyHash, hash) {
  return {
    encryptedCredentialsSha256: hash,
    configurationReadback: 'PASS',
    recoveryReadback: 'PASS',
    recoveryEvidenceSha256: 'a'.repeat(64),
    region: 'af-south-1',
    bucket: PRIMARY,
    backupBucket: BACKUP,
    runtimeUser: USER,
    runtimeUserArn: ARN,
    operatorArn: `arn:aws:iam::${ACCOUNT}:user/listify-finance-operator`,
    publicKeySha256: keyHash,
    existingAccessKeysBefore: 0,
    accessKeysCreated: 1,
    existingResourcesChanged: false,
    runtimePermissionsExercised: false,
    productionBindingsChanged: false,
    migrationCompleted: false,
  };
}

function sealed(envelope, publicPem) {
  return crypto.publicEncrypt(
    { key: publicPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(JSON.stringify(envelope)),
  );
}

test('a changed export or unverified result cannot reach decryption', () => {
  const bytes = Buffer.from('dummy ciphertext');
  const hash = sha256(bytes);
  assert.throws(
    () => decryptExport(bytes, '', {}, '0'.repeat(64), '0'.repeat(64)),
    /checksum/,
  );
  assert.throws(() => decryptExport(bytes, '', { encryptedCredentialsSha256: hash }, hash, '0'.repeat(64)), /incomplete/);
});

test('a different transfer key is rejected before decrypting an otherwise verified envelope', () => {
  const { privateKey } = keyPair();
  const bytes = Buffer.from('dummy ciphertext');
  const hash = sha256(bytes);
  const wrongKeyHash = 'f'.repeat(64);
  assert.throws(
    () => decryptExport(bytes, privateKey, validResult(wrongKeyHash, hash), hash, wrongKeyHash),
    /transfer key differs/,
  );
});

test('envelope contract accepts only the dedicated finance runtime credentials', () => {
  const { privateKey } = keyPair();
  const publicPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
  const publicKeyHash = sha256(publicPem);
  const good = {
    BILLING_PROOF_STORAGE_ADAPTER: 's3',
    BILLING_PROOF_S3_BUCKET: PRIMARY,
    BILLING_PROOF_S3_REGION: 'af-south-1',
    BILLING_PROOF_S3_PREFIX: 'billing-proofs',
    ...env,
  };
  const encrypted = sealed(good, publicPem);
  const hash = sha256(encrypted);
  const decrypted = decryptExport(
    encrypted,
    privateKey,
    validResult(publicKeyHash, hash),
    hash,
    publicKeyHash,
  );
  assert.deepEqual(decrypted, good);
  for (const bad of [
    { ...good, BILLING_PROOF_S3_BUCKET: 'listify-paid-proofs-914683204061-eun1-290496c0' },
    { ...good, BILLING_PROOF_S3_REGION: 'eu-north-1' },
    { ...good, EXTRA: 'x' },
    { ...good, BILLING_PROOF_AWS_SECRET_ACCESS_KEY: 'short' },
  ]) {
    const sealedBad = sealed(bad, publicPem);
    const badHash = sha256(sealedBad);
    assert.throws(
      () =>
        decryptExport(
          sealedBad,
          privateKey,
          validResult(publicKeyHash, badHash),
          badHash,
          publicKeyHash,
        ),
      /credential envelope/,
    );
  }
});

async function mockedProbe(overrides = {}) {
  const originalFetch = global.fetch;
  const originalSend = s3.S3Client.prototype.send;
  const originalDestroy = s3.S3Client.prototype.destroy;
  const calls = [];
  const evidence = [];
  let payload;
  global.fetch = async () => ({
    ok: true,
    text: async () =>
      `<GetCallerIdentityResponse><GetCallerIdentityResult><Account>${ACCOUNT}</Account><Arn>${overrides.arn || ARN}</Arn></GetCallerIdentityResult></GetCallerIdentityResponse>`,
  });
  s3.S3Client.prototype.send = async function (command) {
    const name = command.constructor.name;
    calls.push({ name, input: command.input });
    if (overrides.send) {
      const result = overrides.send(command);
      if (result !== undefined) return result;
    }
    if (
      name === 'PutObjectCommand' &&
      command.input.Bucket === PRIMARY &&
      command.input.Key.startsWith('billing-proofs/')
    ) {
      payload = command.input.Body;
      return { VersionId: 'task-version' };
    }
    if (
      name === 'GetObjectCommand' &&
      command.input.Bucket === PRIMARY &&
      !command.input.VersionId
    )
      return {
        ServerSideEncryption: 'AES256',
        Body: { transformToByteArray: async () => payload },
      };
    throw Object.assign(new Error('denied'), {
      name: 'AccessDenied',
      $metadata: { httpStatusCode: 403 },
    });
  };
  s3.S3Client.prototype.destroy = () => {};
  try {
    return {
      result: await runtimeProbe(env, (name, value) => evidence.push({ name, value })),
      calls,
      evidence,
    };
  } finally {
    global.fetch = originalFetch;
    s3.S3Client.prototype.send = originalSend;
    s3.S3Client.prototype.destroy = originalDestroy;
  }
}

test('bounded probe retains its object and requires actual AccessDenied on every forbidden operation', async () => {
  const { result, calls, evidence } = await mockedProbe();
  assert.equal(result.outcome, 'PASS');
  assert.equal(result.retainedTestObject, true);
  assert.equal(result.runtimePermissionsExercised, true);
  assert.equal(result.productionBindingsChanged, false);
  assert.equal(result.migrationCompleted, false);
  assert.equal(result.hostedOwnerIsolationVerified, false);
  assert.deepEqual(
    result.results.filter(x => x.code === 'AccessDenied').map(x => x.operation),
    DENIED,
  );
  assert.equal(calls.filter(x => x.name === 'PutObjectCommand').length, 4);
  const positivePut = calls.find(
    x => x.name === 'PutObjectCommand' && x.input.Bucket === PRIMARY,
  );
  assert.equal(positivePut.input.IfNoneMatch, '*');
  const deniedDelete = calls.find(x => x.name === 'DeleteObjectCommand');
  assert.equal(deniedDelete.input.Key, positivePut.input.Key);
  assert.ok(calls.some(x => x.name === 'GetObjectCommand' && x.input.Bucket === BACKUP));
  assert.ok(calls.some(x => x.name === 'PutObjectCommand' && x.input.Bucket === BACKUP));
  assert.ok(calls.some(x => x.name === 'PutObjectCommand' && x.input.Bucket === MEDIA));
  assert.equal(
    evidence.some(x => JSON.stringify(x).includes(env.BILLING_PROOF_AWS_SECRET_ACCESS_KEY)),
    false,
  );
});

test('wrong runtime principal stops before any S3 operation', async () => {
  let s3Called = false;
  await assert.rejects(
    mockedProbe({
      arn: 'arn:aws:iam::914683204061:user/vercel-s3-uploader',
      send: () => {
        s3Called = true;
      },
    }),
    /identity verification failed/,
  );
  assert.equal(s3Called, false);
});

test('a missing version is not accepted as permission-denial evidence', async () => {
  await assert.rejects(
    mockedProbe({
      send: command => {
        if (command.constructor.name === 'GetObjectCommand' && command.input.VersionId)
          throw Object.assign(new Error('missing'), {
            name: 'NoSuchKey',
            $metadata: { httpStatusCode: 404 },
          });
      },
    }),
    /did not establish AccessDenied/,
  );
});

test('a missing backup object is not accepted as permission-denial evidence', async () => {
  await assert.rejects(
    mockedProbe({
      send: command => {
        if (command.constructor.name === 'GetObjectCommand' && command.input.Bucket === BACKUP)
          throw Object.assign(new Error('missing'), {
            name: 'NoSuchKey',
            $metadata: { httpStatusCode: 404 },
          });
      },
    }),
    /did not establish AccessDenied/,
  );
});

test('unexpected broad access stops all later writes and deletes', async () => {
  let lateMutation = false;
  await assert.rejects(
    mockedProbe({
      send: command => {
        if (command.constructor.name === 'ListObjectsV2Command') return { Contents: [] };
        if (
          command.constructor.name === 'DeleteObjectCommand' ||
          (command.constructor.name === 'PutObjectCommand' && command.input.Bucket !== PRIMARY)
        )
          lateMutation = true;
      },
    }),
    /unexpectedly succeeded/,
  );
  assert.equal(lateMutation, false);
});
