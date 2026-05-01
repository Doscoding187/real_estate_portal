import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

type EnvLike = Record<string, string | undefined>;
type SeedAction = 'seed' | 'reset';
type SeedTarget = 'local' | 'test';

const DEMO_PASSWORD = 'LocalDemo123!';
const DEMO_EMAILS = [
  'admin@listify.local',
  'developer@listify.local',
  'agent@listify.local',
  'referrer@listify.local',
  'buyer@listify.local',
] as const;

const ALLOWED_LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'host.docker.internal',
  'listify-mysql-local',
  'real-estate-mysql',
  'mysql',
  'db',
]);

const FORBIDDEN_HOST_PATTERNS = [
  'tidbcloud',
  'railway',
  'planetscale',
  'amazonaws',
  'rds.amazonaws',
  'azure',
  'googleusercontent',
  'supabase',
  'neon',
  'prod',
  'production',
];

const LOCAL_DEMO_DESCRIPTION =
  'Local demo only. Do not use, export, sync, or deploy this record to production.';

export function assertLocalSeedSafety(
  env: EnvLike = process.env,
  options: { target?: SeedTarget } = {},
): URL {
  const nodeEnv = String(env.NODE_ENV || '').toLowerCase();
  const appEnv = String(env.APP_ENV || '').toLowerCase();
  const explicitFlag = String(env.LOCAL_SEED_ALLOWED || '').toLowerCase();
  const databaseUrlRaw = env.DATABASE_URL;
  const target = options.target || (nodeEnv === 'test' ? 'test' : 'local');

  if (nodeEnv === 'production' || appEnv === 'production') {
    throw new Error('Local demo seed refused: production runtime detected.');
  }

  if (explicitFlag !== 'true') {
    throw new Error('Local demo seed refused: LOCAL_SEED_ALLOWED=true is required.');
  }

  if (!databaseUrlRaw) {
    throw new Error('Local demo seed refused: DATABASE_URL is required.');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrlRaw);
  } catch {
    throw new Error('Local demo seed refused: DATABASE_URL is invalid.');
  }

  const host = parsed.hostname.toLowerCase();
  const dbName = parsed.pathname.replace(/^\//, '');
  const isAllowedHost =
    ALLOWED_LOCAL_HOSTS.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.docker') ||
    host.endsWith('.docker.internal');
  const isForbiddenHost = FORBIDDEN_HOST_PATTERNS.some(pattern => host.includes(pattern));

  if (!isAllowedHost || isForbiddenHost) {
    throw new Error(
      `Local demo seed refused: DATABASE_URL host must be local/Docker only, received "${host}".`,
    );
  }

  if (dbName === 'listify_property_sa') {
    throw new Error('Local demo seed refused: production database name detected.');
  }

  const expectedDb = target === 'test' ? 'listify_test' : 'listify_local';
  if (dbName !== expectedDb) {
    throw new Error(
      `Local demo seed refused: ${target} seed must target database "${expectedDb}", received "${dbName}".`,
    );
  }

  return parsed;
}

function loadEnvForTarget(target: SeedTarget) {
  const envFile = target === 'test' ? '.env.test' : '.env.local';
  dotenv.config({ path: path.resolve(process.cwd(), envFile), override: false });
}

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function json(value: unknown) {
  return JSON.stringify(value);
}

function placeholders(values: unknown[]) {
  return values.map(() => '?').join(', ');
}

async function queryRows<T extends Record<string, unknown>>(
  connection: mysql.Connection,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await connection.execute(sql, params);
  return rows as T[];
}

