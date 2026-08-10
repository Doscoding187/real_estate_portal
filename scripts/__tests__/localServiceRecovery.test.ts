import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type Fixture = {
  root: string;
  serviceRoot: string;
  dataDir: string;
  pidPath: string;
  socketPath: string;
  lockPath: string;
  logPath: string;
  scriptPath: string;
  binDirectory: string;
};

const fixtures: string[] = [];
const children: ChildProcess[] = [];

function deadPid(): number {
  let pid = process.pid + 100000;
  while (existsSync(`/proc/${pid}`)) pid += 1;
  return pid;
}

function fixture(): Fixture {
  const root = mkdtempSync('/var/tmp/property-listify-recovery-test-');
  fixtures.push(root);
  const serviceUidRoot = join(root, 'uid-root');
  const serviceRoot = join(serviceUidRoot, 'mysql-3307');
  const binDirectory = join(root, 'bin');
  mkdirSync(serviceRoot, { recursive: true, mode: 0o700 });
  mkdirSync(binDirectory, { recursive: true, mode: 0o700 });
  chmodSync(serviceUidRoot, 0o700);
  chmodSync(serviceRoot, 0o700);

  const source = readFileSync(join(process.cwd(), 'scripts/local-db.sh'), 'utf8');
  const fixtureSource = source.replace(
    'readonly SERVICE_UID_ROOT="$TMP_PARENT/property-listify-$SERVICE_USER_ID"',
    `readonly SERVICE_UID_ROOT="${serviceUidRoot}"`,
  );
  const scriptPath = join(root, 'local-db-fixture.sh');
  writeFileSync(scriptPath, fixtureSource, { mode: 0o700 });
  chmodSync(scriptPath, 0o700);

  return {
    root,
    serviceRoot,
    dataDir: join(serviceRoot, 'data'),
    pidPath: join(serviceRoot, 'mysqld.pid'),
    socketPath: join(serviceRoot, 'mysql.sock'),
    lockPath: join(serviceRoot, 'mysql.sock.lock'),
    logPath: join(serviceRoot, 'mysqld.log'),
    scriptPath,
    binDirectory,
  };
}

function run(
  fixtureState: Fixture,
  action = 'recover',
  path = process.env.PATH,
): ReturnType<typeof spawnSync> {
  return spawnSync('bash', [fixtureState.scriptPath, action], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: path,
    },
  });
}

