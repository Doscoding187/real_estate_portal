import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DATABASE_CREDENTIAL_CLASSES,
  DATABASE_OPERATIONS,
  DATABASE_TARGET_CLASSES,
  type DatabaseCredentialClass,
  type DatabaseOperation,
  type DatabaseTargetClass,
  type ResolvedDatabaseAuthority,
  type ResolvedDatabaseContext,
} from './types';

export type OwnershipRequirement = 'none' | 'registered-local-worktree' | 'exact-local-owner';
export type ApprovalRequirement = 'none' | 'protected-target';
export type AcknowledgementRequirement = 'none' | 'exact-target';

export type OperationPolicy = {
  allowedTargetClasses: DatabaseTargetClass[];
  credentialClasses: DatabaseCredentialClass[];
  ownership: OwnershipRequirement;
  approval: ApprovalRequirement;
  acknowledgement: AcknowledgementRequirement;
  evidence: string;
};

export type DatabaseOperationPolicy = {
  policyVersion: number;
  denyTargetClasses: DatabaseTargetClass[];
  protectedTargetClasses: DatabaseTargetClass[];
  operations: Record<DatabaseOperation, OperationPolicy>;
};

export type ProtectedDatabaseApproval = {
  reference: string;
  actor: string;
  operation: DatabaseOperation;
  targetFingerprintHash: string;
  credentialClass?: DatabaseCredentialClass;
  inspectionIdentity?: string;
  tidbSourceInstanceId?: string;
  tidbSourceAdminIdentity?: string;
  tidbSourceReaderIdentity?: string;
  tidbSourceReaderPrivilegeSet?: string;
  migrationIdentity?: string;
  migrationPrivilegeSet?: string;
  runtimeIdentity?: string;
  workerIdentity?: string;
  runtimeGrantDigest?: string;
  runtimePreviousGrantDigest?: string;
  workerGrantDigest?: string;
};

export const B08_AZURE_TARGET_FINGERPRINT_HASH =
  'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced';
export const B08_INSPECTION_IDENTITY = 'propertylistify_b08_inspector';
export const B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH =
  '68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e';
export const B08_TIDB_SOURCE_INSTANCE_ID = '10492391619114516879';
export const B08_TIDB_SOURCE_ADMIN_IDENTITY = '42MAxcoJrgbJNnU.root';
export const B08_TIDB_SOURCE_READER_IDENTITY = '42MAxcoJrgbJNnU.b08_reader';
export const B08_TIDB_SOURCE_READER_PRIVILEGE_SET = 'listify_property_sa.*:SELECT';
export const B08_MIGRATION_IDENTITY = 'propertylistify_release_migrator';
export const B08_MIGRATION_PRIVILEGE_SET =
  'propertylistify_database.*:SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,DROP,INDEX,REFERENCES;*.*:SESSION_VARIABLES_ADMIN';
export const B08_RUNTIME_IDENTITY = 'propertylistify_app_runtime';
export const B08_WORKER_IDENTITY = 'propertylistify_job_worker';
export const B08_RUNTIME_GRANT_DIGEST = '58f42389e76495048f32460f71c4cbe15bb85c9c1d5365426c0561383b75d1d5';
export const B08_RUNTIME_LEDGER_READ_GRANT_DIGEST = '90c9d4aca03ac0820ebfe0fdbbbfef0617859bc6959e610be3b949ec27457fd9';
export const B08_WORKER_GRANT_DIGEST = '74b68ee103b3f1f345c7e7a0874b84fde128653977817cc59b5a2776b88f1f22';

