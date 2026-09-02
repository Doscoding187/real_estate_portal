import bcrypt from 'bcryptjs';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
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
import { verifyCanonicalGeographyReferenceData } from './canonicalGeography';
import {
  CANONICAL_AGENCY_LAUNCH_ACCESS,
  CANONICAL_AGENT_LAUNCH_ACCESS,
  CANONICAL_DEVELOPER_LAUNCH_ACCESS,
} from './canonicalCommercial';
import { ensureCanonicalManualFixture, type ManualFixtureDefinition } from './searchToLeadScenario';
import {
  assertCentralEnvironmentReady,
  inspectCentralLocalEnvironment,
  resolveCentralLocalEnvironment,
} from '../../../../scripts/localEnvironmentAuthority';

/**
 * A deliberately separate, machine-local data lane for a human to review the
 * public homepage rail and the three inventory-owner workspaces. It does not
 * replace Search-to-Lead acceptance data or the small PLE authentication
 * fixture, and it never writes to a shared or protected target.
 */
export const HOMEPAGE_JOURNEY_PREVIEW_VERSION = 'homepage-journey-preview-v1' as const;

const TARGET = Object.freeze({
  host: '127.0.0.1',
  port: '3307',
  targetClass: 'disposable-worktree' as const,
});

const IDS = Object.freeze({
  agency: 996001,
  agencyAdminUser: 996001,
  agent: 996001,
  agentUser: 996002,
  developerOrganisation: 996001,
  developerMembership: 996001,
  developerUser: 996003,
  cataloguePublisher: 996001,
  development: 996001,
  unit: '00000000-0000-4000-8000-000000009961',
  agencyAgentMembership: 996001,
});

type PreviewUser = Readonly<{
  id: number;
  openId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'agent' | 'agency_admin' | 'property_developer';
  agencyId: number | null;
}>;

const USERS = Object.freeze({
  agencyAdmin: {
    id: IDS.agencyAdminUser,
    openId: 'homepage-preview-agency-admin-v1',
    email: 'home-preview-agency@listify.local',
    name: 'Homepage Preview Agency Admin',
    firstName: 'Homepage',
    lastName: 'Agency Admin',
    phone: '+27110009601',
    role: 'agency_admin',
    agencyId: IDS.agency,
  },
  agent: {
    id: IDS.agentUser,
    openId: 'homepage-preview-agent-v1',
    email: 'home-preview-agent@listify.local',
    name: 'Homepage Preview Agent',
    firstName: 'Homepage',
    lastName: 'Agent',
    phone: '+27110009602',
    role: 'agent',
    agencyId: IDS.agency,
  },
  developer: {
    id: IDS.developerUser,
    openId: 'homepage-preview-developer-v1',
    email: 'home-preview-developer@listify.local',
    name: 'Homepage Preview Developer',
    firstName: 'Homepage',
    lastName: 'Developer',
    phone: '+27110009603',
    role: 'property_developer',
    agencyId: null,
  },
} as const satisfies Record<string, PreviewUser>);

export const HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES = Object.freeze({
  agentEmail: USERS.agent.email,
  agentOpenId: USERS.agent.openId,
  agencyAdminEmail: USERS.agencyAdmin.email,
  agencyAdminOpenId: USERS.agencyAdmin.openId,
  developerEmail: USERS.developer.email,
  developerOpenId: USERS.developer.openId,
  agencySlug: 'homepage-preview-agency-v1',
  developerSlug: 'homepage-preview-developer-v1',
  canonicalLocation: 'gauteng/johannesburg/sandton',
});

const AGENCY = Object.freeze({
  id: IDS.agency,
  name: 'Homepage Preview Realty',
  slug: HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.agencySlug,
  email: USERS.agencyAdmin.email,
  phone: USERS.agencyAdmin.phone,
  address: '96 Preview Avenue',
  city: 'Johannesburg',
  province: 'Gauteng',
  description:
    'Machine-local agency fixture for manual homepage, listing, and agency journey review.',
});

const AGENT_PROFILE = Object.freeze({
  id: IDS.agent,
  displayName: 'Homepage Preview Agent',
  slug: 'homepage-preview-agent-v1',
  bio: 'Machine-local approved agent profile for manual homepage journey review.',
  focus: 'both',
  propertyTypes: JSON.stringify(['Apartment', 'Townhouse', 'House']),
  areasServed: JSON.stringify(['Johannesburg', 'Sandton']),
  languages: JSON.stringify(['English']),
  profileCompletionScore: 90,
});

const BRANDING = Object.freeze({
  companyName: AGENCY.name,
  primaryColor: '#0F3D91',
  secondaryColor: '#0A2E6E',
  accentColor: '#F59E0B',
  tagline: 'Manual homepage journey preview',
  supportEmail: AGENCY.email,
  supportPhone: AGENCY.phone,
});

const FIXTURE_TIMESTAMP = '2026-09-02 12:00:00';

