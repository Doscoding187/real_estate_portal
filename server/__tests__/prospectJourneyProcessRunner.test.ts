import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProspectJourneyChildError, ProspectJourneyProcessRunner } from '../../scripts/prospectJourneyProcessRunner';

const fixture = join(process.cwd(), 'server/__tests__/fixtures/prospect-journey-child.mjs');
const runners: ProspectJourneyProcessRunner[] = [];
const pidFiles: string[] = [];

function runner() {
  const value = new ProspectJourneyProcessRunner();
  runners.push(value);
  return value;
}

function options(timeoutMs?: number) {
  return { cwd: process.cwd(), env: { ...process.env, CI: '1' }, timeoutMs };
}

function pidFile(name: string) {
  const value = join('/tmp', `prospect-journey-process-${process.pid}-${name}.pid`);
  pidFiles.push(value);
  return value;
}

afterEach(async () => {
  await Promise.all(runners.map(value => value.stop()));
  for (const file of pidFiles) rmSync(file, { force: true });
  runners.length = 0;
  pidFiles.length = 0;
});

describe('Prospect Journey E2E child lifecycle', () => {
  it('records successful child completion and empties the registry', async () => {
    const value = runner();
    const result = await value.run(process.execPath, [fixture, 'success'], options());
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('fixture success');
    expect(value.activeCount).toBe(0);
  });

  it('reports a non-zero exit without retaining the child', async () => {
    const value = runner();
    await expect(value.run(process.execPath, [fixture, 'failure'], options())).rejects.toBeInstanceOf(ProspectJourneyChildError);
    expect(value.activeCount).toBe(0);
  });

  it('terminates a timed-out command and waits for it to close', async () => {
    const value = runner();
    await expect(value.run(process.execPath, [fixture, 'sleep'], options(150))).rejects.toThrow('timed out');
    expect(value.activeCount).toBe(0);
  });

  it('terminates the complete process group, including a grandchild', async () => {
    const value = runner();
    const grandchildPid = pidFile('grandchild');
    const pending = value.run(process.execPath, [fixture, 'grandchild', grandchildPid], options());
    for (let attempt = 0; !existsSync(grandchildPid) && attempt < 40; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    expect(existsSync(grandchildPid)).toBe(true);
    const childPid = Number(readFileSync(grandchildPid, 'utf8'));
    await value.stop();
    await expect(pending).rejects.toBeInstanceOf(ProspectJourneyChildError);
    expect(value.activeCount).toBe(0);
    expect(() => process.kill(childPid, 0)).toThrow();
  });

  it('prevents overlapping commands and permits cleanup only after child exit', async () => {
    const value = runner();
    const events: string[] = [];
    const pending = value.run(process.execPath, [fixture, 'sleep'], { ...options(), onChildClose: () => events.push('child-closed') });
    await expect(value.run(process.execPath, [fixture, 'success'], options())).rejects.toThrow('another child process');
    await value.stop();
    await expect(pending).rejects.toBeInstanceOf(ProspectJourneyChildError);
    events.push('cleanup-started');
    expect(events).toEqual(['child-closed', 'cleanup-started']);
    expect(value.activeCount).toBe(0);
  });
});
