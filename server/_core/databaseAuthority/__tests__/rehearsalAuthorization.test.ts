import './useRehearsal20261105';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertStructuredRehearsalApproval,
  authorizeDatabaseOperation,
  loadDatabaseOperationPolicy,
  protectedDatabaseApprovalFromEnvironment,
  type RehearsalApprovalBinding,
} from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  assertRehearsalResource,
  assertRehearsalSourceBinding,
  REHEARSAL,
  REHEARSAL_FINGERPRINT,
  REHEARSAL_RESOURCE_ID,
  REHEARSAL_SOURCE_FILES,
  REHEARSAL_SOURCE_DIGEST,
  isRegisteredRehearsal,
} from '../rehearsalAuthority';
import { readDatabaseCredentialUrl } from '../credentialVault';
import { buildMysqlConnectionSecurityConfig } from '../../databaseTls';
import type { DatabaseOperation } from '../types';

const roots: string[] = [];
const url = `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`;
const rehearsal = { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose };

function resolve(
  operation: DatabaseOperation,
  input: {
    credentialClass?: 'read-only' | 'migration' | 'runtime';
    explicitDatabaseUrl?: string;
    processEnv?: NodeJS.ProcessEnv;
  } = {},
) {
  const credentialClass = input.credentialClass ?? 'read-only';
  return resolveDatabaseAuthority({
    operation,
    explicitDatabaseUrl: input.explicitDatabaseUrl ?? url,
    rehearsal,
    credentialClass,
    processEnv: input.processEnv ?? { NODE_ENV: 'development', APP_ENV: 'development' },
  });
}

function structuredApproval(scope = true): RehearsalApprovalBinding {
  return {
    resourceId: REHEARSAL_RESOURCE_ID,
    purpose: REHEARSAL.purpose,
    serverCreatedAt: REHEARSAL.serverCreatedAt,
    sourceDigest: REHEARSAL_SOURCE_DIGEST,
    ...(scope
      ? {
          scope: {
            acceptedOldHead: REHEARSAL.acceptedOldHead,
            expectedNewHead: REHEARSAL.expectedHead,
            manifestDigest: REHEARSAL.manifestDigest,
          },
        }
      : {}),
  };
}