const HOME_SALE_FIXTURES: readonly ManualFixtureDefinition[] = [
  {
    propertyId: 996101,
    listingId: 996101,
    mediaId: 996201,
    propertyImageId: 996301,
    title: 'Solar-ready family home with a landscaped garden',
    description:
      'A spacious Sandton family home with solar backup, garden living, and secure parking.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 4850000,
    imageUrl: 'http://localhost:3009/properties/property-detail-preview-v1/hero-exterior.webp',
    bedrooms: 4,
    bathrooms: 3,
    internalAreaM2: 248,
    erfAreaM2: 620,
    garages: 2,
    parkingBays: 2,
    propertyHighlights: ['Solar backup', 'Landscaped garden', 'Double garage'],
  },
  {
    propertyId: 996102,
    listingId: 996102,
    mediaId: 996202,
    propertyImageId: 996302,
    title: 'Contemporary townhouse close to Sandton CBD',
    description:
      'A polished townhouse with secure access, an open-plan living area, and private outdoor space.',
    propertyType: 'townhouse',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 3125000,
    imageUrl: 'http://localhost:3009/properties/property-detail-preview-v1/arrival-exterior.webp',
    bedrooms: 3,
    bathrooms: 2,
    internalAreaM2: 166,
    erfAreaM2: 244,
    garages: 1,
    parkingBays: 1,
    propertyHighlights: ['Controlled access', 'Private patio', 'Fibre ready'],
  },
  {
    propertyId: 996103,
    listingId: 996103,
    mediaId: 996203,
    propertyImageId: 996303,
    title: 'Bright apartment with a private balcony',
    description:
      'A light-filled apartment with a balcony, lift access, and a practical lock-up-and-go layout.',
    propertyType: 'apartment',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 1895000,
    imageUrl: 'http://localhost:3009/properties/35t5znQJ1v9V.jpg',
    bedrooms: 2,
    bathrooms: 2,
    internalAreaM2: 96,
    parkingBays: 1,
    propertyHighlights: ['Private balcony', 'Lift access', 'Fibre ready'],
  },
  {
    propertyId: 996104,
    listingId: 996104,
    mediaId: 996204,
    propertyImageId: 996304,
    title: 'Garden apartment with covered parking',
    description:
      'A ground-floor apartment with a garden edge, flexible living space, and covered parking.',
    propertyType: 'apartment',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 2250000,
    imageUrl: 'http://localhost:3009/properties/40O7UI0lbxUn.jpg',
    bedrooms: 2,
    bathrooms: 2,
    internalAreaM2: 104,
    parkingBays: 2,
    propertyHighlights: ['Garden edge', 'Covered parking', 'Backup power'],
  },
  {
    propertyId: 996105,
    listingId: 996105,
    mediaId: 996205,
    propertyImageId: 996305,
    title: 'Secure four-bedroom home in an established estate',
    description:
      'A generous estate home with an entertainer patio, garden, and ample off-street parking.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 5650000,
    imageUrl: 'http://localhost:3009/properties/khdLfaNTTtsd.jpg',
    bedrooms: 4,
    bathrooms: 3,
    internalAreaM2: 286,
    erfAreaM2: 742,
    garages: 2,
    parkingBays: 2,
    propertyHighlights: ['Estate security', 'Entertainment patio', 'Garden'],
  },
  {
    propertyId: 996106,
    listingId: 996106,
    mediaId: 996206,
    propertyImageId: 996306,
    title: 'Modern two-bedroom apartment near local amenities',
    description:
      'A compact modern apartment with natural light, secure parking, and everyday convenience.',
    propertyType: 'apartment',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 1650000,
    imageUrl: 'http://localhost:3009/properties/f0xp6VWeaZSN.jpg',
    bedrooms: 2,
    bathrooms: 1,
    internalAreaM2: 82,
    parkingBays: 1,
    propertyHighlights: ['Natural light', 'Secure parking', 'Walkable amenities'],
  },
  {
    propertyId: 996107,
    listingId: 996107,
    mediaId: 996207,
    propertyImageId: 996307,
    title: 'Family home with pool and flexible work space',
    description:
      'A family home balancing a pool, outdoor living, and a dedicated work-from-home room.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agentUser,
    agentId: IDS.agent,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 6250000,
    imageUrl: 'http://localhost:3009/properties/cb6IeI4pBCAG.jpg',
    bedrooms: 4,
    bathrooms: 3,
    internalAreaM2: 312,
    erfAreaM2: 810,
    garages: 2,
    parkingBays: 2,
    propertyHighlights: ['Pool', 'Work-from-home room', 'Solar geyser'],
  },
  {
    propertyId: 996108,
    listingId: 996108,
    mediaId: 996208,
    propertyImageId: 996308,
    title: 'Lock-up-and-go townhouse with double parking',
    description:
      'A low-maintenance townhouse offering secure access, a sunny patio, and double parking.',
    propertyType: 'townhouse',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agencyAdminUser,
    agentId: null,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 2780000,
    imageUrl: 'http://localhost:3009/properties/OSNX9i1Pc92d.jpg',
    bedrooms: 3,
    bathrooms: 2,
    internalAreaM2: 154,
    erfAreaM2: 196,
    parkingBays: 2,
    propertyHighlights: ['Double parking', 'Sunny patio', 'Secure access'],
  },
  {
    propertyId: 996109,
    listingId: 996109,
    mediaId: 996209,
    propertyImageId: 996309,
    title: 'Three-bedroom home with a generous yard',
    description:
      'An adaptable three-bedroom home with a large yard, covered patio, and secure garage.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agencyAdminUser,
    agentId: null,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 3650000,
    imageUrl: 'http://localhost:3009/properties/ZcWGSahwTdDK.jpg',
    bedrooms: 3,
    bathrooms: 2,
    internalAreaM2: 194,
    erfAreaM2: 510,
    garages: 1,
    parkingBays: 2,
    propertyHighlights: ['Generous yard', 'Covered patio', 'Secure garage'],
  },
  {
    propertyId: 996110,
    listingId: 996110,
    mediaId: 996210,
    propertyImageId: 996310,
    title: 'Apartment with skyline views and secure parking',
    description:
      'A practical city-facing apartment with a sunny balcony and secure basement parking.',
    propertyType: 'apartment',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: IDS.agencyAdminUser,
    agentId: null,
    agencyId: IDS.agency,
    cataloguePublisherId: null,
    price: 2140000,
    imageUrl: 'http://localhost:3009/properties/XP05F7nbEz5Z.jpg',
    bedrooms: 2,
    bathrooms: 2,
    internalAreaM2: 108,
    parkingBays: 1,
    propertyHighlights: ['Skyline views', 'Sunny balcony', 'Basement parking'],
  },
];

const HOME_RENTAL_FIXTURE: ManualFixtureDefinition = {
  propertyId: 996111,
  listingId: 996111,
  mediaId: 996211,
  propertyImageId: 996311,
  title: 'Furnished Sandton apartment available to rent',
  description: 'A furnished two-bedroom apartment with backup power and a private balcony.',
  propertyType: 'apartment',
  action: 'rent',
  propertyStatus: 'available',
  listingStatus: 'published',
  approvalStatus: 'approved',
  ownerId: IDS.agentUser,
  agentId: IDS.agent,
  agencyId: IDS.agency,
  cataloguePublisherId: null,
  price: 28500,
  imageUrl: 'http://localhost:3009/properties/40O7UI0lbxUn.jpg',
  bedrooms: 2,
  bathrooms: 2,
  internalAreaM2: 91,
  parkingBays: 1,
  propertyHighlights: ['Furnished', 'Backup power', 'Private balcony'],
};

