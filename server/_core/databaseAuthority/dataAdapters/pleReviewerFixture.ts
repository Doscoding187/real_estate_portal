import bcrypt from 'bcryptjs';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
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
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertCentralEnvironmentReady,
  inspectCentralLocalEnvironment,
  resolveCentralLocalEnvironment,
} from '../../../../scripts/localEnvironmentAuthority';

export const PLE_REVIEWER_FIXTURE_VERSION = 'ple-reviewer-v2' as const;
export const PLE_REVIEWER_FIXTURE = 'ple-reviewer-acceptance' as const;
export const PLE_REVIEWER_PASSWORD_VARIABLE = 'LOCAL_PLE_REVIEWER_PASSWORD' as const;
export const PLE_REVIEWER_USER_ID = 990005 as const;
export const PLE_REVIEWER_EMAIL = 'ple-reviewer@listify.local' as const;
export const PLE_REVIEWER_OPEN_ID = 'ple-reviewer-v1' as const;

export const PLE_REVIEWER_TARGET = Object.freeze({
  host: '127.0.0.1',
  port: '3307',
  targetClass: 'disposable-worktree' as const,
});

const REVIEWER_EXPECTED = Object.freeze({
  id: PLE_REVIEWER_USER_ID,
  openId: PLE_REVIEWER_OPEN_ID,
  email: PLE_REVIEWER_EMAIL,
  name: 'PLE Local Review Fixture',
  firstName: 'PLE',
  lastName: 'Review Fixture',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'super_admin',
  agencyId: null,
  isSubaccount: 0,
  onboardingComplete: 1,
  onboardingStep: 0,
});

const FIXTURE_PAYLOAD = Object.freeze({
  version: PLE_REVIEWER_FIXTURE_VERSION,
  fixture: PLE_REVIEWER_FIXTURE,
  target: PLE_REVIEWER_TARGET,
  reviewer: REVIEWER_EXPECTED,
  password: 'machine-local-only;excluded-from-digest',
});

export const PLE_REVIEWER_FIXTURE_DIGEST = stableDigest(FIXTURE_PAYLOAD);

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'reused';

export type PleReviewerFixtureEvidence = AdapterEvidence & {
  fixture: typeof PLE_REVIEWER_FIXTURE_VERSION;
  target: typeof PLE_REVIEWER_TARGET;
  reviewer: {
    userId: typeof PLE_REVIEWER_USER_ID;
    email: typeof PLE_REVIEWER_EMAIL;
  };
  prepared: {
    reviewer: PreparedState;
  };
  verified: {
    exactTarget: true;
    migrationHead: string;
    databaseCurrent: true;
    exactReviewer: true;
    role: 'super_admin';
    emailVerified: true;
    passwordHash: true;
    noAgencyAssociation: true;
    noAgentProfile: true;
    noSubscription: true;
    noEntitlement: true;
    unrelatedUsersUntouched: true;
  };
};

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function requireExact(value: unknown, expected: unknown, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`PLE reviewer fixture conflicts at ${label}.`);
  }
}

function requireNull(value: unknown, label: string): void {
  if (value !== null && value !== undefined && String(value) !== '') {
    throw new Error(`PLE reviewer fixture conflicts at ${label}.`);
  }
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`PLE reviewer fixture has duplicate ${label} identity rows.`);
  }
  return rows[0] ?? null;
}

export function assertPleReviewerPassword(password: unknown): asserts password is string {
  if (
    typeof password !== 'string' ||
    password.length < 16 ||
    /(?:replace-with|placeholder|example|changeme|your[-_ ]|<[^>]+>)/i.test(password)
  ) {
    throw new Error(
      `PLE reviewer fixture refused: ${PLE_REVIEWER_PASSWORD_VARIABLE} must be a strong machine-local secret.`,
    );
  }
}

