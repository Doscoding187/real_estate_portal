import { completeLegalReleaseCommand } from './legalReleaseCommand';
import {
  installLegalRelease,
  prepareLegalInstallationPacket,
} from '../server/_core/databaseAuthority/legalReleaseInstallation';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import { readInstallerWorktreeIdentity } from '../server/_core/databaseAuthority/worktreeIdentity';
import { stableDigest } from '../server/_core/databaseAuthority/dataAdapters/common';
import type {
  DatabaseCredentialClass,
  DatabaseOperation,
} from '../server/_core/databaseAuthority/types';

export const LEGAL_JOB_ENV = {
  mode: 'LEGAL_RELEASE_MODE',
  effectiveAt: 'LEGAL_EFFECTIVE_AT',
  validUntil: 'LEGAL_VALID_UNTIL',
  previousBundle: 'LEGAL_PREVIOUS_BUNDLE',
  packetDigest: 'LEGAL_PACKET_DIGEST',
  planDigest: 'LEGAL_PLAN_DIGEST',
  ack: 'LEGAL_ACK',
} as const;

export interface LegalReleaseFailureDetail {
  errorName?: string;
  outcomeUnknown?: boolean;
  /** Only fixed library refusal texts; never driver text. */
  libraryMessage?: string;
  applyCommitted?: boolean;
  applyState?: string;
  step?: string;
  code?: string;
}

export const LEGAL_JOB_STEPS = [
  'installer-identity',
  'resolve-authority',
  'approval-env',
  'authorize',
  'connect',
  'run',
] as const;
const STEP_PROPERTY = 'legalJobStep';
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

export class LegalReleaseJobFailure extends Error {
  constructor(
    readonly stage: string,
    readonly detail: LegalReleaseFailureDetail = {},
  ) {
    super(`Legal release job failed at ${stage}.`);
    this.name = 'LegalReleaseJobFailure';
  }
}

const SAFE_MESSAGE_PREFIXES = [
  'Legal release',
  'Legal package',
  'Legal-release installer refused',
  'Protected legal release',
  'Database operation refused',
  'Database connection refused',
  'Recovery validation target',
];

function tagStep(error: unknown, step: string): unknown {
  if (error !== null && typeof error === 'object' && !(STEP_PROPERTY in error)) {
    try {
      Object.defineProperty(error, STEP_PROPERTY, { value: step, enumerable: false });
    } catch {
      // frozen error objects stay untagged
    }
  }
  return error;
}

function detailFrom(error: unknown): LegalReleaseFailureDetail {
  if (!(error instanceof Error)) return { outcomeUnknown: false };
  const unsafe = (error as { unsafeToReplay?: unknown }).unsafeToReplay === true;
  const unknown =
    unsafe ||
    error.name === 'LegalReleaseOutcomeUnknown' ||
    error.name === 'LegalReleaseCommandFailure';
  const raw = error as { code?: unknown; sqlState?: unknown; [k: string]: unknown };
  const isDriverError = raw.code !== undefined || raw.sqlState !== undefined;
  const safeMessage =
    !isDriverError && SAFE_MESSAGE_PREFIXES.some(prefix => error.message.startsWith(prefix));
  const stepValue = raw[STEP_PROPERTY];
  const step =
    typeof stepValue === 'string' && (LEGAL_JOB_STEPS as readonly string[]).includes(stepValue)
      ? stepValue
      : undefined;
  const code = typeof raw.code === 'string' && SAFE_CODE.test(raw.code) ? raw.code : undefined;
  return {
    errorName: error.name,
    outcomeUnknown: unknown,
    ...(step ? { step } : {}),
    ...(code ? { code } : {}),
    ...(safeMessage ? { libraryMessage: error.message.slice(0, 300) } : {}),
  };
}

/** Safe one-line failure record for the CLI. */
export function legalReleaseFailureLine(error: unknown): Record<string, unknown> {
  const failure = error instanceof LegalReleaseJobFailure ? error : undefined;
  const detail = failure?.detail ?? detailFrom(error);
  return {
    event: 'legal-release-job-failed',
    stage: failure?.stage ?? 'unknown',
    errorName: detail.errorName ?? null,
    outcomeUnknown: detail.outcomeUnknown ?? false,
    safeToReplay: false,
    ...(detail.step ? { step: detail.step } : {}),
    ...(detail.code ? { code: detail.code } : {}),
    ...(detail.applyCommitted ? { applyCommitted: true, applyState: detail.applyState } : {}),
    ...(detail.libraryMessage ? { message: detail.libraryMessage } : {}),
  };
}

const REJECTED_LITERALS = new Set(['undefined', 'null']);

type Env = Record<string, string | undefined>;

function cleanInput(env: Env, name: string): string {
  const value = (env[name] ?? '').trim();
  if (!value || REJECTED_LITERALS.has(value)) {
    throw new LegalReleaseJobFailure(`input:${name}`);
  }
  return value;
}

export interface LegalReleaseJobDeps {
  preparePacket: typeof prepareLegalInstallationPacket;
  install: typeof installLegalRelease;
  runOperation: (
    operation: DatabaseOperation,
    credential: DatabaseCredentialClass,
    acknowledgement: string | undefined,
    run: (ctx: {
      authority: any;
      decision: any;
      connection: any;
    }) => Promise<unknown>,
  ) => Promise<any>;
  root: string;
}

/** Same library path as databaseAuthorityCli legal-release:*: resolve authority,
 * authorize, open the authority connection, run, then close. */
