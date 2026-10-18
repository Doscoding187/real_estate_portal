#!/usr/bin/env node
/* global process, console, fetch, AbortSignal, Buffer, __dirname */
// Local credential transfer verification and bounded permission probe for the
// South African finance storage. Never binds production, migrates records or
// touches the eu-north-1 leaf bucket beyond a denied write attempt.
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
const REGION = 'af-south-1';
const PRIMARY_BUCKET = 'listify-finance-914683204061-af-south-1';
const BACKUP_BUCKET = 'listify-finance-af-south-1-financebackup-kce1wayc2h2e';
const RUNTIME_USER = 'listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx';
const RUNTIME_ARN = `arn:aws:iam::${ACCOUNT}:user/${RUNTIME_USER}`;
const MEDIA_BUCKET = 'listify-properties-sa';
const MEDIA_REGION = 'eu-north-1';
const PREFIX = 'billing-proofs';
const PAYLOAD = Buffer.from(
  'Property Listify finance runtime permission probe; no customer record.\n',
);
const DENIED_OPERATIONS = [
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

function privateFile(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600)
    throw new Error('Input must be an owned mode-0600 regular file.');
  return fs.readFileSync(file);
}

function validateResult(result, expectedHash, expectedKeyHash) {
  if (
    result.configurationReadback !== 'PASS' ||
    result.recoveryReadback !== 'PASS' ||
    !/^[a-f0-9]{64}$/.test(result.recoveryEvidenceSha256 || '') ||
    result.region !== REGION ||
    result.bucket !== PRIMARY_BUCKET ||
    result.backupBucket !== BACKUP_BUCKET ||
    result.runtimeUser !== RUNTIME_USER ||
    result.runtimeUserArn !== RUNTIME_ARN ||
    !new RegExp(`^arn:aws:iam::${ACCOUNT}:(root|(?:user|role)/[A-Za-z0-9+=,.@_/-]+)$`).test(
      result.operatorArn || '',
    ) ||
    result.publicKeySha256 !== expectedKeyHash ||
    result.existingAccessKeysBefore !== 0 ||
    result.accessKeysCreated !== 1 ||
    result.existingResourcesChanged !== false ||
    result.runtimePermissionsExercised !== false ||
    result.productionBindingsChanged !== false ||
    result.migrationCompleted !== false
  )
    throw new Error('Operator verification result is incomplete or names a different target.');
}

function decryptExport(encrypted, privateKey, result, expectedHash, expectedKeyHash) {
  if (
    !/^[a-f0-9]{64}$/.test(expectedHash) ||
    !/^[a-f0-9]{64}$/.test(expectedKeyHash || '') ||
    sha256(encrypted) !== expectedHash ||
    result.encryptedCredentialsSha256 !== expectedHash
  )
    throw new Error('Encrypted export differs from the independently supplied operator checksum.');
  validateResult(result, expectedHash, expectedKeyHash);
  const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
  if (sha256(publicKey) !== expectedKeyHash)
    throw new Error('Existing local transfer key differs from the provisioning public key.');
  const raw = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    encrypted,
  );
  try {
    const value = JSON.parse(raw.toString('utf8'));
    const expected = {
      BILLING_PROOF_STORAGE_ADAPTER: 's3',
      BILLING_PROOF_S3_BUCKET: PRIMARY_BUCKET,
      BILLING_PROOF_S3_REGION: REGION,
      BILLING_PROOF_S3_PREFIX: PREFIX,
    };
    const keys = [
      ...Object.keys(expected),
      'BILLING_PROOF_AWS_ACCESS_KEY_ID',
      'BILLING_PROOF_AWS_SECRET_ACCESS_KEY',
    ].sort();
    if (
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys) ||
      Object.entries(expected).some(([key, expectedValue]) => value[key] !== expectedValue) ||
      !/^AKIA[A-Z0-9]{16}$/.test(value.BILLING_PROOF_AWS_ACCESS_KEY_ID || '') ||
      !/^[A-Za-z0-9/+=]{40}$/.test(value.BILLING_PROOF_AWS_SECRET_ACCESS_KEY || '')
    )
      throw new Error(
        'Decrypted credential envelope differs from the dedicated finance runtime contract.',
      );
    return value;
  } finally {
    raw.fill(0);
  }
}

async function verifiedIdentity(credentials, expectedArn) {
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
  if (!response.ok || identity?.Account !== ACCOUNT || identity?.Arn !== expectedArn)
    throw new Error(
      'Dedicated finance runtime identity verification failed; no probe object written.',
    );
  return identity;
}

