import { z } from 'zod';
import { execFileSync } from 'node:child_process';
import * as legalSchema from '../../../drizzle/schema/legalAcceptance';
import { prepareLegalRelease } from '../../services/legalReleasePreparation';
import { acquireMigrationLock, releaseMigrationLock } from '../../migrations/runSqlMigrations';
import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from './authorization';
import type { AuthoritySqlConnection } from './connectionAuthority';
import type { ResolvedDatabaseAuthority } from './types';
import { assertOwnedDisposableTarget } from './lifecycle';
import { readGitWorktreeIdentity } from './worktreeIdentity';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { resolve } from 'node:path';
import { queryRows, requireAcceptedMigrationHead, stableDigest } from './dataAdapters/common';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const packetSchema = z
  .object({
    formatVersion: z.literal(1),
    sourceHead: z.string().regex(/^[a-f0-9]{40}$/),
    manifestDigest: digest,
    expectedPreviousBundleId: z.string().min(1).max(100).nullable(),
    validUntil: z.string().datetime(),
    plannedEffectiveAt: z.string().datetime(),
    candidate: z.unknown(),
    approval: z.unknown(),
    terms: z.string(),
    privacy: z.string(),
  })
  .strict();

const columns = {
  bundleId: 'bundle_id',
  formatVersion: 'format_version',
  effectiveAt: 'effective_at',
  termsVersion: 'terms_version',
  termsContent: 'terms_content',
  privacyVersion: 'privacy_version',
  privacyContent: 'privacy_content',
  approvalReference: 'approval_reference',
  approvalActor: 'approval_actor',
  approvedAt: 'approved_at',
  contentSha256: 'content_sha256',
} as const;
type LegalRow = ReturnType<typeof prepareLegalRelease>['databaseRow'];
const fields = Object.keys(columns) as Array<keyof LegalRow>;

