import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const recordState = vi.hoisted(() => ({ revoked: false, registration: undefined as any }));
vi.mock(
  '../../../../docs/database-authority/disposable-rehearsal-authorization.json',
  async importOriginal => {
    const { default: original } = await importOriginal<any>();
    const { createHash } = await import('node:crypto');
    const targetFingerprint = `mysql://${original.hostname}:3306/${original.database}`;
    const registration = {
      ...original,
      status: 'approved',
      approvedBy: 'Founder',
      createdAt: '2026-09-28T00:00:00Z',
      expiresAt: '2026-09-28T12:00:00Z',
      runtimeMode: 'development',
      targetFingerprint,
      targetFingerprintHash: createHash('sha256').update(targetFingerprint).digest('hex'),
      allowedOperations: [
        'release-plan',
        'release-apply',
        'release-reference-plan',
        'release-reference-apply',
        'release-reference-verify',
        'diagnostics',
      ],
      credentialClassesByOperation: {
        'release-plan': ['read-only'],
        'release-apply': ['migration'],
        'release-reference-plan': ['read-only'],
        'release-reference-apply': ['migration'],
        'release-reference-verify': ['read-only', 'migration'],
        diagnostics: ['read-only'],
      },
      allowedReferenceAdapters: ['fordsburg-retirement', 'gauteng-type-reconciliation', 'places'],
      deniedTargetFingerprints: [
        'mysql://propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database',
      ],
      expectedOldHead: '0111_properties_canonical_place_reference_fk.sql',
      expectedNewHead: '0197_drop_seller_prospects_province.sql',
    };
    recordState.registration = registration;
    return { default: registration };
  },
);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T11:00:00Z'));
});
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: (...args: any[]) => {
      const result = (actual.readFileSync as any)(...args);
      if (String(args[0]).endsWith('/disposable-rehearsal-authorization.json')) {
        return JSON.stringify({
          ...recordState.registration,
          status: recordState.revoked ? 'revoked' : 'approved',
        });
      }
      return result;
    },
  };
});
import { resolveDatabaseAuthority } from '../context';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
  loadDatabaseOperationPolicy,
} from '../authorization';
import {
  assertApprovedRehearsalDiagnosticsTarget,
  assertApprovedRehearsalMigrationTarget,
  REHEARSAL,
  REHEARSAL_RESOURCE_ID,
  assertApprovedRehearsalReferenceTarget,
  assertRehearsalAuthorization,
  assertRehearsalReferenceAdapter,
  assertRehearsalMigrationScope,
  assertRehearsalResource,
} from '../rehearsalAuthority';
import { requireReleaseReferenceTarget } from '../dataAdapters/common';
import { compileRehearsalProbe } from '../rehearsalProbes';
import { createAuthoritySqlConnection, createAuthorityRuntimePool } from '../connectionAuthority';
import type { DatabaseOperation } from '../types';

const url = `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`;
const binding = { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose };
function resolve(
  overrides: Parameters<typeof resolveDatabaseAuthority>[0] = { operation: 'rehearsal-regression' },
) {
  return resolveDatabaseAuthority({
    explicitDatabaseUrl: url,
    rehearsal: binding,
    credentialClass: 'runtime',
    processEnv: { NODE_ENV: 'test', APP_ENV: 'test' },
    ...overrides,
  });
}
function approve(a: ReturnType<typeof resolve>, actor = 'Edward') {
  return authorizeDatabaseOperation(a, {
    approval: {
      actor,
      reference: REHEARSAL.purpose,
      operation: a.context.operation,
      targetFingerprintHash: a.context.targetFingerprintHash,
    },
    acknowledgement: expectedDatabaseAcknowledgement(a.context),
  });
}
function diagnosticsTarget(credentialClass: 'read-only' | 'migration' = 'read-only') {
  return resolve({
    operation: 'diagnostics',
    explicitDatabaseUrl: undefined,
    credentialClass,
    processEnv: {
      NODE_ENV: 'development',
      APP_ENV: 'development',
      DATABASE_URL: url,
    },
  });
}
function diagnosticsApproval(target: ReturnType<typeof diagnosticsTarget>) {
  return {
    actor: 'Founder',
    reference: REHEARSAL.purpose,
    operation: 'diagnostics',
    targetFingerprintHash: target.context.targetFingerprintHash,
    credentialClass: target.context.credentialClass,
  };
}
const resource = () => ({
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
});
afterEach(() => {
  vi.useRealTimers();
  recordState.revoked = false;
});

