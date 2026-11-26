import { describe, expect, it } from 'vitest';
import {
  resolveRuntimeGrant0200CliInputs,
  RUNTIME_0200_ACK_ENV,
  RUNTIME_0200_PLAN_DIGEST_ENV,
} from '../runtimeGrant0200CliInputs';
import { safeProbeErrorLine } from '../../server/_core/databaseAuthority/runtimeGrant0200ProbeSupport';

describe('0200 runtime grant CLI inputs', () => {
  it('reads flags or environment and rejects conflicts, duplicates and placeholders', () => {
    expect(
      resolveRuntimeGrant0200CliInputs(['--plan-digest', 'd', '--ack', 'a'], {}),
    ).toEqual({ planDigest: 'd', acknowledgement: 'a' });
    expect(
      resolveRuntimeGrant0200CliInputs([], {
        [RUNTIME_0200_PLAN_DIGEST_ENV]: 'd',
        [RUNTIME_0200_ACK_ENV]: 'a',
      }),
    ).toEqual({ planDigest: 'd', acknowledgement: 'a' });
    expect(() =>
      resolveRuntimeGrant0200CliInputs(['--plan-digest', 'd', '--ack', 'a'], {
        [RUNTIME_0200_PLAN_DIGEST_ENV]: 'other',
      }),
    ).toThrow('Conflicting');
    expect(() =>
      resolveRuntimeGrant0200CliInputs(['--plan-digest', 'd', '--plan-digest', 'd', '--ack', 'a'], {}),
    ).toThrow('more than once');
    expect(() =>
      resolveRuntimeGrant0200CliInputs(['--plan-digest', 'undefined', '--ack', 'a'], {}),
    ).toThrow('placeholder');
    expect(() => resolveRuntimeGrant0200CliInputs([], {})).toThrow('Missing required');
  });
});

describe('0200 probe error line', () => {
  it('keeps authored 0200 refusals, redacts URLs and drops driver text', () => {
    expect(
      safeProbeErrorLine(new Error('0200 probe refused: see mysql://u:p@h/db now'), 'grants'),
    ).toBe('0200 probe error: step=grants class=Error message=0200 probe refused: see [redacted] now');
    expect(safeProbeErrorLine(new Error('ECONNREFUSED mysql://u:p@h'), 'connect')).toBe(
      '0200 probe error: step=connect class=Error',
    );
  });
});