export function protectedDatabaseApprovalFromEnvironment(
  authority: ResolvedDatabaseAuthority,
  env: NodeJS.ProcessEnv = process.env,
): ProtectedDatabaseApproval | undefined {
  const reference = env.DATABASE_AUTHORITY_APPROVAL_REFERENCE;
  const actor = env.DATABASE_AUTHORITY_APPROVAL_ACTOR;
  const fingerprint = env.DATABASE_AUTHORITY_APPROVED_FINGERPRINT;
  if (!reference && !actor && !fingerprint) return undefined;
  return {
    reference: reference ?? '',
    actor: actor ?? '',
    operation: authority.context.operation,
    targetFingerprintHash: fingerprint ?? '',
    credentialClass: env.DATABASE_AUTHORITY_APPROVED_CREDENTIAL_CLASS as DatabaseCredentialClass | undefined,
    inspectionIdentity: env.DATABASE_AUTHORITY_APPROVED_INSPECTION_IDENTITY,
    tidbSourceInstanceId: env.DATABASE_AUTHORITY_APPROVED_TIDB_SOURCE_INSTANCE_ID,
    tidbSourceAdminIdentity: env.DATABASE_AUTHORITY_APPROVED_TIDB_SOURCE_ADMIN_IDENTITY,
    tidbSourceReaderIdentity: env.DATABASE_AUTHORITY_APPROVED_TIDB_SOURCE_READER_IDENTITY,
    tidbSourceReaderPrivilegeSet: env.DATABASE_AUTHORITY_APPROVED_TIDB_SOURCE_READER_PRIVILEGE_SET,
    migrationIdentity: env.DATABASE_AUTHORITY_APPROVED_MIGRATION_IDENTITY,
    migrationPrivilegeSet: env.DATABASE_AUTHORITY_APPROVED_MIGRATION_PRIVILEGE_SET,
    runtimeIdentity: env.DATABASE_AUTHORITY_APPROVED_RUNTIME_IDENTITY,
    workerIdentity: env.DATABASE_AUTHORITY_APPROVED_WORKER_IDENTITY,
    runtimeGrantDigest: env.DATABASE_AUTHORITY_APPROVED_RUNTIME_GRANT_DIGEST,
    runtimePreviousGrantDigest: env.DATABASE_AUTHORITY_APPROVED_RUNTIME_PREVIOUS_GRANT_DIGEST,
    workerGrantDigest: env.DATABASE_AUTHORITY_APPROVED_WORKER_GRANT_DIGEST,
  };
}

export type AuthorizedDatabaseOperation = {
  decisionVersion: 1;
  decisionId: string;
  contextId: string;
  operation: DatabaseOperation;
  targetFingerprintHash: string;
  targetClass: DatabaseTargetClass;
  credentialClass: DatabaseCredentialClass;
  approvalReference: string | null;
  approvalActor: string | null;
  evidenceRule: string;
};

const authorizationDecisions = new WeakSet<AuthorizedDatabaseOperation>();

function unique<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

function assertKnownValues<T extends string>(
  values: readonly string[],
  knownValues: readonly T[],
  label: string,
): asserts values is T[] {
  const known = new Set<string>(knownValues);
  const unknown = values.filter(value => !known.has(value));
  if (unknown.length > 0 || !unique(values)) {
    throw new Error(`Database operation policy has invalid ${label}.`);
  }
}

export function loadDatabaseOperationPolicy(
  root = process.cwd(),
  path = 'docs/database-authority/operation-policy.json',
): DatabaseOperationPolicy {
  const parsed = JSON.parse(readFileSync(resolve(root, path), 'utf8')) as DatabaseOperationPolicy;
  if (parsed.policyVersion !== 1) {
    throw new Error('Database operation policy version is unsupported.');
  }
  assertKnownValues(parsed.denyTargetClasses, DATABASE_TARGET_CLASSES, 'deny target classes');
  assertKnownValues(
    parsed.protectedTargetClasses,
    DATABASE_TARGET_CLASSES,
    'protected target classes',
  );
  const operationNames = Object.keys(parsed.operations);
  assertKnownValues(operationNames, DATABASE_OPERATIONS, 'operation names');
  if (operationNames.length !== DATABASE_OPERATIONS.length) {
    throw new Error('Database operation policy must define every operation exactly once.');
  }
  for (const operation of DATABASE_OPERATIONS) {
    const rule = parsed.operations[operation];
    assertKnownValues(rule.allowedTargetClasses, DATABASE_TARGET_CLASSES, 'target classes');
    assertKnownValues(rule.credentialClasses, DATABASE_CREDENTIAL_CLASSES, 'credential classes');
    if (
      !['none', 'registered-local-worktree', 'exact-local-owner'].includes(rule.ownership) ||
      !['none', 'protected-target'].includes(rule.approval) ||
      !['none', 'exact-target'].includes(rule.acknowledgement) ||
      !rule.evidence
    ) {
      throw new Error(`Database operation policy for ${operation} is malformed.`);
    }
  }
  return parsed;
}

