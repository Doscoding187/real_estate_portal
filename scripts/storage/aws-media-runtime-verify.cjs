#!/usr/bin/env node
/* global process, console, fetch, AbortSignal, Buffer, __dirname */
// Local credential transfer and bounded permission probe. Never binds production.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const s3sdk = require('@aws-sdk/client-s3');
const awsRequire = createRequire(require.resolve('@aws-sdk/client-s3'));
const { SignatureV4 } = awsRequire('@smithy/signature-v4');
const { HttpRequest } = awsRequire('@smithy/protocol-http');
const { Hash } = awsRequire('@smithy/hash-node');
const { XMLParser } = awsRequire('fast-xml-parser');
const ACCOUNT = '914683204061';
const BUCKET = 'listify-properties-sa';
const PROOF_BUCKET = 'listify-paid-proofs-914683204061-eun1-290496c0';
const PUBLIC_KEY_HASH = '5f27118e24bc7cc78ec4b0e49d6102e85815c006fd9fb64eeab7138dc9eb6066';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function privateFile(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600)
    throw new Error('Input must be an owned mode-0600 regular file.');
  return fs.readFileSync(file);
}

function decryptExport(encrypted, privateKey, result, expectedHash, expectedUser) {
  if (
    !/^[a-f0-9]{64}$/.test(expectedHash) ||
    sha256(encrypted) !== expectedHash ||
    result.encryptedCredentialsSha256 !== expectedHash
  )
    throw new Error('Encrypted export differs from the independently supplied operator checksum.');
  const deniedOperations = [
    'list-objects-v2',
    'get-bucket-cors',
    'get-bucket-encryption',
    'put-object',
    'get-object',
  ];
  if (
    !/^listify-media-runtime-[a-f0-9]{8}$/.test(expectedUser || '') ||
    result.configurationAndOperatorStorageChecks !== 'PASS' ||
    result.runtimeUser !== expectedUser ||
    result.runtimeArn !== `arn:aws:iam::${ACCOUNT}:user/${expectedUser}` ||
    result.runtimePutGetPayloadAndDeletePassed !== true ||
    result.existingObjectsPreserved !== true ||
    result.retainedObjectCountBefore !== 2260 ||
    result.existingIamUsersModified !== false ||
    result.productionBindingsChanged !== false ||
    result.hostedUploadDisplayAndOwnerIsolationVerified !== false ||
    result.azureDependencyInventorySha256 !==
      '33fd4d40e3ba35d51300089fbed6fa00324dc2b631ad8d6336b48a8979b9eab7' ||
    !Array.isArray(result.runtimeNegativeChecks) ||
    result.runtimeNegativeChecks.length !== deniedOperations.length ||
    result.runtimeNegativeChecks.some(
      (check, index) =>
        check.operation !== deniedOperations[index] || check.outcome !== 'AccessDenied',
    )
  )
    throw new Error('Operator verification result is incomplete or names a different target.');
  const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
  if (sha256(publicKey) !== PUBLIC_KEY_HASH)
    throw new Error('Existing local transfer key differs from the provisioning public key.');
  const raw = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    encrypted,
  );
  try {
    return validateCredentialEnvelope(JSON.parse(raw.toString('utf8')), expectedUser);
  } finally {
    raw.fill(0);
  }
}

function validateCredentialEnvelope(value, expectedUser) {
  const expected = {
    AWS_REGION: 'eu-north-1',
    S3_BUCKET_NAME: BUCKET,
    CLOUDFRONT_URL: 'https://d3fz99u3go2cmn.cloudfront.net',
    runtimeUser: expectedUser,
  };
  const keys = [...Object.keys(expected), 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'].sort();
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys) ||
    Object.entries(expected).some(([key, expectedValue]) => value[key] !== expectedValue) ||
    !/^AKIA[A-Z0-9]{16}$/.test(value.AWS_ACCESS_KEY_ID || '') ||
    !/^[A-Za-z0-9/+=]{40}$/.test(value.AWS_SECRET_ACCESS_KEY || '')
  )
    throw new Error(
      'Decrypted credential envelope differs from the dedicated media runtime contract.',
    );
  return value;
}

