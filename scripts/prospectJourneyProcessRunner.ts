import { spawn, type ChildProcess } from 'node:child_process';

export type ProcessRunResult = {
  command: string;
  args: readonly string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
};

export class ProspectJourneyChildError extends Error {
  constructor(
    message: string,
    readonly result: ProcessRunResult,
  ) {
    super(message);
    this.name = 'ProspectJourneyChildError';
  }
}

type RunOptions = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
  onChildStart?: (pid: number | null) => void;
  onChildClose?: (result: ProcessRunResult) => void;
};

const OUTPUT_LIMIT = 512 * 1024;

function redactOutput(value: string) {
  return value
    .replace(/mysql(?:2)?:\/\/[^\s'"`]+/gi, '<redacted-mysql-url>')
    .replace(/(password|pwd)=([^\s&]+)/gi, '$1=<redacted>');
}

/**
 * Runs exactly one foreground command at a time. Commands are their own Linux
 * process group so a timeout or harness interruption stops pnpm and every
 * descendant (including drizzle-kit) before a database cleanup can begin.
 */
export class ProspectJourneyProcessRunner {
  private active: ChildProcess | null = null;
  private closePromise: Promise<ProcessRunResult> | null = null;

  get activeChildPid() {
    return this.active?.pid ?? null;
  }

  get activeCount() {
    return this.active ? 1 : 0;
  }

  async run(command: string, args: readonly string[], options: RunOptions): Promise<ProcessRunResult> {
    if (this.active) {
      throw new Error('Prospect Journey E2E refused: another child process is still active.');
    }

    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.active = child;
    options.onChildStart?.(child.pid ?? null);

    let output = '';
    const collect = (chunk: Buffer) => {
      output = `${output}${chunk.toString()}`.slice(-OUTPUT_LIMIT);
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);

    const close = new Promise<ProcessRunResult>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (exitCode, signal) => {
        resolve({ command, args, exitCode, signal, output: redactOutput(output) });
      });
    });
    this.closePromise = close;

    let timeout: NodeJS.Timeout | undefined;
    let timedOut = false;
    if (options.timeoutMs) {
      timeout = setTimeout(() => {
        timedOut = true;
        void this.stop('SIGTERM');
      }, options.timeoutMs);
    }

    let result: ProcessRunResult;
    try {
      result = await close;
    } finally {
      if (timeout) clearTimeout(timeout);
      // A timeout waits for close in stop(). For ordinary completion, this is
      // where the registry becomes empty before the next command may start.
      if (this.active === child && !child.exitCode && !child.signalCode) {
        await close.catch(() => undefined);
      }
      if (this.active === child && (child.exitCode !== null || child.signalCode !== null)) {
        this.active = null;
        this.closePromise = null;
      }
    }

    options.onChildClose?.(result);
    if (timedOut) {
      throw new Error(`Prospect Journey E2E command timed out after ${options.timeoutMs}ms: ${command} ${args.join(' ')}`);
    }
    if (result.exitCode !== 0) {
      throw new ProspectJourneyChildError(
        `${command} ${args.join(' ')} failed (${result.exitCode ?? result.signal ?? 'unknown'}).`,
        result,
      );
    }
    return result;
  }

  async stop(signal: NodeJS.Signals = 'SIGTERM') {
    const child = this.active;
    const close = this.closePromise;
    if (!child || !close) return;

    if (child.pid) {
      try {
        // `detached` makes the child PID a process-group leader on Linux.
        process.kill(-child.pid, signal);
      } catch {
        child.kill(signal);
      }
    }

    await close.catch(() => undefined);
    if (this.active === child) {
      this.active = null;
      this.closePromise = null;
    }
  }
}
