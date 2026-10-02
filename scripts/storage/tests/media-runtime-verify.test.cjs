/* global Buffer */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const s3 = require('@aws-sdk/client-s3');
const {
  decryptExport,
  validateCredentialEnvelope,
  runtimeProbe,
} = require('../aws-media-runtime-verify.cjs');
const BUCKET = 'listify-properties-sa';
const USER = 'listify-media-runtime-07394cfd';
const ARN = `arn:aws:iam::914683204061:user/${USER}`;
const env = {
  runtimeUser: USER,
  AWS_ACCESS_KEY_ID: 'AKIA' + 'A'.repeat(16),
  AWS_SECRET_ACCESS_KEY: 'A'.repeat(40),
};

function verifiedResult(hash) {
  return {
    encryptedCredentialsSha256: hash,
    configurationAndOperatorStorageChecks: 'PASS',
    runtimeUser: USER,
    runtimeArn: ARN,
    runtimePutGetPayloadAndDeletePassed: true,
    existingObjectsPreserved: true,
    retainedObjectCountBefore: 2260,
    existingIamUsersModified: false,
    productionBindingsChanged: false,
    hostedUploadDisplayAndOwnerIsolationVerified: false,
    azureDependencyInventorySha256:
      '33fd4d40e3ba35d51300089fbed6fa00324dc2b631ad8d6336b48a8979b9eab7',
    runtimeNegativeChecks: [
      'list-objects-v2',
      'get-bucket-cors',
      'get-bucket-encryption',
      'put-object',
      'get-object',
    ].map(operation => ({ operation, outcome: 'AccessDenied' })),
  };
}

test('decrypted credentials must bind exact media target, independent user and allowed keys', () => {
  const value = {
    ...env,
    AWS_REGION: 'eu-north-1',
    S3_BUCKET_NAME: BUCKET,
    CLOUDFRONT_URL: 'https://d3fz99u3go2cmn.cloudfront.net',
  };
  assert.equal(validateCredentialEnvelope(value, USER), value);
  for (const changed of [
    { ...value, AWS_REGION: 'us-east-1' },
    { ...value, S3_BUCKET_NAME: 'other-bucket' },
    { ...value, runtimeUser: 'listify-media-runtime-00000000' },
    { ...value, AWS_SESSION_TOKEN: 'unexpected' },
    { ...value, AWS_SECRET_ACCESS_KEY: 'bad' },
    { ...value, CLOUDFRONT_URL: 'https://other.invalid' },
  ])
    assert.throws(() => validateCredentialEnvelope(changed, USER), /contract/);
});

test('missing denial or wrong user in operator metadata stops before key loading', () => {
  const bytes = Buffer.from('dummy ciphertext');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  for (const changed of [
    { ...verifiedResult(hash), runtimeUser: 'listify-media-runtime-00000000' },
    { ...verifiedResult(hash), runtimeNegativeChecks: [] },
    { ...verifiedResult(hash), productionBindingsChanged: true },
    { ...verifiedResult(hash), existingObjectsPreserved: false },
  ])
    assert.throws(() => decryptExport(bytes, '', changed, hash, USER), /incomplete/);
});

test('a changed export or incomplete media result cannot reach decryption', () => {
  const bytes = Buffer.from('dummy ciphertext');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.throws(() => decryptExport(bytes, '', {}, '0'.repeat(64), USER), /checksum/);
  assert.throws(
    () => decryptExport(bytes, '', { encryptedCredentialsSha256: hash }, hash, USER),
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
  const result = verifiedResult(hash);
  assert.throws(() => decryptExport(bytes, privateKey, result, hash, USER), /transfer key differs/);
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
      command.input.Key.startsWith('properties/')
    ) {
      payload = command.input.Body;
      return { ETag: 'task-etag' };
    }
    if (name === 'GetObjectCommand' && command.input.Bucket === BUCKET && !command.input.VersionId)
      return {
        ServerSideEncryption: 'AES256',
        Body: { transformToByteArray: async () => payload },
      };
    if (name === 'DeleteObjectCommand' && command.input.Bucket === BUCKET) return {};
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

test('bounded probe deletes only its object and requires actual AccessDenied on every forbidden operation', async () => {
  const { result, calls, evidence } = await mockedProbe();
  assert.equal(result.outcome, 'PASS');
  assert.equal(result.hostedOwnerIsolationVerified, false);
  assert.equal(result.productionBindingsChanged, false);
  assert.equal(result.results.filter(x => x.code === 'AccessDenied').length, 6);
  assert.equal(calls.filter(x => x.name === 'PutObjectCommand').length, 2);
  assert.equal(calls.find(x => x.name === 'PutObjectCommand').input.IfNoneMatch, '*');
  assert.equal(
    calls.find(x => x.name === 'DeleteObjectCommand').input.Key,
    calls.find(x => x.name === 'PutObjectCommand').input.Key,
  );
  assert.equal(
    evidence.some(x => JSON.stringify(x).includes(env.AWS_SECRET_ACCESS_KEY)),
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
        if (command.constructor.name === 'GetObjectCommand' && command.input.Bucket !== BUCKET)
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
