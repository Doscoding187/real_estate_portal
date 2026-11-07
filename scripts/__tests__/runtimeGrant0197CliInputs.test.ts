import { describe, expect, it } from 'vitest';
import { resolveRuntimeGrant0197CliInputs } from '../runtimeGrant0197CliInputs';

const ENV = { RUNTIME_GRANT_0197_PLAN_DIGEST: 'd1', RUNTIME_GRANT_0197_ACK: 'a1' };

describe('resolveRuntimeGrant0197CliInputs', () => {
  it('accepts flags only', () => {
    expect(resolveRuntimeGrant0197CliInputs(['--plan-digest', 'd1', '--ack', 'a1'], {})).toEqual({
      planDigest: 'd1',
      acknowledgement: 'a1',
    });
  });

  it('accepts env only', () => {
    expect(resolveRuntimeGrant0197CliInputs([], ENV)).toEqual({
      planDigest: 'd1',
      acknowledgement: 'a1',
    });
  });

  it('accepts equal flag and env', () => {
    expect(resolveRuntimeGrant0197CliInputs(['--plan-digest', 'd1', '--ack', 'a1'], ENV)).toEqual({
      planDigest: 'd1',
      acknowledgement: 'a1',
    });
  });

  it('refuses differing flag and env', () => {
    expect(() => resolveRuntimeGrant0197CliInputs(['--plan-digest', 'other'], ENV)).toThrow(
      /Conflicting/,
    );
    expect(() => resolveRuntimeGrant0197CliInputs(['--ack', 'other'], ENV)).toThrow(/Conflicting/);
  });

  it('refuses missing inputs', () => {
    expect(() => resolveRuntimeGrant0197CliInputs([], {})).toThrow(/Missing required/);
    expect(() =>
      resolveRuntimeGrant0197CliInputs([], { RUNTIME_GRANT_0197_PLAN_DIGEST: 'd1' }),
    ).toThrow(/Missing required/);
    expect(() => resolveRuntimeGrant0197CliInputs(['--plan-digest', '--ack'], {})).toThrow(
      /Missing required/,
    );
  });

  it('does not affect plan mode (resolver is only called for apply/rollback)', () => {
    expect(() => resolveRuntimeGrant0197CliInputs([], {})).toThrow();
  });
});
