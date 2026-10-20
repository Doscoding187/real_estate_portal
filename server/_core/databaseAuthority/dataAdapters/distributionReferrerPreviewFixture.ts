import bcrypt from 'bcryptjs';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
import { assessAuthorizedDatabaseReadiness } from '../readiness';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  assertCentralEnvironmentReady,
  inspectCentralLocalEnvironment,
  resolveCentralLocalEnvironment,
} from '../../../../scripts/localEnvironmentAuthority';

export const DISTRIBUTION_REFERRER_PREVIEW_VERSION =
  'distribution-individual-referrer-preview-v1' as const;
export const DISTRIBUTION_REFERRER_PREVIEW_EMAIL =
  'individual-referrer@listify.local' as const;
export const DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID =
  'distribution-individual-referrer-preview-v1' as const;
export const DISTRIBUTION_REFERRER_PREVIEW_PASSWORD_VARIABLE =
  'LOCAL_DEMO_AGENCY_PASSWORD' as const;

const EXPECTED_USER = Object.freeze({
  openId: DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
  email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  name: 'Individual Referrer Preview',
  firstName: 'Individual',
  lastName: 'Referrer',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'visitor',
  agencyId: null,
  isSubaccount: 0,
  onboardingComplete: 1,
  onboardingStep: 0,
});

const EXPECTED_IDENTITY = Object.freeze({
  identityType: 'referrer',
  active: 1,
  displayName: EXPECTED_USER.name,
});

const FIXTURE_PAYLOAD = Object.freeze({
  version: DISTRIBUTION_REFERRER_PREVIEW_VERSION,
  user: EXPECTED_USER,
  identity: EXPECTED_IDENTITY,
  scope: 'account-and-distribution-identity-only',
  password: 'machine-local-only;excluded-from-digest',
});

export const DISTRIBUTION_REFERRER_PREVIEW_DIGEST = stableDigest(FIXTURE_PAYLOAD);

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'reused';

export type DistributionReferrerPreviewEvidence = AdapterEvidence & {
  fixture: typeof DISTRIBUTION_REFERRER_PREVIEW_VERSION;
  account: { userId: number; email: typeof DISTRIBUTION_REFERRER_PREVIEW_EMAIL };
  distributionIdentityId: number;
  prepared: { user: PreparedState; identity: PreparedState };
  verified: {
    migrationHead: string;
    schemaCongruent: true;
    userRole: 'visitor';
    activeReferrerIdentity: true;
    noAgentProfile: true;
    noAgencyAssociation: true;
    noProgramGrant: true;
    passwordHash: true;
  };
};

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function requireExact(value: unknown, expected: unknown, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`Distribution referrer preview fixture conflicts at ${label}.`);
  }
}

function requireNull(value: unknown, label: string): void {
  if (value !== null && value !== undefined && String(value) !== '') {
    throw new Error(`Distribution referrer preview fixture conflicts at ${label}.`);
  }
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`Distribution referrer preview fixture has duplicate ${label} rows.`);
  }
  return rows[0] ?? null;
}

export function assertDistributionReferrerPreviewPassword(
  password: unknown,
): asserts password is string {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    /(?:replace-with|placeholder|example|changeme|your[-_ ]|<[^>]+>)/i.test(password)
  ) {
    throw new Error(
      `Distribution referrer preview fixture refused: ${DISTRIBUTION_REFERRER_PREVIEW_PASSWORD_VARIABLE} must be a configured machine-local secret.`,
    );
  }
}

function localPreviewPassword(): string {
  const central = inspectCentralLocalEnvironment(resolveCentralLocalEnvironment());
  assertCentralEnvironmentReady(central);
  const password = central.values[DISTRIBUTION_REFERRER_PREVIEW_PASSWORD_VARIABLE];
  assertDistributionReferrerPreviewPassword(password);
  return password;
}

function asPositiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Distribution referrer preview fixture has an invalid ${label}.`);
  }
  return id;
}

export function assertDistributionReferrerPreviewTarget(
  authority: ResolvedDatabaseAuthority,
): void {
  assertOwnedDisposableTarget(authority);
  const { context } = authority;
  if (
    context.targetClass !== 'disposable-worktree' ||
    context.host !== '127.0.0.1' ||
    context.port !== '3307' ||
    context.databaseName !== context.worktree.expectedDatabase ||
    !context.worktree.ownershipMatches
  ) {
    throw new Error(
      'Distribution referrer preview fixture refused: an exact owned localhost disposable worktree database is required.',
    );
  }
}

export function assertDistributionReferrerPreviewUser(row: Row): void {
  requireExact(rowValue(row, 'openId'), EXPECTED_USER.openId, 'user openId');
  requireExact(rowValue(row, 'email'), EXPECTED_USER.email, 'user email');
  requireExact(rowValue(row, 'name'), EXPECTED_USER.name, 'user name');
  requireExact(rowValue(row, 'firstName'), EXPECTED_USER.firstName, 'user firstName');
  requireExact(rowValue(row, 'lastName'), EXPECTED_USER.lastName, 'user lastName');
  requireNull(rowValue(row, 'phone'), 'user phone');
  requireExact(rowValue(row, 'loginMethod'), EXPECTED_USER.loginMethod, 'user login method');
  requireExact(rowValue(row, 'emailVerified'), EXPECTED_USER.emailVerified, 'user email verification');
  requireExact(rowValue(row, 'role'), EXPECTED_USER.role, 'user base role');
  requireNull(rowValue(row, 'agencyId'), 'user agency association');
  requireExact(rowValue(row, 'isSubaccount'), EXPECTED_USER.isSubaccount, 'user subaccount flag');
  requireExact(
    rowValue(row, 'onboarding_complete'),
    EXPECTED_USER.onboardingComplete,
    'user onboarding state',
  );
  requireExact(
    rowValue(row, 'onboarding_step'),
    EXPECTED_USER.onboardingStep,
    'user onboarding step',
  );
}

export function classifyDistributionReferrerPreviewUser(row: Row | null): {
  state: PreparedState;
} {
  if (!row) return { state: 'created' };
  assertDistributionReferrerPreviewUser(row);
  return { state: 'reused' };
}

export function assertDistributionReferrerIdentity(row: Row): void {
  requireExact(rowValue(row, 'identity_type'), EXPECTED_IDENTITY.identityType, 'identity type');
  requireExact(rowValue(row, 'active'), EXPECTED_IDENTITY.active, 'identity active state');
  requireExact(rowValue(row, 'display_name'), EXPECTED_IDENTITY.displayName, 'identity display name');
}

async function passwordHashMatches(password: string, hash: unknown): Promise<boolean> {
  if (typeof hash !== 'string' || !hash) return false;
  return bcrypt.compare(password, hash);
}

async function findUser(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, openId, email, passwordHash, name, firstName, lastName, phone,
            loginMethod, emailVerified, role, agencyId, isSubaccount,
            onboarding_complete, onboarding_step
       FROM users
      WHERE email = ? OR openId = ?
      ORDER BY id`,
    [EXPECTED_USER.email, EXPECTED_USER.openId],
  );
  return requireOneOrNone(rows, 'individual referrer user');
}