const HOME_FIXTURES: readonly ManualFixtureDefinition[] = [
  ...HOME_SALE_FIXTURES,
  HOME_RENTAL_FIXTURE,
];

export const HOMEPAGE_JOURNEY_PREVIEW_SALE_PROPERTY_IDS = Object.freeze(
  HOME_SALE_FIXTURES.map(fixture => fixture.propertyId),
);
export const HOMEPAGE_JOURNEY_PREVIEW_RENTAL_PROPERTY_ID = HOME_RENTAL_FIXTURE.propertyId;

const FIXTURE_PAYLOAD = Object.freeze({
  version: HOMEPAGE_JOURNEY_PREVIEW_VERSION,
  target: TARGET,
  identities: HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES,
  agency: AGENCY,
  agentProfile: AGENT_PROFILE,
  developer: {
    organisationId: IDS.developerOrganisation,
    publisherId: IDS.cataloguePublisher,
    developmentId: IDS.development,
  },
  saleFixtures: HOME_SALE_FIXTURES,
  rentalFixture: HOME_RENTAL_FIXTURE,
  password: 'central-local-demo-password; excluded from fixture evidence',
});

export const HOMEPAGE_JOURNEY_PREVIEW_DIGEST = stableDigest(FIXTURE_PAYLOAD);

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'reused';

export type HomepageJourneyPreviewEvidence = AdapterEvidence & {
  fixture: typeof HOMEPAGE_JOURNEY_PREVIEW_VERSION;
  expected: {
    saleCards: 10;
    rentalCards: 1;
    canonicalLocation: typeof HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.canonicalLocation;
    accounts: {
      agentEmail: string;
      agencyAdminEmail: string;
      developerEmail: string;
    };
  };
  prepared: {
    agency: PreparedState;
    agencyAdmin: PreparedState;
    agent: PreparedState;
    agentProfile: PreparedState;
    agencyMembership: PreparedState;
    agencyBranding: PreparedState;
    developer: PreparedState;
    agentLaunchAccess: PreparedState;
    agencyLaunchAccess: PreparedState;
    developerLaunchAccess: PreparedState;
    saleCards: 10;
    rentalCards: 1;
  };
  verified: {
    saleCards: 10;
    rentalCards: 1;
    sourceListingsPublished: true;
    exactLocation: true;
    agentLogin: true;
    agencyAdminLogin: true;
    developerLogin: true;
    agentProfile: true;
    agencyMembership: true;
    developerIdentity: true;
    launchAccess: true;
  };
  migrationHead: string;
};

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function requireExact(value: unknown, expected: unknown, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`Homepage journey preview fixture conflicts at ${label}.`);
  }
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`Homepage journey preview fixture has duplicate ${label} rows.`);
  }
  return rows[0] ?? null;
}

