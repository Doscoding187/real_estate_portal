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

    expect(compose).toContain('mysql-authority-3307:');
    expect(compose).toContain('container_name: listify-mysql-authority-3307');
    expect(compose).toContain("MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'");
    expect(compose).toContain("'127.0.0.1:3307:3306'");
    expect(compose).not.toContain('MYSQL_DATABASE:');
    expect(compose).not.toContain('docker-entrypoint-initdb.d');
    expect(compose).not.toContain('listify_local');
    expect(compose).not.toContain('MYSQL_USER:');
    expect(compose).not.toContain('MYSQL_PASSWORD:');

    expect(compose).not.toContain('adminer:');
    expect(compose).not.toContain('phpmyadmin:');
    expect(compose).not.toContain('real_estate_portal');
  });

  it('keeps the Makefile as a package-command alias layer', () => {
    const makefile = read('Makefile');

    expect(makefile).toContain('docker-up:\n\t@pnpm db:local:start');
    expect(makefile).toContain('docker-down:\n\t@pnpm db:local:stop');
    expect(makefile).toContain('db-migrate:\n\t@pnpm db:migrate:local');
    expect(makefile).toContain('db-seed:\n\t@pnpm db:seed:local');
    expect(makefile).toContain('dev-full: env\n\t@pnpm db:prepare:local');
    expect(makefile).toContain('env:\n\t@test -f .env.local || cp .env.example .env.local');

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

  it('routes owned lifecycle commands and retires fixed-database mutation names', () => {
    const scripts = packageScripts();

    expect(scripts['db:worktree:create']).toContain('databaseAuthorityCli.ts worktree:create');
    expect(scripts['db:worktree:dispose']).toContain('databaseAuthorityCli.ts worktree:dispose');
    expect(scripts['db:worktree:ack']).toContain('databaseAuthorityCli.ts worktree:ack');
    for (const retired of [
      'db:prepare:local',
      'db:reprovision:local',
      'db:demo:reset:local',
      'db:test:rebuild',
    ]) {
      expect(scripts[retired]).toContain('scripts/retiredDatabaseMutation.ts');
    }

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

  it('pins local infrastructure and refuses destructive shell dispatch', () => {
    const shell = read('scripts/local-db.sh');

    for (const authority of [
      'readonly PORT=3307',
      'readonly HOST=127.0.0.1',
      'readonly TMP_PARENT=/var/tmp',
      'readonly SERVICE_UID_ROOT=',
      'readonly LEGACY_SERVICE_ROOT=',
      'readonly SERVICE_ROOT=',
      'readonly DATA_DIR=',
      'readonly SOCKET_PATH=',
      'readonly LOCK_FILE=',
      'readonly PID_FILE=',
      'readonly LOG_FILE=',
      'readonly IDENTITY_FILE=',
      'assert_native_mode',
      'assert_non_root_user',
      'assert_shared_tmp_parent',
      'assert_expected_direct_children',
      'assert_service_artifacts_are_not_symlinked',
      'report_legacy_residue',
      'pid_matches_service',
      'assert_runtime_artifact_shapes',
      'assert_no_runtime_openers',
      'classify_runtime_state',
      'normalize_runtime_state',
      'recover()',
      'lsof',
      '30-second bound',
    ]) {
      expect(shell).toContain(authority);
    }

    expect(shell).not.toContain('COMPOSE_FILE=');
    expect(shell).not.toContain('CREATE DATABASE');
    expect(shell).not.toContain('CREATE USER');
    expect(shell).not.toContain('GRANT ');
    expect(shell).not.toContain('listify_local');
    expect(shell).not.toContain('3306');
    expect(shell).not.toContain('kill -9');
    expect(shell).not.toContain('kill -TERM');
    expect(shell).not.toContain('pkill');
    expect(shell).not.toContain('killall');
    expect(shell).not.toContain('rm -rf');
    expect(shell).not.toContain('SERVICE_ROOT="$SERVICE_USER_HOME');
    expect(shell).not.toContain('mkdir -p "$SERVICE_ROOT"');
    expect(shell).not.toContain('mkdir -p "$SERVICE_UID_ROOT"');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_PORT');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_HOST');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_DIR');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_ROOT_PASSWORD');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_APP_PASSWORD');
    expect(shell).not.toContain('${LISTIFY_LOCAL_DB_TEST_PASSWORD');

    const overrideTokens = [...new Set(shell.match(/LISTIFY_LOCAL_DB_[A-Z_]+/g) ?? [])].sort();

    expect(overrideTokens).toEqual(['LISTIFY_LOCAL_DB_MODE']);
    expect(shell).toContain('Database Authority service-only lifecycle');
    expect(shell).toContain('Legacy home service residue is inactive and never adopted');
    expect(shell).toContain('direct database mutation is retired');
  });

  it('pins the UID-owned AppArmor-compatible service tree and rejects ambiguous state', () => {
    const shell = read('scripts/local-db.sh');

    expect(shell).toContain(
      'readonly SERVICE_UID_ROOT="$TMP_PARENT/property-listify-$SERVICE_USER_ID"',
    );
    expect(shell).toContain('stat -c \'%u\' "$TMP_PARENT"');
    expect(shell).toContain('= "0"');
    expect(shell).toContain('stat -c \'%a\' "$TMP_PARENT"');
    expect(shell).toContain('= "1777"');
    expect(shell).toContain('assert_owned_directory "$SERVICE_UID_ROOT"');
    expect(shell).toContain('root execution is prohibited');
    expect(shell).toContain('assert_expected_direct_children "$SERVICE_UID_ROOT" "mysql-3307"');
    expect(shell).toContain('assert_not_symlink "$TMP_PARENT"');
    expect(shell).toContain('assert_not_symlink "$path"');
    expect(shell).toContain(
      'assert_expected_direct_children "$SERVICE_ROOT" "data" "mysql.sock" "mysql.sock.lock" "mysqld.pid" "mysqld.log" "service.identity"',
    );
    expect(shell).toContain('mkdir -- "$SERVICE_UID_ROOT"');
    expect(shell).toContain('mkdir -- "$SERVICE_ROOT"');
    expect(shell).toContain('umask 077');
    expect(shell).toContain('never adopted or deleted by this command');
  });

  it('authorizes only the exact MySQL socket lock and uses socket shutdown without signal or TCP fallback', () => {
    const shell = read('scripts/local-db.sh');
    const stopStart = shell.indexOf('stop()');
    const retiredStart = shell.indexOf('retired()', stopStart);
    const stopBlock = shell.slice(stopStart, retiredStart);

    expect(shell).toContain('readonly LOCK_FILE="$SERVICE_ROOT/mysql.sock.lock"');
    expect(shell).toContain('read_socket_lock_pid');
    expect(shell).toContain('assert_socket_lock_state');
    expect(shell).toContain('value !~ /^[0-9]+$/');
    expect(shell).toContain('socket lock must have mode 0600');
    expect(shell).toContain('socket lock PID does not match the exact service PID');
    expect(shell).toContain('socket lock has no exact canonical Unix socket');
    expect(shell).toContain('assert_not_symlink "$LOCK_FILE"');
    expect(shell).toContain('assert_not_symlink "$SOCKET_PATH"');

    expect(stopBlock).toContain('assert_socket_lock_state "$pid"');
    expect(stopBlock).toContain('mysqladmin');
    expect(stopBlock).toContain('--no-defaults');
    expect(stopBlock).toContain('--protocol=socket');
    expect(stopBlock).toContain('--socket="$SOCKET_PATH"');
    expect(stopBlock).toContain('--connect-timeout=5');
    expect(stopBlock).toContain('--shutdown-timeout=30');
    expect(stopBlock).toContain('shutdown');
    expect(stopBlock).toContain('assert_port_free');
    expect(stopBlock).toContain('normalize_runtime_state');
    expect(stopBlock).not.toContain('kill -');
    expect(stopBlock).not.toContain('tcp_ping');
    expect(stopBlock).not.toContain('pkill');
    expect(stopBlock).not.toContain('killall');
  });

  it('fails closed on stale and partial PID/socket state without automatic cleanup', () => {
    const shell = read('scripts/local-db.sh');
    const stateStart = shell.indexOf('assert_known_process_or_stopped()');
    const portStart = shell.indexOf('port_has_listener()', stateStart);
    const stateBlock = shell.slice(stateStart, portStart);

    expect(stateBlock).toContain('service PID file is stale; preserved evidence requires review');
    expect(stateBlock).toContain(
      'canonical Unix socket exists without an exact running service PID',
    );
    expect(stateBlock).toContain('socket lock exists without an exact service PID file');
    expect(stateBlock).toContain('approved mysqld process exists without an exact PID file');
    expect(stateBlock).toContain(
      'port $PORT is occupied without an exact running service identity',
    );
    expect(stateBlock).toContain('if port_has_listener; then');
    expect(stateBlock).toContain('return 0');
    expect(stateBlock).not.toContain('rm -f');
    expect(shell).toContain('for path in "$PID_FILE" "$SOCKET_PATH" "$LOCK_FILE"');
    expect(shell).not.toContain('rm -rf');
    expect(shell).not.toContain('rm -f -- "$PID_FILE"');

    for (const command of ['start()', 'status()', 'stop()']) {
      const commandStart = shell.indexOf(command);
      const nextCommand = shell.indexOf('\n}\n', commandStart);
      expect(commandStart).toBeGreaterThanOrEqual(0);
      expect(shell.slice(commandStart, nextCommand)).toContain('assert_known_process_or_stopped');
    }
  });

  it('honours the native MySQL fresh-directory initialization contract', () => {
    const shell = read('scripts/local-db.sh');
    const initializeStart = shell.indexOf('native_initialize_if_needed()');
    const waitStart = shell.indexOf('wait_for_tcp()');
    const initializeBlock = shell.slice(initializeStart, waitStart);

    expect(initializeBlock).toContain('assert_data_state');
    expect(initializeBlock).toContain('--initialize-insecure');
    expect(initializeBlock).toContain('--datadir="$DATA_DIR"');
    expect(initializeBlock).not.toContain('mkdir "$DATA_DIR"');
    expect(initializeBlock).not.toContain('mkdir -p "$DATA_DIR"');
    expect(initializeBlock).toContain(
      'MySQL initialization completed without creating the exact data directory',
    );
    expect(shell).toContain(
      'the exact pre-initialization path must be removed by an approved cleanup packet before retry',
    );
    expect(shell).toContain('assert_not_symlink "$DATA_DIR/mysql"');
    expect(initializeBlock).toContain(
      'service identity exists without an initialized data directory',
    );
    expect(initializeBlock).toContain(
      'printf \'%s\\n\' "$(service_fingerprint)" > "$IDENTITY_FILE"',
    );
    expect(shell).toContain('initialized data state has no exact service identity marker');
    expect(shell).toContain('service identity does not match the approved service fingerprint');
    expect(shell).toContain('chmod 600 "$IDENTITY_FILE"');
    expect(shell).toContain('assert_known_process_or_stopped');
    expect(shell).toContain('assert_tcp_owner');
    expect(shell).toContain('assert_socket_lock_state');
    expect(shell).toContain('mysqladmin');
    expect(shell).not.toContain('kill -TERM "$pid"');
  });

  it('keeps the legacy orchestrator fail-closed while compatibility exports remain', () => {
    const workflow = read('scripts/localDbWorkflow.ts');
    expect(workflow).toContain('localDbWorkflow direct execution is retired');
    expect(workflow).toContain("['pnpm', ['db:reference:prepare']]");
    expect(workflow).toContain("['pnpm', ['db:scenario:prepare']]");
    expect(workflow).not.toContain('listify_local');
    expect(workflow).not.toContain('mysql2');

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

    for (const retiredHost of ["'real-estate-mysql'", "'mysql'", "'db'"]) {
      expect(workflow).not.toContain(retiredHost);
    }
  });
});

describe('database local lifecycle manifest authority', () => {
  it('records approved lifecycle ownership and closes deferred Gap 3', () => {
    const manifest = JSON.parse(read('docs/database-authority/migration-tree-authority.json')) as {
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
      manifest.classifications.map(entry => [entry.path, entry.classification]),
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
    expect(classifications.get('scripts/testDbWorkflow.ts')).toBe(
      'approved guarded local orchestration',
    );

    expect(manifest.prohibitedPaths).toContain('docker-compose.yml');

    const manual = manifest.manualUtilityAuthority;

    for (const path of [
      'scripts/local-db.sh',
      'scripts/localDbWorkflow.ts',
      'scripts/testDbWorkflow.ts',
    ]) {
      expect(manual.knownManualSchemaExecutorCandidates).not.toContain(path);

      expect(manual.directSchemaCandidateClasses['deferred schema executor']).not.toContain(path);

      expect(manual.deferredGap3Utilities).not.toContain(path);
    }

    expect(manual.implementationAuditDocumentationFiles).toContain(
      'docs/database-authority/dba-s3c6b2-local-lifecycle-authority-audit-and-consolidation-plan.md',
    );
  });
});