export function expectedDatabaseAcknowledgement(
  context: Pick<ResolvedDatabaseContext, 'operation' | 'targetFingerprintHash'>,
): string {
  return `CONFIRM_${context.operation.toUpperCase().replace(/-/g, '_')}_${context.targetFingerprintHash.slice(0, 16)}`;
}

function assertOwnership(
  context: ResolvedDatabaseContext,
  requirement: OwnershipRequirement,
): void {
  if (requirement === 'none' || !context.local) return;
  if (!context.worktree.registered) {
    throw new Error(
      'Database operation refused: current directory is not a registered Git worktree.',
    );
  }
  if (requirement === 'registered-local-worktree') return;
  if (context.targetClass === 'clean-main-local') {
    if (!context.worktree.cleanMainOwnershipMatches) {
      throw new Error(
        'Database operation refused: listify_local belongs only to clean main at current origin/main.',
      );
    }
    return;
  }
  if (!context.worktree.ownershipMatches) {
    throw new Error(
      'Database operation refused: target does not belong to the current registered worktree.',
    );
  }
}

function assertProtectedApproval(
  context: ResolvedDatabaseContext,
  approval: ProtectedDatabaseApproval | undefined,
): void {
  if (
    !approval ||
    !approval.reference.trim() ||
    !approval.actor.trim() ||
    approval.operation !== context.operation ||
    approval.targetFingerprintHash !== context.targetFingerprintHash ||
    (approval.credentialClass != null && approval.credentialClass !== context.credentialClass)
  ) {
    throw new Error(
      'Database operation refused: protected target requires an exact operation and fingerprint approval.',
    );
  }
}