describe('exact disposable Azure rehearsal authority', () => {
  it('refuses the bound rehearsal regression operation when it is not listed', () => {
    const a = resolve();
    expect(a.context.targetClass).toBe('disposable-rehearsal');
    expect(REHEARSAL.allowedOperations).not.toContain('rehearsal-regression');
    expect(() => approve(a)).toThrow('not listed in the approved registration');
  });
  it('permits the bound rehearsal regression only when explicitly listed', () => {
    const a = resolve();
    const operations = recordState.registration.allowedOperations as string[];
    operations.push('rehearsal-regression');
    try {
      expect(approve(a).operation).toBe('rehearsal-regression');
      expect(() => assertRehearsalResource(resource())).not.toThrow();
      expect(
        compileRehearsalProbe('user.insert', [0], '12345678-1234-1234-1234-123456789abc')
          .values[0],
      ).toBe(1900000000);
    } finally {
      operations.pop();
    }
  });
  it.each([
    'mysql://fixture:fixture@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
    'mysql://fixture:fixture@remote.mysql.example.com/listify_property_sa',
    'mysql://fixture:fixture@another.mysql.database.azure.com/propertylistify_database',
    `mysql://fixture:fixture@${REHEARSAL.hostname}/another_database`,
    'mysql://fixture:fixture@unregistered.example.test/remote',
  ])('refuses other/protected identities: %s', explicitDatabaseUrl => {
    expect(() =>
      approve(resolve({ operation: 'rehearsal-regression', explicitDatabaseUrl })),
    ).toThrow();
  });
  it.each(['subscription', 'resource-group', 'purpose'])('refuses wrong %s binding', kind => {
    const rehearsal = { ...binding };
    if (kind === 'purpose') rehearsal.purpose = 'generic remote tests';
    else
      rehearsal.resourceId = rehearsal.resourceId.replace(
        kind === 'subscription' ? REHEARSAL.subscriptionId : REHEARSAL.resourceGroup,
        'wrong',
      );
    expect(() => approve(resolve({ operation: 'rehearsal-regression', rehearsal }))).toThrow();
  });
  it('requires an explicit URL, test mode, approval and acknowledgement', () => {
    const a = resolve();
    expect(() => authorizeDatabaseOperation(a)).toThrow();
    expect(() =>
      approve(
        resolve({
          operation: 'rehearsal-regression',
          processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
        }),
      ),
    ).toThrow();
    expect(() =>
      approve(
        resolve({
          operation: 'rehearsal-regression',
          explicitDatabaseUrl: undefined,
          processEnv: { NODE_ENV: 'test', APP_ENV: 'test', DATABASE_URL: url },
        }),
      ),
    ).toThrow();
  });
  it.each(['?ssl=false', '?sslaccept=insecure', '?rejectUnauthorized=false'])(
    'refuses unverified TLS %s',
    suffix => {
      expect(() =>
        approve(resolve({ operation: 'rehearsal-regression', explicitDatabaseUrl: url + suffix })),
      ).toThrow();
    },
  );
  it.each([
    'test-fixture',
    'runtime-connect',
    'migration-apply',
    'reference-seed',
    'reset',
    'database-dispose',
    'lifecycle-admin',
  ] as DatabaseOperation[])('refuses %s even for rehearsal', operation => {
    expect(() => approve(resolve({ operation }))).toThrow();
  });
  it('does not expose generic SQL or runtime factories with a rehearsal decision', async () => {
    const operations = recordState.registration.allowedOperations as string[];
    operations.push('rehearsal-regression');
    try {
      const a = resolve();
      const decision = approve(a);
      await expect(createAuthoritySqlConnection(a, decision)).rejects.toThrow('authorization');
      await expect(createAuthorityRuntimePool(a, decision)).rejects.toThrow('authorization');
    } finally {
      operations.pop();
    }
  });
  it('refuses a revoked registration without connecting', () => {
    recordState.revoked = true;
    expect(() => approve(resolve())).toThrow('expired, revoked or changed');
  });
  it('refuses expired authorization', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T00:00:00Z'));
    expect(() => approve(resolve())).toThrow('expired, revoked or changed');
  });
  it.each(['id', 'fqdn', 'createdAt', 'version', 'state'])('refuses unverifiable ARM %s', field => {
    const r = resource();
    if (field === 'id') r.id = r.id.replace(REHEARSAL.subscriptionId, 'wrong');
    if (field === 'fqdn')
      r.properties.fullyQualifiedDomainName = 'propertylistify-mysql.mysql.database.azure.com';
    if (field === 'createdAt') r.systemData.createdAt = '2026-09-29T00:00:00Z';
    if (field === 'version') r.properties.fullVersion = '5.7';
    if (field === 'state') r.properties.state = 'Updating';
    expect(() => assertRehearsalResource(r)).toThrow();
  });
  it('never compiles arbitrary DDL, SQL, identifiers or unbounded IDs', () => {
    for (const probe of [
      'DROP DATABASE propertylistify_database',
      'TRUNCATE users',
      'migration-apply',
      'SET GLOBAL sql_mode',
      'reference-seed',
    ]) {
      expect(() =>
        compileRehearsalProbe(probe as any, [], '12345678-1234-1234-1234-123456789abc'),
      ).toThrow();
    }
    for (const slot of [-1, 32, NaN, 1.5])
      expect(() =>
        compileRehearsalProbe('user.delete', [slot], '12345678-1234-1234-1234-123456789abc'),
      ).toThrow();
  });
});

