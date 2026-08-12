import bcrypt from 'bcryptjs';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
import {
  PLE_MANUAL_LOCATION_CAPABILITY,
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

export const LISTING_PREVIEW_FIXTURE_VERSION = 'listing-preview-auth-v1' as const;

const FIXTURE = Object.freeze({
  agency: Object.freeze({
    slug: 'listing-preview-agency-v1',
    name: 'Listing Preview Agency',
    email: 'agency@listify.local',
    phone: '+27110000002',
    address: '1 Local Preview Way',
    city: 'Johannesburg',
    province: 'Gauteng',
    description: 'Machine-local agency fixture for Property Listing Engine review.',
  }),
  agent: Object.freeze({
    openId: 'listing-preview-agent-v1',
    email: 'agent@listify.local',
    name: 'Listing Preview Agent',
    firstName: 'Preview',
    lastName: 'Agent',
    phone: '+27110000001',
    slug: 'listing-preview-agent-v1',
  }),
  agencyAdmin: Object.freeze({
    openId: 'listing-preview-agency-admin-v1',
    email: 'agency@listify.local',
    name: 'Listing Preview Agency Admin',
    firstName: 'Preview',
    lastName: 'Agency Admin',
    phone: '+27110000002',
  }),
  agentProfile: Object.freeze({
    displayName: 'Listing Preview Agent',
    bio: 'Local-only approved agent profile for reviewing the Property Listing Engine.',
    focus: 'both' as const,
    propertyTypes: JSON.stringify(['Apartment', 'Townhouse', 'House']),
    areasServed: JSON.stringify(['Johannesburg', 'Sandton']),
    languages: JSON.stringify(['English']),
    profileCompletionScore: 80,
  }),
  branding: Object.freeze({
    companyName: 'Listing Preview Agency',
    primaryColor: '#0F3D91',
    secondaryColor: '#0A2E6E',
    accentColor: '#F59E0B',
    tagline: 'Local Property Listing Engine review',
    supportEmail: 'agency@listify.local',
    supportPhone: '+27110000002',
  }),
});

const FIXTURE_PAYLOAD = Object.freeze({
  version: LISTING_PREVIEW_FIXTURE_VERSION,
  agency: FIXTURE.agency,
  agent: FIXTURE.agent,
  agencyAdmin: FIXTURE.agencyAdmin,
  agentProfile: FIXTURE.agentProfile,
  branding: FIXTURE.branding,
  publicationEntitlement: 'not-provisioned',
});

export const LISTING_PREVIEW_FIXTURE_DIGEST = stableDigest(FIXTURE_PAYLOAD);

export const LISTING_PREVIEW_FIXTURE_IDENTITIES = Object.freeze({
  agencySlug: FIXTURE.agency.slug,
  agentEmail: FIXTURE.agent.email,
  agentOpenId: FIXTURE.agent.openId,
  agentSlug: FIXTURE.agent.slug,
  agencyAdminEmail: FIXTURE.agencyAdmin.email,
  agencyAdminOpenId: FIXTURE.agencyAdmin.openId,
});

export type ListingPreviewFixtureEvidence = AdapterEvidence & {
  fixture: typeof LISTING_PREVIEW_FIXTURE_VERSION;
  expected: {
    agentEmail: string;
    agencyAdminEmail: string;
    agencySlug: string;
    publicationEntitlement: 'not-provisioned';
  };
  prepared: {
    agency: 'created' | 'reused';
    agentUser: 'created' | 'reused';
    agencyAdminUser: 'created' | 'reused';
    agentProfile: 'created' | 'reused';
    agencyBranding: 'created' | 'reused';
    agencyMembership: 'created' | 'reused';
  };
  verified: {
    agentLoginPassword: true;
    agencyAdminLoginPassword: true;
    agentRole: true;
    agencyAdminRole: true;
    agencyOwnership: true;
    agentProfile: true;
    agencyMembership: true;
    contactPreflight: true;
  };
  migrationHead: string;
};

type Row = Record<string, unknown>;

type UserFixtureResult = {
  id: number;
  state: 'created' | 'reused';
};

type AgencyFixtureResult = {
  id: number;
  state: 'created' | 'reused';
};

type AgentProfileFixtureResult = {
  id: number;
  state: 'created' | 'reused';
};

type BrandingFixtureResult = { state: 'created' | 'reused' };
type MembershipFixtureResult = { state: 'created' | 'reused' };

function asId(row: Row, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Listing preview fixture ${label} has an invalid ID.`);
  }
  return id;
}

function insertId(result: unknown, label: string): number {
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : (result as { insertId?: unknown } | null);
  const id = Number(header?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Listing preview fixture could not create ${label}.`);
  }
  return id;
}

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`Listing preview fixture has duplicate ${label} identity rows.`);
  }
  return rows[0] ?? null;
}

