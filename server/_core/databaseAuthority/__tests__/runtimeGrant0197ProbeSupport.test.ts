import { describe, expect, it } from 'vitest';
import { B08_AZURE_TARGET_FINGERPRINT_HASH } from '../authorization';
import { isAcceptedProbeTarget, readFounderCounts } from '../runtimeGrant0197ProbeSupport';

const good = {
  targetClass: 'production',
  targetFingerprintHash: B08_AZURE_TARGET_FINGERPRINT_HASH,
  databaseName: 'propertylistify_database',
  credentialClass: 'runtime',
};

describe('0197 probe target acceptance', () => {
  it('accepts only the pinned production runtime target', () => {
    expect(isAcceptedProbeTarget(good)).toBe(true);
  });

  it.each([
    { targetClass: 'disposable-rehearsal' },
    { targetClass: 'staging' },
    { targetClass: 'clean-main-local' },
    { targetClass: 'shared-remote' },
    { targetFingerprintHash: '0'.repeat(64) },
    { databaseName: 'other' },
    { credentialClass: 'read-only' },
  ])('refuses %j', override => {
    expect(isAcceptedProbeTarget({ ...good, ...override })).toBe(false);
  });
});

describe('0197 probe founder counts', () => {
  it('returns null and runs no query when the email is unset', async () => {
    let called = false;
    const connection = {
      query: async () => {
        called = true;
        return [[]];
      },
    };
    expect(await readFounderCounts(connection, undefined)).toBeNull();
    expect(await readFounderCounts(connection, '  ')).toBeNull();
    expect(called).toBe(false);
  });

  it('runs one parameterized query and never exposes the email', async () => {
    const email = 'Founder.Person@Example.com';
    const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
    const connection = {
      query: async (sql: string, values?: readonly unknown[]) => {
        calls.push({ sql, values });
        return [[{ email_rows: '2', super_admin_rows: '1', platform_founder_rows: '1' }]];
      },
    };
    const counts = await readFounderCounts(connection, email);
    expect(counts).toEqual({ emailRows: 2, superAdminRows: 1, platformFounderRows: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toContain('example.com');
    expect(calls[0].sql).toMatch(/^SELECT /);
    expect(calls[0].values).toEqual(['founder.person@example.com']);
    expect(JSON.stringify({ founder: counts }).toLowerCase()).not.toContain('example.com');
  });
});