describe('registered rehearsal migration route', () => {
  function migrationTarget(operation: 'release-plan' | 'release-apply') {
    return resolve({
      operation,
      explicitDatabaseUrl: undefined,
      credentialClass: operation === 'release-apply' ? 'migration' : 'read-only',
      processEnv: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
        DATABASE_URL: url,
      },
    });
  }

  it.each(['release-plan', 'release-apply'] as const)(
    'allows %s only for the registered target and 0111-to-0197 scope',
    operation => {
      const target = migrationTarget(operation);
      expect(() => approve(target, 'Founder')).not.toThrow();
      expect(() =>
        assertRehearsalMigrationScope({
          context: target.context,
          mode: operation === 'release-plan' ? 'plan' : 'apply',
          acceptedOldHead: '0111_properties_canonical_place_reference_fk.sql',
          expectedNewHead: '0197_drop_seller_prospects_province.sql',
        }),
      ).not.toThrow();
    },
  );

  it('requires each release migration operation to be explicitly listed', () => {
    const target = migrationTarget('release-apply');
    const approval = {
      actor: 'Founder',
      reference: REHEARSAL.purpose,
      operation: target.context.operation,
      targetFingerprintHash: target.context.targetFingerprintHash,
      credentialClass: 'migration' as const,
    };
    expect(() =>
      assertApprovedRehearsalMigrationTarget({
        context: target.context,
        approval,
        registration: {
          ...recordState.registration,
          allowedOperations: ['release-plan'],
          credentialClassesByOperation: { 'release-plan': ['read-only'] },
        },
      }),
    ).toThrow('exact unexpired Founder registration');
  });

  it('refuses any rehearsal migration scope outside 0111-to-0197', () => {
    const target = migrationTarget('release-apply');
    for (const change of [
      { acceptedOldHead: '0110_previous.sql' },
      { expectedNewHead: '0198_unreviewed.sql' },
      { ancestorHead: '0111_properties_canonical_place_reference_fk.sql' },
    ]) {
      expect(() =>
        assertRehearsalMigrationScope({
          context: target.context,
          mode: 'apply',
          acceptedOldHead: '0111_properties_canonical_place_reference_fk.sql',
          expectedNewHead: '0197_drop_seller_prospects_province.sql',
          ...change,
        }),
      ).toThrow('0111-to-0197');
    }
  });

  it.each(['staging', 'production'] as const)(
    'does not apply rehearsal migration scope rules to %s',
    targetClass => {
      const target = migrationTarget('release-plan');
      const context = { ...target.context, targetClass };
      expect(() =>
        assertRehearsalMigrationScope({
          context,
          mode: 'plan',
          acceptedOldHead: 'not-the-rehearsal-head.sql',
          expectedNewHead: 'not-the-rehearsal-head.sql',
          ancestorHead: 'also-not-the-rehearsal-head.sql',
        }),
      ).not.toThrow();
    },
  );

  it.each([
    'release-plan',
    'release-apply',
    'release-reference-plan',
    'release-reference-apply',
    'release-reference-verify',
  ] as DatabaseOperation[])('refuses a bare purpose string for %s', operation => {
    const target = resolve({
      operation,
      explicitDatabaseUrl: undefined,
      credentialClass: operation.endsWith('apply') ? 'migration' : 'read-only',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development', DATABASE_URL: url },
    });
    expect(() => assertRehearsalAuthorization(target.context, REHEARSAL.purpose)).toThrow();
  });

  it.each(['migration-plan', 'migration-apply'] as DatabaseOperation[])(
    'refuses %s for a rehearsal target',
    operation => {
      const target = resolve({
        operation,
        explicitDatabaseUrl: undefined,
        credentialClass: operation === 'migration-apply' ? 'migration' : 'read-only',
        processEnv: { NODE_ENV: 'development', APP_ENV: 'development', DATABASE_URL: url },
      });
      expect(() => approve(target, 'Founder')).toThrow();
    },
  );

  it.each(['production', 'db.railway.app'])(
    'refuses %s for all four migration operations',
    host => {
      for (const operation of [
        'release-plan',
        'release-apply',
        'migration-plan',
        'migration-apply',
      ] as DatabaseOperation[]) {
        const target = migrationTarget(
          operation === 'migration-apply' ? 'release-apply' : 'release-plan',
        );
        const fingerprint = `mysql://${host}.mysql.database.azure.com:3306/${REHEARSAL.database}`;
        const context = {
          ...target.context,
          operation,
          host: host === 'production' ? 'propertylistify-mysql.mysql.database.azure.com' : host,
          targetFingerprint: fingerprint,
          targetFingerprintHash: createHash('sha256').update(fingerprint).digest('hex'),
        };
        const authority = { ...target, context } as typeof target;
        expect(() =>
          authorizeDatabaseOperation(authority, {
            approval: {
              actor: 'Founder',
              reference: REHEARSAL.purpose,
              operation,
              targetFingerprintHash: context.targetFingerprintHash,
              credentialClass: context.credentialClass,
            },
            acknowledgement: expectedDatabaseAcknowledgement(context),
          }),
        ).toThrow();
      }
    },
  );

  it.each(['release-plan', 'release-apply'] as const)('refuses expired %s approval', operation => {
    vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
    expect(() => approve(migrationTarget(operation), 'Founder')).toThrow(
      'expired, revoked or changed',
    );
  });

  it.each(['release-plan', 'release-apply'] as const)(
    'refuses an unregistered %s target',
    operation => {
      expect(() =>
        resolve({
          operation,
          explicitDatabaseUrl: 'mysql://fixture:fixture@unregistered.example.test/other_db',
          rehearsal: binding,
          credentialClass: operation === 'release-apply' ? 'migration' : 'read-only',
          processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
        }),
      ).toThrow('rehearsal binding applies only to its exact registered server and database');
    },
  );
});

