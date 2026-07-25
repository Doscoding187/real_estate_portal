import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function packageScripts(): Record<string, string> {
  return (
    JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    }
  ).scripts;
}

describe('database local lifecycle authority', () => {
  it('retires the legacy root Compose stack', () => {
    expect(existsSync(join(ROOT, 'docker-compose.yml'))).toBe(false);
    expect(existsSync(join(ROOT, 'docker-compose.local-db.yml'))).toBe(true);

    const compose = read('docker-compose.local-db.yml');

    expect(compose).toContain('mysql-local:');
    expect(compose).toContain('container_name: listify-mysql-local');
    expect(compose).toContain('MYSQL_DATABASE: listify_local');
    expect(compose).toContain('"127.0.0.1:3307:3306"');
    expect(compose).toContain(
      './docker/mysql-local/init:/docker-entrypoint-initdb.d:ro',
    );

    expect(compose).not.toContain('adminer:');
    expect(compose).not.toContain('phpmyadmin:');
    expect(compose).not.toContain('real_estate_portal');
  });

  it('keeps the Makefile as a package-command alias layer', () => {
    const makefile = read('Makefile');

    expect(makefile).toContain(
      'docker-up:\n\t@pnpm db:local:start',
    );
    expect(makefile).toContain(
      'docker-down:\n\t@pnpm db:local:stop',
    );
    expect(makefile).toContain(
      'db-migrate:\n\t@pnpm db:migrate:local',
    );
    expect(makefile).toContain(
      'db-seed:\n\t@pnpm db:seed:local',
    );
    expect(makefile).toContain(
      'dev-full: env\n\t@pnpm db:prepare:local',
    );
    expect(makefile).toContain(
      'env:\n\t@test -f .env.local || cp .env.example .env.local',
    );

    for (const prohibited of [
      'docker compose',
      'docker exec',
      'DOCKER_COMPOSE',
      'propertylistify-mysql',
      'propertylistify_dev',
      'docker-reset:',
      'docker-logs:',
      'db-shell:',
      'if not exist',
      'copy .env',
    ]) {
      expect(makefile).not.toContain(prohibited);
    }
  });

  it('uses explicit non-destructive, destructive, and demo-reset names', () => {
    const scripts = packageScripts();

    expect(scripts['db:prepare:local']).toBe(
      'cross-env NODE_ENV=development APP_ENV=development tsx scripts/localDbWorkflow.ts start',
    );
    expect(scripts['db:reprovision:local']).toBe(
      'cross-env NODE_ENV=development APP_ENV=development tsx scripts/localDbWorkflow.ts reprovision',
    );
    expect(scripts['db:demo:reset:local']).toBe(
      'cross-env NODE_ENV=development LOCAL_SEED_ALLOWED=true tsx server/scripts/localDemoSeed.ts reset local',
    );

    for (const retired of [
      'db:start:local',
      'db:migrate:fresh:local',
      'db:bootstrap:local',
      'db:migrate:dev',
      'db:reset:local',
    ]) {
      expect(scripts[retired]).toBeUndefined();
    }
  });

  it('pins local infrastructure and destructive paths exactly', () => {
    const shell = read('scripts/local-db.sh');

    for (const authority of [
      'readonly PORT=3307',
      'readonly HOST=127.0.0.1',
      'readonly LOCAL_DIR=/tmp/listify-mysql-3307',
      'readonly ROOT_PASSWORD=listify_root_password',
      'readonly APP_PASSWORD=listify_app_password',
      'readonly TEST_PASSWORD=listify_test_password',
      'readonly LISTING_PERFORMANCE_E2E_DATABASE=listify_listing_performance_e2e',
      'readonly PROSPECT_JOURNEY_E2E_DATABASE=listify_prospect_journey_e2e',
    ]) {
      expect(shell).toContain(authority);
    }

    expect(shell).toContain(
      'COMPOSE_FILE="$ROOT_DIR/docker-compose.local-db.yml"',
    );
    expect(shell).toContain('assert_native_local_directory');
    expect(shell).toContain('rm -rf -- "$LOCAL_DIR"');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_PORT');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_HOST');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_DIR');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_ROOT_PASSWORD');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_APP_PASSWORD');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_TEST_PASSWORD');

    const overrideTokens = [
      ...new Set(
        shell.match(/LISTIFY_LOCAL_DB_[A-Z_]+/g) ?? [],
      ),
    ].sort();

    expect(overrideTokens).toEqual(['LISTIFY_LOCAL_DB_MODE']);
  });

  it('keeps the orchestrator local, guarded, and migration-delegating', () => {
    const workflow = read('scripts/localDbWorkflow.ts');
    const hostBlock = workflow.match(
      /const LOCAL_HOSTS = new Set\(\[([\s\S]*?)\]\);/,
    );

    expect(hostBlock).not.toBeNull();

    const hosts = Array.from(
      hostBlock?.[1].matchAll(/'([^']+)'/g) ?? [],
      match => match[1],
    ).sort();

    expect(hosts).toEqual([
      '127.0.0.1',
      '::1',
      'host.docker.internal',
      'listify-mysql-local',
      'localhost',
    ]);

    expect(workflow).toContain(
      "const REPROVISION_ACKNOWLEDGEMENT = 'I_UNDERSTAND_LISTIFY_LOCAL_WILL_BE_DESTROYED'",
    );
    expect(workflow).toContain(
      "['pnpm', ['db:migrate:local']]",
    );
    expect(workflow).toContain(
      "['pnpm', ['db:verify:distribution']]",
    );
    expect(workflow).toContain(
      "['pnpm', ['db:verify:local-demo']]",
    );

    for (const parallelAuthority of [
      'SHOWING_STATUS_ENUM',
      'information_schema',
      'sql_migration_history',
      'requiredTables',
      'migrationFiles',
      'verifyLocalDatabase',
      'verifyLocalDemoSeed',
    ]) {
      expect(workflow).not.toContain(parallelAuthority);
    }

    for (const retiredHost of [
      "'real-estate-mysql'",
      "'mysql'",
      "'db'",
    ]) {
      expect(workflow).not.toContain(retiredHost);
    }
  });
});

