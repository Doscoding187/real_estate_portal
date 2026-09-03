import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndValidateMigrationManifest, parseSqlStatements } from '../migrationManifest';

const sessionMigrationPath = resolve('server/migrations/0064_auth_session_security.sql');
const cleanupMigrationPath = resolve('server/migrations/0065_auth_verification_token_cleanup.sql');

describe('auth session security migrations', () => {
  it('keeps session revocation and verification expiry in the canonical migration chain', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });

    expect(manifest.orderedMigrations.find(entry => entry.sequence === 64)).toMatchObject({
      filename: '0064_auth_session_security.sql',
      kind: 'ddl',
      statementPolicy: 'single-ddl',
    });
    expect(manifest.orderedMigrations.find(entry => entry.sequence === 65)).toMatchObject({
      filename: '0065_auth_verification_token_cleanup.sql',
      kind: 'transactional-data',
      statementPolicy: 'transactional-dml',
    });
  });

  it('adds only the session-revocation and verification-expiry columns', () => {
    const sql = readFileSync(sessionMigrationPath, 'utf8');
    const statements = parseSqlStatements(sql);
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    expect(statements).toHaveLength(1);
    expect(normalized).toContain('alter table users');
    expect(normalized).toContain('add column sessionversion int not null default 1 after lastsignedin');
    expect(normalized).toContain(
      'add column emailverificationtokenexpiresat timestamp null after emailverificationtoken',
    );
    expect(normalized).not.toMatch(/\b(drop|delete|update|insert|truncate)\b/);
  });

  it('removes only legacy unbounded verification-token values', () => {
    const sql = readFileSync(cleanupMigrationPath, 'utf8');
    const statements = parseSqlStatements(sql);
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    expect(statements).toHaveLength(1);
    expect(normalized).toContain('update users');
    expect(normalized).toContain('emailverificationtoken = null');
    expect(normalized).toContain('emailverificationtokenexpiresat = null');
    expect(normalized).toContain('emailverificationtoken is not null');
    expect(normalized).toContain('emailverificationtokenexpiresat is null');
  });
});
