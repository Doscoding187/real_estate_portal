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
};

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
    approval.targetFingerprintHash !== context.targetFingerprintHash
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