function output(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function writePid(fixtureState: Fixture, pid: number): void {
  writeFileSync(fixtureState.pidPath, `${pid}\n`, { mode: 0o600 });
}

function writeLock(fixtureState: Fixture, pid: number): void {
  writeFileSync(fixtureState.lockPath, `${pid}\n`, { mode: 0o600 });
  chmodSync(fixtureState.lockPath, 0o600);
}

function createStaleSocket(socketPath: string): void {
  const result = spawnSync('python3', [
    '-c',
    'import socket, sys; s=socket.socket(socket.AF_UNIX); s.bind(sys.argv[1]); s.close()',
    socketPath,
  ]);
  expect(result.status).toBe(0);
}

async function holdUnixSocket(socketPath: string): Promise<ChildProcess> {
  const child = spawn(
    'python3',
    [
      '-u',
      '-c',
      'import socket, sys, time; s=socket.socket(socket.AF_UNIX); s.bind(sys.argv[1]); s.listen(1); print("ready", flush=True); time.sleep(30)',
      socketPath,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  children.push(child);
  await once(child.stdout!, 'data');
  return child;
}

async function holdFile(path: string): Promise<ChildProcess> {
  const child = spawn(
    'python3',
    [
      '-u',
      '-c',
      'import sys, time; f=open(sys.argv[1], "r"); print("ready", flush=True); time.sleep(30)',
      path,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  children.push(child);
  await once(child.stdout!, 'data');
  return child;
}

function prepareDataSentinels(fixtureState: Fixture): void {
  const mysqlDirectory = join(fixtureState.dataDir, 'mysql');
  mkdirSync(mysqlDirectory, { recursive: true, mode: 0o700 });
  chmodSync(fixtureState.dataDir, 0o700);
  const fingerprint = createHash('sha256')
    .update(`127.0.0.1:3307:${fixtureState.serviceRoot}:${fixtureState.dataDir}`)
    .digest('hex');
  const identityPath = join(fixtureState.serviceRoot, 'service.identity');
  writeFileSync(identityPath, `${fingerprint}\n`, { mode: 0o600 });
  chmodSync(identityPath, 0o600);
  writeFileSync(join(fixtureState.dataDir, 'authority-sentinel.txt'), 'database data preserved\n');
  writeFileSync(fixtureState.logPath, 'service log preserved\n');
}

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await once(child, 'exit').catch(() => undefined);
    }
  }
  while (fixtures.length) rmSync(fixtures.pop()!, { recursive: true, force: true });
});

describe('governed local service runtime recovery', () => {
  it('treats a cleanly stopped service as an idempotent no-op', () => {
    const state = fixture();

    const first = run(state);
    const second = run(state);

    expect(first.status).toBe(0);
    expect(output(first)).toContain('cleanly stopped');
    expect(second.status).toBe(0);
    expect(output(second)).toContain('safe no-op');
  });

  it.each([
    ['stale PID only', (state: Fixture) => writePid(state, deadPid())],
    ['stale socket only', (state: Fixture) => createStaleSocket(state.socketPath)],
    ['stale lock only', (state: Fixture) => writeLock(state, deadPid())],
    [
      'stale PID, socket and lock together',
      (state: Fixture) => {
        const pid = deadPid();
        writePid(state, pid);
        createStaleSocket(state.socketPath);
        writeLock(state, pid);
      },
    ],
  ])('%s is normalized without touching protected files', (_name, prepare) => {
    const state = fixture();
    prepare(state);
    prepareDataSentinels(state);

    const result = run(state);

    expect(result.status).toBe(0);
    expect(output(result)).toContain('safely recoverable stale metadata');
    expect(existsSync(state.pidPath)).toBe(false);
    expect(existsSync(state.socketPath)).toBe(false);
    expect(existsSync(state.lockPath)).toBe(false);
    expect(readFileSync(join(state.dataDir, 'authority-sentinel.txt'), 'utf8')).toContain(
      'preserved',
    );
    expect(readFileSync(state.logPath, 'utf8')).toContain('preserved');
  });

  it('is idempotent after stale metadata recovery', () => {
    const state = fixture();
    writePid(state, deadPid());
    createStaleSocket(state.socketPath);
    writeLock(state, deadPid());

    expect(run(state).status).toBe(0);
    const second = run(state);

    expect(second.status).toBe(0);
    expect(output(second)).toContain('cleanly stopped');
  });

  it('refuses a live unexpected PID and preserves it', () => {
    const state = fixture();
    writePid(state, process.pid);

    const result = run(state);

    expect(result.status).not.toBe(0);
    expect(output(result)).toMatch(/live unexpected process|ambiguous/i);
    expect(readFileSync(state.pidPath, 'utf8')).toContain(String(process.pid));
  });

  it('refuses an occupied authority port', () => {
    const state = fixture();
    const ssPath = join(state.binDirectory, 'ss');
    writeFileSync(
      ssPath,
      '#!/usr/bin/env bash\nprintf "%s\\n" "LISTEN 0 128 127.0.0.1:3307 0.0.0.0:*"\n',
      { mode: 0o700 },
    );
    chmodSync(ssPath, 0o700);
    writePid(state, deadPid());

    const result = run(state, 'recover', `${state.binDirectory}:${process.env.PATH ?? ''}`);

    expect(result.status).not.toBe(0);
    expect(output(result)).toContain('port 3307 is occupied');
    expect(existsSync(state.pidPath)).toBe(true);
  });

  it('refuses an opened socket', async () => {
    const state = fixture();
    const child = await holdUnixSocket(state.socketPath);

    const result = run(state);

    expect(result.status).not.toBe(0);
    expect(output(result)).toContain('runtime artifact is open by a process');
    expect(existsSync(state.socketPath)).toBe(true);
    child.kill('SIGTERM');
  });

  it('refuses an opened lock file', async () => {
    const state = fixture();
    writeLock(state, deadPid());
    const child = await holdFile(state.lockPath);

    const result = run(state);

    expect(result.status).not.toBe(0);
    expect(output(result)).toContain('runtime artifact is open by a process');
    expect(existsSync(state.lockPath)).toBe(true);
    child.kill('SIGTERM');
  });

  it('fails closed on wrong ownership metadata', () => {
    const state = fixture();
    const statPath = join(state.binDirectory, 'stat');
    writeFileSync(
      statPath,
      `#!/usr/bin/env bash\nif [[ "$*" == *"%u"* && "$*" == *"${state.socketPath}"* ]]; then printf '2000\\n'; else exec /usr/bin/stat "$@"; fi\n`,
      { mode: 0o700 },
    );
    chmodSync(statPath, 0o700);
    createStaleSocket(state.socketPath);

    const result = run(state, 'recover', `${state.binDirectory}:${process.env.PATH ?? ''}`);

    expect(result.status).not.toBe(0);
    expect(output(result)).toContain('not owned by the current user');
    expect(existsSync(state.socketPath)).toBe(true);
  });

  it('fails closed on symlink, malformed and contradictory metadata', () => {
    const symlinkState = fixture();
    const target = join(symlinkState.root, 'pid-target');
    writeFileSync(target, `${deadPid()}\n`);
    symlinkSync(target, symlinkState.pidPath);
    expect(run(symlinkState).status).not.toBe(0);

    const malformedPidState = fixture();
    writeFileSync(malformedPidState.pidPath, 'not-a-pid\n', { mode: 0o600 });
    expect(run(malformedPidState).status).not.toBe(0);

    const malformedLockState = fixture();
    writeFileSync(malformedLockState.lockPath, 'not-a-pid\n', { mode: 0o600 });
    expect(run(malformedLockState).status).not.toBe(0);

    const contradictoryState = fixture();
    const firstDeadPid = deadPid();
    writePid(contradictoryState, firstDeadPid);
    writeLock(contradictoryState, firstDeadPid + 1);
    const result = run(contradictoryState);
    expect(result.status).not.toBe(0);
    expect(output(result)).toContain('contradict');
  });
});