function requireExact(value: unknown, expected: string | number, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`Listing preview fixture conflicts at ${label}.`);
  }
}

export function assertListingPreviewUserIdentity(
  row: Row,
  identity: { email: string; openId: string },
  role: 'agent' | 'agency_admin',
): void {
  requireExact(rowValue(row, 'email'), identity.email, `user ${role} email`);
  requireExact(rowValue(row, 'openId'), identity.openId, `user ${role} openId`);
  requireExact(rowValue(row, 'role'), role, `user ${role} role`);
}

export function assertListingPreviewAgencyIdentity(row: Row): void {
  requireExact(rowValue(row, 'slug'), FIXTURE.agency.slug, 'agency slug');
  requireExact(rowValue(row, 'email'), FIXTURE.agency.email, 'agency email');
}

export function assertListingPreviewTarget(authority: ResolvedDatabaseAuthority): void {
  assertOwnedDisposableTarget(authority);
  if (authority.context.host !== '127.0.0.1' || authority.context.port !== '3307') {
    throw new Error(
      'Listing preview fixture refused: Database Authority service must be the approved localhost:3307 service.',
    );
  }
}

export function assertListingPreviewPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error(
      'Listing preview fixture refused: LOCAL_DEMO_AGENCY_PASSWORD must be configured by the central local environment authority.',
    );
  }
}

function localPreviewPassword(): string {
  const central = inspectCentralLocalEnvironment(resolveCentralLocalEnvironment());
  assertCentralEnvironmentReady(central);
  const password = central.values.LOCAL_DEMO_AGENCY_PASSWORD;
  assertListingPreviewPassword(password);
  return password;
}

export async function hashListingPreviewPassword(password: string): Promise<string> {
  assertListingPreviewPassword(password);
  return bcrypt.hash(password, 10);
}

async function passwordHashMatches(password: string, hash: unknown): Promise<boolean> {
  if (typeof hash !== 'string' || !hash) return false;
  return bcrypt.compare(password, hash);
}

async function findUser(
  connection: AuthoritySqlConnection,
  identity: { email: string; openId: string },
): Promise<Row | null> {
  return requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, openId, email, passwordHash, name, firstName, lastName, phone,
              loginMethod, emailVerified, role, agencyId, isSubaccount,
              onboarding_complete, onboarding_step
         FROM users
        WHERE email = ? OR openId = ?
        ORDER BY id`,
      [identity.email, identity.openId],
    ),
    `user ${identity.email}`,
  );
}

async function ensureUser(
  connection: AuthoritySqlConnection,
  input: {
    identity: typeof FIXTURE.agent | typeof FIXTURE.agencyAdmin;
    role: 'agent' | 'agency_admin';
    agencyId: number;
    password: string;
  },
): Promise<UserFixtureResult> {
  const existing = await findUser(connection, input.identity);
  if (existing) {
    assertListingPreviewUserIdentity(existing, input.identity, input.role);

    const id = asId(existing, `user ${input.role}`);
    const passwordHash = (await passwordHashMatches(
      input.password,
      rowValue(existing, 'passwordHash'),
    ))
      ? String(rowValue(existing, 'passwordHash'))
      : await hashListingPreviewPassword(input.password);

    await connection.execute(
      `UPDATE users
          SET name = ?, firstName = ?, lastName = ?, phone = ?, loginMethod = 'email',
              emailVerified = 1, role = ?, agencyId = ?, isSubaccount = 0,
              onboarding_complete = 1, onboarding_step = 0,
              passwordHash = ?, passwordResetToken = NULL,
              passwordResetTokenExpiresAt = NULL, emailVerificationToken = NULL
        WHERE id = ?`,
      [
        input.identity.name,
        input.identity.firstName,
        input.identity.lastName,
        input.identity.phone,
        input.role,
        input.agencyId,
        passwordHash,
        id,
      ],
    );
    return { id, state: 'reused' };
  }

  const passwordHash = await hashListingPreviewPassword(input.password);
  const result = await connection.execute(
    `INSERT INTO users
      (openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
       emailVerified, role, plan, trialStatus, onboarding_complete, onboarding_step,
       subscription_tier, subscription_status, agencyId, isSubaccount,
       passwordResetToken, passwordResetTokenExpiresAt, emailVerificationToken)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'email', 1, ?, 'trial', 'active', 1, 0,
             'free', 'trial', ?, 0, NULL, NULL, NULL)`,
    [
      input.identity.openId,
      input.identity.email,
      passwordHash,
      input.identity.name,
      input.identity.firstName,
      input.identity.lastName,
      input.identity.phone,
      input.role,
      input.agencyId,
    ],
  );
  const id = insertId(result, `the ${input.role} user`);
  return { id, state: 'created' };
}

async function findAgency(connection: AuthoritySqlConnection): Promise<Row | null> {
  return requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, name, slug, email, phone, address, city, province,
              subscriptionPlan, subscriptionStatus, isVerified
         FROM agencies
        WHERE slug = ? OR email = ?
        ORDER BY id`,
      [FIXTURE.agency.slug, FIXTURE.agency.email],
    ),
    'agency listing-preview-agency-v1',
  );
}