function reviewedFiles(root: string, head: string) {
  const path =
    'docs/architecture/launch-readiness-and-product-convergence/evidence/b15-existing-certificate-20261013';
  const read = (file: string) =>
    execFileSync('git', ['show', `${head}:${path}/${file}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  return {
    terms: read('terms.txt'),
    privacy: read('privacy.txt'),
    candidate: JSON.parse(read('release-candidate.json')),
    approval: JSON.parse(read('final-privacy-approval.json')),
  };
}

/** Offline package construction from committed approvals. No target, credential,
 * connection or public effective date is created by this preparation. */
export function prepareLegalInstallationPacket(input: {
  root: string;
  plannedEffectiveAt: string;
  validUntil: string;
  expectedPreviousBundleId: string | null;
}) {
  const identity = readGitWorktreeIdentity(input.root);
  if (!identity.clean) throw new Error('Legal package requires clean reviewed source');
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(input.root, 'server/migrations'),
  });
  const packet = packetSchema.parse({
    formatVersion: 1,
    sourceHead: identity.head,
    manifestDigest: manifest.manifestDigest,
    expectedPreviousBundleId: input.expectedPreviousBundleId,
    plannedEffectiveAt: input.plannedEffectiveAt,
    validUntil: input.validUntil,
    ...reviewedFiles(input.root, identity.head),
  });
  prepareLegalRelease({ ...packet, candidate: packet.candidate, approval: packet.approval });
  const window = Date.parse(packet.validUntil) - Date.parse(packet.plannedEffectiveAt);
  if (window <= 0 || window > 30 * 60_000)
    throw new Error('Legal package activation window must be positive and at most 30 minutes');
  return packet;
}

export class LegalReleaseOutcomeUnknown extends Error {
  readonly unsafeToReplay = true;
  constructor(readonly primaryFailure: unknown) {
    super(
      'Legal release COMMIT outcome is unknown. Keep affected intake held; perform named read-only verification before any further apply.',
    );
    this.name = 'LegalReleaseOutcomeUnknown';
  }
}

function sameRow(observed: Record<string, unknown>, desired: LegalRow): boolean {
  return fields.every(key => observed[columns[key]] === desired[key]);
}

async function inspect(connection: AuthoritySqlConnection, row: LegalRow, locked = false) {
  const pointerRows = await queryRows(
    connection,
    `SELECT bundle_id FROM legal_active_release WHERE purpose = ?${locked ? ' FOR UPDATE' : ''}`,
    ['account_registration'],
  );
  const releaseRows = await queryRows(
    connection,
    `SELECT ${Object.values(columns).join(', ')} FROM legal_releases WHERE bundle_id = ?${locked ? ' FOR UPDATE' : ''}`,
    [row.bundleId],
  );
  if (pointerRows.length > 1 || releaseRows.length > 1)
    throw new Error('Legal release cardinality differs from canonical authority');
  if (releaseRows[0] && !sameRow(releaseRows[0], row))
    throw new Error('Immutable legal bundle ID collision; released text will not be overwritten');
  const pointer = pointerRows[0]?.bundle_id ?? null;
  if (pointer !== null && typeof pointer !== 'string') throw new Error('Invalid legal pointer');
  if (pointer === row.bundleId && releaseRows.length !== 1)
    throw new Error('Active pointer lacks its immutable legal row');
  return { pointer: pointer as string | null, rowExists: releaseRows.length === 1 };
}

/** Named canonical authority operation. No raw connection factory, schema,
 * grants, acceptance backfill, release overwrite or automatic rollback. */
export async function installLegalRelease(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  packet: unknown;
  expectedPlanDigest?: string;
  now?: () => Date;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'legal-release-plan',
    'legal-release-apply',
    'legal-release-verify',
  ]);
  const context = input.authority.context;
  if (context.provider !== 'mysql')
    throw new Error('Legal release requires the admitted transactional MySQL authority');
  const protectedTarget = ['staging', 'production'].includes(context.targetClass);
  if (protectedTarget) {
    if (!context.worktree.clean)
      throw new Error('Protected legal release requires clean reviewed source');
  } else {
    assertOwnedDisposableTarget(input.authority);
  }
  const packet = packetSchema.parse(input.packet);
  if (packet.sourceHead !== context.repository.head)
    throw new Error('Legal release source head mismatch');
  if (protectedTarget) {
    const reviewed = reviewedFiles(context.repository.root, packet.sourceHead);
    if (
      reviewed.terms !== packet.terms ||
      reviewed.privacy !== packet.privacy ||
      stableDigest(reviewed.candidate) !== stableDigest(packet.candidate) ||
      stableDigest(reviewed.approval) !== stableDigest(packet.approval)
    )
      throw new Error('Legal release packet differs from the exact reviewed Git copy/approval');
  }
  const prepared = prepareLegalRelease({
    candidate: packet.candidate,
    approval: packet.approval,
    terms: packet.terms,
    privacy: packet.privacy,
    plannedEffectiveAt: packet.plannedEffectiveAt,
  });
  const row = prepared.databaseRow;
  const effective = Date.parse(row.effectiveAt),
    expiry = Date.parse(packet.validUntil);
  if (expiry <= effective || expiry - effective > 30 * 60_000)
    throw new Error('Legal release requires a finite activation window of at most 30 minutes');
  const now = input.now ?? (() => new Date());
  const operation = input.decision.operation;
  const checkWindow = () => {
    const stamp = now().getTime();
    if (
      !Number.isFinite(stamp) ||
      stamp > expiry ||
      stamp < effective - (operation === 'legal-release-plan' ? 30 * 60_000 : 0)
    )
      throw new Error('Legal release is outside its controlled activation window');
  };
  if (operation !== 'legal-release-verify') checkWindow();
  const manifest = await requireAcceptedMigrationHead(input);
  if (packet.manifestDigest !== manifest.manifestDigest)
    throw new Error('Legal release manifest digest mismatch');
  const checkPhysical = async () => {
    const desired = normalizedDesiredSchema(legalSchema);
    const physical = await normalizedPhysicalSchema(input.connection, context.provider, desired);
    const names = new Set(desired.tables.map(table => table.name));
    const scopedPhysical = {
      ...physical,
      tables: physical.tables.filter(table => names.has(table.name)),
    };
    if (!compareNormalizedSchemas(desired, scopedPhysical).congruent)
      throw new Error('Legal release physical schema differs from canonical authority');
    const engines = await queryRows(
      input.connection,
      'SELECT TABLE_NAME AS table_name, ENGINE AS engine FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?, ?)',
      [...names],
    );
    if (
      engines.length !== names.size ||
      engines.some(item => !names.has(String(item.table_name)) || item.engine !== 'InnoDB')
    )
      throw new Error('Legal release requires all legal tables to use InnoDB transactions');
  };
  await checkPhysical();
  const binding = {
    protocol: 'legal-release-v1',
    targetFingerprintHash: context.targetFingerprintHash,
    sourceHead: packet.sourceHead,
    manifestDigest: packet.manifestDigest,
    expectedHead: manifest.document.expectedHead,
    expectedPreviousBundleId: packet.expectedPreviousBundleId,
    validUntil: packet.validUntil,
    sourceBusinessApproval: prepared.sourceBusinessApproval,
    row,
  };
  const planDigest = stableDigest(binding);
  const evidence = (state: string, pointer: string | null) => ({
    recordedAt: now().toISOString(),
    operation,
    operationApprovalReference: input.decision.approvalReference,
    operationApprovalActor: input.decision.approvalActor,
    state,
    planDigest,
    targetFingerprintHash: context.targetFingerprintHash,
    sourceHead: packet.sourceHead,
    manifestDigest: packet.manifestDigest,
    expectedHead: manifest.document.expectedHead,
    bundleId: row.bundleId,
    contentSha256: row.contentSha256,
    approvalReference: row.approvalReference,
    activeBundleId: pointer,
    effectiveAt: row.effectiveAt,
    validUntil: packet.validUntil,
    acceptanceWrites: false,
    schemaWrites: false,
    grantWrites: false,
  });
  const assertPrior = (snapshot: Awaited<ReturnType<typeof inspect>>) => {
    if (snapshot.pointer !== row.bundleId && snapshot.pointer !== packet.expectedPreviousBundleId)
      throw new Error('Legal release prior pointer changed; create and review a fresh plan');
  };
  if (operation !== 'legal-release-apply') {
    const snapshot = await inspect(input.connection, row);
    if (operation === 'legal-release-verify') {
      if (!snapshot.rowExists || snapshot.pointer !== row.bundleId)
        throw new Error('Legal release verification differs: bundle or pointer is not installed');
      return evidence('verified', snapshot.pointer);
    }
    assertPrior(snapshot);
    return evidence(
      snapshot.pointer === row.bundleId ? 'already_installed' : 'prepared_not_installed',
      snapshot.pointer,
    );
  }
  if (input.expectedPlanDigest !== planDigest)
    throw new Error('Legal release exact reviewed plan digest is required');
  await acquireMigrationLock(input.connection, manifest.document.lockName);
  let started = false,
    commitDispatched = false;
  try {
    // Recheck schema after acquiring the shared schema-release lock.
    await requireAcceptedMigrationHead(input);
    await checkPhysical();
    checkWindow();
    await input.connection.query('START TRANSACTION');
    started = true;
    const snapshot = await inspect(input.connection, row, true);
    assertPrior(snapshot);
    if (snapshot.pointer !== row.bundleId) {
      if (!snapshot.rowExists)
        await input.connection.execute(
          `INSERT INTO legal_releases (${Object.values(columns).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
          fields.map(key => row[key]),
        );
      if (snapshot.pointer === null)
        await input.connection.execute(
          'INSERT INTO legal_active_release (purpose, bundle_id) VALUES (?, ?)',
          ['account_registration', row.bundleId],
        );
      else
        await input.connection.execute(
          'UPDATE legal_active_release SET bundle_id = ? WHERE purpose = ? AND bundle_id = ?',
          [row.bundleId, 'account_registration', snapshot.pointer],
        );
    }
    const readback = await inspect(input.connection, row, true);
    if (!readback.rowExists || readback.pointer !== row.bundleId)
      throw new Error('Legal release transactional readback differs');
    checkWindow();
    commitDispatched = true;
    const transactionCommitDispatchedAt = now().toISOString();
    await input.connection.query('COMMIT');
    return {
      ...evidence(
        snapshot.pointer === row.bundleId ? 'already_installed' : 'installed',
        row.bundleId,
      ),
      activationChanged: snapshot.pointer !== row.bundleId,
      transactionCommitDispatchedAt,
      transactionCommitAcknowledgedAt: now().toISOString(),
    };
  } catch (error) {
    if (commitDispatched) throw new LegalReleaseOutcomeUnknown(error);
    if (started) await input.connection.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await releaseMigrationLock(input.connection, manifest.document.lockName);
  }
}