describe('registered rehearsal reference-data guard', () => {
  function referenceTarget() {
    return resolve({
      operation: 'release-reference-plan',
      explicitDatabaseUrl: undefined,
      credentialClass: 'read-only',
      processEnv: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
        DATABASE_URL: url,
      },
    });
  }

  it.each(['fordsburg-retirement', 'gauteng-type-reconciliation', 'places'])(
    'allows only the registered %s adapter during the approved window',
    adapter => {
      const target = referenceTarget();
      const approval = approve(target, 'Founder');
      expect(() =>
        assertRehearsalReferenceAdapter({
          context: target.context,
          decision: approval,
          adapter,
        }),
      ).not.toThrow();
      expect(requireReleaseReferenceTarget(target, approval, adapter).targetFingerprintHash).toBe(
        target.context.targetFingerprintHash,
      );
    },
  );

  it('refuses an unlisted adapter and a non-Founder approval', () => {
    const target = referenceTarget();
    const founderDecision = approve(target, 'Founder');
    expect(() => requireReleaseReferenceTarget(target, founderDecision, 'commercial')).toThrow(
      'exact unexpired Founder registration',
    );
    expect(() => approve(target, 'Edward')).toThrow('exact unexpired Founder registration');
  });

  it('does not let a migration-only registration authorize reference adapters', () => {
    const target = referenceTarget();
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: target.context,
        approval: {
          actor: 'Founder',
          reference: REHEARSAL.purpose,
          operation: target.context.operation,
          targetFingerprintHash: target.context.targetFingerprintHash,
          credentialClass: 'read-only',
        },
        adapter: 'places',
        registration: {
          ...recordState.registration,
          allowedOperations: ['release-plan', 'release-apply'],
          credentialClassesByOperation: {
            'release-plan': ['read-only'],
            'release-apply': ['migration'],
          },
        },
      }),
    ).toThrow('exact unexpired Founder registration');
  });

  it('refuses an expired registration', () => {
    vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
    expect(() => approve(referenceTarget(), 'Founder')).toThrow('expired, revoked or changed');
  });

  it('refuses targets that are not bound to the registered Azure resource', () => {
    expect(() =>
      resolve({
        operation: 'release-reference-plan',
        explicitDatabaseUrl: 'mysql://fixture:fixture@unregistered.example.test/other_db',
      }),
    ).toThrow('rehearsal binding applies only to its exact registered server and database');
  });

  it('refuses a registration naming propertylistify-mysql', () => {
    const target = referenceTarget();
    const hostname = 'propertylistify-mysql.mysql.database.azure.com';
    const database = 'propertylistify_database';
    const targetFingerprint = `mysql://${hostname}:3306/${database}`;
    const targetFingerprintHash = createHash('sha256').update(targetFingerprint).digest('hex');
    const registration = {
      ...recordState.registration,
      serverName: 'propertylistify-mysql',
      hostname,
      database,
      targetFingerprint,
      targetFingerprintHash,
    };
    const resourceId = `/subscriptions/${registration.subscriptionId}/resourceGroups/${registration.resourceGroup}/providers/${registration.provider}/propertylistify-mysql`;
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: {
          ...target.context,
          host: hostname,
          databaseName: database,
          targetFingerprint,
          targetFingerprintHash,
          targetClass: 'disposable-rehearsal',
          rehearsal: { resourceId, purpose: registration.purpose },
        },
        registration,
      }),
    ).toThrow('Production host or resource cannot be admitted');
  });

  it('refuses the production hostname even when the registration names the rehearsal server', () => {
    const target = referenceTarget();
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: {
          ...target.context,
          host: 'propertylistify-mysql.mysql.database.azure.com',
          targetClass: 'disposable-rehearsal',
        },
        registration: recordState.registration,
      }),
    ).toThrow('Production host or resource cannot be admitted');
  });

  it('refuses a registration hostname that aliases its Azure resource ID', () => {
    const target = referenceTarget();
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: target.context,
        registration: { ...recordState.registration, hostname: 'rehearsal.example.test' },
      }),
    ).toThrow('registration hostname does not match its resource ID');
  });

  it('refuses a target host alias even when the registration hostname is canonical', () => {
    const target = referenceTarget();
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: { ...target.context, host: 'rehearsal.example.test' },
        registration: recordState.registration,
      }),
    ).toThrow('target hostname does not match its resource ID');
  });

  it.each([
    ['missing serverName', { serverName: undefined }],
    ['malformed resourceGroup', { resourceGroup: 'rg/other' }],
  ])('refuses a registration with %s', (_label, malformed) => {
    const target = referenceTarget();
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: target.context,
        registration: { ...recordState.registration, ...malformed },
      }),
    ).toThrow('registration resource ID is missing or malformed');
  });

  it.each(['db.railway.app', 'mysql.rlwy.net'])('explicitly refuses Railway host %s', host => {
    const target = referenceTarget();
    const decision = approve(target, 'Founder');
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: { ...target.context, host },
        approval: {
          actor: decision.approvalActor ?? undefined,
          reference: decision.approvalReference ?? undefined,
          operation: decision.operation,
          targetFingerprintHash: decision.targetFingerprintHash,
          credentialClass: decision.credentialClass,
        },
        adapter: 'places',
      }),
    ).toThrow('Railway hosts cannot be rehearsal targets');
  });

  it('refuses production when presented as a rehearsal target', () => {
    const production = resolve({
      operation: 'release-reference-plan',
      explicitDatabaseUrl:
        'mysql://release-user:private@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
      rehearsal: undefined,
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    expect(production.context.targetClass).toBe('production');
    expect(() =>
      assertApprovedRehearsalReferenceTarget({
        context: production.context,
        approval: {
          actor: 'Founder',
          reference: REHEARSAL.purpose,
          operation: production.context.operation,
          targetFingerprintHash: production.context.targetFingerprintHash,
          credentialClass: 'read-only',
        },
        adapter: 'places',
      }),
    ).toThrow('Production host or resource cannot be admitted');
  });

  it('uses the exact environment binding for CLI target resolution', () => {
    const target = resolve({
      operation: 'release-reference-plan',
      rehearsal: undefined,
      credentialClass: 'read-only',
      processEnv: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
        DATABASE_URL: url,
        DATABASE_AUTHORITY_REHEARSAL_RESOURCE_ID: REHEARSAL_RESOURCE_ID,
        DATABASE_AUTHORITY_REHEARSAL_PURPOSE: REHEARSAL.purpose,
      },
    });
    expect(target.context.targetClass).toBe('disposable-rehearsal');
    expect(() =>
      resolve({
        operation: 'release-reference-plan',
        rehearsal: undefined,
        processEnv: {
          NODE_ENV: 'development',
          DATABASE_AUTHORITY_REHEARSAL_RESOURCE_ID: REHEARSAL_RESOURCE_ID,
        },
      }),
    ).toThrow('rehearsal binding is incomplete');
  });
});