async function ensureAgency(connection: AuthoritySqlConnection): Promise<AgencyFixtureResult> {
  const existing = await findAgency(connection);
  if (existing) {
    assertListingPreviewAgencyIdentity(existing);
    const id = asId(existing, 'agency');
    await connection.execute(
      `UPDATE agencies
          SET name = ?, description = ?, email = ?, phone = ?, address = ?,
              city = ?, province = ?, isVerified = 1
        WHERE id = ?`,
      [
        FIXTURE.agency.name,
        FIXTURE.agency.description,
        FIXTURE.agency.email,
        FIXTURE.agency.phone,
        FIXTURE.agency.address,
        FIXTURE.agency.city,
        FIXTURE.agency.province,
        id,
      ],
    );
    return { id, state: 'reused' };
  }

  const result = await connection.execute(
    `INSERT INTO agencies
      (name, slug, description, email, phone, address, city, province,
       subscriptionPlan, subscriptionStatus, isVerified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free', 'trial', 1)`,
    [
      FIXTURE.agency.name,
      FIXTURE.agency.slug,
      FIXTURE.agency.description,
      FIXTURE.agency.email,
      FIXTURE.agency.phone,
      FIXTURE.agency.address,
      FIXTURE.agency.city,
      FIXTURE.agency.province,
    ],
  );
  const id = insertId(result, 'the agency');
  return { id, state: 'created' };
}

async function ensureBranding(
  connection: AuthoritySqlConnection,
  agencyId: number,
): Promise<BrandingFixtureResult> {
  const rows = await queryRows(
    connection,
    `SELECT id, agencyId, companyName, primaryColor, secondaryColor, accentColor,
            tagline, supportEmail, supportPhone, isEnabled
       FROM agency_branding
      WHERE agencyId = ?
      ORDER BY id`,
    [agencyId],
  );
  const existing = requireOneOrNone(rows, `branding for agency ${agencyId}`);
  if (existing) {
    await connection.execute(
      `UPDATE agency_branding
          SET companyName = ?, primaryColor = ?, secondaryColor = ?, accentColor = ?,
              tagline = ?, supportEmail = ?, supportPhone = ?, isEnabled = 1
        WHERE id = ?`,
      [
        FIXTURE.branding.companyName,
        FIXTURE.branding.primaryColor,
        FIXTURE.branding.secondaryColor,
        FIXTURE.branding.accentColor,
        FIXTURE.branding.tagline,
        FIXTURE.branding.supportEmail,
        FIXTURE.branding.supportPhone,
        asId(existing, 'agency branding'),
      ],
    );
    return { state: 'reused' };
  }

  await connection.execute(
    `INSERT INTO agency_branding
      (agencyId, primaryColor, secondaryColor, accentColor, companyName, tagline,
       supportEmail, supportPhone, isEnabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      agencyId,
      FIXTURE.branding.primaryColor,
      FIXTURE.branding.secondaryColor,
      FIXTURE.branding.accentColor,
      FIXTURE.branding.companyName,
      FIXTURE.branding.tagline,
      FIXTURE.branding.supportEmail,
      FIXTURE.branding.supportPhone,
    ],
  );
  return { state: 'created' };
}

async function findAgentProfile(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<Row | null> {
  return requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, userId, agencyId, firstName, lastName, displayName, slug, bio,
              phone, email, whatsapp, specialization, focus, propertyTypes,
              areasServed, languages, profileCompletionScore, profileCompletionFlags,
              isVerified, isFeatured, status, approvedBy
         FROM agents
        WHERE slug = ? OR userId = ?
        ORDER BY id`,
      [FIXTURE.agent.slug, userId],
    ),
    `agent ${FIXTURE.agent.slug}`,
  );
}