async function execute(connection: mysql.Connection, sql: string, params: unknown[] = []) {
  const [result] = await connection.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

async function idsFor(
  connection: mysql.Connection,
  sql: string,
  params: unknown[] = [],
): Promise<number[]> {
  const rows = await queryRows<{ id: number }>(connection, sql, params);
  return rows.map(row => Number(row.id)).filter(Number.isFinite);
}

async function deleteByIds(connection: mysql.Connection, table: string, column: string, ids: number[]) {
  if (!ids.length) return;
  await execute(connection, `DELETE FROM ${table} WHERE ${column} IN (${placeholders(ids)})`, ids);
}

async function resetDemoData(connection: mysql.Connection) {
  const demoUserIds = await idsFor(
    connection,
    `SELECT id FROM users WHERE email IN (${placeholders([...DEMO_EMAILS])})`,
    [...DEMO_EMAILS],
  );
  const demoDevelopmentIds = await idsFor(
    connection,
    "SELECT id FROM developments WHERE slug LIKE 'local-demo-%' OR name LIKE '[LOCAL DEMO]%'",
  );
  const demoBrandIds = await idsFor(
    connection,
    "SELECT id FROM developer_brand_profiles WHERE slug LIKE 'local-demo-%' OR brand_name LIKE '[LOCAL DEMO]%'",
  );
  const demoDeveloperIds = demoUserIds.length
    ? await idsFor(
        connection,
        `SELECT id FROM developers WHERE slug LIKE 'local-demo-%' OR userId IN (${placeholders(demoUserIds)})`,
        demoUserIds,
      )
    : await idsFor(connection, "SELECT id FROM developers WHERE slug LIKE 'local-demo-%'");
  const demoAgencyIds = await idsFor(
    connection,
    "SELECT id FROM agencies WHERE slug LIKE 'local-demo-%' OR email LIKE '%@listify.local'",
  );

  const dealConditions = ["external_ref LIKE 'LOCAL-DEMO-%'"];
  const dealParams: unknown[] = [];
  if (demoDevelopmentIds.length) {
    dealConditions.push(`development_id IN (${placeholders(demoDevelopmentIds)})`);
    dealParams.push(...demoDevelopmentIds);
  }
  if (demoUserIds.length) {
    dealConditions.push(`agent_id IN (${placeholders(demoUserIds)})`);
    dealParams.push(...demoUserIds);
  }
  const demoDealIds = await idsFor(
    connection,
    `SELECT id FROM distribution_deals WHERE ${dealConditions.join(' OR ')}`,
    dealParams,
  );

  await deleteByIds(connection, 'distribution_commission_ledger', 'distribution_deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_commission_entries', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deal_bank_outcomes', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_viewing_validations', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_viewings', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deal_documents', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deal_events', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deals', 'id', demoDealIds);

  await deleteByIds(connection, 'development_required_documents', 'development_id', demoDevelopmentIds);
  await deleteByIds(connection, 'development_manager_assignments', 'development_id', demoDevelopmentIds);
  await deleteByIds(connection, 'distribution_development_access', 'development_id', demoDevelopmentIds);
  await deleteByIds(connection, 'distribution_program_workflow_steps', 'workflow_id', []);
  await deleteByIds(connection, 'distribution_programs', 'development_id', demoDevelopmentIds);
  await deleteByIds(connection, 'developments', 'id', demoDevelopmentIds);

  await deleteByIds(connection, 'distribution_brand_partnerships', 'brand_profile_id', demoBrandIds);
  await deleteByIds(connection, 'developer_brand_profiles', 'id', demoBrandIds);
  await deleteByIds(connection, 'developers', 'id', demoDeveloperIds);
  await deleteByIds(connection, 'distribution_identities', 'user_id', demoUserIds);
  await deleteByIds(connection, 'users', 'id', demoUserIds);
  await deleteByIds(connection, 'agencies', 'id', demoAgencyIds);
}

async function insertUser(
  connection: mysql.Connection,
  input: {
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    passwordHash: string;
    agencyId?: number | null;
  },
) {
  const result = await execute(
    connection,
    `
      INSERT INTO users
        (openId, email, passwordHash, name, firstName, lastName, phone, loginMethod, emailVerified, role, agencyId, isSubaccount, lastSignedIn, onboarding_complete, onboarding_step, subscription_tier, subscription_status)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 'email', 1, ?, ?, 0, NOW(), 1, 0, 'professional', 'active')
    `,
    [
      `local-demo-${input.email}`,
      input.email,
      input.passwordHash,
      input.name,
      input.firstName,
      input.lastName,
      '+27000000000',
      input.role,
      input.agencyId ?? null,
    ],
  );
  return Number(result.insertId);
}

async function insertDevelopment(
  connection: mysql.Connection,
  input: {
    developerId: number;
    brandProfileId: number;
    name: string;
    slug: string;
    city: string;
    suburb: string;
    priceFrom: number;
    priceTo: number;
    readinessScore: number;
    approvalStatus: 'approved' | 'pending' | 'draft';
    status: 'selling' | 'launching-soon';
  },
) {
  const result = await execute(
    connection,
    `
      INSERT INTO developments
        (developer_id, name, description, developmentType, address, city, province, latitude, longitude, totalUnits, availableUnits, priceFrom, priceTo, amenities, images, isFeatured, slug, isPublished, publishedAt, approval_status, readiness_score, developer_brand_profile_id, dev_owner_type, tagline, marketing_name, property_types, status, legacy_status, construction_phase, suburb)
      VALUES
        (?, ?, ?, 'residential', ?, ?, 'Gauteng', '-26.2041', '28.0473', 120, 42, ?, ?, ?, ?, 1, ?, ?, NOW(), ?, ?, ?, 'developer', 'Local demo referral-ready opportunity', ?, ?, ?, 'ready', 'completed', ?)
    `,
    [
      input.developerId,
      input.name,
      `${LOCAL_DEMO_DESCRIPTION} ${input.name} is seeded for local referral workflow testing.`,
      `${input.suburb}, ${input.city}`,
      input.city,
      input.priceFrom,
      input.priceTo,
      'Security, clubhouse, parks, fibre, family spaces',
      JSON.stringify([
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
      ]),
      input.slug,
      input.approvalStatus === 'approved' ? 1 : 0,
      input.approvalStatus,
      input.readinessScore,
      input.brandProfileId,
      input.name,
      json(['Apartments', 'Townhouses']),
      input.status,
      input.suburb,
    ],
  );
  return Number(result.insertId);
}

async function insertProgram(
  connection: mysql.Connection,
  input: {
    developmentId: number;
    active: boolean;
    referralsEnabled: boolean;
    commissionValue?: number | null;
    currencyCode?: string;
  },
) {
  const result = await execute(
    connection,
    `
      INSERT INTO distribution_programs
        (development_id, is_referral_enabled, is_active, commission_model, default_commission_percent, referrer_commission_type, referrer_commission_value, referrer_commission_basis, platform_commission_type, platform_commission_value, platform_commission_basis, tier_access_policy, payout_milestone, payout_milestone_notes, currency_code)
      VALUES
        (?, ?, ?, 'flat_percentage', 1.50, 'flat', ?, 'sale_price', 'percentage', 0.50, 'sale_price', 'open', 'bond_approval', 'Local demo only: payout/reward progress is simulated.', ?)
    `,
    [
      input.developmentId,
      input.referralsEnabled ? 1 : 0,
      input.active ? 1 : 0,
      input.commissionValue ?? 24000,
      input.currencyCode ?? 'ZAR',
    ],
  );
  return Number(result.insertId);
}

async function insertRequiredDocuments(connection: mysql.Connection, developmentId: number) {
  const docs = [
    ['id_document', 'Buyer ID document', 1],
    ['proof_of_income', 'Latest payslip or proof of income', 2],
    ['bank_statement', '3 months bank statements', 3],
    ['pre_approval', 'Bond pre-approval or affordability note', 4],
  ] as const;

  const ids: number[] = [];
  for (const [code, label, sortOrder] of docs) {
    const result = await execute(
      connection,
      `
        INSERT INTO development_required_documents
          (development_id, document_code, document_label, category, is_required, sort_order, is_active)
        VALUES
          (?, ?, ?, 'client_required_document', 1, ?, 1)
      `,
      [developmentId, code, label, sortOrder],
    );
    ids.push(Number(result.insertId));
  }
  return ids;
}

async function insertDeal(
  connection: mysql.Connection,
  input: {
    programId: number;
    developmentId: number;
    referrerId: number;
    managerUserId: number;
    externalRef: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    currentStage: string;
    status: string;
    commissionStatus: string;
    dealAmount: number;
    commissionAmount: number;
  },
) {
  const result = await execute(
    connection,
    `
      INSERT INTO distribution_deals
        (program_id, development_id, agent_id, owner_type, owner_id, assigned_agent_id, visibility_scope, manager_user_id, external_ref, buyer_name, buyer_email, buyer_phone, deal_amount, commission_base_amount, referrer_commission_type, referrer_commission_value, referrer_commission_basis, referrer_commission_amount, platform_commission_type, platform_commission_value, platform_commission_basis, platform_commission_amount, snapshot_version, snapshot_source, current_stage, commission_trigger_stage, commission_status, status, submitted_at, attribution_locked_at, attribution_locked_by)
      VALUES
        (?, ?, ?, 'agent', ?, ?, 'private', ?, ?, ?, ?, ?, ?, ?, 'flat', ?, 'sale_price', ?, 'percentage', 0.50, 'sale_price', 8000, 1, 'submission_gate', ?, 'bond_approved', ?, ?, NOW(), NOW(), ?)
    `,
    [
      input.programId,
      input.developmentId,
      input.referrerId,
      input.referrerId,
      input.referrerId,
      input.managerUserId,
      input.externalRef,
      input.buyerName,
      input.buyerEmail,
      input.buyerPhone,
      input.dealAmount,
      input.dealAmount,
      input.commissionAmount,
      input.commissionAmount,
      input.currentStage,
      input.commissionStatus,
      input.status,
      input.managerUserId,
    ],
  );
  return Number(result.insertId);
}

async function insertDealDocuments(
  connection: mysql.Connection,
  dealId: number,
  documentIds: number[],
  statuses: Array<'pending' | 'received' | 'verified'>,
  actorUserId: number,
) {
  for (let index = 0; index < documentIds.length; index += 1) {
    const status = statuses[index] || 'pending';
    await execute(
      connection,
      `
        INSERT INTO distribution_deal_documents
          (deal_id, development_required_document_id, status, received_at, verified_at, received_by, verified_by, submitted_file_url, submitted_file_name, submitted_at, submitted_by, notes)
        VALUES
          (?, ?, ?, ${status === 'pending' ? 'NULL' : 'NOW()'}, ${status === 'verified' ? 'NOW()' : 'NULL'}, ?, ?, ?, ?, ${status === 'pending' ? 'NULL' : 'NOW()'}, ?, ?)
      `,
      [
        dealId,
        documentIds[index],
        status,
        status === 'pending' ? null : actorUserId,
        status === 'verified' ? actorUserId : null,
        status === 'pending' ? null : 'local-demo://document.pdf',
        status === 'pending' ? null : 'local-demo-document.pdf',
        status === 'pending' ? null : actorUserId,
        `${LOCAL_DEMO_DESCRIPTION} Document status: ${status}.`,
      ],
    );
  }
}

async function insertDealEvent(
  connection: mysql.Connection,
  dealId: number,
  actorUserId: number,
  notes: string,
  toStage?: string,
) {
  await execute(
    connection,
    `
      INSERT INTO distribution_deal_events
        (deal_id, event_type, from_stage, to_stage, actor_user_id, owner_type, owner_id, assigned_agent_id, visibility_scope, metadata, notes, event_at)
      VALUES
        (?, 'note', NULL, ?, ?, 'agent', ?, ?, 'private', ?, ?, NOW())
    `,
    [
      dealId,
      toStage ?? null,
      actorUserId,
      actorUserId,
      actorUserId,
      json({ source: 'local-demo-seed', localOnly: true }),
      `${LOCAL_DEMO_DESCRIPTION} ${notes}`,
    ],
  );
}

async function insertCommissionEntry(
  connection: mysql.Connection,
  input: {
    dealId: number;
    programId: number;
    developmentId: number;
    referrerId: number;
    commissionAmount: number;
    status: 'pending' | 'approved' | 'paid';
    approvedBy: number;
  },
) {
  await execute(
    connection,
    `
      INSERT INTO distribution_commission_entries
        (deal_id, program_id, development_id, agent_id, calculation_base_amount, commission_percent, commission_amount, currency, trigger_stage, entry_status, approved_at, approved_by, paid_at, paid_by, payment_reference, notes, created_by, updated_by)
      VALUES
        (?, ?, ?, ?, 1600000, 1.50, ?, 'ZAR', 'bond_approved', ?, NOW(), ?, ${input.status === 'paid' ? 'NOW()' : 'NULL'}, ${input.status === 'paid' ? '?' : 'NULL'}, ?, ?, ?, ?)
    `,
    [
      input.dealId,
      input.programId,
      input.developmentId,
      input.referrerId,
      input.commissionAmount,
      input.status,
      input.approvedBy,
      ...(input.status === 'paid' ? [input.approvedBy] : []),
      `LOCAL-DEMO-PAYOUT-${input.dealId}`,
      LOCAL_DEMO_DESCRIPTION,
      input.approvedBy,
      input.approvedBy,
    ],
  );
}

async function seedDemoData(connection: mysql.Connection) {
  await resetDemoData(connection);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const agencyResult = await execute(
    connection,
    `
      INSERT INTO agencies
        (name, slug, description, website, email, phone, address, city, province, subscriptionPlan, subscriptionStatus, isVerified)
      VALUES
        ('[LOCAL DEMO] Referral Agency', 'local-demo-referral-agency', ?, 'http://localhost:3009', 'agent@listify.local', '+27000000000', 'Local demo only', 'Johannesburg', 'Gauteng', 'professional', 'active', 1)
    `,
    [LOCAL_DEMO_DESCRIPTION],
  );
  const agencyId = Number(agencyResult.insertId);

  const adminId = await insertUser(connection, {
    email: 'admin@listify.local',
    name: '[LOCAL DEMO] Super Admin',
    firstName: 'Local',
    lastName: 'Admin',
    role: 'super_admin',
    passwordHash,
  });
  const developerUserId = await insertUser(connection, {
    email: 'developer@listify.local',
    name: '[LOCAL DEMO] Developer Manager',
    firstName: 'Local',
    lastName: 'Developer',
    role: 'property_developer',
    passwordHash,
  });
  const agentId = await insertUser(connection, {
    email: 'agent@listify.local',
    name: '[LOCAL DEMO] Agency Agent',
    firstName: 'Local',
    lastName: 'Agent',
    role: 'agent',
    passwordHash,
    agencyId,
  });
  const referrerId = await insertUser(connection, {
    email: 'referrer@listify.local',
    name: '[LOCAL DEMO] Workclass Referrer',
    firstName: 'Local',
    lastName: 'Referrer',
    role: 'visitor',
    passwordHash,
  });
  await insertUser(connection, {
    email: 'buyer@listify.local',
    name: '[LOCAL DEMO] Buyer User',
    firstName: 'Local',
    lastName: 'Buyer',
    role: 'visitor',
    passwordHash,
  });

  await execute(
    connection,
    "INSERT INTO distribution_identities (user_id, identity_type, active, display_name) VALUES (?, 'referrer', 1, '[LOCAL DEMO] Workclass Referrer')",
    [referrerId],
  );
  await execute(
    connection,
    "INSERT INTO distribution_identities (user_id, identity_type, active, display_name) VALUES (?, 'referrer', 1, '[LOCAL DEMO] Agency Agent')",
    [agentId],
  );
  await execute(
    connection,
    "INSERT INTO distribution_identities (user_id, identity_type, active, display_name) VALUES (?, 'manager', 1, '[LOCAL DEMO] Developer Manager')",
    [developerUserId],
  );

  const developerResult = await execute(
    connection,
    `
      INSERT INTO developers
        (name, description, website, email, phone, address, city, province, category, establishedYear, isVerified, userId, status, approvedBy, approvedAt, completedProjects, currentProjects, upcomingProjects, specializations, slug, is_trusted)
      VALUES
        ('[LOCAL DEMO] Ubuntu Homes Developer', ?, 'http://localhost:3009', 'developer@listify.local', '+27000000000', 'Local demo only', 'Johannesburg', 'Gauteng', 'residential', 2020, 1, ?, 'approved', ?, NOW(), 2, 3, 1, ?, 'local-demo-ubuntu-homes-developer', 1)
    `,
    [LOCAL_DEMO_DESCRIPTION, developerUserId, adminId, json(['affordable_housing', 'family_estates'])],
  );
  const developerId = Number(developerResult.insertId);

  const brandResult = await execute(
    connection,
    `
      INSERT INTO developer_brand_profiles
        (brand_name, slug, about, head_office_location, operating_provinces, property_focus, website_url, public_contact_email, brand_tier, source_attribution, profile_type, is_subscriber, is_claimable, is_visible, is_contact_verified, linked_developer_account_id, owner_type, created_by, identity_type, seed_batch_id)
      VALUES
        ('[LOCAL DEMO] Ubuntu Homes', 'local-demo-ubuntu-homes', ?, 'Johannesburg', ?, ?, 'http://localhost:3009', 'developer@listify.local', 'regional', 'local-demo-seed', 'verified_partner', 1, 0, 1, 1, ?, 'developer', ?, 'developer', 'local-demo-distribution')
    `,
    [
      `${LOCAL_DEMO_DESCRIPTION} Brand profile for local distribution referral testing.`,
      json(['Gauteng']),
      json(['Residential', 'First-time buyer']),
      developerId,
      adminId,
    ],
  );
  const brandProfileId = Number(brandResult.insertId);

  const readyDevelopmentId = await insertDevelopment(connection, {
    developerId,
    brandProfileId,
    name: '[LOCAL DEMO] Hillside Gardens',
    slug: 'local-demo-hillside-gardens',
    city: 'Johannesburg',
    suburb: 'Midrand',
    priceFrom: 950000,
    priceTo: 1850000,
    readinessScore: 96,
    approvalStatus: 'approved',
    status: 'selling',
  });
  const pendingDevelopmentId = await insertDevelopment(connection, {
    developerId,
    brandProfileId,
    name: '[LOCAL DEMO] River Quarter',
    slug: 'local-demo-river-quarter',
    city: 'Pretoria',
    suburb: 'Menlyn',
    priceFrom: 1250000,
    priceTo: 2400000,
    readinessScore: 42,
    approvalStatus: 'pending',
    status: 'launching-soon',
  });
  const blockedDevelopmentId = await insertDevelopment(connection, {
    developerId,
    brandProfileId,
    name: '[LOCAL DEMO] Mandate Locked Estate',
    slug: 'local-demo-mandate-locked-estate',
    city: 'Johannesburg',
    suburb: 'Fourways',
    priceFrom: 1750000,
    priceTo: 3200000,
    readinessScore: 88,
    approvalStatus: 'approved',
    status: 'selling',
  });

  const readyProgramId = await insertProgram(connection, {
    developmentId: readyDevelopmentId,
    active: true,
    referralsEnabled: true,
    commissionValue: 24000,
  });
  await insertProgram(connection, {
    developmentId: pendingDevelopmentId,
    active: false,
    referralsEnabled: true,
    commissionValue: 18000,
  });
  await insertProgram(connection, {
    developmentId: blockedDevelopmentId,
    active: true,
    referralsEnabled: true,
    commissionValue: 30000,
  });

  const readyDocumentIds = await insertRequiredDocuments(connection, readyDevelopmentId);
  await insertRequiredDocuments(connection, blockedDevelopmentId);

  await execute(
    connection,
    `
      INSERT INTO development_manager_assignments
        (development_id, manager_user_id, is_primary, workload_capacity, timezone, is_active)
      VALUES
        (?, ?, 1, 50, 'Africa/Johannesburg', 1),
        (?, ?, 1, 50, 'Africa/Johannesburg', 1)
    `,
    [readyDevelopmentId, developerUserId, blockedDevelopmentId, developerUserId],
  );

  const partnershipResult = await execute(
    connection,
    `
      INSERT INTO distribution_brand_partnerships
        (brand_profile_id, status, channel_scope, partnered_at, notes, onboarding_defaults_json, created_by, updated_by)
      VALUES
        (?, 'active', ?, NOW(), ?, ?, ?, ?)
    `,
    [
      brandProfileId,
      json(['open_referrer', 'agency_agent']),
      `${LOCAL_DEMO_DESCRIPTION} Active brand partnership for local demo scenarios.`,
      json({ localDemo: true, preferredCopy: 'buyer-first' }),
      adminId,
      adminId,
    ],
  );
  const partnershipId = Number(partnershipResult.insertId);

  await execute(
    connection,
    `
      INSERT INTO distribution_development_access
        (development_id, brand_partnership_id, brand_profile_id, status, submission_allowed, excluded_by_mandate, excluded_by_exclusivity, visibility_scope, reason_code, notes, included_at, created_by, updated_by)
      VALUES
        (?, ?, ?, 'included', 1, 0, 0, ?, NULL, ?, NOW(), ?, ?),
        (?, ?, ?, 'listed', 0, 0, 0, ?, 'PENDING_SETUP', ?, NULL, ?, ?),
        (?, ?, ?, 'excluded', 0, 1, 0, ?, 'MANDATE_EXCLUSION', ?, NULL, ?, ?)
    `,
    [
      readyDevelopmentId,
      partnershipId,
      brandProfileId,
      json(['referrer', 'agent']),
      `${LOCAL_DEMO_DESCRIPTION} Submit-ready opportunity.`,
      adminId,
      adminId,
      pendingDevelopmentId,
      partnershipId,
      brandProfileId,
      json(['explore']),
      `${LOCAL_DEMO_DESCRIPTION} Coming soon: setup is incomplete.`,
      adminId,
      adminId,
      blockedDevelopmentId,
      partnershipId,
      brandProfileId,
      json(['explore']),
      `${LOCAL_DEMO_DESCRIPTION} Blocked by mandate/exclusivity logic.`,
      adminId,
      adminId,
    ],
  );

  const submittedDealId = await insertDeal(connection, {
    programId: readyProgramId,
    developmentId: readyDevelopmentId,
    referrerId,
    managerUserId: developerUserId,
    externalRef: 'LOCAL-DEMO-SUBMITTED',
    buyerName: '[LOCAL DEMO] Submitted Buyer',
    buyerEmail: 'submitted-buyer@listify.local',
    buyerPhone: '+27000000001',
    currentStage: 'viewing_scheduled',
    status: 'submitted',
    commissionStatus: 'not_ready',
    dealAmount: 1250000,
    commissionAmount: 24000,
  });
  await insertDealDocuments(connection, submittedDealId, readyDocumentIds, ['pending'], referrerId);
  await insertDealEvent(connection, submittedDealId, referrerId, 'Buyer submitted and awaiting review.', 'viewing_scheduled');

  const actionDealId = await insertDeal(connection, {
    programId: readyProgramId,
    developmentId: readyDevelopmentId,
    referrerId,
    managerUserId: developerUserId,
    externalRef: 'LOCAL-DEMO-NEEDS-ACTION',
    buyerName: '[LOCAL DEMO] Needs Action Buyer',
    buyerEmail: 'needs-action-buyer@listify.local',
    buyerPhone: '+27000000002',
    currentStage: 'application_submitted',
    status: 'docs_pending',
    commissionStatus: 'not_ready',
    dealAmount: 1425000,
    commissionAmount: 24000,
  });
  await insertDealDocuments(
    connection,
    actionDealId,
    readyDocumentIds,
    ['verified', 'received', 'pending', 'pending'],
    referrerId,
  );
  await insertDealEvent(connection, actionDealId, developerUserId, 'Two buyer documents still need action.', 'application_submitted');

  const payoutDealId = await insertDeal(connection, {
    programId: readyProgramId,
    developmentId: readyDevelopmentId,
    referrerId,
    managerUserId: developerUserId,
    externalRef: 'LOCAL-DEMO-PAYOUT-PROGRESS',
    buyerName: '[LOCAL DEMO] Payout Progress Buyer',
    buyerEmail: 'payout-progress-buyer@listify.local',
    buyerPhone: '+27000000003',
    currentStage: 'commission_pending',
    status: 'payout_ready',
    commissionStatus: 'approved',
    dealAmount: 1600000,
    commissionAmount: 24000,
  });
  await insertDealDocuments(
    connection,
    payoutDealId,
    readyDocumentIds,
    ['verified', 'verified', 'verified', 'verified'],
    referrerId,
  );
  await insertDealEvent(connection, payoutDealId, developerUserId, 'Reward approved and waiting for payout processing.', 'commission_pending');
  await insertCommissionEntry(connection, {
    dealId: payoutDealId,
    programId: readyProgramId,
    developmentId: readyDevelopmentId,
    referrerId,
    commissionAmount: 24000,
    status: 'approved',
    approvedBy: developerUserId,
  });

  // Give the agency agent one submitted referral too, so both agency and open-referrer accounts have data.
  const agentDealId = await insertDeal(connection, {
    programId: readyProgramId,
    developmentId: readyDevelopmentId,
    referrerId: agentId,
    managerUserId: developerUserId,
    externalRef: 'LOCAL-DEMO-AGENT-SUBMITTED',
    buyerName: '[LOCAL DEMO] Agent Buyer',
    buyerEmail: 'agent-buyer@listify.local',
    buyerPhone: '+27000000004',
    currentStage: 'viewing_completed',
    status: 'in_review',
    commissionStatus: 'not_ready',
    dealAmount: 1350000,
    commissionAmount: 24000,
  });
  await insertDealDocuments(connection, agentDealId, readyDocumentIds, ['received', 'pending'], agentId);
  await insertDealEvent(connection, agentDealId, agentId, 'Agency referral created for local demo testing.', 'viewing_completed');

  console.log('');
  console.log('Local demo seed complete.');
  console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
  console.log('Accounts:');
  for (const email of DEMO_EMAILS) console.log(`- ${email}`);
  console.log('');
  console.log('Demo developments:');
  console.log('- [LOCAL DEMO] Hillside Gardens: submit-ready');
  console.log('- [LOCAL DEMO] River Quarter: pending setup / explore only');
  console.log('- [LOCAL DEMO] Mandate Locked Estate: blocked');
}

async function main() {
  const action = (process.argv[2] || 'seed') as SeedAction;
  const target = (process.argv[3] || (process.env.NODE_ENV === 'test' ? 'test' : 'local')) as SeedTarget;

  if (!['seed', 'reset'].includes(action)) {
    throw new Error('Usage: tsx server/scripts/localDemoSeed.ts <seed|reset> <local|test>');
  }
  if (!['local', 'test'].includes(target)) {
    throw new Error('Usage: tsx server/scripts/localDemoSeed.ts <seed|reset> <local|test>');
  }

  loadEnvForTarget(target);
  const parsedUrl = assertLocalSeedSafety(process.env, { target });
  const connection = await mysql.createConnection(parsedUrl.toString());

  try {
    await connection.beginTransaction();
    if (action === 'reset') {
      await resetDemoData(connection);
      console.log(`Local demo data reset from ${target} database.`);
    } else {
      await seedDemoData(connection);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/localDemoSeed.ts')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