describe('registered rehearsal diagnostics guard', () => {
  it('allows only the exact registered rehearsal with structured read-only approval', () => {
    const target = diagnosticsTarget();
    expect(() => authorizeDatabaseOperation(target, { approval: diagnosticsApproval(target) })).not.toThrow();
    const diagnosticsPolicy = loadDatabaseOperationPolicy().operations.diagnostics;
    expect(diagnosticsPolicy.allowedTargetClasses).toContain('disposable-rehearsal');
    expect(diagnosticsPolicy.allowedTargetClasses).toContain('staging');
    expect(diagnosticsPolicy.allowedTargetClasses).toContain('production');
    const cli = readFileSync(new URL('../../../../scripts/databaseAuthorityCli.ts', import.meta.url), 'utf8');
    expect(cli.match(/authorityFor\('diagnostics'\)/g)).toHaveLength(1);
    expect(cli).toContain("if (command !== 'schema:check')");
  });

  it('refuses diagnostics when the registration omits the operation', () => {
    const target = diagnosticsTarget();
    const registration = {
      ...recordState.registration,
      allowedOperations: recordState.registration.allowedOperations.filter(
        (operation: string) => operation !== 'diagnostics',
      ),
      credentialClassesByOperation: {
        ...recordState.registration.credentialClassesByOperation,
        diagnostics: undefined,
      },
    };
    expect(() =>
      assertApprovedRehearsalDiagnosticsTarget({
        context: target.context,
        approval: diagnosticsApproval(target),
        registration,
      }),
    ).toThrow('exact unexpired Founder registration');
  });

  it('refuses diagnostics with the previous migration-only registration', () => {
    const target = diagnosticsTarget();
    expect(() =>
      assertApprovedRehearsalDiagnosticsTarget({
        context: target.context,
        approval: diagnosticsApproval(target),
        registration: {
          ...recordState.registration,
          allowedOperations: ['release-plan', 'release-apply'],
          credentialClassesByOperation: {
            'release-plan': ['read-only'],
            'release-apply': ['migration'],
          },
        },
      }),
    ).toThrow('exact unexpired Founder registration');
  });

  it('refuses diagnostics when the credential class is not read-only', () => {
    const target = diagnosticsTarget('migration');
    expect(() =>
      assertApprovedRehearsalDiagnosticsTarget({
        context: target.context,
        approval: diagnosticsApproval(target),
        registration: {
          ...recordState.registration,
          credentialClassesByOperation: {
            ...recordState.registration.credentialClassesByOperation,
            diagnostics: ['migration'],
          },
        },
      }),
    ).toThrow('requires read-only credentials');
  });

  it.each(['staging', 'production'] as const)(
    'keeps the rehearsal registration from authorizing a %s target',
    targetClass => {
      const target = diagnosticsTarget();
      expect(() =>
        assertApprovedRehearsalDiagnosticsTarget({
          context: { ...target.context, targetClass },
          approval: diagnosticsApproval(target),
        }),
      ).toThrow();
    },
  );

  it('refuses Railway hosts even with a valid rehearsal registration', () => {
    const target = diagnosticsTarget();
    expect(() =>
      assertApprovedRehearsalDiagnosticsTarget({
        context: { ...target.context, host: 'mysql.rlwy.net' },
        approval: diagnosticsApproval(target),
      }),
    ).toThrow('Railway hosts cannot be rehearsal targets');
  });

  it('refuses an expired diagnostics registration', () => {
    vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
    const target = diagnosticsTarget();
    expect(() =>
      authorizeDatabaseOperation(target, { approval: diagnosticsApproval(target) }),
    ).toThrow('expired, revoked or changed');
  });

  it('refuses an unregistered diagnostics target', () => {
    expect(() =>
      resolve({
        operation: 'diagnostics',
        explicitDatabaseUrl: 'mysql://fixture:fixture@unregistered.example.test/other_db',
        credentialClass: 'read-only',
        processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
      }),
    ).toThrow('rehearsal binding applies only to its exact registered server and database');
  });
});
