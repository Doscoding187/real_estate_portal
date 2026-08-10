import { describe, expect, it } from 'vitest';
import {
  LOCAL_SERVICE_HOST,
  LOCAL_SERVICE_PORT,
  LOCAL_SERVICE_TMP_PARENT,
  localServiceDataDir,
  localServiceFingerprint,
  localServiceLegacyRoot,
  localServiceLogPath,
  localServicePidPath,
  localServiceLockPath,
  localServiceRoot,
  localServiceSocketPath,
  localServiceUid,
  localServiceUidRoot,
} from '../localServicePaths';

describe('Database Authority local service path authority', () => {
  it('derives the canonical service tree from the numeric UID', () => {
    expect(LOCAL_SERVICE_TMP_PARENT).toBe('/var/tmp');
    expect(localServiceUid(1000)).toBe('1000');
    expect(localServiceUidRoot(1000)).toBe('/var/tmp/property-listify-1000');
    expect(localServiceRoot(1000)).toBe('/var/tmp/property-listify-1000/mysql-3307');
    expect(localServiceDataDir(1000)).toBe('/var/tmp/property-listify-1000/mysql-3307/data');
    expect(localServiceSocketPath(1000)).toBe(
      '/var/tmp/property-listify-1000/mysql-3307/mysql.sock',
    );
    expect(localServicePidPath(1000)).toBe('/var/tmp/property-listify-1000/mysql-3307/mysqld.pid');
    expect(localServiceLockPath(1000)).toBe(
      '/var/tmp/property-listify-1000/mysql-3307/mysql.sock.lock',
    );
    expect(localServiceLogPath(1000)).toBe('/var/tmp/property-listify-1000/mysql-3307/mysqld.log');
  });

  it('rejects invalid UID inputs instead of deriving an ambiguous path', () => {
    expect(() => localServiceUid(0)).toThrow('invalid or root');
    expect(() => localServiceUid(-1)).toThrow('UID is invalid');
    expect(() => localServiceUid(Number.NaN)).toThrow('UID is invalid');
    expect(() => localServiceUid(1.5)).toThrow('UID is invalid');
  });

  it('uses the current UID by default and keeps the legacy home path separate', () => {
    const uid = process.getuid?.();

    expect(uid).toBeTypeOf('number');
    expect(localServiceRoot()).toBe(`/var/tmp/property-listify-${uid}/mysql-3307`);
    expect(localServiceLegacyRoot('/home/example')).toBe(
      '/home/example/.config/property-listify/mysql-3307',
    );
    expect(localServiceRoot()).not.toContain('/.config/property-listify/');
  });

  it('derives a stable fingerprint from the exact service path and pinned topology', () => {
    expect(localServiceFingerprint(1000)).toMatch(/^[a-f0-9]{64}$/);
    expect(localServiceFingerprint(1000)).toBe(
      '2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2',
    );
    expect(localServiceFingerprint(1000)).toBe(localServiceFingerprint(1000));
    expect(localServiceFingerprint(1000)).not.toBe(localServiceFingerprint(1001));
    expect(LOCAL_SERVICE_HOST).toBe('127.0.0.1');
    expect(LOCAL_SERVICE_PORT).toBe('3307');
  });
});