async function runtimeProbe(env, save) {
  const credentials = {
    accessKeyId: env.BILLING_PROOF_AWS_ACCESS_KEY_ID,
    secretAccessKey: env.BILLING_PROOF_AWS_SECRET_ACCESS_KEY,
  };
  const identity = await verifiedIdentity(credentials, RUNTIME_ARN);
  const s3 = new s3sdk.S3Client({ credentials, region: REGION, maxAttempts: 1 });
  const media = new s3sdk.S3Client({ credentials, region: MEDIA_REGION, maxAttempts: 1 });
  const key = `${PREFIX}/runtime-permission-verification-${crypto.randomUUID()}.txt`;
  const results = [];
  save('probe-started.private.json', {
    key,
    startedAt: new Date().toISOString(),
    target: PRIMARY_BUCKET,
    identity: identity.Arn,
  });
  async function denied(name, command, client = s3) {
    try {
      await client.send(command);
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
        Bucket: PRIMARY_BUCKET,
        Key: key,
        Body: PAYLOAD,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256',
        IfNoneMatch: '*',
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    if (!put.VersionId || put.VersionId === 'null')
      throw new Error('Probe PUT returned no retained version.');
    save('probe-object.private.json', { key, versionId: put.VersionId, sha256: sha256(PAYLOAD) });
    const get = await s3.send(
      new s3sdk.GetObjectCommand({
        Bucket: PRIMARY_BUCKET,
        Key: key,
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    if (
      sha256(await get.Body.transformToByteArray()) !== sha256(PAYLOAD) ||
      get.ServerSideEncryption !== 'AES256'
    )
      throw new Error('Probe GET content or encryption differs.');
    results.push({ operation: 'PutObject/GetObject', outcome: 'PASS' });
    await denied(
      'bucket-list',
      new s3sdk.ListObjectsV2Command({
        Bucket: PRIMARY_BUCKET,
        Prefix: `${PREFIX}/`,
        MaxKeys: 1,
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'bucket-versioning',
      new s3sdk.GetBucketVersioningCommand({ Bucket: PRIMARY_BUCKET, ExpectedBucketOwner: ACCOUNT }),
    );
    await denied(
      'bucket-policy',
      new s3sdk.GetBucketPolicyCommand({ Bucket: PRIMARY_BUCKET, ExpectedBucketOwner: ACCOUNT }),
    );
    await denied(
      'bucket-encryption',
      new s3sdk.GetBucketEncryptionCommand({ Bucket: PRIMARY_BUCKET, ExpectedBucketOwner: ACCOUNT }),
    );
    await denied(
      'version-read',
      new s3sdk.GetObjectCommand({
        Bucket: PRIMARY_BUCKET,
        Key: key,
        VersionId: put.VersionId,
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'outside-prefix-write',
      new s3sdk.PutObjectCommand({
        Bucket: PRIMARY_BUCKET,
        Key: `runtime-permission-verification/${crypto.randomUUID()}.txt`,
        Body: PAYLOAD,
        IfNoneMatch: '*',
        ServerSideEncryption: 'AES256',
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'object-delete',
      new s3sdk.DeleteObjectCommand({ Bucket: PRIMARY_BUCKET, Key: key, ExpectedBucketOwner: ACCOUNT }),
    );
    const absent = `${PREFIX}/absent-${crypto.randomUUID()}.txt`;
    await denied(
      'backup-read',
      new s3sdk.GetObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: absent,
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'backup-write',
      new s3sdk.PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: absent,
        Body: PAYLOAD,
        IfNoneMatch: '*',
        ServerSideEncryption: 'AES256',
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    await denied(
      'cross-media-write',
      new s3sdk.PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: `properties/${crypto.randomUUID()}.txt`,
        Body: PAYLOAD,
        IfNoneMatch: '*',
        ServerSideEncryption: 'AES256',
        ExpectedBucketOwner: ACCOUNT,
      }),
      media,
    );
    const final = await s3.send(
      new s3sdk.GetObjectCommand({
        Bucket: PRIMARY_BUCKET,
        Key: key,
        ExpectedBucketOwner: ACCOUNT,
      }),
    );
    if (sha256(await final.Body.transformToByteArray()) !== sha256(PAYLOAD))
      throw new Error('Probe object differs after permission checks.');
    return {
      outcome: 'PASS',
      results,
      retainedTestObject: true,
      runtimePermissionsExercised: true,
      productionBindingsChanged: false,
      migrationCompleted: false,
      hostedOwnerIsolationVerified: false,
      infrastructureWritePermissionsTested: false,
    };
  } finally {
    s3.destroy();
    media.destroy();
  }
}

async function main(args) {
  if (args.length !== 6)
    throw new Error(
      'Usage: aws-finance-runtime-verify.cjs <encrypted export> <result.json> <private transfer key> <operator export SHA256> <expected transfer key SHA256> <new private output directory>',
    );
  const [encryptedPath, resultPath, keyPath, expectedHash, expectedKeyHash, directory] = args;
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
  const result = JSON.parse(privateFile(resultPath));
  const env = decryptExport(
    privateFile(encryptedPath),
    privateFile(keyPath),
    result,
    expectedHash,
    expectedKeyHash,
  );
  fs.mkdirSync(directory, { mode: 0o700 });
  const save = (name, value) =>
    fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', {
      mode: 0o600,
      flag: 'wx',
    });
  save('transfer-verification.json', {
    encryptedCredentialsSha256: expectedHash,
    transferKeySha256: expectedKeyHash,
    checksumVerified: true,
    transferKeyVerified: true,
    decryptionVerified: true,
    runtimeUser: RUNTIME_USER,
    verifiedAt: new Date().toISOString(),
  });
  const probe = await runtimeProbe(env, save);
  // Persist locally only after every bounded permission check passes.
  save('runtime-credentials.private.json', env);
  save('runtime-verification.json', probe);
  console.log(
    'PASS: encrypted checksum, transfer key, dedicated identity and bounded runtime permissions verified.',
  );
  console.log('Private credentials/evidence:', directory);
  console.log(
    'Production bindings, migration and hosted owner-isolation checks remain pending. Do not rerun into this directory.',
  );
}

module.exports = { decryptExport, runtimeProbe, main, DENIED_OPERATIONS };
if (require.main === module)
  main(process.argv.slice(2)).catch(() => {
    console.error(
      'Verification stopped. Preserve private evidence; no production binding performed.',
    );
    process.exitCode = 1;
  });