async function ensureAgentProfile(
  connection: AuthoritySqlConnection,
  input: { userId: number; agencyId: number; approvedBy: number },
): Promise<AgentProfileFixtureResult> {
  const existing = await findAgentProfile(connection, input.userId);
  if (existing) {
    requireExact(rowValue(existing, 'userId'), input.userId, 'agent profile userId');
    requireExact(rowValue(existing, 'slug'), FIXTURE.agent.slug, 'agent profile slug');
    const id = asId(existing, 'agent profile');
    await connection.execute(
      `UPDATE agents
          SET agencyId = ?, firstName = ?, lastName = ?, displayName = ?,
              slug = ?, bio = ?, phone = ?, email = ?, whatsapp = ?,
              specialization = NULL, focus = ?, propertyTypes = ?,
              role = 'agent', areasServed = ?, languages = ?,
              profileCompletionScore = ?, profileCompletionFlags = '[]',
              isVerified = 1, isFeatured = 0, status = 'approved',
              rejectionReason = NULL, approvedBy = ?, approvedAt = NOW()
        WHERE id = ?`,
      [
        input.agencyId,
        FIXTURE.agent.firstName,
        FIXTURE.agent.lastName,
        FIXTURE.agentProfile.displayName,
        FIXTURE.agent.slug,
        FIXTURE.agentProfile.bio,
        FIXTURE.agent.phone,
        FIXTURE.agent.email,
        FIXTURE.agent.phone,
        FIXTURE.agentProfile.focus,
        FIXTURE.agentProfile.propertyTypes,
        FIXTURE.agentProfile.areasServed,
        FIXTURE.agentProfile.languages,
        FIXTURE.agentProfile.profileCompletionScore,
        input.approvedBy,
        id,
      ],
    );
    return { id, state: 'reused' };
  }

  const result = await connection.execute(
    `INSERT INTO agents
      (userId, agencyId, firstName, lastName, displayName, slug, bio, phone, email,
       whatsapp, focus, propertyTypes, role, areasServed, languages,
       profileCompletionScore, profileCompletionFlags, isVerified, isFeatured,
       status, approvedBy, approvedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agent', ?, ?, ?, '[]', 1, 0,
             'approved', ?, NOW())`,
    [
      input.userId,
      input.agencyId,
      FIXTURE.agent.firstName,
      FIXTURE.agent.lastName,
      FIXTURE.agentProfile.displayName,
      FIXTURE.agent.slug,
      FIXTURE.agentProfile.bio,
      FIXTURE.agent.phone,
      FIXTURE.agent.email,
      FIXTURE.agent.phone,
      FIXTURE.agentProfile.focus,
      FIXTURE.agentProfile.propertyTypes,
      FIXTURE.agentProfile.areasServed,
      FIXTURE.agentProfile.languages,
      FIXTURE.agentProfile.profileCompletionScore,
      input.approvedBy,
    ],
  );
  const id = insertId(result, 'the agent profile');
  return { id, state: 'created' };
}