export function defaultLegalReleaseJobDeps(): LegalReleaseJobDeps {
  return {
    preparePacket: prepareLegalInstallationPacket,
    install: installLegalRelease,
    root: process.cwd(),
    runOperation: async (operation, credential, acknowledgement, run) => {
      let step: string = 'installer-identity';
      try {
        const gitIdentity = readInstallerWorktreeIdentity(process.cwd());
        step = 'resolve-authority';
        const authority = resolveDatabaseAuthority({
          operation,
          gitIdentity,
          credentialClass: process.env.GITHUB_ACTIONS === 'true' ? undefined : credential,
        });
        step = 'approval-env';
        const approval = protectedDatabaseApprovalFromEnvironment(authority);
        step = 'authorize';
        const decision = authorizeDatabaseOperation(authority, { approval, acknowledgement });
        step = 'connect';
        const connection = await createAuthoritySqlConnection(authority, decision);
        step = 'run';
        return await completeLegalReleaseCommand({
          connection,
          operation: () => run({ authority, decision, connection }) as Promise<any>,
        });
      } catch (error) {
        throw tagStep(error, step);
      }
    },
  };
}

function preparePacketFromEnv(env: Env, deps: LegalReleaseJobDeps) {
  const previous = cleanInput(env, LEGAL_JOB_ENV.previousBundle);
  try {
    return deps.preparePacket({
      root: deps.root,
      plannedEffectiveAt: cleanInput(env, LEGAL_JOB_ENV.effectiveAt),
      validUntil: cleanInput(env, LEGAL_JOB_ENV.validUntil),
      expectedPreviousBundleId: previous === 'none' ? null : previous,
    });
  } catch (error) {
    if (error instanceof LegalReleaseJobFailure) throw error;
    throw new LegalReleaseJobFailure('prepare', detailFrom(error));
  }
}

async function runStage<T>(
  stage: string,
  fn: () => Promise<T>,
  extra: LegalReleaseFailureDetail = {},
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof LegalReleaseJobFailure) throw error;
    throw new LegalReleaseJobFailure(stage, { ...detailFrom(error), ...extra });
  }
}

/** Returns the JSON-serialisable result lines to print. Never includes URLs. */
export async function runLegalReleaseJob(
  env: Env,
  deps: LegalReleaseJobDeps = defaultLegalReleaseJobDeps(),
  emit: (line: Record<string, unknown>) => void = () => {},
): Promise<Array<Record<string, unknown>>> {
  // The approved-credential-class variable would also bind the read-only
  // verify that follows apply, so it must not be set for this job.
  if ((env.DATABASE_AUTHORITY_APPROVED_CREDENTIAL_CLASS ?? '') !== '') {
    throw new LegalReleaseJobFailure('validation');
  }
  // The authority layer ignores the requested credential class under GitHub Actions.
  if ((env.GITHUB_ACTIONS ?? '') !== '') {
    throw new LegalReleaseJobFailure('validation');
  }
  const mode = cleanInput(env, LEGAL_JOB_ENV.mode);
  if (mode !== 'plan' && mode !== 'apply' && mode !== 'verify') {
    throw new LegalReleaseJobFailure('mode');
  }
  const packet = preparePacketFromEnv(env, deps);
  const packetDigest = stableDigest(packet);
  const optionalAck = (env[LEGAL_JOB_ENV.ack] ?? '').trim() || undefined;

  const run = (
    operation: DatabaseOperation,
    credential: DatabaseCredentialClass,
    acknowledgement: string | undefined,
    expectedPlanDigest?: string,
  ) =>
    deps.runOperation(operation, credential, acknowledgement, ({ authority, decision, connection }) =>
      deps.install({ authority, decision, connection, packet, expectedPlanDigest }),
    );

  if (mode === 'plan') {
    const plan = await runStage('plan', () => run('legal-release-plan', 'read-only', optionalAck));
    const line = {
      event: 'legal-release-job-plan',
      packetDigest,
      planDigest: plan.planDigest,
      requiredAcknowledgement: expectedDatabaseAcknowledgement({
        operation: 'legal-release-apply',
        targetFingerprintHash: plan.targetFingerprintHash,
      }),
      sourceHead: plan.sourceHead,
      bundleId: plan.bundleId,
      plannedEffectiveAt: plan.effectiveAt,
      validUntil: plan.validUntil,
    };
    emit(line);
    return [line];
  }

  if (mode === 'verify') {
    const verified = await runStage('verify', () =>
      run('legal-release-verify', 'read-only', optionalAck),
    );
    const line = { event: 'legal-release-job-verified', ...pick(verified) };
    emit(line);
    return [line];
  }

  // apply
  const expectedPacketDigest = cleanInput(env, LEGAL_JOB_ENV.packetDigest);
  if (packetDigest !== expectedPacketDigest) throw new LegalReleaseJobFailure('packet-digest');
  const planDigest = cleanInput(env, LEGAL_JOB_ENV.planDigest);
  const ack = cleanInput(env, LEGAL_JOB_ENV.ack);
  const completed = await runStage('apply', () =>
    run('legal-release-apply', 'migration', ack, planDigest),
  );
  // Print the full apply evidence now, before the post-apply verify can fail.
  const completedLine = { event: 'legal-release-job-completed', ...completed };
  emit(completedLine);
  const verified = await runStage(
    'post-apply-verify',
    () => run('legal-release-verify', 'read-only', undefined),
    { applyCommitted: true, applyState: String(completed?.state ?? '') },
  );
  const verifiedLine = { event: 'legal-release-job-verified', ...pick(verified) };
  emit(verifiedLine);
  return [completedLine, verifiedLine];
}

function pick(evidence: Record<string, any>) {
  return {
    operation: evidence.operation,
    state: evidence.state,
    planDigest: evidence.planDigest,
    sourceHead: evidence.sourceHead,
    bundleId: evidence.bundleId,
    activeBundleId: evidence.activeBundleId,
    effectiveAt: evidence.effectiveAt,
    validUntil: evidence.validUntil,
  };
}
