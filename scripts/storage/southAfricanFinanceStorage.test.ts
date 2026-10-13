import { describe, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import {
  inspectSouthAfricanFinanceStorage,
  verifyFinanceBucketObservation,
  type FinanceBucketObservation,
} from './southAfricanFinanceStorage';

const operatorArn = 'arn:aws:iam::914683204061:user/operator';
const runtimeArn = 'arn:aws:iam::914683204061:user/finance-runtime';
const role = 'arn:aws:iam::914683204061:role/domestic-replication';
const valid: FinanceBucketObservation = {
  bucket: 'finance-primary',
  region: 'af-south-1',
  versioning: 'Enabled',
  encryption: ['AES256'],
  publicAccessBlock: {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  },
  tlsOnly: true,
  restrictedPrincipals: [operatorArn, runtimeArn],
  automaticExpiry: false,
};

describe('South African finance storage evidence', () => {
  it.each([
    { region: 'eu-north-1' },
    { versioning: 'Suspended' },
    { encryption: [] },
    { publicAccessBlock: {} },
    { tlsOnly: false },
    { restrictedPrincipals: [] },
    { restrictedPrincipals: ['arn:aws:iam::111111111111:user/foreign'] },
    { automaticExpiry: true },
  ])('rejects a material security/location/retention gap: %s', delta => {
    expect(() => verifyFinanceBucketObservation({ ...valid, ...delta })).toThrow(
      'verification failed',
    );
  });

  function mockClient(location = 'af-south-1', backupAllowsRuntime = false) {
    const send = vi.fn(async command => {
      const bucket = command.input.Bucket;
      expect(command.input.ExpectedBucketOwner).toBe('914683204061');
      switch (command.constructor.name) {
        case 'GetBucketLocationCommand':
          return { LocationConstraint: location };
        case 'GetBucketVersioningCommand':
          return { Status: 'Enabled' };
        case 'GetBucketEncryptionCommand':
          return {
            ServerSideEncryptionConfiguration: {
              Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
            },
          };
        case 'GetPublicAccessBlockCommand':
          return { PublicAccessBlockConfiguration: valid.publicAccessBlock };
        case 'GetBucketPolicyCommand':
          return {
            Policy: JSON.stringify({
              Statement: [
                {
                  Effect: 'Deny',
                  Principal: '*',
                  Action: 's3:*',
                  Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
                  Condition: { Bool: { 'aws:SecureTransport': 'false' } },
                },
                {
                  Effect: 'Deny',
                  Principal: '*',
                  Action: 's3:*',
                  Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
                  Condition: {
                    ArnNotEquals: {
                      'aws:PrincipalArn': [
                        operatorArn,
                        role,
                        ...(bucket === 'finance-primary' || backupAllowsRuntime
                          ? [runtimeArn]
                          : []),
                      ],
                    },
                  },
                },
              ],
            }),
          };
        case 'GetBucketLifecycleConfigurationCommand':
          throw Object.assign(new Error('No lifecycle'), { name: 'NoSuchLifecycleConfiguration' });
        case 'GetBucketReplicationCommand':
          return {
            ReplicationConfiguration: {
              Role: role,
              Rules: [
                {
                  Status: 'Enabled',
                  Filter: { Prefix: '' },
                  DeleteMarkerReplication: { Status: 'Disabled' },
                  Destination: { Bucket: 'arn:aws:s3:::finance-backup' },
                },
              ],
            },
          };
        default:
          throw new Error('A mutation or unexpected operation was attempted.');
      }
    });
    const destroy = vi.fn();
    return { client: { send, destroy } as unknown as S3Client, send, destroy };
  }
  const input = {
    primaryBucket: 'finance-primary',
    backupBucket: 'finance-backup',
    operatorArn,
    runtimeArn,
  };

  it('verifies control-plane evidence without claiming a restore or migration', async () => {
    const mock = mockClient();
    const result = await inspectSouthAfricanFinanceStorage(input, mock.client);
    expect(result).toMatchObject({
      status: 'control_plane_verified',
      backupReplicationConfigured: true,
      runtimePermissionsExercised: false,
      recoveryExercised: false,
      migrationCompleted: false,
    });
    expect(mock.destroy).toHaveBeenCalledOnce();
  });
  it('stops on actual overseas location before later provider checks', async () => {
    const mock = mockClient('eu-north-1');
    await expect(inspectSouthAfricanFinanceStorage(input, mock.client)).rejects.toThrow(
      'not South Africa',
    );
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(mock.destroy).toHaveBeenCalledOnce();
  });
  it('rejects a backup bucket accessible by the application identity', async () => {
    const mock = mockClient('af-south-1', true);
    await expect(inspectSouthAfricanFinanceStorage(input, mock.client)).rejects.toThrow(
      'principal separation',
    );
    expect(mock.destroy).toHaveBeenCalledOnce();
  });
});