function asId(row: Row, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Homepage journey preview fixture ${label} has an invalid ID.`);
  }
  return id;
}

function buildInsertStatement(
  table: string,
  columns: readonly string[],
  values: readonly unknown[],
): string {
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) ||
    columns.some(column => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column))
  ) {
    throw new Error(
      'Homepage journey preview fixture insert contract contains an invalid identifier.',
    );
  }
  if (columns.length !== values.length) {
    throw new Error(
      `Homepage journey preview fixture insert contract for ${table} has ${columns.length} columns but ${values.length} values.`,
    );
  }
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
}

async function ensureFixedRow(input: {
  connection: AuthoritySqlConnection;
  table: string;
  id: number | string;
  columns: readonly string[];
  expected: Record<string, unknown>;
  insertColumns: readonly string[];
  insertValues: readonly unknown[];
}): Promise<PreparedState> {
  const rows = await queryRows(
    input.connection,
    `SELECT ${input.columns.join(', ')} FROM ${input.table} WHERE id = ?`,
    [input.id],
  );
  const existing = requireOneOrNone(rows, `${input.table}:${input.id}`);
  if (existing) {
    for (const [column, expected] of Object.entries(input.expected)) {
      requireExact(rowValue(existing, column), expected, `${input.table}:${input.id}.${column}`);
    }
    return 'reused';
  }
  await input.connection.execute(
    buildInsertStatement(input.table, input.insertColumns, input.insertValues),
    input.insertValues,
  );
  return 'created';
}

export function assertHomepageJourneyPreviewTarget(authority: ResolvedDatabaseAuthority): void {
  assertOwnedDisposableTarget(authority);
  const { context } = authority;
  if (
    context.targetClass !== TARGET.targetClass ||
    context.host !== TARGET.host ||
    context.port !== TARGET.port ||
    context.databaseName !== context.worktree.expectedDatabase ||
    !context.worktree.ownershipMatches
  ) {
    throw new Error(
      'Homepage journey preview fixture refused: target is not the exact owned disposable worktree database.',
    );
  }
}

export function assertHomepageJourneyPreviewPassword(
  password: unknown,
): asserts password is string {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error(
      'Homepage journey preview fixture refused: LOCAL_DEMO_AGENCY_PASSWORD must be configured by the central local environment authority.',
    );
  }
}

function localPreviewPassword(): string {
  const central = inspectCentralLocalEnvironment(resolveCentralLocalEnvironment());
  assertCentralEnvironmentReady(central);
  const password = central.values.LOCAL_DEMO_AGENCY_PASSWORD;
  assertHomepageJourneyPreviewPassword(password);
  return password;
}

export async function hashHomepageJourneyPreviewPassword(password: string): Promise<string> {
  assertHomepageJourneyPreviewPassword(password);
  return bcrypt.hash(password, 10);
}

async function passwordHashMatches(password: string, hash: unknown): Promise<boolean> {
  return typeof hash === 'string' && hash.length > 0 && bcrypt.compare(password, hash);
}

async function ensureUser(
  connection: AuthoritySqlConnection,
  user: PreviewUser,
  password: string,
): Promise<PreparedState> {
  const rows = await queryRows(
    connection,
    `SELECT id, openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
            emailVerified, role, agencyId, isSubaccount, onboarding_complete, onboarding_step
       FROM users
      WHERE id = ? OR email = ? OR openId = ?
      ORDER BY id`,
    [user.id, user.email, user.openId],
  );
  const existing = requireOneOrNone(rows, `user ${user.email}`);
  if (existing) {
    requireExact(rowValue(existing, 'id'), user.id, `user ${user.email} ID`);
    requireExact(rowValue(existing, 'email'), user.email, `user ${user.email} email`);
    requireExact(rowValue(existing, 'openId'), user.openId, `user ${user.email} openId`);
    requireExact(rowValue(existing, 'role'), user.role, `user ${user.email} role`);
    requireExact(rowValue(existing, 'agencyId'), user.agencyId, `user ${user.email} agency`);
    const passwordHash = (await passwordHashMatches(password, rowValue(existing, 'passwordHash')))
      ? String(rowValue(existing, 'passwordHash'))
      : await hashHomepageJourneyPreviewPassword(password);
    await connection.execute(
      `UPDATE users
          SET name = ?, firstName = ?, lastName = ?, phone = ?, loginMethod = 'email',
              emailVerified = 1, role = ?, agencyId = ?, isSubaccount = 0,
              onboarding_complete = 1, onboarding_step = 0, passwordHash = ?,
              passwordResetToken = NULL, passwordResetTokenExpiresAt = NULL,
              emailVerificationToken = NULL
        WHERE id = ?`,
      [
        user.name,
        user.firstName,
        user.lastName,
        user.phone,
        user.role,
        user.agencyId,
        passwordHash,
        user.id,
      ],
    );
    return 'reused';
  }

  const passwordHash = await hashHomepageJourneyPreviewPassword(password);
  await connection.execute(
    `INSERT INTO users
      (id, openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
       emailVerified, role, plan, trialStatus, onboarding_complete, onboarding_step,
       subscription_tier, subscription_status, agencyId, isSubaccount,
       passwordResetToken, passwordResetTokenExpiresAt, emailVerificationToken)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'email', 1, ?, 'trial', 'active', 1, 0,
             'free', 'trial', ?, 0, NULL, NULL, NULL)`,
    [
      user.id,
      user.openId,
      user.email,
      passwordHash,
      user.name,
      user.firstName,
      user.lastName,
      user.phone,
      user.role,
      user.agencyId,
    ],
  );
  return 'created';
}

async function ensureAgency(connection: AuthoritySqlConnection): Promise<PreparedState> {
  const rows = await queryRows(
    connection,
    `SELECT id, slug, email, name, isVerified
       FROM agencies
      WHERE id = ? OR slug = ? OR email = ?
      ORDER BY id`,
    [AGENCY.id, AGENCY.slug, AGENCY.email],
  );
  const existing = requireOneOrNone(rows, `agency ${AGENCY.slug}`);
  if (existing) {
    requireExact(rowValue(existing, 'id'), AGENCY.id, 'agency ID');
    requireExact(rowValue(existing, 'slug'), AGENCY.slug, 'agency slug');
    requireExact(rowValue(existing, 'email'), AGENCY.email, 'agency email');
    await connection.execute(
      `UPDATE agencies
          SET name = ?, description = ?, phone = ?, address = ?, city = ?, province = ?,
              isVerified = 1
        WHERE id = ?`,
      [
        AGENCY.name,
        AGENCY.description,
        AGENCY.phone,
        AGENCY.address,
        AGENCY.city,
        AGENCY.province,
        AGENCY.id,
      ],
    );
    return 'reused';
  }
  await connection.execute(
    `INSERT INTO agencies
      (id, name, slug, description, email, phone, address, city, province,
       subscriptionPlan, subscriptionStatus, isVerified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'free', 'trial', 1)`,
    [
      AGENCY.id,
      AGENCY.name,
      AGENCY.slug,
      AGENCY.description,
      AGENCY.email,
      AGENCY.phone,
      AGENCY.address,
      AGENCY.city,
      AGENCY.province,
    ],
  );
  return 'created';
}

async function ensureBranding(connection: AuthoritySqlConnection): Promise<PreparedState> {
  const existing = requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, companyName, isEnabled
         FROM agency_branding
        WHERE agencyId = ?
        ORDER BY id`,
      [AGENCY.id],
    ),
    `branding for agency ${AGENCY.id}`,
  );
  if (existing) {
    await connection.execute(
      `UPDATE agency_branding
          SET companyName = ?, primaryColor = ?, secondaryColor = ?, accentColor = ?,
              tagline = ?, supportEmail = ?, supportPhone = ?, isEnabled = 1
        WHERE id = ?`,
      [
        BRANDING.companyName,
        BRANDING.primaryColor,
        BRANDING.secondaryColor,
        BRANDING.accentColor,
        BRANDING.tagline,
        BRANDING.supportEmail,
        BRANDING.supportPhone,
        asId(existing, 'agency branding'),
      ],
    );
    return 'reused';
  }
  await connection.execute(
    `INSERT INTO agency_branding
      (agencyId, primaryColor, secondaryColor, accentColor, companyName, tagline,
       supportEmail, supportPhone, isEnabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      AGENCY.id,
      BRANDING.primaryColor,
      BRANDING.secondaryColor,
      BRANDING.accentColor,
      BRANDING.companyName,
      BRANDING.tagline,
      BRANDING.supportEmail,
      BRANDING.supportPhone,
    ],
  );
  return 'created';
}

async function ensureAgentProfile(connection: AuthoritySqlConnection): Promise<PreparedState> {
  const rows = await queryRows(
    connection,
    `SELECT id, userId, agencyId, slug, status, isVerified
       FROM agents
      WHERE id = ? OR userId = ? OR slug = ?
      ORDER BY id`,
    [AGENT_PROFILE.id, USERS.agent.id, AGENT_PROFILE.slug],
  );
  const existing = requireOneOrNone(rows, `agent ${AGENT_PROFILE.slug}`);
  if (existing) {
    requireExact(rowValue(existing, 'id'), AGENT_PROFILE.id, 'agent profile ID');
    requireExact(rowValue(existing, 'userId'), USERS.agent.id, 'agent profile user ID');
    requireExact(rowValue(existing, 'agencyId'), AGENCY.id, 'agent profile agency ID');
    requireExact(rowValue(existing, 'slug'), AGENT_PROFILE.slug, 'agent profile slug');
    await connection.execute(
      `UPDATE agents
          SET firstName = ?, lastName = ?, displayName = ?, bio = ?, phone = ?, email = ?,
              whatsapp = ?, focus = ?, propertyTypes = ?, role = 'agent', areasServed = ?,
              languages = ?, profileCompletionScore = ?, profileCompletionFlags = '[]',
              isVerified = 1, isFeatured = 0, status = 'approved', rejectionReason = NULL,
              approvedBy = ?, approvedAt = NOW()
        WHERE id = ?`,
      [
        USERS.agent.firstName,
        USERS.agent.lastName,
        AGENT_PROFILE.displayName,
        AGENT_PROFILE.bio,
        USERS.agent.phone,
        USERS.agent.email,
        USERS.agent.phone,
        AGENT_PROFILE.focus,
        AGENT_PROFILE.propertyTypes,
        AGENT_PROFILE.areasServed,
        AGENT_PROFILE.languages,
        AGENT_PROFILE.profileCompletionScore,
        USERS.agencyAdmin.id,
        AGENT_PROFILE.id,
      ],
    );
    return 'reused';
  }
  await connection.execute(
    `INSERT INTO agents
      (id, userId, agencyId, firstName, lastName, displayName, slug, bio, phone, email,
       whatsapp, focus, propertyTypes, role, areasServed, languages, profileCompletionScore,
       profileCompletionFlags, isVerified, isFeatured, status, approvedBy, approvedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agent', ?, ?, ?, '[]', 1, 0,
             'approved', ?, NOW())`,
    [
      AGENT_PROFILE.id,
      USERS.agent.id,
      AGENCY.id,
      USERS.agent.firstName,
      USERS.agent.lastName,
      AGENT_PROFILE.displayName,
      AGENT_PROFILE.slug,
      AGENT_PROFILE.bio,
      USERS.agent.phone,
      USERS.agent.email,
      USERS.agent.phone,
      AGENT_PROFILE.focus,
      AGENT_PROFILE.propertyTypes,
      AGENT_PROFILE.areasServed,
      AGENT_PROFILE.languages,
      AGENT_PROFILE.profileCompletionScore,
      USERS.agencyAdmin.id,
    ],
  );
  return 'created';
}

async function ensureAgencyMembership(connection: AuthoritySqlConnection): Promise<PreparedState> {
  const existing = requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, agency_id, agent_id, status, governance_mode, role
         FROM agency_agent_memberships
        WHERE id = ? OR (agency_id = ? AND agent_id = ?)
        ORDER BY id`,
      [IDS.agencyAgentMembership, AGENCY.id, AGENT_PROFILE.id],
    ),
    `agency-agent membership ${AGENCY.id}:${AGENT_PROFILE.id}`,
  );
  if (existing) {
    requireExact(rowValue(existing, 'agency_id'), AGENCY.id, 'agency membership agency');
    requireExact(rowValue(existing, 'agent_id'), AGENT_PROFILE.id, 'agency membership agent');
    await connection.execute(
      `UPDATE agency_agent_memberships
          SET status = 'active', governance_mode = 'affiliated', role = 'agent',
              permissions_overrides = ?, created_by = ?, updated_by = ?
        WHERE id = ?`,
      ['{}', USERS.agencyAdmin.id, USERS.agencyAdmin.id, asId(existing, 'agency membership')],
    );
    return 'reused';
  }
  await connection.execute(
    `INSERT INTO agency_agent_memberships
      (id, agency_id, agent_id, status, governance_mode, role, permissions_overrides,
       effective_from, created_by, updated_by)
     VALUES (?, ?, ?, 'active', 'affiliated', 'agent', ?, ?, ?, ?)`,
    [
      IDS.agencyAgentMembership,
      AGENCY.id,
      AGENT_PROFILE.id,
      '{}',
      FIXTURE_TIMESTAMP,
      USERS.agencyAdmin.id,
      USERS.agencyAdmin.id,
    ],
  );
  return 'created';
}