export function authorizeDatabaseOperation(
  authority: ResolvedDatabaseAuthority,
  input: {
    root?: string;
    policy?: DatabaseOperationPolicy;
    approval?: ProtectedDatabaseApproval;
    acknowledgement?: string;
  } = {},
): AuthorizedDatabaseOperation {
  const context = authority.context;
  const policy = input.policy ?? loadDatabaseOperationPolicy(input.root ?? context.repository.root);
  const rule = policy.operations[context.operation];

  if (policy.denyTargetClasses.includes(context.targetClass)) {
    throw new Error(
      `Database operation refused: target class ${context.targetClass} fails closed.`,
    );
  }
  if (!rule.allowedTargetClasses.includes(context.targetClass)) {
    throw new Error(
      `Database operation refused: ${context.operation} is not allowed for ${context.targetClass}.`,
    );
  }
  if (!rule.credentialClasses.includes(context.credentialClass)) {
    throw new Error(
      `Database operation refused: credential class ${context.credentialClass} is not allowed for ${context.operation}.`,
    );
  }
  if (
    context.operation === 'inspection-identity-provision' &&
    (context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      input.approval?.credentialClass !== 'bootstrap-admin' ||
      input.approval?.inspectionIdentity !== B08_INSPECTION_IDENTITY)
  ) {
    throw new Error('Database operation refused: exact B08 Azure inspection identity approval is required.');
  }
  if (
    context.operation === 'tidb-source-reader-provision' &&
    (context.targetFingerprintHash !== B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH ||
      context.provider !== 'tidb' ||
      input.approval?.credentialClass !== 'bootstrap-admin' ||
      input.approval?.tidbSourceInstanceId !== B08_TIDB_SOURCE_INSTANCE_ID ||
      input.approval?.tidbSourceAdminIdentity !== B08_TIDB_SOURCE_ADMIN_IDENTITY ||
      input.approval?.tidbSourceReaderIdentity !== B08_TIDB_SOURCE_READER_IDENTITY ||
      input.approval?.tidbSourceReaderPrivilegeSet !== B08_TIDB_SOURCE_READER_PRIVILEGE_SET)
  ) {
    throw new Error('Database operation refused: exact B08 TiDB source reader approval is required.');
  }
  if (
    context.operation === 'migration-identity-provision' &&
    (context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      input.approval?.credentialClass !== 'bootstrap-admin' ||
      input.approval?.migrationIdentity !== B08_MIGRATION_IDENTITY ||
      input.approval?.migrationPrivilegeSet !== B08_MIGRATION_PRIVILEGE_SET)
  ) {
    throw new Error('Database operation refused: exact B08 Azure migration identity approval is required.');
  }
  if (
    context.operation === 'runtime-identities-provision' &&
    (context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      input.approval?.credentialClass !== 'bootstrap-admin' ||
      input.approval?.runtimeIdentity !== B08_RUNTIME_IDENTITY ||
      input.approval?.workerIdentity !== B08_WORKER_IDENTITY ||
      input.approval?.runtimeGrantDigest !== B08_RUNTIME_GRANT_DIGEST ||
      input.approval?.workerGrantDigest !== B08_WORKER_GRANT_DIGEST)
  ) {
    throw new Error('Database operation refused: exact B08 Azure runtime identity approval is required.');
  }
  if (
    context.operation === 'runtime-ledger-read-grant' &&
    (context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      input.approval?.credentialClass !== 'bootstrap-admin' ||
      input.approval?.runtimeIdentity !== B08_RUNTIME_IDENTITY ||
      input.approval?.runtimePreviousGrantDigest !== B08_RUNTIME_GRANT_DIGEST ||
      input.approval?.runtimeGrantDigest !== B08_RUNTIME_LEDGER_READ_GRANT_DIGEST)
  ) {
    throw new Error('Database operation refused: exact B08 Azure ledger-read grant approval is required.');
  }
  if (
    context.operation === 'b08-behavior-verify' &&
    (context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      input.approval?.credentialClass !== 'migration' ||
      input.approval?.migrationIdentity !== B08_MIGRATION_IDENTITY ||
      input.approval?.migrationPrivilegeSet !== B08_MIGRATION_PRIVILEGE_SET)
  ) {
    throw new Error('Database operation refused: exact B08 Azure behavior approval is required.');
  }
  assertOwnership(context, rule.ownership);
  if (
    rule.approval === 'protected-target' &&
    policy.protectedTargetClasses.includes(context.targetClass)
  ) {
    assertProtectedApproval(context, input.approval);
  }
  if (
    rule.acknowledgement === 'exact-target' &&
    input.acknowledgement !== expectedDatabaseAcknowledgement(context)
  ) {
    throw new Error(
      `Database operation refused: exact acknowledgement is required (${expectedDatabaseAcknowledgement(context)}).`,
    );
  }

  const decision: AuthorizedDatabaseOperation = Object.freeze({
    decisionVersion: 1,
    decisionId: `${context.contextId}:${context.operation}`,
    contextId: context.contextId,
    operation: context.operation,
    targetFingerprintHash: context.targetFingerprintHash,
    targetClass: context.targetClass,
    credentialClass: context.credentialClass,
    approvalReference: input.approval?.reference ?? null,
    approvalActor: input.approval?.actor ?? null,
    evidenceRule: rule.evidence,
  });
  authorizationDecisions.add(decision);
  return decision;
}

export function assertAuthorizedDatabaseOperation(
  authority: ResolvedDatabaseAuthority,
  decision: AuthorizedDatabaseOperation,
  allowedOperations?: readonly DatabaseOperation[],
): void {
  if (
    !authorizationDecisions.has(decision) ||
    decision.contextId !== authority.context.contextId ||
    decision.targetFingerprintHash !== authority.context.targetFingerprintHash ||
    decision.operation !== authority.context.operation ||
    (allowedOperations && !allowedOperations.includes(decision.operation))
  ) {
    throw new Error(
      'Database connection refused: operation authorization is absent or mismatched.',
    );
  }
}