async function ensureUser(
  connection: AuthoritySqlConnection,
  password: string,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findUser(connection);
  const classification = classifyDistributionReferrerPreviewUser(existing);
  if (existing) {
    if (!(await passwordHashMatches(password, rowValue(existing, 'passwordHash')))) {
      throw new Error(
        'Distribution referrer preview fixture refuses to rotate a conflicting existing password.',
      );
    }
    return { id: asPositiveId(rowValue(existing, 'id'), 'user ID'), state: classification.state };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await connection.execute(
    `INSERT INTO users
      (openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
       emailVerified, role, plan, trialStatus, onboarding_complete, onboarding_step,
       subscription_tier, subscription_status, agencyId, isSubaccount,
       passwordResetToken, passwordResetTokenExpiresAt, emailVerificationToken)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, 'trial', 'active', 1, 0,
             'free', 'trial', NULL, 0, NULL, NULL, NULL)`,
    [
      EXPECTED_USER.openId,
      EXPECTED_USER.email,
      passwordHash,
      EXPECTED_USER.name,
      EXPECTED_USER.firstName,
      EXPECTED_USER.lastName,
      EXPECTED_USER.loginMethod,
      EXPECTED_USER.role,
    ],
  );
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : (result as { insertId?: unknown } | null);
  return { id: asPositiveId(header?.insertId, 'created user ID'), state: 'created' };
}

async function ensureDistributionIdentity(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<{ id: number; state: PreparedState }> {
  const rows = await queryRows(
    connection,
    `SELECT id, user_id, identity_type, active, display_name
       FROM distribution_identities
      WHERE user_id = ?
      ORDER BY id`,
    [userId],
  );
  if (rows.length > 1) {
    throw new Error('Distribution referrer preview fixture refuses multiple identities on the demo user.');
  }
  const existing = rows[0];
  if (existing) {
    assertDistributionReferrerIdentity(existing);
    return { id: asPositiveId(rowValue(existing, 'id'), 'Distribution identity ID'), state: 'reused' };
  }

  const result = await connection.execute(
    `INSERT INTO distribution_identities (user_id, identity_type, active, display_name)
     VALUES (?, ?, 1, ?)`,
    [userId, EXPECTED_IDENTITY.identityType, EXPECTED_IDENTITY.displayName],
  );
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : (result as { insertId?: unknown } | null);
  return {
    id: asPositiveId(header?.insertId, 'created Distribution identity ID'),
    state: 'created',
  };
}

async function assertNoAgentProfileOrProgramGrant(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<void> {
  const agents = await queryRows(connection, 'SELECT id FROM agents WHERE userId = ? ORDER BY id', [
    userId,
  ]);
  if (agents.length) {
    throw new Error('Distribution referrer preview fixture refuses an agent profile.');
  }
  const grants = await queryRows(
    connection,
    'SELECT id FROM distribution_agent_access WHERE agent_id = ? ORDER BY id',
    [userId],
  );
  if (grants.length) {
    throw new Error('Distribution referrer preview fixture refuses pre-existing program grants.');
  }
}

async function requireCurrentCongruentSchema(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  migrationHead: string;
}): Promise<void> {
  const readiness = await assessAuthorizedDatabaseReadiness({
    authority: input.authority,
    connection: input.connection,
    authorization: input.decision,
  });
  if (
    readiness.layers.targetConnectivity.state !== 'ready' ||
    readiness.layers.migrationHead.state !== 'ready' ||
    readiness.layers.schemaCongruent.state !== 'ready'
  ) {
    throw new Error(
      `Distribution referrer preview fixture refused: exact target, current migration head ${input.migrationHead}, and schema congruency are required.`,
    );
  }
}

async function verifyFixture(input: {
  connection: AuthoritySqlConnection;
  userId: number;
  identityId: number;
  password: string;
  migrationHead: string;
}): Promise<DistributionReferrerPreviewEvidence['verified']> {
  const user = await findUser(input.connection);
  if (!user) throw new Error('Distribution referrer preview fixture user is missing.');
  assertDistributionReferrerPreviewUser(user);
  requireExact(rowValue(user, 'id'), input.userId, 'user ID');
  if (!(await passwordHashMatches(input.password, rowValue(user, 'passwordHash')))) {
    throw new Error('Distribution referrer preview fixture password hash does not match the local secret.');
  }

  const identities = await queryRows(
    input.connection,
    `SELECT id, user_id, identity_type, active, display_name
       FROM distribution_identities
      WHERE user_id = ?
      ORDER BY id`,
    [input.userId],
  );
  if (identities.length !== 1) {
    throw new Error('Distribution referrer preview fixture requires exactly one Distribution identity.');
  }
  assertDistributionReferrerIdentity(identities[0]);
  requireExact(rowValue(identities[0], 'id'), input.identityId, 'Distribution identity ID');

  await assertNoAgentProfileOrProgramGrant(input.connection, input.userId);

  return {
    migrationHead: input.migrationHead,
    schemaCongruent: true,
    userRole: 'visitor',
    activeReferrerIdentity: true,
    noAgentProfile: true,
    noAgencyAssociation: true,
    noProgramGrant: true,
    passwordHash: true,
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'distribution-individual-referrer-preview',
    version: DISTRIBUTION_REFERRER_PREVIEW_VERSION,
    digest: DISTRIBUTION_REFERRER_PREVIEW_DIGEST,
  };
}

export async function prepareDistributionReferrerPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<DistributionReferrerPreviewEvidence> {
  assertOperation(input.decision, ['demo-seed']);
  assertDistributionReferrerPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await requireCurrentCongruentSchema({
    ...input,
    migrationHead: manifest.document.expectedHead,
  });
  const password = localPreviewPassword();

  const prepared = await withTransaction(input.connection, async () => {
    const user = await ensureUser(input.connection, password);
    await assertNoAgentProfileOrProgramGrant(input.connection, user.id);
    const identity = await ensureDistributionIdentity(input.connection, user.id);
    return { user, identity };
  });
  const verified = await verifyFixture({
    connection: input.connection,
    userId: prepared.user.id,
    identityId: prepared.identity.id,
    password,
    migrationHead: manifest.document.expectedHead,
  });

  return {
    ...base,
    fixture: DISTRIBUTION_REFERRER_PREVIEW_VERSION,
    account: { userId: prepared.user.id, email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL },
    distributionIdentityId: prepared.identity.id,
    prepared: { user: prepared.user.state, identity: prepared.identity.state },
    verified,
  };
}

export async function verifyDistributionReferrerPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<DistributionReferrerPreviewEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertDistributionReferrerPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await requireCurrentCongruentSchema({
    ...input,
    migrationHead: manifest.document.expectedHead,
  });
  const password = localPreviewPassword();
  const user = await findUser(input.connection);
  if (!user) throw new Error('Distribution referrer preview fixture user is missing.');
  const userId = asPositiveId(rowValue(user, 'id'), 'user ID');
  const identityRows = await queryRows(
    input.connection,
    `SELECT id FROM distribution_identities
      WHERE user_id = ? AND identity_type = 'referrer'
      ORDER BY id`,
    [userId],
  );
  if (identityRows.length !== 1) {
    throw new Error('Distribution referrer preview fixture requires exactly one referrer identity.');
  }
  const identityId = asPositiveId(rowValue(identityRows[0], 'id'), 'Distribution identity ID');
  const verified = await verifyFixture({
    connection: input.connection,
    userId,
    identityId,
    password,
    migrationHead: manifest.document.expectedHead,
  });

  return {
    ...base,
    fixture: DISTRIBUTION_REFERRER_PREVIEW_VERSION,
    account: { userId, email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL },
    distributionIdentityId: identityId,
    prepared: { user: 'reused', identity: 'reused' },
    verified,
  };
}