async function ensureDeveloperIdentity(connection: AuthoritySqlConnection): Promise<PreparedState> {
  const organisation = await ensureFixedRow({
    connection,
    table: 'developer_organisations',
    id: IDS.developerOrganisation,
    columns: ['id', 'slug', 'name', 'status', 'is_verified'],
    expected: {
      id: IDS.developerOrganisation,
      slug: HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.developerSlug,
      name: 'Homepage Preview Developments',
      status: 'approved',
      is_verified: 1,
    },
    insertColumns: ['id', 'slug', 'name', 'status', 'is_verified'],
    insertValues: [
      IDS.developerOrganisation,
      HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.developerSlug,
      'Homepage Preview Developments',
      'approved',
      1,
    ],
  });
  await ensureFixedRow({
    connection,
    table: 'developer_organisation_memberships',
    id: IDS.developerMembership,
    columns: ['id', 'organisation_id', 'user_id', 'role', 'status'],
    expected: {
      id: IDS.developerMembership,
      organisation_id: IDS.developerOrganisation,
      user_id: USERS.developer.id,
      role: 'owner',
      status: 'active',
    },
    insertColumns: ['id', 'organisation_id', 'user_id', 'role', 'status'],
    insertValues: [
      IDS.developerMembership,
      IDS.developerOrganisation,
      USERS.developer.id,
      'owner',
      'active',
    ],
  });
  await ensureFixedRow({
    connection,
    table: 'catalogue_publishers',
    id: IDS.cataloguePublisher,
    columns: ['id', 'authority_kind', 'developer_organisation_id', 'slug', 'name', 'is_visible'],
    expected: {
      id: IDS.cataloguePublisher,
      authority_kind: 'developer_first_party',
      developer_organisation_id: IDS.developerOrganisation,
      slug: HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.developerSlug,
      name: 'Homepage Preview Developments',
      is_visible: 1,
    },
    insertColumns: [
      'id',
      'authority_kind',
      'publisher_type',
      'developer_organisation_id',
      'slug',
      'name',
      'is_visible',
    ],
    insertValues: [
      IDS.cataloguePublisher,
      'developer_first_party',
      'developer',
      IDS.developerOrganisation,
      HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.developerSlug,
      'Homepage Preview Developments',
      1,
    ],
  });
  await ensureFixedRow({
    connection,
    table: 'developments',
    id: IDS.development,
    columns: [
      'id',
      'catalogue_publisher_id',
      'name',
      'slug',
      'city',
      'province',
      'suburb',
      'isPublished',
      'approval_status',
      'transaction_type',
    ],
    expected: {
      id: IDS.development,
      catalogue_publisher_id: IDS.cataloguePublisher,
      name: 'The Preview Residences',
      slug: 'homepage-preview-residences-v1',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
      isPublished: 1,
      approval_status: 'approved',
      transaction_type: 'for_sale',
    },
    insertColumns: [
      'id',
      'catalogue_publisher_id',
      'name',
      'developmentType',
      'city',
      'province',
      'suburb',
      'slug',
      'isPublished',
      'approval_status',
      'dev_owner_type',
      'status',
      'transaction_type',
      'totalUnits',
      'availableUnits',
      'priceFrom',
    ],
    insertValues: [
      IDS.development,
      IDS.cataloguePublisher,
      'The Preview Residences',
      'residential',
      'Johannesburg',
      'Gauteng',
      'Sandton',
      'homepage-preview-residences-v1',
      1,
      'approved',
      'developer',
      'selling',
      'for_sale',
      24,
      16,
      1950000,
    ],
  });
  await ensureFixedRow({
    connection,
    table: 'unit_types',
    id: IDS.unit,
    columns: [
      'id',
      'development_id',
      'name',
      'bedrooms',
      'bathrooms',
      'base_price_from',
      'is_active',
      'available_units',
      'total_units',
    ],
    expected: {
      id: IDS.unit,
      development_id: IDS.development,
      name: 'Two-bedroom preview residence',
      bedrooms: 2,
      bathrooms: '2.0',
      base_price_from: '1950000.00',
      is_active: 1,
      available_units: 16,
      total_units: 24,
    },
    insertColumns: [
      'id',
      'development_id',
      'name',
      'bedrooms',
      'bathrooms',
      'base_price_from',
      'is_active',
      'total_units',
      'available_units',
      'structural_type',
      'display_order',
    ],
    insertValues: [
      IDS.unit,
      IDS.development,
      'Two-bedroom preview residence',
      2,
      '2.0',
      '1950000.00',
      1,
      24,
      16,
      'apartment',
      1,
    ],
  });
  return organisation;
}