async function ensureMembership(
  connection: AuthoritySqlConnection,
  input: { agencyId: number; agentId: number; createdBy: number },
): Promise<MembershipFixtureResult> {
  const rows = await queryRows(
    connection,
    `SELECT id, agency_id, agent_id, status, governance_mode, role
       FROM agency_agent_memberships
      WHERE agency_id = ? AND agent_id = ?
      ORDER BY id`,
    [input.agencyId, input.agentId],
  );
  const existing = requireOneOrNone(
    rows,
    `agency-agent membership ${input.agencyId}:${input.agentId}`,
  );
  if (existing) {
    await connection.execute(
      `UPDATE agency_agent_memberships
          SET status = 'active', governance_mode = 'affiliated', role = 'agent',
              permissions_overrides = ?, created_by = ?, updated_by = ?
        WHERE id = ?`,
      ['{}', input.createdBy, input.createdBy, asId(existing, 'agency-agent membership')],
    );
    return { state: 'reused' };
  }

  await connection.execute(
    `INSERT INTO agency_agent_memberships
      (agency_id, agent_id, status, governance_mode, role, permissions_overrides,
       created_by, updated_by)
     VALUES (?, ?, 'active', 'affiliated', 'agent', ?, ?, ?)`,
    [input.agencyId, input.agentId, '{}', input.createdBy, input.createdBy],
  );
  return { state: 'created' };
}

async function verifyFixtureRows(
  connection: AuthoritySqlConnection,
  password: string,
): Promise<ListingPreviewFixtureEvidence['verified']> {
  const agency = await findAgency(connection);
  if (!agency) throw new Error('Listing preview fixture agency is missing.');
  assertListingPreviewAgencyIdentity(agency);
  requireExact(rowValue(agency, 'isVerified'), 1, 'agency verification');
  const agencyId = asId(agency, 'agency');

  const agentUser = await findUser(connection, FIXTURE.agent);
  if (!agentUser) throw new Error('Listing preview fixture agent user is missing.');
  const agencyAdminUser = await findUser(connection, FIXTURE.agencyAdmin);
  if (!agencyAdminUser) throw new Error('Listing preview fixture agency admin user is missing.');

  assertListingPreviewUserIdentity(agentUser, FIXTURE.agent, 'agent');
  requireExact(rowValue(agentUser, 'emailVerified'), 1, 'agent user email verification');
  requireExact(rowValue(agentUser, 'agencyId'), agencyId, 'agent user agency ownership');
  assertListingPreviewUserIdentity(agencyAdminUser, FIXTURE.agencyAdmin, 'agency_admin');
  requireExact(
    rowValue(agencyAdminUser, 'emailVerified'),
    1,
    'agency admin user email verification',
  );
  requireExact(
    rowValue(agencyAdminUser, 'agencyId'),
    agencyId,
    'agency admin user agency ownership',
  );

  const agentId = asId(agentUser, 'agent user');
  const [agentPassword, agencyAdminPassword] = await Promise.all([
    passwordHashMatches(password, rowValue(agentUser, 'passwordHash')),
    passwordHashMatches(password, rowValue(agencyAdminUser, 'passwordHash')),
  ]);
  if (!agentPassword || !agencyAdminPassword) {
    throw new Error('Listing preview fixture password verification failed.');
  }
  if (!String(rowValue(agentUser, 'phone') || '').trim()) {
    throw new Error('Listing preview fixture agent contact is missing.');
  }
  if (!String(rowValue(agencyAdminUser, 'phone') || '').trim()) {
    throw new Error('Listing preview fixture agency admin contact is missing.');
  }

  const agentProfile = await findAgentProfile(connection, agentId);
  if (!agentProfile) throw new Error('Listing preview fixture agent profile is missing.');
  requireExact(rowValue(agentProfile, 'userId'), agentId, 'agent profile user ownership');
  requireExact(rowValue(agentProfile, 'agencyId'), agencyId, 'agent profile agency ownership');
  requireExact(rowValue(agentProfile, 'status'), 'approved', 'agent profile status');
  requireExact(rowValue(agentProfile, 'isVerified'), 1, 'agent profile verification');
  if (!String(rowValue(agentProfile, 'phone') || '').trim()) {
    throw new Error('Listing preview fixture agent profile contact is missing.');
  }

  const membershipRows = await queryRows(
    connection,
    `SELECT id, status, governance_mode, role
       FROM agency_agent_memberships
      WHERE agency_id = ? AND agent_id = ?
      ORDER BY id`,
    [agencyId, asId(agentProfile, 'agent profile')],
  );
  const membership = requireOneOrNone(
    membershipRows,
    `agency-agent membership ${agencyId}:${asId(agentProfile, 'agent profile')}`,
  );
  if (!membership) throw new Error('Listing preview fixture agency membership is missing.');
  requireExact(rowValue(membership, 'status'), 'active', 'agency membership status');

  const brandingRows = await queryRows(
    connection,
    `SELECT id, companyName, primaryColor, secondaryColor, isEnabled
       FROM agency_branding
      WHERE agencyId = ?
      ORDER BY id`,
    [agencyId],
  );
  const branding = requireOneOrNone(brandingRows, `branding for agency ${agencyId}`);
  if (!branding) throw new Error('Listing preview fixture agency branding is missing.');
  requireExact(rowValue(branding, 'companyName'), FIXTURE.branding.companyName, 'branding company');
  requireExact(rowValue(branding, 'isEnabled'), 1, 'branding enabled state');

  return {
    agentLoginPassword: true,
    agencyAdminLoginPassword: true,
    agentRole: true,
    agencyAdminRole: true,
    agencyOwnership: true,
    agentProfile: true,
    agencyMembership: true,
    contactPreflight: true,
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'listing-preview-authentication',
    version: LISTING_PREVIEW_FIXTURE_VERSION,
    digest: LISTING_PREVIEW_FIXTURE_DIGEST,
  };
}

