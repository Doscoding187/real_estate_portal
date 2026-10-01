/* global Buffer */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const s3 = require('@aws-sdk/client-s3');
const { decryptExport, runtimeProbe } = require('../aws-proof-runtime-verify.cjs');
const BUCKET = 'listify-paid-proofs-914683204061-eun1-290496c0';
const USER = 'listify-paid-proof-runtime-290496c0';
const ARN = `arn:aws:iam::914683204061:user/${USER}`;
const env = {
  BILLING_PROOF_AWS_ACCESS_KEY_ID: 'AKIA' + 'A'.repeat(16),
  BILLING_PROOF_AWS_SECRET_ACCESS_KEY: 'A'.repeat(40),
};

test('a changed export or unverified recovery cannot reach decryption', () => {
  const bytes = Buffer.from('dummy ciphertext');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.throws(() => decryptExport(bytes, '', {}, '0'.repeat(64)), /checksum/);
  assert.throws(
    () => decryptExport(bytes, '', { encryptedCredentialsSha256: hash }, hash),
    /incomplete/,
  );
});

test('a different transfer key is rejected before decrypting an otherwise verified envelope', () => {
  const bytes = Buffer.from('dummy ciphertext');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const result = {
    encryptedCredentialsSha256: hash,
    configurationReadback: 'PASS',
    recoveryReadback: 'PASS',
    anonymousReadDenied: true,
    bucket: BUCKET,
    runtimeUser: USER,
    region: 'eu-north-1',
    dedicatedRuntimeUserArn: ARN,
  };
  assert.throws(() => decryptExport(bytes, privateKey, result, hash), /transfer key differs/);
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
      `<GetCallerIdentityResponse><GetCallerIdentityResult><Account>914683204061</Account><Arn>${overrides.arn || ARN}</Arn></GetCallerIdentityResult></GetCallerIdentityResponse>`,
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
      command.input.Bucket === BUCKET &&
      command.input.Key.startsWith('billing-proofs/')
    ) {
      payload = command.input.Body;
      return { VersionId: 'task-version' };
    }
    if (name === 'GetObjectCommand' && command.input.Bucket === BUCKET && !command.input.VersionId)
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
  assert.equal(result.hostedOwnerIsolationVerified, false);
  assert.equal(result.productionBindingsChanged, false);
  assert.equal(result.results.filter(x => x.code === 'AccessDenied').length, 6);
  assert.equal(calls.filter(x => x.name === 'PutObjectCommand').length, 3);
  assert.equal(calls.find(x => x.name === 'PutObjectCommand').input.IfNoneMatch, '*');
  assert.equal(
    calls.find(x => x.name === 'DeleteObjectCommand').input.Key,
    calls.find(x => x.name === 'PutObjectCommand').input.Key,
  );
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

test('a missing object is not accepted as permission-denial evidence', async () => {
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

test('unexpected bucket listing stops all later writes and deletes', async () => {
  let lateMutation = false;
  await assert.rejects(
    mockedProbe({
      send: command => {
        if (command.constructor.name === 'ListObjectsV2Command') return { Contents: [] };
        if (command.constructor.name === 'DeleteObjectCommand') lateMutation = true;
      },
    }),
    /unexpectedly succeeded/,
  );
  assert.equal(lateMutation, false);
});