async function ensureLaunchAccessSubscription(input: {
  connection: AuthoritySqlConnection;
  ownerType: 'agent' | 'agency' | 'developer';
  ownerId: number;
  plan: { name: string; segment: string; price: number };
  createdBy: number;
}): Promise<PreparedState> {
  const planRows = await queryRows(
    input.connection,
    'SELECT id FROM plans WHERE name = ? AND segment = ?',
    [input.plan.name, input.plan.segment],
  );
  if (planRows.length !== 1) {
    throw new Error(
      `Homepage journey preview fixture requires the canonical ${input.plan.name} plan.`,
    );
  }
  const planId = asId(planRows[0], `${input.plan.name} plan`);
  const rows = await queryRows(
    input.connection,
    `SELECT id, plan_id, status, current_period_end, cancel_at_period_end
       FROM subscriptions
      WHERE owner_type = ? AND owner_id = ?
      ORDER BY id`,
    [input.ownerType, input.ownerId],
  );
  const existing = requireOneOrNone(rows, `${input.ownerType} Launch Access subscription`);
  if (existing) {
    const expiresAt = new Date(String(rowValue(existing, 'current_period_end') || '')).getTime();
    if (
      Number(rowValue(existing, 'plan_id')) !== planId ||
      rowValue(existing, 'status') !== 'active' ||
      Number(rowValue(existing, 'cancel_at_period_end')) !== 0 ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      throw new Error(
        `Homepage journey preview fixture ${input.ownerType} Launch Access conflicts with canonical access.`,
      );
    }
    return 'reused';
  }
  await input.connection.execute(
    `INSERT INTO subscriptions
      (owner_type, owner_id, plan_id, status, trial_ends_at,
       current_period_start, current_period_end, grace_ends_at,
       cancel_at_period_end, billing_cycle_anchor, metadata, created_by, updated_by)
     VALUES (?, ?, ?, 'active', NULL, CURRENT_TIMESTAMP,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 90 DAY), NULL, 0,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 90 DAY), CAST(? AS JSON), ?, ?)`,
    [
      input.ownerType,
      input.ownerId,
      planId,
      JSON.stringify({
        fixture: HOMEPAGE_JOURNEY_PREVIEW_VERSION,
        commercial_product_key: input.plan.name,
        commercial_term_kind: 'paid_launch_access',
        commercial_access_activated: true,
        commercial_requires_verified_payment: true,
        commercial_auto_renews: false,
        billing_provider: 'machine_local_fixture',
        verified_payment_amount_minor: input.plan.price,
      }),
      input.createdBy,
      input.createdBy,
    ],
  );
  return 'created';
}

async function resolveExactSandtonLocation(connection: AuthoritySqlConnection): Promise<{
  provinceId: number;
  cityId: number;
  suburbId: number;
}> {
  const rows = await queryRows(
    connection,
    `SELECT p.id AS province_id, c.id AS city_id, s.id AS suburb_id
       FROM provinces p
       INNER JOIN cities c ON c.provinceId = p.id
       INNER JOIN suburbs s ON s.cityId = c.id
      WHERE p.slug = ? AND c.slug = ? AND s.slug = ?`,
    ['gauteng', 'johannesburg', 'sandton'],
  );
  if (rows.length !== 1) {
    throw new Error(
      'Homepage journey preview fixture requires the canonical Gauteng/Johannesburg/Sandton hierarchy.',
    );
  }
  return {
    provinceId: asId({ id: rowValue(rows[0], 'province_id') }, 'province'),
    cityId: asId({ id: rowValue(rows[0], 'city_id') }, 'city'),
    suburbId: asId({ id: rowValue(rows[0], 'suburb_id') }, 'suburb'),
  };
}