describe('database local lifecycle manifest authority', () => {
  it('records approved lifecycle ownership and closes deferred Gap 3', () => {
    const manifest = JSON.parse(
      read('docs/database-authority/migration-tree-authority.json'),
    ) as {
      classifications: Array<{
        path: string;
        classification: string;
        purpose: string;
      }>;
      prohibitedPaths: string[];
      manualUtilityAuthority: {
        knownManualSchemaExecutorCandidates: string[];
        directSchemaCandidateClasses: Record<string, string[]>;
        deferredGap3Utilities: string[];
        implementationAuditDocumentationFiles: string[];
      };
    };

    const classifications = new Map(
      manifest.classifications.map(entry => [
        entry.path,
        entry.classification,
      ]),
    );

    expect(classifications.get('docker-compose.local-db.yml')).toBe(
      'approved local/test lifecycle infrastructure',
    );
    expect(classifications.get('scripts/local-db.sh')).toBe(
      'approved local/test lifecycle infrastructure',
    );
    expect(classifications.get('scripts/localDbWorkflow.ts')).toBe(
      'approved guarded local orchestration',
    );

    expect(manifest.prohibitedPaths).toContain('docker-compose.yml');

    const manual = manifest.manualUtilityAuthority;

    for (const path of [
      'scripts/local-db.sh',
      'scripts/localDbWorkflow.ts',
    ]) {
      expect(
        manual.knownManualSchemaExecutorCandidates,
      ).not.toContain(path);

      expect(
        manual.directSchemaCandidateClasses[
          'deferred schema executor'
        ],
      ).not.toContain(path);

      expect(manual.deferredGap3Utilities).not.toContain(path);
    }

    expect(manual.implementationAuditDocumentationFiles).toContain(
      'docs/database-authority/dba-s3c6b2-local-lifecycle-authority-audit-and-consolidation-plan.md',
    );
  });
});
