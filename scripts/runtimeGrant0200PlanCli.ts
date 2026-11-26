import { runtimeGrant0200Plan } from '../server/_core/databaseAuthority/runtimeGrant0200Plan';

try {
  process.stdout.write(`${JSON.stringify(runtimeGrant0200Plan(), null, 2)}\n`);
} catch {
  process.stderr.write(
    '0200 runtime grant plan refused; inspect source lineage and canonical inventory before review.\n',
  );
  process.exitCode = 1;
}