async function verifyPreviewRows(
  connection: AuthoritySqlConnection,
  password: string,
): Promise<HomepageJourneyPreviewEvidence['verified']> {
  const ids = HOME_FIXTURES.map(fixture => fixture.propertyId);
  const rows = await queryRows(
    connection,
    `SELECT p.id, p.title, p.listingType AS listing_type, p.status AS property_status,
            p.provinceId AS province_id, p.cityId AS city_id, p.suburbId AS suburb_id,
            p.sourceListingId AS source_listing_id, p.mainImage,
            l.id AS listing_id, l.status AS listing_status, l.approvalStatus AS approval_status,
            l.revision_of_listing_id
       FROM properties p
       INNER JOIN listings l ON l.id = p.sourceListingId
      WHERE p.id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  if (rows.length !== HOME_FIXTURES.length) {
    throw new Error('Homepage journey preview fixture public property set is incomplete.');
  }
  let saleCards = 0;
  let rentalCards = 0;
  for (const fixture of HOME_FIXTURES) {
    const row = rows.find(candidate => Number(rowValue(candidate, 'id')) === fixture.propertyId);
    if (!row) {
      throw new Error(`Homepage journey preview property ${fixture.propertyId} is missing.`);
    }
    requireExact(rowValue(row, 'title'), fixture.title, `property ${fixture.propertyId} title`);
    requireExact(
      rowValue(row, 'source_listing_id'),
      fixture.listingId,
      `property ${fixture.propertyId} source listing`,
    );
    requireExact(
      rowValue(row, 'listing_id'),
      fixture.listingId,
      `property ${fixture.propertyId} listing`,
    );
    requireExact(
      rowValue(row, 'listing_type'),
      fixture.action === 'sell' ? 'sale' : 'rent',
      `property ${fixture.propertyId} listing type`,
    );
    requireExact(
      rowValue(row, 'property_status'),
      'available',
      `property ${fixture.propertyId} status`,
    );
    requireExact(
      rowValue(row, 'listing_status'),
      'published',
      `property ${fixture.propertyId} publication`,
    );
    requireExact(
      rowValue(row, 'approval_status'),
      'approved',
      `property ${fixture.propertyId} approval`,
    );
    requireExact(
      rowValue(row, 'revision_of_listing_id'),
      null,
      `property ${fixture.propertyId} revision`,
    );
    requireExact(
      rowValue(row, 'mainImage'),
      fixture.imageUrl,
      `property ${fixture.propertyId} image`,
    );
    if (
      Number(rowValue(row, 'province_id')) <= 0 ||
      Number(rowValue(row, 'city_id')) <= 0 ||
      Number(rowValue(row, 'suburb_id')) <= 0
    ) {
      throw new Error(
        `Homepage journey preview property ${fixture.propertyId} lacks exact geography.`,
      );
    }
    if (fixture.action === 'sell') saleCards += 1;
    else rentalCards += 1;
  }
  if (saleCards !== 10 || rentalCards !== 1) {
    throw new Error(
      'Homepage journey preview fixture has an unexpected sale or rental card count.',
    );
  }

  const location = await resolveExactSandtonLocation(connection);
  if (
    !rows.every(
      row =>
        Number(rowValue(row, 'province_id')) === location.provinceId &&
        Number(rowValue(row, 'city_id')) === location.cityId &&
        Number(rowValue(row, 'suburb_id')) === location.suburbId,
    )
  ) {
    throw new Error('Homepage journey preview fixture widened or mixed its canonical location.');
  }

  const userRows = await queryRows(
    connection,
    `SELECT id, email, openId, role, agencyId, passwordHash
       FROM users
      WHERE id IN (?, ?, ?)
      ORDER BY id`,
    [USERS.agencyAdmin.id, USERS.agent.id, USERS.developer.id],
  );
  if (userRows.length !== 3) {
    throw new Error('Homepage journey preview fixture accounts are incomplete.');
  }
  const resolveUser = (user: PreviewUser) => {
    const row = userRows.find(candidate => Number(rowValue(candidate, 'id')) === user.id);
    if (!row) throw new Error(`Homepage journey preview user ${user.email} is missing.`);
    requireExact(rowValue(row, 'email'), user.email, `user ${user.email} email`);
    requireExact(rowValue(row, 'openId'), user.openId, `user ${user.email} openId`);
    requireExact(rowValue(row, 'role'), user.role, `user ${user.email} role`);
    requireExact(rowValue(row, 'agencyId'), user.agencyId, `user ${user.email} agency`);
    return row;
  };
  const [agencyAdminLogin, agentLogin, developerLogin] = await Promise.all([
    passwordHashMatches(password, rowValue(resolveUser(USERS.agencyAdmin), 'passwordHash')),
    passwordHashMatches(password, rowValue(resolveUser(USERS.agent), 'passwordHash')),
    passwordHashMatches(password, rowValue(resolveUser(USERS.developer), 'passwordHash')),
  ]);
  if (!agencyAdminLogin || !agentLogin || !developerLogin) {
    throw new Error('Homepage journey preview fixture login verification failed.');
  }

  const agentRows = await queryRows(
    connection,
    `SELECT a.id, a.userId, a.agencyId, a.slug, a.status, a.isVerified,
            m.status AS membership_status, m.governance_mode
       FROM agents a
       INNER JOIN agency_agent_memberships m ON m.agent_id = a.id AND m.agency_id = a.agencyId
      WHERE a.id = ?`,
    [AGENT_PROFILE.id],
  );
  if (
    agentRows.length !== 1 ||
    Number(rowValue(agentRows[0], 'userId')) !== USERS.agent.id ||
    Number(rowValue(agentRows[0], 'agencyId')) !== AGENCY.id ||
    rowValue(agentRows[0], 'slug') !== AGENT_PROFILE.slug ||
    rowValue(agentRows[0], 'status') !== 'approved' ||
    Number(rowValue(agentRows[0], 'isVerified')) !== 1 ||
    rowValue(agentRows[0], 'membership_status') !== 'active' ||
    rowValue(agentRows[0], 'governance_mode') !== 'affiliated'
  ) {
    throw new Error('Homepage journey preview fixture agent/agency custody is incomplete.');
  }

  const developerRows = await queryRows(
    connection,
    `SELECT o.id AS organisation_id, m.user_id, m.role, m.status,
            cp.id AS publisher_id, cp.authority_kind
       FROM developer_organisations o
       INNER JOIN developer_organisation_memberships m ON m.organisation_id = o.id
       INNER JOIN catalogue_publishers cp
               ON cp.developer_organisation_id = o.id
              AND cp.authority_kind = 'developer_first_party'
      WHERE o.id = ? AND m.user_id = ?`,
    [IDS.developerOrganisation, USERS.developer.id],
  );
  if (
    developerRows.length !== 1 ||
    Number(rowValue(developerRows[0], 'publisher_id')) !== IDS.cataloguePublisher ||
    rowValue(developerRows[0], 'role') !== 'owner' ||
    rowValue(developerRows[0], 'status') !== 'active'
  ) {
    throw new Error('Homepage journey preview fixture developer identity is incomplete.');
  }

  const subscriptionRows = await queryRows(
    connection,
    `SELECT owner_type, owner_id, status, cancel_at_period_end, current_period_end
       FROM subscriptions
      WHERE (owner_type = 'agent' AND owner_id = ?)
         OR (owner_type = 'agency' AND owner_id = ?)
         OR (owner_type = 'developer' AND owner_id = ?)
      ORDER BY owner_type, owner_id`,
    [USERS.agent.id, AGENCY.id, IDS.developerOrganisation],
  );
  if (subscriptionRows.length !== 3) {
    throw new Error('Homepage journey preview fixture Launch Access subscriptions are incomplete.');
  }
  for (const row of subscriptionRows) {
    const expiresAt = new Date(String(rowValue(row, 'current_period_end') || '')).getTime();
    if (
      rowValue(row, 'status') !== 'active' ||
      Number(rowValue(row, 'cancel_at_period_end')) !== 0 ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      throw new Error('Homepage journey preview fixture Launch Access is not active.');
    }
  }

  return {
    saleCards: 10,
    rentalCards: 1,
    sourceListingsPublished: true,
    exactLocation: true,
    agentLogin: true,
    agencyAdminLogin: true,
    developerLogin: true,
    agentProfile: true,
    agencyMembership: true,
    developerIdentity: true,
    launchAccess: true,
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'homepage-journey-preview',
    version: HOMEPAGE_JOURNEY_PREVIEW_VERSION,
    digest: HOMEPAGE_JOURNEY_PREVIEW_DIGEST,
  };
}

function expectedEvidence() {
  return {
    saleCards: 10 as const,
    rentalCards: 1 as const,
    canonicalLocation: HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.canonicalLocation,
    accounts: {
      agentEmail: USERS.agent.email,
      agencyAdminEmail: USERS.agencyAdmin.email,
      developerEmail: USERS.developer.email,
    },
  };
}

export async function prepareHomepageJourneyPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<HomepageJourneyPreviewEvidence> {
  assertOperation(input.decision, ['demo-seed']);
  assertHomepageJourneyPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await verifyCanonicalGeographyReferenceData(input.connection);
  const location = await resolveExactSandtonLocation(input.connection);
  const password = localPreviewPassword();

  const prepared = await withTransaction(input.connection, async () => {
    const agency = await ensureAgency(input.connection);
    const agencyAdmin = await ensureUser(input.connection, USERS.agencyAdmin, password);
    const agent = await ensureUser(input.connection, USERS.agent, password);
    const developer = await ensureUser(input.connection, USERS.developer, password);
    const agencyBranding = await ensureBranding(input.connection);
    const agentProfile = await ensureAgentProfile(input.connection);
    const agencyMembership = await ensureAgencyMembership(input.connection);
    await ensureDeveloperIdentity(input.connection);
    const agentLaunchAccess = await ensureLaunchAccessSubscription({
      connection: input.connection,
      ownerType: 'agent',
      ownerId: USERS.agent.id,
      plan: CANONICAL_AGENT_LAUNCH_ACCESS,
      createdBy: USERS.agent.id,
    });
    const agencyLaunchAccess = await ensureLaunchAccessSubscription({
      connection: input.connection,
      ownerType: 'agency',
      ownerId: AGENCY.id,
      plan: CANONICAL_AGENCY_LAUNCH_ACCESS,
      createdBy: USERS.agencyAdmin.id,
    });
    const developerLaunchAccess = await ensureLaunchAccessSubscription({
      connection: input.connection,
      ownerType: 'developer',
      ownerId: IDS.developerOrganisation,
      plan: CANONICAL_DEVELOPER_LAUNCH_ACCESS,
      createdBy: USERS.developer.id,
    });
    for (const fixture of HOME_FIXTURES) {
      await ensureCanonicalManualFixture(
        input.connection,
        fixture,
        location.provinceId,
        location.cityId,
        location.suburbId,
      );
    }
    return {
      agency,
      agencyAdmin,
      agent,
      developer,
      agencyBranding,
      agentProfile,
      agencyMembership,
      agentLaunchAccess,
      agencyLaunchAccess,
      developerLaunchAccess,
    };
  });
  const verified = await verifyPreviewRows(input.connection, password);
  return {
    ...base,
    fixture: HOMEPAGE_JOURNEY_PREVIEW_VERSION,
    expected: expectedEvidence(),
    prepared: {
      agency: prepared.agency,
      agencyAdmin: prepared.agencyAdmin,
      agent: prepared.agent,
      agentProfile: prepared.agentProfile,
      agencyMembership: prepared.agencyMembership,
      agencyBranding: prepared.agencyBranding,
      developer: prepared.developer,
      agentLaunchAccess: prepared.agentLaunchAccess,
      agencyLaunchAccess: prepared.agencyLaunchAccess,
      developerLaunchAccess: prepared.developerLaunchAccess,
      saleCards: 10,
      rentalCards: 1,
    },
    verified,
    migrationHead: manifest.document.expectedHead,
  };
}

export async function verifyHomepageJourneyPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<HomepageJourneyPreviewEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertHomepageJourneyPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await verifyCanonicalGeographyReferenceData(input.connection);
  const verified = await verifyPreviewRows(input.connection, localPreviewPassword());
  return {
    ...base,
    fixture: HOMEPAGE_JOURNEY_PREVIEW_VERSION,
    expected: expectedEvidence(),
    prepared: {
      agency: 'reused',
      agencyAdmin: 'reused',
      agent: 'reused',
      agentProfile: 'reused',
      agencyMembership: 'reused',
      agencyBranding: 'reused',
      developer: 'reused',
      agentLaunchAccess: 'reused',
      agencyLaunchAccess: 'reused',
      developerLaunchAccess: 'reused',
      saleCards: 10,
      rentalCards: 1,
    },
    verified,
    migrationHead: manifest.document.expectedHead,
  };
}
