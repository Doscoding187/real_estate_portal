import {
  S3Client,
  GetBucketLocationCommand,
  GetBucketVersioningCommand,
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  GetBucketPolicyCommand,
  GetBucketReplicationCommand,
  GetBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';

export const FINANCE_STORAGE_REGION = 'af-south-1';
export const FINANCE_STORAGE_ACCOUNT = '914683204061';

export type FinanceBucketObservation = {
  bucket: string;
  region: string;
  versioning: string;
  encryption: string[];
  publicAccessBlock: Record<string, boolean>;
  tlsOnly: boolean;
  restrictedPrincipals: string[];
  automaticExpiry: boolean;
};

export function verifyFinanceBucketObservation(value: FinanceBucketObservation) {
  const failures: string[] = [];
  if (value.region !== FINANCE_STORAGE_REGION) failures.push('location');
  if (value.versioning !== 'Enabled') failures.push('versioning');
  if (value.encryption.length !== 1 || value.encryption[0] !== 'AES256')
    failures.push('encryption');
  if (
    ['BlockPublicAcls', 'IgnorePublicAcls', 'BlockPublicPolicy', 'RestrictPublicBuckets'].some(
      key => value.publicAccessBlock[key] !== true,
    )
  )
    failures.push('public access');
  if (!value.tlsOnly) failures.push('TLS');
  if (
    !value.restrictedPrincipals.length ||
    value.restrictedPrincipals.some(
      arn =>
        !new RegExp(
          `^arn:aws:iam::${FINANCE_STORAGE_ACCOUNT}:(root|(?:user|role)/[A-Za-z0-9+=,.@_/-]+)$`,
        ).test(arn),
    )
  )
    failures.push('principal isolation');
  if (value.automaticExpiry) failures.push('retention review/holds');
  if (failures.length)
    throw new Error(`Finance storage verification failed: ${failures.join(', ')}.`);
}

/** Control-plane reads only. No object contents, writes, keys or database access. */
export async function inspectSouthAfricanFinanceStorage(
  input: {
    primaryBucket: string;
    backupBucket: string;
    runtimeArn: string;
    operatorArn: string;
  },
  client = new S3Client({ region: FINANCE_STORAGE_REGION, maxAttempts: 1 }),
) {
  if (
    input.primaryBucket === input.backupBucket ||
    ![input.primaryBucket, input.backupBucket].every(name =>
      /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name),
    )
  ) {
    throw new Error('Two distinct dedicated bucket names are required.');
  }
  const observations: FinanceBucketObservation[] = [];
  try {
    for (const bucket of [input.primaryBucket, input.backupBucket]) {
      const target = { Bucket: bucket, ExpectedBucketOwner: FINANCE_STORAGE_ACCOUNT };
      const location = await client.send(new GetBucketLocationCommand(target));
      // Stop before treating an overseas bucket as the prepared domestic target.
      if (location.LocationConstraint !== FINANCE_STORAGE_REGION)
        throw new Error('Finance bucket location is not South Africa.');
      const versioning = await client.send(new GetBucketVersioningCommand(target));
      const encryption = await client.send(new GetBucketEncryptionCommand(target));
      const block = await client.send(new GetPublicAccessBlockCommand(target));
      const policyResponse = await client.send(new GetBucketPolicyCommand(target));
      const policy = JSON.parse(policyResponse.Policy || '{}') as {
        Statement?: Array<{
          Effect?: string;
          Principal?: string;
          Action?: string;
          Resource?: string[];
          Condition?: { Bool?: Record<string, string>; ArnNotEquals?: Record<string, string[]> };
        }>;
      };
      const statements = (policy.Statement || []).filter(
        statement =>
          statement.Effect === 'Deny' &&
          statement.Principal === '*' &&
          statement.Action === 's3:*' &&
          statement.Resource?.includes(`arn:aws:s3:::${bucket}`) &&
          statement.Resource.includes(`arn:aws:s3:::${bucket}/*`),
      );
      const restrictedPrincipals =
        statements.find(
          statement =>
            Object.keys(statement.Condition || {}).length === 1 &&
            Object.keys(statement.Condition?.ArnNotEquals || {}).length === 1 &&
            Array.isArray(statement.Condition?.ArnNotEquals?.['aws:PrincipalArn']),
        )?.Condition?.ArnNotEquals?.['aws:PrincipalArn'] || [];
      let automaticExpiry = false;
      try {
        const lifecycle = await client.send(new GetBucketLifecycleConfigurationCommand(target));
        automaticExpiry = (lifecycle.Rules || []).some(
          rule =>
            rule.Status === 'Enabled' &&
            Boolean(rule.Expiration || rule.NoncurrentVersionExpiration),
        );
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'NoSuchLifecycleConfiguration') throw error;
      }
      const observation: FinanceBucketObservation = {
        bucket,
        region: location.LocationConstraint,
        versioning: versioning.Status || '',
        encryption: (encryption.ServerSideEncryptionConfiguration?.Rules || []).map(
          rule => rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm || '',
        ),
        publicAccessBlock: (block.PublicAccessBlockConfiguration as Record<string, boolean>) || {},
        tlsOnly: statements.some(
          statement =>
            Object.keys(statement.Condition || {}).length === 1 &&
            Object.keys(statement.Condition?.Bool || {}).length === 1 &&
            statement.Condition?.Bool?.['aws:SecureTransport'] === 'false',
        ),
        restrictedPrincipals,
        automaticExpiry,
      };
      verifyFinanceBucketObservation(observation);
      if (
        !restrictedPrincipals.includes(input.operatorArn) ||
        (bucket === input.primaryBucket && !restrictedPrincipals.includes(input.runtimeArn)) ||
        (bucket === input.backupBucket && restrictedPrincipals.includes(input.runtimeArn))
      ) {
        throw new Error(
          'Finance primary/backup principal separation differs from the prepared arrangement.',
        );
      }
      observations.push(observation);
    }
    const replication = await client.send(
      new GetBucketReplicationCommand({
        Bucket: input.primaryBucket,
        ExpectedBucketOwner: FINANCE_STORAGE_ACCOUNT,
      }),
    );
    const rules = replication.ReplicationConfiguration?.Rules || [];
    if (
      rules.length !== 1 ||
      rules[0].Status !== 'Enabled' ||
      rules[0].Filter?.Prefix !== '' ||
      rules[0].Destination?.Bucket !== `arn:aws:s3:::${input.backupBucket}` ||
      rules[0].DeleteMarkerReplication?.Status !== 'Disabled' ||
      !replication.ReplicationConfiguration?.Role ||
      !observations.every(bucket =>
        bucket.restrictedPrincipals.includes(replication.ReplicationConfiguration!.Role!),
      )
    ) {
      throw new Error(
        'Domestic backup replication configuration differs from the prepared arrangement.',
      );
    }
    return {
      checkedAt: new Date().toISOString(),
      status: 'control_plane_verified' as const,
      observations,
      backupReplicationConfigured: true,
      runtimePermissionsExercised: false,
      recoveryExercised: false,
      migrationCompleted: false,
    };
  } finally {
    client.destroy();
  }
}