function localPleReviewerPassword(): string {
  const central = inspectCentralLocalEnvironment(resolveCentralLocalEnvironment());
  assertCentralEnvironmentReady(central);
  const password = central.values[PLE_REVIEWER_PASSWORD_VARIABLE];
  assertPleReviewerPassword(password);
  return password;
}

export async function hashPleReviewerPassword(password: string): Promise<string> {
  assertPleReviewerPassword(password);
  return bcrypt.hash(password, 10);
}

async function passwordHashMatches(password: string, hash: unknown): Promise<boolean> {
  if (typeof hash !== 'string' || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function assertPleReviewerTarget(authority: ResolvedDatabaseAuthority): void {
  assertOwnedDisposableTarget(authority);
  const { context } = authority;
  if (
    context.targetClass !== PLE_REVIEWER_TARGET.targetClass ||
    context.host !== PLE_REVIEWER_TARGET.host ||
    context.port !== PLE_REVIEWER_TARGET.port ||
    context.databaseName !== context.worktree.expectedDatabase ||
    !context.worktree.ownershipMatches
  ) {
    throw new Error(
      'PLE reviewer fixture refused: target is not the exact authorized disposable PLE worktree database.',
    );
  }
}

export function assertPleReviewerUserRow(row: Row): void {
  requireExact(rowValue(row, 'id'), REVIEWER_EXPECTED.id, 'reviewer user ID');
  requireExact(rowValue(row, 'openId'), REVIEWER_EXPECTED.openId, 'reviewer openId');
  requireExact(rowValue(row, 'email'), REVIEWER_EXPECTED.email, 'reviewer email');
  requireExact(rowValue(row, 'name'), REVIEWER_EXPECTED.name, 'reviewer name');
  requireExact(rowValue(row, 'firstName'), REVIEWER_EXPECTED.firstName, 'reviewer firstName');
  requireExact(rowValue(row, 'lastName'), REVIEWER_EXPECTED.lastName, 'reviewer lastName');
  requireNull(rowValue(row, 'phone'), 'reviewer phone');
  requireExact(rowValue(row, 'loginMethod'), REVIEWER_EXPECTED.loginMethod, 'reviewer loginMethod');
  requireExact(
    rowValue(row, 'emailVerified'),
    REVIEWER_EXPECTED.emailVerified,
    'reviewer emailVerified',
  );
  requireExact(rowValue(row, 'role'), REVIEWER_EXPECTED.role, 'reviewer role');
  requireNull(rowValue(row, 'agencyId'), 'reviewer agency association');
  requireExact(
    rowValue(row, 'isSubaccount'),
    REVIEWER_EXPECTED.isSubaccount,
    'reviewer isSubaccount',
  );
  requireExact(
    rowValue(row, 'onboarding_complete'),
    REVIEWER_EXPECTED.onboardingComplete,
    'reviewer onboardingComplete',
  );
  requireExact(
    rowValue(row, 'onboarding_step'),
    REVIEWER_EXPECTED.onboardingStep,
    'reviewer onboardingStep',
  );
}

export function classifyPleReviewerUser(row: Row | null): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertPleReviewerUserRow(row);
  return { state: 'reused' };
}

async function findReviewerIdentityRows(connection: AuthoritySqlConnection): Promise<Row[]> {
  return queryRows(
    connection,
    `SELECT id, openId, email, passwordHash, name, firstName, lastName, phone,
            loginMethod, emailVerified, role, agencyId, isSubaccount,
            onboarding_complete, onboarding_step
       FROM users
      WHERE id = ? OR email = ? OR openId = ?
      ORDER BY id`,
    [PLE_REVIEWER_USER_ID, PLE_REVIEWER_EMAIL, PLE_REVIEWER_OPEN_ID],
  );
}

async function findReviewerIdentity(connection: AuthoritySqlConnection): Promise<Row | null> {
  return requireOneOrNone(await findReviewerIdentityRows(connection), 'reviewer');
}

async function listUserSafetySnapshot(connection: AuthoritySqlConnection): Promise<Row[]> {
  return queryRows(
    connection,
    `SELECT id, openId, email, role, agencyId, isSubaccount,
            loginMethod, emailVerified, onboarding_complete, onboarding_step
       FROM users
      ORDER BY id`,
  );
}

function userSafetySnapshot(rows: Row[]): string {
  return JSON.stringify(
    rows.map(row => ({
      id: rowValue(row, 'id'),
      openId: rowValue(row, 'openId'),
      email: rowValue(row, 'email'),
      role: rowValue(row, 'role'),
      agencyId: rowValue(row, 'agencyId'),
      isSubaccount: rowValue(row, 'isSubaccount'),
      loginMethod: rowValue(row, 'loginMethod'),
      emailVerified: rowValue(row, 'emailVerified'),
      onboarding_complete: rowValue(row, 'onboarding_complete'),
      onboarding_step: rowValue(row, 'onboarding_step'),
    })),
  );
}

function assertUnrelatedUsersUnchanged(before: Row[], after: Row[]): void {
  const withoutReviewer = (rows: Row[]) =>
    rows.filter(row => Number(rowValue(row, 'id')) !== PLE_REVIEWER_USER_ID);
  if (userSafetySnapshot(withoutReviewer(before)) !== userSafetySnapshot(withoutReviewer(after))) {
    throw new Error('PLE reviewer fixture refused: an unrelated user changed.');
  }
}

async function assertNoReviewerAssociations(
  connection: AuthoritySqlConnection,
): Promise<
  Pick<
    PleReviewerFixtureEvidence['verified'],
    'noAgencyAssociation' | 'noAgentProfile' | 'noSubscription' | 'noEntitlement'
  >
> {
  const agentRows = await queryRows(
    connection,
    'SELECT id FROM agents WHERE userId = ? ORDER BY id',
    [PLE_REVIEWER_USER_ID],
  );
  if (agentRows.length > 0) {
    throw new Error('PLE reviewer fixture refused: reviewer has an agent profile.');
  }

  const membershipRows = await queryRows(
    connection,
    `SELECT m.id
       FROM agency_agent_memberships m
       JOIN agents a ON a.id = m.agent_id
      WHERE a.userId = ?
      ORDER BY m.id`,
    [PLE_REVIEWER_USER_ID],
  );
  if (membershipRows.length > 0) {
    throw new Error('PLE reviewer fixture refused: reviewer has agency membership.');
  }

  const joinRequestRows = await queryRows(
    connection,
    'SELECT id FROM agency_join_requests WHERE userId = ? ORDER BY id',
    [PLE_REVIEWER_USER_ID],
  );
  if (joinRequestRows.length > 0) {
    throw new Error('PLE reviewer fixture refused: reviewer has agency association state.');
  }

  const subscriptions = await queryRows(
    connection,
    'SELECT id FROM subscriptions WHERE owner_id = ? ORDER BY id',
    [PLE_REVIEWER_USER_ID],
  );
  if (subscriptions.length > 0) {
    throw new Error('PLE reviewer fixture refused: reviewer has a canonical subscription.');
  }

  const invoices = await queryRows(
    connection,
    'SELECT id FROM billing_invoices WHERE owner_id = ? ORDER BY id',
    [PLE_REVIEWER_USER_ID],
  );
  const payments = await queryRows(
    connection,
    'SELECT id FROM billing_payments WHERE owner_id = ? ORDER BY id',
    [PLE_REVIEWER_USER_ID],
  );
  if (invoices.length > 0 || payments.length > 0) {
    throw new Error('PLE reviewer fixture refused: reviewer has billing state.');
  }

  return {
    noAgencyAssociation: true,
    noAgentProfile: true,
    noSubscription: true,
    noEntitlement: true,
  };
}

async function verifyReviewerRecords(
  connection: AuthoritySqlConnection,
  password: string,
  migrationHead: string,
): Promise<PleReviewerFixtureEvidence['verified']> {
  const rows = await findReviewerIdentityRows(connection);
  if (rows.length !== 1) {
    throw new Error('PLE reviewer fixture must have exactly one reviewer identity row.');
  }
  const reviewer = rows[0];
  assertPleReviewerUserRow(reviewer);
  if (!(await passwordHashMatches(password, rowValue(reviewer, 'passwordHash')))) {
    throw new Error('PLE reviewer fixture password hash does not match the local secret.');
  }
  const associations = await assertNoReviewerAssociations(connection);
  return {
    exactTarget: true,
    migrationHead,
    databaseCurrent: true,
    exactReviewer: true,
    role: 'super_admin',
    emailVerified: true,
    passwordHash: true,
    ...associations,
    unrelatedUsersUntouched: true,
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'ple-reviewer-fixture',
    version: PLE_REVIEWER_FIXTURE_VERSION,
    digest: PLE_REVIEWER_FIXTURE_DIGEST,
  };
}

export async function preparePleReviewerFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<PleReviewerFixtureEvidence> {
  assertOperation(input.decision, ['test-fixture']);
  assertPleReviewerTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  const password = localPleReviewerPassword();
  const usersBefore = await listUserSafetySnapshot(input.connection);

  const prepared = await withTransaction(input.connection, async () => {
    const existing = await findReviewerIdentity(input.connection);
    const decision = classifyPleReviewerUser(existing);
    if (existing) {
      if (!(await passwordHashMatches(password, rowValue(existing, 'passwordHash')))) {
        throw new Error('PLE reviewer fixture refuses to rotate a conflicting existing password.');
      }
      return { reviewer: decision.state };
    }

    const passwordHash = await hashPleReviewerPassword(password);
    await input.connection.execute(
      `INSERT INTO users
        (id, openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
         emailVerified, role, plan, trialStatus, onboarding_complete, onboarding_step,
         subscription_tier, subscription_status, agencyId, isSubaccount,
         passwordResetToken, passwordResetTokenExpiresAt, emailVerificationToken)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, 'trial', 'active', 1, 0,
               'free', 'trial', NULL, 0, NULL, NULL, NULL)`,
      [
        REVIEWER_EXPECTED.id,
        REVIEWER_EXPECTED.openId,
        REVIEWER_EXPECTED.email,
        passwordHash,
        REVIEWER_EXPECTED.name,
        REVIEWER_EXPECTED.firstName,
        REVIEWER_EXPECTED.lastName,
        REVIEWER_EXPECTED.loginMethod,
        REVIEWER_EXPECTED.role,
      ],
    );
    return { reviewer: 'created' as const };
  });

  const usersAfter = await listUserSafetySnapshot(input.connection);
  assertUnrelatedUsersUnchanged(usersBefore, usersAfter);
  const verified = await verifyReviewerRecords(
    input.connection,
    password,
    manifest.document.expectedHead,
  );
  return {
    ...base,
    fixture: PLE_REVIEWER_FIXTURE_VERSION,
    target: PLE_REVIEWER_TARGET,
    reviewer: { userId: PLE_REVIEWER_USER_ID, email: PLE_REVIEWER_EMAIL },
    prepared,
    verified,
  };
}

export async function verifyPleReviewerFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<PleReviewerFixtureEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertPleReviewerTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  const password = localPleReviewerPassword();
  const verified = await verifyReviewerRecords(
    input.connection,
    password,
    manifest.document.expectedHead,
  );
  return {
    ...base,
    fixture: PLE_REVIEWER_FIXTURE_VERSION,
    target: PLE_REVIEWER_TARGET,
    reviewer: { userId: PLE_REVIEWER_USER_ID, email: PLE_REVIEWER_EMAIL },
    prepared: { reviewer: 'reused' },
    verified,
  };
}