async function runtimeProbe(env, save) {
  const credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
  const signer = new SignatureV4({
    credentials,
    region: 'us-east-1',
    service: 'sts',
    sha256: Hash.bind(null, 'sha256'),
  });
  const request = await signer.sign(
    new HttpRequest({
      protocol: 'https:',
      hostname: 'sts.amazonaws.com',
      method: 'POST',
      path: '/',
      headers: { host: 'sts.amazonaws.com', 'content-type': 'application/x-www-form-urlencoded' },
      body: 'Action=GetCallerIdentity&Version=2011-06-15',
    }),
  );
  const response = await fetch('https://sts.amazonaws.com/', {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(20000),
  });
  const identity = new XMLParser({ removeNSPrefix: true, parseTagValue: false }).parse(
    await response.text(),
  ).GetCallerIdentityResponse?.GetCallerIdentityResult;
  if (
    !response.ok ||
    identity?.Account !== ACCOUNT ||
    identity?.Arn !== `arn:aws:iam::${ACCOUNT}:user/${env.runtimeUser}`
  )
    throw new Error(
      'Dedicated media runtime identity verification failed; no probe object written.',
    );
  const s3 = new s3sdk.S3Client({ credentials, region: 'eu-north-1', maxAttempts: 1 });
  const key = `properties/runtime-permission-verification-${crypto.randomUUID()}.txt`;
  const payload = Buffer.from(
    'Property Listify dedicated runtime permission probe; no customer media.\n',
  );
  const results = [];
  save('probe-started.private.json', {
    key,
    startedAt: new Date().toISOString(),
    target: BUCKET,
    identity: identity.Arn,
  });
  async function denied(name, command) {
    try {
      await s3.send(command);
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 403 || error.name !== 'AccessDenied')
        throw new Error(`Permission probe ${name} did not establish AccessDenied/403.`);
      results.push({ operation: name, status: 403, code: 'AccessDenied' });
      save(`${name}.json`, results.at(-1));
      return;
    }
    throw new Error(
      `Permission probe ${name} unexpectedly succeeded; preserve task objects and stop.`,
    );
  }
  try {
    const put = await s3.send(
      new s3sdk.PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: payload,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256',
        IfNoneMatch: '*',
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    save('probe-object.private.json', { key, etag: put.ETag, sha256: sha256(payload) });
    const get = await s3.send(
      new s3sdk.GetObjectCommand({ Bucket: BUCKET, Key: key, ExpectedBucketOwner: ACCOUNT }),
    );
    if (
      sha256(await get.Body.transformToByteArray()) !== sha256(payload) ||
      get.ServerSideEncryption !== 'AES256'
    )
      throw new Error('Probe GET content or encryption differs.');
    results.push({ operation: 'PutObject/GetObject', outcome: 'PASS' });
    await denied(
      'bucket-list',
      new s3sdk.ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: 'properties/',
        MaxKeys: 1,
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'bucket-cors',
      new s3sdk.GetBucketCorsCommand({ Bucket: BUCKET, ExpectedBucketOwner: ACCOUNT }),
    );
    await denied(
      'bucket-encryption',
      new s3sdk.GetBucketEncryptionCommand({ Bucket: BUCKET, ExpectedBucketOwner: ACCOUNT }),
    );
    await denied(
      'bucket-policy',
      new s3sdk.GetBucketPolicyCommand({ Bucket: BUCKET, ExpectedBucketOwner: ACCOUNT }),
    );
    await denied(
      'cross-proof-read',
      new s3sdk.GetObjectCommand({
        Bucket: PROOF_BUCKET,
        Key: 'billing-proofs/' + key.split('/').at(-1),
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'outside-prefix-write',
      new s3sdk.PutObjectCommand({
        Bucket: BUCKET,
        Key: 'videos/' + key.split('/').at(-1),
        Body: payload,
        IfNoneMatch: '*',
        ServerSideEncryption: 'AES256',
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await s3.send(
      new s3sdk.DeleteObjectCommand({ Bucket: BUCKET, Key: key, ExpectedBucketOwner: ACCOUNT }),
    );
    results.push({ operation: 'DeleteObject', outcome: 'PASS' });
    return {
      outcome: 'PASS',
      results,
      taskObjectDeletionAccepted: true,
      productionBindingsChanged: false,
      hostedOwnerIsolationVerified: false,
      infrastructureWritePermissionsTested: false,
    };
  } finally {
    s3.destroy();
  }
}

async function main(args) {
  if (args.length !== 6)
    throw new Error(
      'Usage: aws-media-runtime-verify.cjs <encrypted export> <result.json> <existing private transfer key> <operator SHA256> <operator runtime user> <new private output directory>',
    );
  const [encryptedPath, resultPath, keyPath, expectedHash, expectedUser, directory] = args;
  const parent = fs.lstatSync(path.dirname(path.resolve(directory)));
  const repository = path.resolve(__dirname, '../..');
  if (
    !parent.isDirectory() ||
    parent.uid !== process.getuid() ||
    (parent.mode & 0o777) !== 0o700 ||
    path.resolve(directory).startsWith(repository + path.sep) ||
    fs.realpathSync(path.dirname(path.resolve(directory))).startsWith(repository + path.sep)
  )
    throw new Error(
      'Output must be outside the repository under an owned mode-0700 private directory.',
    );
  const env = decryptExport(
    privateFile(encryptedPath),
    privateFile(keyPath),
    JSON.parse(privateFile(resultPath)),
    expectedHash,
    expectedUser,
  );
  fs.mkdirSync(directory, { mode: 0o700 });
  const save = (name, value) =>
    fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', {
      mode: 0o600,
      flag: 'wx',
    });
  save('transfer-verification.json', {
    encryptedCredentialsSha256: expectedHash,
    checksumVerified: true,
    transferKeyVerified: true,
    decryptionVerified: true,
    runtimeUser: expectedUser,
    verifiedAt: new Date().toISOString(),
  });
  const result = await runtimeProbe(env, save);
  // Persist locally only after every bounded permission check passes.
  save('runtime-credentials.private.json', env);
  save('runtime-verification.json', result);
  console.log(
    'PASS: encrypted checksum, existing transfer key, dedicated identity and bounded runtime permissions verified.',
  );
  console.log('Private credentials/evidence:', directory);
  console.log(
    'Production bindings and hosted owner-isolation checks remain pending. Do not rerun into this directory.',
  );
}

module.exports = { decryptExport, validateCredentialEnvelope, runtimeProbe, main };
if (require.main === module)
  main(process.argv.slice(2)).catch(() => {
    console.error(
      'Verification stopped. Preserve private evidence; no production binding performed.',
    );
    process.exitCode = 1;
  });