export async function prepareListingPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<ListingPreviewFixtureEvidence> {
  assertOperation(input.decision, ['demo-seed']);
  assertListingPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    requiredCapabilities: [PLE_MANUAL_LOCATION_CAPABILITY],
  });
  const password = localPreviewPassword();

  const prepared = await withTransaction(input.connection, async () => {
    const agency = await ensureAgency(input.connection);
    const agencyAdminUser = await ensureUser(input.connection, {
      identity: FIXTURE.agencyAdmin,
      role: 'agency_admin',
      agencyId: agency.id,
      password,
    });
    const agentUser = await ensureUser(input.connection, {
      identity: FIXTURE.agent,
      role: 'agent',
      agencyId: agency.id,
      password,
    });
    const branding = await ensureBranding(input.connection, agency.id);
    const agentProfile = await ensureAgentProfile(input.connection, {
      userId: agentUser.id,
      agencyId: agency.id,
      approvedBy: agencyAdminUser.id,
    });
    const membership = await ensureMembership(input.connection, {
      agencyId: agency.id,
      agentId: agentProfile.id,
      createdBy: agencyAdminUser.id,
    });
    return { agency, agencyAdminUser, agentUser, branding, agentProfile, membership };
  });

  const verified = await verifyFixtureRows(input.connection, password);
  return {
    ...base,
    fixture: LISTING_PREVIEW_FIXTURE_VERSION,
    expected: {
      agentEmail: FIXTURE.agent.email,
      agencyAdminEmail: FIXTURE.agencyAdmin.email,
      agencySlug: FIXTURE.agency.slug,
      publicationEntitlement: 'not-provisioned',
    },
    prepared: {
      agency: prepared.agency.state,
      agentUser: prepared.agentUser.state,
      agencyAdminUser: prepared.agencyAdminUser.state,
      agentProfile: prepared.agentProfile.state,
      agencyBranding: prepared.branding.state,
      agencyMembership: prepared.membership.state,
    },
    verified,
    migrationHead: manifest.document.expectedHead,
  };
}

export async function verifyListingPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<ListingPreviewFixtureEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertListingPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    requiredCapabilities: [PLE_MANUAL_LOCATION_CAPABILITY],
  });
  const password = localPreviewPassword();
  const verified = await verifyFixtureRows(input.connection, password);
  return {
    ...base,
    fixture: LISTING_PREVIEW_FIXTURE_VERSION,
    expected: {
      agentEmail: FIXTURE.agent.email,
      agencyAdminEmail: FIXTURE.agencyAdmin.email,
      agencySlug: FIXTURE.agency.slug,
      publicationEntitlement: 'not-provisioned',
    },
    prepared: {
      agency: 'reused',
      agentUser: 'reused',
      agencyAdminUser: 'reused',
      agentProfile: 'reused',
      agencyBranding: 'reused',
      agencyMembership: 'reused',
    },
    verified,
    migrationHead: manifest.document.expectedHead,
  };
}
