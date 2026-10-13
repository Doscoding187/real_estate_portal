import { inspectSouthAfricanFinanceStorage } from './southAfricanFinanceStorage';

const [primaryBucket, backupBucket, runtimeArn, operatorArn] = process.argv.slice(2);
if (process.argv.length !== 6) {
  throw new Error(
    'Usage: verifySouthAfricanFinanceStorage.ts <primary bucket> <backup bucket> <runtime ARN> <operator ARN>. Credentials use the existing AWS SDK process/profile chain; never pass keys as arguments.',
  );
}
try {
  const result = await inspectSouthAfricanFinanceStorage({
    primaryBucket,
    backupBucket,
    runtimeArn,
    operatorArn,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch {
  process.stderr.write(
    'South African finance storage is NOT VERIFIED. Resolve the AWS operator session or failed location/security/backup check; no write, migration or restore was attempted.\n',
  );
  process.exitCode = 1;
}