function resource() {
  return {
    id: REHEARSAL_RESOURCE_ID,
    name: REHEARSAL.serverName,
    type: REHEARSAL.provider,
    location: 'southafricanorth',
    systemData: { createdAt: REHEARSAL.serverCreatedAt },
    properties: {
      fullyQualifiedDomainName: REHEARSAL.hostname,
      state: 'Ready',
      fullVersion: '8.4.8',
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('disposable rehearsal schema release authority', () => {
  it('binds the exact remote target and forces verified TLS in development mode', () => {
    const authority = resolve('release-plan');
    expect(authority.context.targetClass).toBe('disposable-rehearsal');
    expect(authority.context.tls).toEqual({
      required: true,
      certificateVerificationRequired: true,
    });
    expect(authority.context.runtimeMode).toBe('development');
    expect(
      buildMysqlConnectionSecurityConfig(
        readDatabaseCredentialUrl(authority.credential),
        'development',
      ).ssl,
    ).toMatchObject({ rejectUnauthorized: true, verifyIdentity: true });
    expect(() => assertRehearsalSourceBinding()).not.toThrow();
  });

  it.each(['?ssl=false', '?sslaccept=insecure', '?rejectUnauthorized=false'])(
    'rejects insecure rehearsal TLS settings in development mode (%s)',
    suffix => {
      expect(() => resolve('release-plan', { explicitDatabaseUrl: `${url}${suffix}` })).toThrow(
        'verified TLS is mandatory',
      );
    },
  );

  it('forces verified TLS on the ordinary protected apply path in development mode', () => {
    const runtimeTarget =
      'mysql://release-user:secret@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database';
    const migrationTarget =
      'mysql://release-migrator:secret@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database';
    const authority = resolveDatabaseAuthority({
      operation: 'release-apply',
      explicitDatabaseUrl: runtimeTarget,
      credentialClass: 'migration',
      processEnv: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
        DATABASE_MIGRATION_URL: migrationTarget,
      },
    });
    expect(authority.context.targetClass).toBe('production');
    expect(authority.context.tls).toEqual({
      required: true,
      certificateVerificationRequired: true,
    });
    const migrationUrl = readDatabaseCredentialUrl(authority.credential);
    expect(new URL(migrationUrl).searchParams.get('sslaccept')).toBe('strict');
    expect(buildMysqlConnectionSecurityConfig(migrationUrl, 'development').ssl).toMatchObject({
      rejectUnauthorized: true,
      verifyIdentity: true,
    });
  });

  it('enforces verified TLS for staging and rehearsal migration credentials in development mode', () => {
    const staging = resolveDatabaseAuthority({
      operation: 'release-plan',
      explicitDatabaseUrl: 'mysql://reader:secret@staging.mysql.example.com/listify_staging',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(staging.context.targetClass).toBe('staging');
    expect(
      new URL(readDatabaseCredentialUrl(staging.credential)).searchParams.get('sslaccept'),
    ).toBe('strict');

    const rehearsalApply = resolve('release-apply', {
      credentialClass: 'migration',
      processEnv: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
        DATABASE_MIGRATION_URL: `mysql://rehearsal-migrator:secret@${REHEARSAL.hostname}/${REHEARSAL.database}`,
      },
    });
    expect(rehearsalApply.context.credentialSource).toBe('protected-migration-url');
    expect(
      new URL(readDatabaseCredentialUrl(rehearsalApply.credential)).searchParams.get('sslaccept'),
    ).toBe('strict');
  });

  it('rejects an insecure protected migration credential in development mode', () => {
    expect(() =>
      resolveDatabaseAuthority({
        operation: 'release-apply',
        explicitDatabaseUrl:
          'mysql://release-user:secret@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database',
        credentialClass: 'migration',
        processEnv: {
          NODE_ENV: 'development',
          APP_ENV: 'development',
          DATABASE_MIGRATION_URL:
            'mysql://release-migrator:secret@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database?ssl=false',
        },
      }),
    ).toThrow('verified TLS is mandatory regardless of runtime mode');
  });

  it('requires exact structured target, creation time, source digest and 0111-to-0197 scope', () => {
    const plan = resolve('release-plan');
    expect(() =>
      assertStructuredRehearsalApproval(plan.context, {
        reference: 'REHEARSAL-RELEASE-APPROVAL',
        actor: 'reviewer',
        operation: 'release-plan',
        targetFingerprintHash: plan.context.targetFingerprintHash,
        rehearsalBinding: structuredApproval(),
      }),
    ).not.toThrow();

    const base = structuredApproval();
    for (const changed of [
      { ...base, resourceId: `${base.resourceId}/other` },
      { ...base, serverCreatedAt: '2026-09-29T00:00:00Z' },
      { ...base, sourceDigest: '0'.repeat(64) },
      { ...base, scope: { ...base.scope!, acceptedOldHead: '0110_wrong.sql' } },
      { ...base, scope: { ...base.scope!, expectedNewHead: '0198_wrong.sql' } },
      { ...base, scope: { ...base.scope!, manifestDigest: '0'.repeat(64) } },
    ]) {
      expect(() =>
        assertStructuredRehearsalApproval(plan.context, {
          reference: 'REHEARSAL-RELEASE-APPROVAL',
          actor: 'reviewer',
          operation: 'release-plan',
          targetFingerprintHash: plan.context.targetFingerprintHash,
          rehearsalBinding: changed,
        }),
      ).toThrow('structured rehearsal identity');
    }
  });

  it('reads structured rehearsal approval fields from the environment and narrows target policy', () => {
    const plan = resolve('release-plan');
    const approved = protectedDatabaseApprovalFromEnvironment(plan, {
      DATABASE_AUTHORITY_APPROVAL_REFERENCE: 'REHEARSAL-RELEASE-APPROVAL',
      DATABASE_AUTHORITY_APPROVAL_ACTOR: 'reviewer',
      DATABASE_AUTHORITY_APPROVED_FINGERPRINT: plan.context.targetFingerprintHash,
      DATABASE_AUTHORITY_REHEARSAL_APPROVAL: JSON.stringify(structuredApproval()),
    });
    expect(approved?.rehearsalBinding).toEqual(structuredApproval());
    expect(() =>
      protectedDatabaseApprovalFromEnvironment(plan, {
        DATABASE_AUTHORITY_APPROVAL_REFERENCE: 'REHEARSAL-RELEASE-APPROVAL',
        DATABASE_AUTHORITY_APPROVAL_ACTOR: 'reviewer',
        DATABASE_AUTHORITY_APPROVED_FINGERPRINT: plan.context.targetFingerprintHash,
        DATABASE_AUTHORITY_REHEARSAL_APPROVAL: '{invalid',
      }),
    ).toThrow('structured rehearsal approval is invalid JSON');

    const policy = loadDatabaseOperationPolicy(process.cwd());
    const rehearsalOperations = Object.entries(policy.operations)
      .filter(([, rule]) => rule.allowedTargetClasses.includes('disposable-rehearsal'))
      .map(([operation]) => operation)
      .sort();
    expect(rehearsalOperations).toEqual(
      [
        'diagnostics',
        'legal-release-apply',
        'legal-release-plan',
        'legal-release-verify',
        'read-only-connect',
        'readiness',
        'release-apply',
        'release-plan',
        'release-reference-apply',
        'release-reference-plan',
        'release-reference-verify',
        'verification',
      ].sort(),
    );
    expect(policy.operations['rehearsal-regression'].allowedTargetClasses).toEqual([]);
    expect(policy.operations['release-reference-apply'].allowedTargetClasses).toContain(
      'disposable-rehearsal',
    );
  });

  it('binds only the exact registered host, database, Azure resource and purpose', () => {
    expect(isRegisteredRehearsal(REHEARSAL_FINGERPRINT, rehearsal)).toBe(true);
    expect(
      isRegisteredRehearsal('mysql://other.example.test/propertylistify_database', rehearsal),
    ).toBe(false);
    expect(
      isRegisteredRehearsal(REHEARSAL_FINGERPRINT, {
        resourceId: REHEARSAL_RESOURCE_ID,
        purpose: 'different purpose',
      }),
    ).toBe(false);
  });

  it('scopes live authorization strictly to the 2026-11-05 window and rejects everything else', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse(REHEARSAL.createdAt) + 3600 * 1000);
    expect(REHEARSAL.status).toBe('approved');
    expect(REHEARSAL.authorizationLive).toBe(true);
    expect(Date.parse(REHEARSAL.expiresAt)).toBeGreaterThan(Date.now());
    expect(
      Date.parse(REHEARSAL.expiresAt) - Date.parse(REHEARSAL.createdAt),
    ).toBeLessThanOrEqual(72 * 3600 * 1000);
    const plan = resolve('release-plan');
    expect(() =>
      authorizeDatabaseOperation(plan, {
        root: process.cwd(),
        approval: {
          reference: 'REHEARSAL-RELEASE-APPROVAL',
          actor: 'reviewer',
          operation: 'release-plan',
          targetFingerprintHash: plan.context.targetFingerprintHash,
          rehearsalBinding: structuredApproval(),
        },
      }),
    ).not.toThrow();

    const legacy = resolve('rehearsal-regression', { credentialClass: 'runtime' });
    expect(() => authorizeDatabaseOperation(legacy)).toThrow('Rehearsal refused');
  });

  it.each([0, 24 * 3600 * 1000])(
    'refuses the same authorization once the clock reaches expiresAt (+%d ms)',
    offset => {
      const plan = resolve('release-plan');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.parse(REHEARSAL.expiresAt) + offset);
      expect(() =>
        authorizeDatabaseOperation(plan, {
          root: process.cwd(),
          approval: {
            reference: 'REHEARSAL-RELEASE-APPROVAL',
            actor: 'reviewer',
            operation: 'release-plan',
            targetFingerprintHash: plan.context.targetFingerprintHash,
            rehearsalBinding: structuredApproval(),
          },
        }),
      ).toThrow('Rehearsal authorization expired, revoked or changed; review required.');
    },
  );

  it('refuses a source digest mismatch when any guarded file changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'listify-rehearsal-source-'));
    roots.push(root);
    const repositoryRoot = process.cwd();
    for (const relativePath of REHEARSAL_SOURCE_FILES) {
      const destination = join(root, relativePath);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(repositoryRoot, relativePath), destination);
    }
    const guardedFile = join(root, 'server/_core/databaseAuthority/context.ts');
    writeFileSync(guardedFile, `${readFileSync(guardedFile, 'utf8')}\n// changed\n`);
    expect(() => assertRehearsalSourceBinding(root)).toThrow('guarded source digest');
  });

  it('keeps the Azure lookup out of the schema release runner', () => {
    const runner = readFileSync(
      join(process.cwd(), 'server/migrations/runSqlMigrations.ts'),
      'utf8',
    );
    expect(runner).not.toContain('verifyRehearsalResource');
    expect(runner).not.toMatch(/execFile\(\s*['"]az['"]/);
  });

  it.each(['id', 'hostname', 'createdAt', 'version', 'state'])(
    'requires the operator preflight to match live Azure %s evidence',
    field => {
      const liveResource = resource();
      if (field === 'id') liveResource.id += '/wrong';
      if (field === 'hostname')
        liveResource.properties.fullyQualifiedDomainName = 'wrong.mysql.azure.com';
      if (field === 'createdAt') liveResource.systemData.createdAt = '2026-09-29T00:00:00Z';
      if (field === 'version') liveResource.properties.fullVersion = '5.7';
      if (field === 'state') liveResource.properties.state = 'Updating';
      expect(() => assertRehearsalResource(liveResource)).toThrow('live Azure resource identity');
    },
  );

  it('binds read-only diagnostic approvals without release scope', () => {
    const diagnostics = resolve('diagnostics');
    expect(() =>
      assertStructuredRehearsalApproval(diagnostics.context, {
        reference: 'REHEARSAL-DIAGNOSTICS-APPROVAL',
        actor: 'reviewer',
        operation: 'diagnostics',
        targetFingerprintHash: diagnostics.context.targetFingerprintHash,
        rehearsalBinding: structuredApproval(false),
      }),
    ).not.toThrow();
    expect(() =>
      assertStructuredRehearsalApproval(diagnostics.context, {
        reference: 'REHEARSAL-DIAGNOSTICS-APPROVAL',
        actor: 'reviewer',
        operation: 'diagnostics',
        targetFingerprintHash: diagnostics.context.targetFingerprintHash,
        rehearsalBinding: structuredApproval(),
      }),
    ).toThrow('structured rehearsal identity');
  });
});
