#!/usr/bin/env node
// Read-only inventory. Credentials and object inventories stay in private files.
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
const xml = new XMLParser({ removeNSPrefix: true, parseTagValue: false });

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath)
  throw new Error(
    'Usage: node scripts/storage/aws-storage-snapshot.cjs <private JSON input> <new private output directory>',
  );
const inputStat = fs.lstatSync(inputPath);
if (!inputStat.isFile() || inputStat.uid !== process.getuid() || (inputStat.mode & 0o777) !== 0o600)
  throw new Error('Input must be an owned mode-0600 regular file.');
const env = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  ...(env.AWS_SESSION_TOKEN ? { sessionToken: env.AWS_SESSION_TOKEN } : {}),
};
if (
  !credentials.accessKeyId ||
  !credentials.secretAccessKey ||
  !env.S3_BUCKET_NAME ||
  !env.AWS_REGION
)
  throw new Error('Explicit AWS credentials, media bucket and region required.');
fs.mkdirSync(outputPath, { mode: 0o700 });
const outputStat = fs.lstatSync(outputPath);
if (
  !outputStat.isDirectory() ||
  outputStat.uid !== process.getuid() ||
  (outputStat.mode & 0o777) !== 0o700
)
  throw new Error('Unsafe output directory.');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const write = (name, value) =>
  fs.writeFileSync(path.join(outputPath, name), JSON.stringify(value, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
const errors = [];
async function signedRead(service, name, resourcePath, queryBody) {
  const hostname = service + '.amazonaws.com';
  const request = new HttpRequest({
    protocol: 'https:',
    hostname,
    method: queryBody ? 'POST' : 'GET',
    path: resourcePath,
    headers: {
      host: hostname,
      ...(queryBody ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(queryBody ? { body: queryBody } : {}),
  });
  const signer = new SignatureV4({
    credentials,
    region: 'us-east-1',
    service,
    sha256: Hash.bind(null, 'sha256'),
  });
  const signed = await signer.sign(request);
  const response = await fetch('https://' + hostname + resourcePath, {
    method: request.method,
    headers: signed.headers,
    ...(queryBody ? { body: queryBody } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  const result = {
    status: response.status,
    etag: response.headers.get('etag'),
    data: xml.parse(text),
  };
  write(name + '.json', result);
  if (!response.ok)
    errors.push({
      operation: name,
      status: response.status,
      code: result.data.ErrorResponse?.Error?.Code || result.data.Error?.Code || 'RequestRejected',
    });
  return result;
}
async function main() {
  const identity = await signedRead(
    'sts',
    'caller-identity',
    '/',
    'Action=GetCallerIdentity&Version=2011-06-15',
  );
  if (identity.status !== 200) throw new Error('AWS identity verification failed.');
  const account = identity.data.GetCallerIdentityResponse.GetCallerIdentityResult.Account;
  const arn = identity.data.GetCallerIdentityResponse.GetCallerIdentityResult.Arn;
  const iamUser = arn.split(':user/')[1];
  const s3 = new s3sdk.S3Client({ region: env.AWS_REGION, credentials, maxAttempts: 1 });
  const snapshots = {};
  try {
    const names = [
      'GetBucketPolicy',
      'GetPublicAccessBlock',
      'GetBucketCors',
      'GetBucketEncryption',
      'GetBucketLifecycleConfiguration',
      'GetBucketVersioning',
      'GetBucketOwnershipControls',
      'GetBucketAcl',
      'GetBucketPolicyStatus',
      'GetBucketLocation',
    ];
    for (const name of names) {
      try {
        const result = await s3.send(new s3sdk[name + 'Command']({ Bucket: env.S3_BUCKET_NAME }));
        delete result.$metadata;
        if (result.Policy) result.Policy = JSON.parse(result.Policy);
        snapshots[name] = result;
        write(name + '.json', { ok: true, data: result });
      } catch (e) {
        const result = { ok: false, code: e.name, status: e.$metadata?.httpStatusCode ?? null };
        errors.push({ operation: name, ...result });
        write(name + '.json', result);
      }
    }
    const inventory = [];
    let token;
    do {
      const page = await s3.send(
        new s3sdk.ListObjectsV2Command({
          Bucket: env.S3_BUCKET_NAME,
          ContinuationToken: token,
          MaxKeys: 1000,
        }),
      );
      inventory.push(
        ...(page.Contents || []).map(({ Key, Size, ETag, LastModified, StorageClass }) => ({
          Key,
          Size,
          ETag,
          LastModified,
          StorageClass,
        })),
      );
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !token)
        throw new Error('Inventory pagination has no continuation token.');
      if (inventory.length > 100000) throw new Error('Inventory exceeded reviewed bound.');
    } while (token);
    write('object-inventory.private.json', inventory);
    const prefixSummary = {};
    for (const object of inventory) {
      const prefix = object.Key.split('/')[0] + '/';
      prefixSummary[prefix] = (prefixSummary[prefix] || 0) + 1;
    }
    const statements = snapshots.GetBucketPolicy?.Policy?.Statement || [];
    const sourceArns = [
      ...new Set(
        statements
          .filter(s => s.Principal?.Service === 'cloudfront.amazonaws.com' && s.Effect === 'Allow')
          .flatMap(s =>
            ['StringEquals', 'ArnEquals', 'ArnLike'].flatMap(operator =>
              Object.entries(s.Condition?.[operator] || {})
                .filter(([key]) => key.toLowerCase() === 'aws:sourcearn')
                .flatMap(([, value]) => [value].flat()),
            ),
          )
          .filter(
            v =>
              typeof v === 'string' &&
              !/[?*]/.test(v) &&
              v.startsWith('arn:aws:cloudfront::' + account + ':distribution/'),
          ),
      ),
    ];
    if (sourceArns.length === 1) {
      const id = sourceArns[0].split('/').at(-1);
      const distribution = await signedRead(
        'cloudfront',
        'distribution-config',
        '/2020-05-31/distribution/' + id + '/config',
      );
      await signedRead('cloudfront', 'distribution-status', '/2020-05-31/distribution/' + id);
      if (distribution.status === 200) {
        const config = distribution.data.DistributionConfig;
        const origins = config.Origins?.Items?.Origin;
        for (const origin of Array.isArray(origins) ? origins : origins ? [origins] : []) {
          if (origin.OriginAccessControlId)
            await signedRead(
              'cloudfront',
              'oac-' + origin.OriginAccessControlId,
              '/2020-05-31/origin-access-control/' + origin.OriginAccessControlId,
            );
        }
        const behaviors = [
          config.DefaultCacheBehavior,
          ...[config.CacheBehaviors?.Items?.CacheBehavior].flat().filter(Boolean),
        ];
        for (const [field, route] of [
          ['CachePolicyId', 'cache-policy'],
          ['OriginRequestPolicyId', 'origin-request-policy'],
          ['ResponseHeadersPolicyId', 'response-headers-policy'],
        ]) {
          for (const policyId of [...new Set(behaviors.map(b => b[field]).filter(Boolean))])
            await signedRead(
              'cloudfront',
              route + '-' + policyId,
              '/2020-05-31/' + route + '/' + policyId,
            );
        }
      }
    } else
      errors.push({
        operation: 'distribution-resolution',
        code: 'ExpectedOneDistributionScopedBucketGrant',
        count: sourceArns.length,
      });
    if (iamUser) {
      for (const action of [
        'GetUser',
        'ListAttachedUserPolicies',
        'ListUserPolicies',
        'ListGroupsForUser',
      ]) {
        await signedRead(
          'iam',
          'iam-' + action,
          '/',
          new URLSearchParams({
            Action: action,
            Version: '2010-05-08',
            UserName: iamUser,
          }).toString(),
        );
      }
    }
    const summary = {
      observedAt: new Date().toISOString(),
      bucket: env.S3_BUCKET_NAME,
      region: env.AWS_REGION,
      bucketSha256: digest(env.S3_BUCKET_NAME),
      accountSha256: digest(account),
      principalSha256: digest(arn),
      configuredCloudFrontUrl: env.CLOUDFRONT_URL || null,
      objectCount: inventory.length,
      totalObjectBytes: inventory.reduce((n, o) => n + (o.Size || 0), 0),
      prefixSummary,
      inventorySha256: digest(
        fs.readFileSync(path.join(outputPath, 'object-inventory.private.json')),
      ),
      configurationReads: Object.keys(snapshots),
      errors,
      mutationPerformed: false,
    };
    write('summary.json', summary);
    console.log(
      JSON.stringify({
        objectCount: summary.objectCount,
        totalObjectBytes: summary.totalObjectBytes,
        capturedConfigurationReads: summary.configurationReads.length,
        errors,
        mutationPerformed: false,
      }),
    );
  } finally {
    s3.destroy();
  }
}
main().catch(e => {
  console.error(JSON.stringify({ snapshotFailed: true, errorCode: e.name, messageExcluded: true }));
  process.exitCode = 1;
});
