import { resolve } from 'node:path';
import {
  authorizeDatabaseOperation,
} from '../server/_core/databaseAuthority/authorization';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import type { DatabaseCredentialClass } from '../server/_core/databaseAuthority/types';
import { loadAndValidateMigrationManifest } from '../server/migrations/migrationManifest';
import { runSqlMigrations } from '../server/migrations/runSqlMigrations';

export async function applyFreshTestManifest(): Promise<void> {
  if (process.env.NODE_ENV !== 'test' || process.env.APP_ENV !== 'test') {
    throw new Error('Fresh test migration refused: NODE_ENV and APP_ENV must both be test.');
  }
  const manifest = loadAndValidateMigrationManifest();
  const authority = resolveDatabaseAuthority({
    operation: 'migration-apply',
    credentialClass: process.env.DATABASE_CREDENTIAL_CLASS as
      | DatabaseCredentialClass
      | undefined,
  });
  if (!['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass)) {
    throw new Error('Fresh test migration refused: target is not disposable test authority.');
  }
  const authorization = authorizeDatabaseOperation(authority);
  const result = await runSqlMigrations({
    mode: 'apply',
    authority,
    authorization,
    acceptedOldHead: null,
    expectedNewHead: manifest.document.expectedHead,
  });
  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        planId: result.plan.planId,
        targetFingerprintHash: result.plan.targetFingerprintHash,
        acceptedOldHead: result.plan.acceptedOldHead,
        expectedNewHead: result.plan.expectedNewHead,
        lock: result.lock,
        applied: result.applied,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  applyFreshTestManifest().catch(error => {
    console.error(error instanceof Error ? error.message : 'Fresh test migration failed.');
    process.exit(1);
  });
}
