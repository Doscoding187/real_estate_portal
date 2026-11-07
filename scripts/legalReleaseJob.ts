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

export class LegalReleaseJobFailure extends Error {
  constructor(readonly stage: string) {
    super(`Legal release job failed at ${stage}.`);
    this.name = 'LegalReleaseJobFailure';
  }
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
      const authority = resolveDatabaseAuthority({
        operation,
        gitIdentity: readInstallerWorktreeIdentity(process.cwd()),
        credentialClass: process.env.GITHUB_ACTIONS === 'true' ? undefined : credential,
      });
      const decision = authorizeDatabaseOperation(authority, {
        approval: protectedDatabaseApprovalFromEnvironment(authority),
        acknowledgement,
      });
      const connection = await createAuthoritySqlConnection(authority, decision);
      return completeLegalReleaseCommand({
        connection,
        operation: () => run({ authority, decision, connection }) as Promise<any>,
      });
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
    throw new LegalReleaseJobFailure('prepare');
  }
}

async function runStage<T>(stage: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof LegalReleaseJobFailure) throw error;
    throw new LegalReleaseJobFailure(stage);
  }
}

/** Returns the JSON-serialisable result lines to print. Never includes URLs. */
export async function runLegalReleaseJob(
  env: Env,
  deps: LegalReleaseJobDeps = defaultLegalReleaseJobDeps(),
): Promise<Array<Record<string, unknown>>> {
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
    return [
      {
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
      },
    ];
  }

  if (mode === 'verify') {
    const verified = await runStage('verify', () =>
      run('legal-release-verify', 'read-only', optionalAck),
    );
    return [{ event: 'legal-release-job-verified', ...pick(verified) }];
  }

  // apply
  const expectedPacketDigest = cleanInput(env, LEGAL_JOB_ENV.packetDigest);
  if (packetDigest !== expectedPacketDigest) throw new LegalReleaseJobFailure('packet-digest');
  const planDigest = cleanInput(env, LEGAL_JOB_ENV.planDigest);
  const ack = cleanInput(env, LEGAL_JOB_ENV.ack);
  const completed = await runStage('apply', () =>
    run('legal-release-apply', 'migration', ack, planDigest),
  );
  const verified = await runStage('post-apply-verify', () =>
    run('legal-release-verify', 'read-only', undefined),
  );
  return [
    { event: 'legal-release-job-completed', ...pick(completed) },
    { event: 'legal-release-job-verified', ...pick(verified) },
  ];
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
