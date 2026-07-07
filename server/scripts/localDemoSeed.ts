import path from 'node:path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

type EnvLike = Record<string, string | undefined>;
type SeedAction = 'seed' | 'reset';
type SeedTarget = 'local' | 'test';

export const DEMO_EMAILS = [
  'admin@listify.local',
  'agency@listify.local',
  'developer@listify.local',
  'agent@listify.local',
  'referrer@listify.local',
  'buyer@listify.local',
] as const;
export const DEMO_DEVELOPMENT_SLUGS = [
  'local-demo-hillside-gardens',
  'local-demo-river-quarter',
  'local-demo-mandate-locked-estate',
] as const;
export const DEMO_DEAL_EXTERNAL_REFS = [
  'LOCAL-DEMO-SUBMITTED',
  'LOCAL-DEMO-NEEDS-ACTION',
  'LOCAL-DEMO-PAYOUT-PROGRESS',
  'LOCAL-DEMO-AGENT-SUBMITTED',
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

export function getLocalDemoCredentials(env: EnvLike = process.env): {
  password: string;
  passwordSource: 'environment';
} {
  const nodeEnv = String(env.NODE_ENV || '').toLowerCase();
  const appEnv = String(env.APP_ENV || '').toLowerCase();

  if (nodeEnv === 'production' || appEnv === 'production') {
    throw new Error('Local demo credentials refused: production runtime detected.');
  }

  const envPassword = env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!envPassword) {
    throw new Error(
      'Local demo credentials refused: LOCAL_DEMO_AGENCY_PASSWORD is required.',
    );
  }

  if (envPassword.length < 8) {
    throw new Error('Local demo credentials refused: password must be at least 8 characters.');
  }

  return {
    password: envPassword,
    passwordSource: 'environment',
  };
}

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

async function columnExists(connection: mysql.Connection, table: string, column: string) {
  const [row] = await queryRows<{ count: number }>(
    connection,
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [table, column],
  );
  return Number(row?.count || 0) > 0;
}

async function tableExists(connection: mysql.Connection, table: string) {
  const [row] = await queryRows<{ count: number }>(
    connection,
    `
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [table],
  );
  return Number(row?.count || 0) > 0;
}

async function idsFor(
  connection: mysql.Connection,
  sql: string,
  params: unknown[] = [],
): Promise<number[]> {
  const rows = await queryRows<{ id: number }>(connection, sql, params);
  return rows.map(row => Number(row.id)).filter(Number.isFinite);
}

async function deleteByIds(
  connection: mysql.Connection,
  table: string,
  column: string,
  ids: number[],
) {
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
  const demoAgentProfileIds =
    demoUserIds.length || demoAgencyIds.length
      ? await idsFor(
          connection,
          `
            SELECT id FROM agents
            WHERE ${[
              demoUserIds.length ? `userId IN (${placeholders(demoUserIds)})` : '',
              demoAgencyIds.length ? `agencyId IN (${placeholders(demoAgencyIds)})` : '',
              "email LIKE '%@listify.local'",
            ]
              .filter(Boolean)
              .join(' OR ')}
          `,
          [...demoUserIds, ...demoAgencyIds],
        )
      : await idsFor(connection, "SELECT id FROM agents WHERE email LIKE '%@listify.local'");
  const demoListingIds = await idsFor(
    connection,
    "SELECT id FROM listings WHERE slug LIKE 'local-demo-agency-%' OR title LIKE '[LOCAL DEMO] Agency%' OR title LIKE '[LOCAL DEMO] Boundary%'",
  );
  const demoPropertyIds = await idsFor(
    connection,
    demoListingIds.length
      ? `SELECT id FROM properties WHERE title LIKE '[LOCAL DEMO] Agency%' OR sourceListingId IN (${placeholders(demoListingIds)})`
      : "SELECT id FROM properties WHERE title LIKE '[LOCAL DEMO] Agency%'",
    demoListingIds,
  );
  const demoLeadIds = await idsFor(
    connection,
    "SELECT id FROM leads WHERE email LIKE '%@listify.local' OR name LIKE '[LOCAL DEMO]%'",
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

  await deleteByIds(
    connection,
    'distribution_commission_ledger',
    'distribution_deal_id',
    demoDealIds,
  );
  await deleteByIds(connection, 'distribution_commission_entries', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deal_bank_outcomes', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_viewing_validations', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_viewings', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deal_documents', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deal_events', 'deal_id', demoDealIds);
  await deleteByIds(connection, 'distribution_deals', 'id', demoDealIds);

  await deleteByIds(
    connection,
    'development_required_documents',
    'development_id',
    demoDevelopmentIds,
  );
  await deleteByIds(
    connection,
    'development_manager_assignments',
    'development_id',
    demoDevelopmentIds,
  );
  await deleteByIds(
    connection,
    'distribution_development_access',
    'development_id',
    demoDevelopmentIds,
  );
  await deleteByIds(connection, 'distribution_program_workflow_steps', 'workflow_id', []);
  await deleteByIds(connection, 'distribution_programs', 'development_id', demoDevelopmentIds);
  await deleteByIds(connection, 'developments', 'id', demoDevelopmentIds);

  await deleteByIds(
    connection,
    'distribution_brand_partnerships',
    'brand_profile_id',
    demoBrandIds,
  );
  await deleteByIds(connection, 'developer_brand_profiles', 'id', demoBrandIds);
  await deleteByIds(connection, 'developers', 'id', demoDeveloperIds);
  await deleteByIds(connection, 'commissions', 'leadId', demoLeadIds);
  await deleteByIds(connection, 'commissions', 'propertyId', demoPropertyIds);
  await deleteByIds(connection, 'commissions', 'agentId', demoAgentProfileIds);
  await deleteByIds(connection, 'lead_activities', 'leadId', demoLeadIds);
  await deleteByIds(connection, 'leads', 'id', demoLeadIds);
  await deleteByIds(connection, 'listing_viewings', 'listingId', demoListingIds);
  await deleteByIds(connection, 'listing_leads', 'listingId', demoListingIds);
  await deleteByIds(connection, 'listing_approval_queue', 'listingId', demoListingIds);
  await deleteByIds(connection, 'listing_analytics', 'listingId', demoListingIds);
  await deleteByIds(connection, 'listing_media', 'listingId', demoListingIds);
  await deleteByIds(connection, 'properties', 'id', demoPropertyIds);
  await deleteByIds(connection, 'listings', 'id', demoListingIds);
  await deleteByIds(connection, 'agents', 'id', demoAgentProfileIds);
  await deleteByIds(connection, 'agency_branding', 'agencyId', demoAgencyIds);
  if (demoAgencyIds.length && (await tableExists(connection, 'subscriptions'))) {
    await execute(
      connection,
      `DELETE FROM subscriptions WHERE owner_type = 'agency' AND owner_id IN (${placeholders(demoAgencyIds)})`,
      demoAgencyIds,
    );
  }
  if (demoAgencyIds.length && (await tableExists(connection, 'agency_subscriptions'))) {
    await execute(
      connection,
      `DELETE FROM agency_subscriptions WHERE agencyId IN (${placeholders(demoAgencyIds)})`,
      demoAgencyIds,
    );
  }
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
    isSubaccount?: number;
  },
) {
  const result = await execute(
    connection,
    `
      INSERT INTO users
        (openId, email, passwordHash, name, firstName, lastName, phone, loginMethod, emailVerified, role, agencyId, isSubaccount, lastSignedIn, onboarding_complete, onboarding_step, subscription_tier, subscription_status)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 'email', 1, ?, ?, ?, NOW(), 1, 0, 'professional', 'active')
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
      input.isSubaccount ?? 0,
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

async function insertAgencyProperty(
  connection: mysql.Connection,
  input: {
    agentProfileId: number;
    ownerUserId: number;
    title: string;
    status: 'available' | 'pending' | 'sold' | 'draft';
    price: number;
    city: string;
    createdSql: string;
    enquiries: number;
    views: number;
  },
) {
  const result = await execute(
    connection,
    `
      INSERT INTO properties
        (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, amenities, status, featured, views, enquiries, agentId, ownerId, createdAt, updatedAt)
      VALUES
        (?, ?, 'apartment', 'sale', 'sale', ?, 2, 2, 84, ?, ?, 'Gauteng', ?, ?, 0, ?, ?, ?, ?, ${input.createdSql}, NOW())
    `,
    [
      input.title,
      `${LOCAL_DEMO_DESCRIPTION} Agency dashboard seed listing.`,
      input.price,
      `Local demo address, ${input.city}`,
      input.city,
      json(['parking', 'security', 'fibre']),
      input.status,
      input.views,
      input.enquiries,
      input.agentProfileId,
      input.ownerUserId,
    ],
  );
  return Number(result.insertId);
}

async function insertCanonicalListing(
  connection: mysql.Connection,
  input: {
    ownerUserId: number;
    agentProfileId?: number | null;
    agencyId?: number | null;
    action?: 'sell' | 'rent' | 'auction';
    propertyType?: 'apartment' | 'house' | 'farm' | 'land' | 'commercial' | 'shared_living';
    title: string;
    slug: string;
    status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    readinessScore: number;
    qualityScore: number;
    price?: number;
    city: string;
    suburb: string;
    createdSql: string;
    updatedSql: string;
    publishedSql?: string;
    archivedSql?: string;
    reviewedBy?: number | null;
    reviewedSql?: string;
    rejectionReason?: string | null;
    rejectionReasons?: string[] | null;
    rejectionNote?: string | null;
  },
) {
  const action = input.action || 'sell';
  const price = input.price ?? 1450000;
  const askingPrice = action === 'sell' ? price : null;
  const monthlyRent = action === 'rent' ? price : null;
  const startingBid = action === 'auction' ? price : null;
  const result = await execute(
    connection,
    `
      INSERT INTO listings
        (ownerId, agentId, agencyId, action, propertyType, title, description, askingPrice, monthlyRent, startingBid, propertyDetails, address, latitude, longitude, city, suburb, province, postalCode, placeId, status, approvalStatus, reviewedBy, reviewedAt, rejectionReason, rejection_reasons, rejection_note, slug, readiness_score, quality_score, featured, createdAt, updatedAt, publishedAt, archivedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '-26.1041000', '28.0473000', ?, ?, 'Gauteng', '0001', ?, ?, ?, ?, ${input.reviewedSql || 'NULL'}, ?, ?, ?, ?, ?, ?, 0, ${input.createdSql}, ${input.updatedSql}, ${input.publishedSql || 'NULL'}, ${input.archivedSql || 'NULL'})
    `,
    [
      input.ownerUserId,
      input.agentProfileId ?? null,
      input.agencyId ?? null,
      action,
      input.propertyType || 'apartment',
      input.title,
      `${LOCAL_DEMO_DESCRIPTION} Canonical agency listing fixture.`,
      askingPrice,
      monthlyRent,
      startingBid,
      json({
        bedrooms: input.propertyType === 'land' ? 0 : 2,
        bathrooms: input.propertyType === 'land' ? 0 : 2,
        houseAreaM2: input.propertyType === 'land' ? 0 : 98,
        amenities: ['parking', 'security', 'fibre'],
      }),
      `Local demo canonical address, ${input.suburb}`,
      input.city,
      input.suburb,
      `local-demo-place-${input.slug}`,
      input.status,
      input.approvalStatus || (input.status === 'rejected' ? 'rejected' : input.status === 'published' ? 'approved' : 'pending'),
      input.reviewedBy ?? null,
      input.rejectionReason ?? null,
      input.rejectionReasons ? json(input.rejectionReasons) : null,
      input.rejectionNote ?? null,
      input.slug,
      input.readinessScore,
      input.qualityScore,
    ],
  );
  return Number(result.insertId);
}

async function insertListingMedia(
  connection: mysql.Connection,
  listingId: number,
  count: number,
) {
  for (let index = 0; index < count; index += 1) {
    await execute(
      connection,
      `
        INSERT INTO listing_media
          (listingId, mediaType, originalUrl, processedUrl, thumbnailUrl, originalFileName, originalFileSize, width, height, displayOrder, isPrimary, processingStatus, createdAt, uploadedAt, processedAt)
        VALUES
          (?, 'image', ?, ?, ?, ?, 240000, 1600, 1067, ?, ?, 'completed', NOW(), NOW(), NOW())
      `,
      [
        listingId,
        `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80&localDemo=${listingId}-${index}`,
        `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80&localDemo=${listingId}-${index}`,
        `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=320&q=80&localDemo=${listingId}-${index}`,
        `local-demo-listing-${listingId}-${index + 1}.jpg`,
        index,
        index === 0 ? 1 : 0,
      ],
    );
  }
}

async function insertListingAnalytics(
  connection: mysql.Connection,
  input: {
    listingId: number;
    totalViews: number;
    totalLeads: number;
  },
) {
  const conversionRate =
    input.totalViews > 0 ? ((input.totalLeads / input.totalViews) * 100).toFixed(2) : '0';
  await execute(
    connection,
    `
      INSERT INTO listing_analytics
        (listingId, totalViews, uniqueVisitors, viewsByDay, totalLeads, contactFormLeads, whatsappClicks, phoneReveals, bookingViewingRequests, totalFavorites, totalShares, conversionRate, leadConversionRate, trafficSources, lastUpdated, createdAt)
      VALUES
        (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, ?, ?, ?, NOW(), NOW())
    `,
    [
      input.listingId,
      input.totalViews,
      Math.max(0, input.totalViews - 3),
      json({ today: input.totalViews }),
      input.totalLeads,
      input.totalLeads,
      input.totalLeads,
      conversionRate,
      conversionRate,
      json({ local_demo: input.totalViews }),
    ],
  );
}

async function insertPublicListingMirror(
  connection: mysql.Connection,
  input: {
    listingId: number;
    ownerUserId: number;
    agentProfileId?: number | null;
    title: string;
    action?: 'sell' | 'rent' | 'auction';
    propertyType?: 'apartment' | 'house' | 'farm' | 'land' | 'commercial' | 'shared_living';
    status: 'available' | 'published' | 'archived';
    price: number;
    city: string;
    suburb: string;
    views: number;
    enquiries: number;
    updatedSql: string;
  },
) {
  const action = input.action || 'sell';
  const listingType = action === 'sell' ? 'sale' : action === 'rent' ? 'rent' : 'auction';
  const result = await execute(
    connection,
    `
      INSERT INTO properties
        (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, amenities, status, featured, views, enquiries, agentId, ownerId, sourceListingId, propertySettings, mainImage, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, 2, 2, 98, ?, ?, 'Gauteng', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ${input.updatedSql}, ${input.updatedSql})
    `,
    [
      input.title,
      `${LOCAL_DEMO_DESCRIPTION} Public mirror for canonical agency listing fixture.`,
      input.propertyType || 'apartment',
      listingType,
      listingType,
      input.price,
      `Local demo canonical address, ${input.suburb}`,
      input.city,
      json(['parking', 'security', 'fibre']),
      input.status,
      input.views,
      input.enquiries,
      input.agentProfileId ?? null,
      input.ownerUserId,
      input.listingId,
      json({ localDemo: true }),
      `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80&localDemo=mirror-${input.listingId}`,
    ],
  );
  return Number(result.insertId);
}

async function insertListingApprovalEvent(
  connection: mysql.Connection,
  input: {
    listingId: number;
    submittedBy: number;
    status: 'pending' | 'approved' | 'rejected';
    priority?: 'normal' | 'high';
    reviewedBy?: number | null;
    submittedSql: string;
    reviewedSql?: string;
    reviewNotes?: string | null;
    rejectionReason?: string | null;
  },
) {
  await execute(
    connection,
    `
      INSERT INTO listing_approval_queue
        (listingId, submittedBy, submittedAt, status, priority, reviewedBy, reviewedAt, reviewNotes, rejectionReason, createdAt, updatedAt)
      VALUES
        (?, ?, ${input.submittedSql}, ?, ?, ?, ${input.reviewedSql || 'NULL'}, ?, ?, ${input.submittedSql}, NOW())
    `,
    [
      input.listingId,
      input.submittedBy,
      input.status,
      input.priority || 'normal',
      input.reviewedBy ?? null,
      input.reviewNotes ?? null,
      input.rejectionReason ?? null,
    ],
  );
}

async function seedAgencyDashboardData(
  connection: mysql.Connection,
  input: {
    agencyId: number;
    agencyAdminId: number;
    agentUserId: number;
    approvedBy: number;
  },
) {
  const agentProfileResult = await execute(
    connection,
    `
      INSERT INTO agents
        (userId, agencyId, firstName, lastName, displayName, bio, phone, email, role, licenseNumber, yearsExperience, areasServed, languages, rating, reviewCount, totalSales, isVerified, isFeatured, status, approvedBy, approvedAt, slug, focus, propertyTypes, profileCompletionScore)
      VALUES
        (?, ?, 'Local', 'Agent', '[LOCAL DEMO] Agency Agent', ?, '+27000000000', 'agent@listify.local', 'agent', 'LOCAL-DEMO-FFC', 7, ?, ?, 47, 18, 4, 1, 0, 'approved', ?, NOW(), 'local-demo-agency-agent', 'both', ?, 92)
    `,
    [
      input.agentUserId,
      input.agencyId,
      `${LOCAL_DEMO_DESCRIPTION} Approved local demo agent for agency dashboard testing.`,
      json(['Midrand', 'Sandton', 'Fourways']),
      json(['English', 'isiZulu', 'Afrikaans']),
      input.approvedBy,
      json(['Apartment', 'Townhouse', 'House']),
    ],
  );
  const agentProfileId = Number(agentProfileResult.insertId);

  const inactiveAgentResult = await execute(
    connection,
    `
      INSERT INTO agents
        (userId, agencyId, firstName, lastName, displayName, bio, phone, email, role, licenseNumber, yearsExperience, areasServed, languages, rating, reviewCount, totalSales, isVerified, isFeatured, status, approvedBy, approvedAt, slug, focus, propertyTypes, profileCompletionScore)
      VALUES
        (NULL, ?, 'Inactive', 'Agent', '[LOCAL DEMO] Inactive Agency Agent', ?, '+27000000008', 'inactive-agent@listify.local', 'agent', 'LOCAL-DEMO-INACTIVE', 5, ?, ?, 39, 3, 1, 1, 0, 'suspended', ?, NOW(), 'local-demo-inactive-agency-agent', 'sales', ?, 70)
    `,
    [
      input.agencyId,
      `${LOCAL_DEMO_DESCRIPTION} Suspended same-agency agent for reassignment testing.`,
      json(['Sandton']),
      json(['English']),
      input.approvedBy,
      json(['Apartment']),
    ],
  );
  const inactiveAgentProfileId = Number(inactiveAgentResult.insertId);

  const activePropertyId = await insertAgencyProperty(connection, {
    agentProfileId,
    ownerUserId: input.agentUserId,
    title: '[LOCAL DEMO] Agency Sandton Apartment',
    status: 'available',
    price: 1450000,
    city: 'Sandton',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 6 DAY)',
    enquiries: 14,
    views: 426,
  });
  const pendingPropertyId = await insertAgencyProperty(connection, {
    agentProfileId,
    ownerUserId: input.agentUserId,
    title: '[LOCAL DEMO] Agency Midrand Townhouse',
    status: 'pending',
    price: 1785000,
    city: 'Midrand',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 2 DAY)',
    enquiries: 0,
    views: 37,
  });
  const stalePropertyId = await insertAgencyProperty(connection, {
    agentProfileId,
    ownerUserId: input.agentUserId,
    title: '[LOCAL DEMO] Agency Fourways Loft',
    status: 'available',
    price: 1195000,
    city: 'Fourways',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 28 DAY)',
    enquiries: 2,
    views: 188,
  });
  const soldPropertyId = await insertAgencyProperty(connection, {
    agentProfileId,
    ownerUserId: input.agentUserId,
    title: '[LOCAL DEMO] Agency Rosebank Studio',
    status: 'sold',
    price: 980000,
    city: 'Rosebank',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 42 DAY)',
    enquiries: 7,
    views: 219,
  });

  const leadResult = await execute(
    connection,
    `
      INSERT INTO leads
        (propertyId, agencyId, agentId, name, email, phone, message, leadType, status, source, createdAt, updatedAt, lastContactedAt, qualification_status, qualification_score, lead_source, funnel_stage)
      VALUES
        (?, ?, NULL, '[LOCAL DEMO] New Buyer', 'agency-new-buyer@listify.local', '+27000001001', 'Interested in a viewing this week.', 'viewing_request', 'new', 'property_page', DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(), NULL, 'pending', 52, 'property_page', 'interest'),
        (?, ?, ?, '[LOCAL DEMO] Qualified Buyer', 'agency-qualified-buyer@listify.local', '+27000001002', 'Pre-approved and comparing Sandton apartments.', 'inquiry', 'qualified', 'explore', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 1 DAY), 'qualified', 84, 'explore', 'qualification'),
        (?, ?, ?, '[LOCAL DEMO] Viewing Prospect', 'agency-viewing@listify.local', '+27000001003', 'Viewing confirmed for Saturday morning.', 'viewing_request', 'viewing_scheduled', 'whatsapp', DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 1 DAY), 'partially_qualified', 71, 'whatsapp', 'viewing'),
        (?, ?, ?, '[LOCAL DEMO] Offer Prospect', 'agency-offer@listify.local', '+27000001004', 'Offer documents are being prepared.', 'offer', 'offer_sent', 'agent_referral', DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY), 'qualified', 91, 'agent_referral', 'offer'),
        (?, ?, ?, '[LOCAL DEMO] Closed Buyer', 'agency-closed@listify.local', '+27000001005', 'Closed demo transaction.', 'offer', 'closed', 'property_page', DATE_SUB(NOW(), INTERVAL 18 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 8 DAY), 'qualified', 95, 'property_page', 'sale')
    `,
    [
      activePropertyId,
      input.agencyId,
      activePropertyId,
      input.agencyId,
      agentProfileId,
      pendingPropertyId,
      input.agencyId,
      agentProfileId,
      stalePropertyId,
      input.agencyId,
      agentProfileId,
      soldPropertyId,
      input.agencyId,
      agentProfileId,
    ],
  );
  const firstLeadId = Number(leadResult.insertId);

  const otherAgencyResult = await execute(
    connection,
    `
      INSERT INTO agencies
        (name, slug, description, website, email, phone, address, city, province, subscriptionPlan, subscriptionStatus, isVerified)
      VALUES
        ('[LOCAL DEMO] Other Agency', 'local-demo-other-agency', ?, 'http://localhost:3009', 'other-agency@listify.local', '+27000000001', 'Local demo only', 'Pretoria', 'Gauteng', 'professional', 'active', 1)
    `,
    [`${LOCAL_DEMO_DESCRIPTION} Boundary fixture for cross-agency protection testing.`],
  );
  const otherAgencyId = Number(otherAgencyResult.insertId);

  const otherAgentResult = await execute(
    connection,
    `
      INSERT INTO agents
        (userId, agencyId, firstName, lastName, displayName, bio, phone, email, role, licenseNumber, yearsExperience, areasServed, languages, rating, reviewCount, totalSales, isVerified, isFeatured, status, approvedBy, approvedAt, slug, focus, propertyTypes, profileCompletionScore)
      VALUES
        (NULL, ?, 'Boundary', 'Agent', '[LOCAL DEMO] Boundary Agent', ?, '+27000000002', 'boundary-agent@listify.local', 'agent', 'LOCAL-DEMO-BOUNDARY', 4, ?, ?, 42, 6, 1, 1, 0, 'approved', ?, NOW(), 'local-demo-boundary-agent', 'sales', ?, 80)
    `,
    [
      otherAgencyId,
      `${LOCAL_DEMO_DESCRIPTION} Belongs to another agency for boundary testing.`,
      json(['Pretoria']),
      json(['English']),
      input.approvedBy,
      json(['Apartment']),
    ],
  );
  const otherAgentProfileId = Number(otherAgentResult.insertId);

  const otherPropertyId = await insertAgencyProperty(connection, {
    agentProfileId: otherAgentProfileId,
    ownerUserId: input.approvedBy,
    title: '[LOCAL DEMO] Agency Boundary Listing',
    status: 'available',
    price: 1325000,
    city: 'Pretoria',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 4 DAY)',
    enquiries: 3,
    views: 88,
  });

  await execute(
    connection,
    `
      INSERT INTO leads
        (propertyId, agencyId, agentId, name, email, phone, message, leadType, status, source, createdAt, updatedAt, lastContactedAt, qualification_status, qualification_score, lead_source, funnel_stage)
      VALUES
        (?, ?, ?, '[LOCAL DEMO] Cross Agency Buyer', 'agency-cross-boundary@listify.local', '+27000001006', 'This lead belongs to another local demo agency.', 'inquiry', 'new', 'property_page', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NULL, 'pending', 48, 'property_page', 'interest'),
        (?, ?, ?, '[LOCAL DEMO] Missing Agent Detail Buyer', 'agency-missing-agent@listify.local', '+27000001007', 'Assigned agent details should be hidden because the agent is outside this agency.', 'inquiry', 'contacted', 'property_page', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 12 HOUR), 'partially_qualified', 66, 'property_page', 'qualification')
    `,
    [
      otherPropertyId,
      otherAgencyId,
      otherAgentProfileId,
      activePropertyId,
      input.agencyId,
      otherAgentProfileId,
    ],
  );

  await insertCanonicalListing(connection, {
    ownerUserId: input.agencyAdminId,
    agentProfileId: null,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Private Draft Loft',
    slug: 'local-demo-agency-private-draft-loft',
    status: 'draft',
    readinessScore: 48,
    qualityScore: 45,
    price: 1180000,
    city: 'Johannesburg',
    suburb: 'Rosebank',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 11 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 3 DAY)',
  });

  const readyListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Ready To Submit Apartment',
    slug: 'local-demo-agency-ready-to-submit-apartment',
    status: 'draft',
    readinessScore: 86,
    qualityScore: 82,
    price: 1495000,
    city: 'Johannesburg',
    suburb: 'Sandton',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 6 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 1 DAY)',
  });
  await insertListingMedia(connection, readyListingId, 3);
  await insertListingAnalytics(connection, { listingId: readyListingId, totalViews: 0, totalLeads: 0 });

  const pendingListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Pending Review Townhouse',
    slug: 'local-demo-agency-pending-review-townhouse',
    status: 'pending_review',
    readinessScore: 94,
    qualityScore: 89,
    price: 1785000,
    city: 'Johannesburg',
    suburb: 'Midrand',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 8 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 2 DAY)',
  });
  await insertListingMedia(connection, pendingListingId, 4);
  await insertListingApprovalEvent(connection, {
    listingId: pendingListingId,
    submittedBy: input.agentUserId,
    status: 'pending',
    priority: 'high',
    submittedSql: 'DATE_SUB(NOW(), INTERVAL 2 DAY)',
  });

  const rejectedListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Rejected Listing',
    slug: 'local-demo-agency-rejected-listing',
    status: 'rejected',
    approvalStatus: 'rejected',
    readinessScore: 82,
    qualityScore: 64,
    price: 1325000,
    city: 'Johannesburg',
    suburb: 'Fourways',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 18 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 5 DAY)',
    reviewedBy: input.approvedBy,
    reviewedSql: 'DATE_SUB(NOW(), INTERVAL 5 DAY)',
    rejectionReason: 'Media quality',
    rejectionReasons: ['Image quality too low', 'Missing proof of mandate'],
    rejectionNote: 'Replace the lead image and attach the mandate before resubmitting.',
  });
  await insertListingMedia(connection, rejectedListingId, 1);
  await insertListingApprovalEvent(connection, {
    listingId: rejectedListingId,
    submittedBy: input.agentUserId,
    status: 'rejected',
    reviewedBy: input.approvedBy,
    submittedSql: 'DATE_SUB(NOW(), INTERVAL 7 DAY)',
    reviewedSql: 'DATE_SUB(NOW(), INTERVAL 5 DAY)',
    reviewNotes: 'Replace the lead image and attach the mandate before resubmitting.',
    rejectionReason: 'Media quality',
  });

  const publishedListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Published Zero Metrics Home',
    slug: 'local-demo-agency-published-zero-metrics-home',
    status: 'published',
    approvalStatus: 'approved',
    readinessScore: 100,
    qualityScore: 92,
    propertyType: 'house',
    price: 2250000,
    city: 'Johannesburg',
    suburb: 'Parkhurst',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 24 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 16 DAY)',
    publishedSql: 'DATE_SUB(NOW(), INTERVAL 16 DAY)',
  });
  await insertListingMedia(connection, publishedListingId, 5);
  await insertPublicListingMirror(connection, {
    listingId: publishedListingId,
    ownerUserId: input.agentUserId,
    agentProfileId,
    title: '[LOCAL DEMO] Agency Published Zero Metrics Home',
    propertyType: 'house',
    status: 'available',
    price: 2250000,
    city: 'Johannesburg',
    suburb: 'Parkhurst',
    views: 0,
    enquiries: 0,
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 16 DAY)',
  });

  const privateEditsListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Live Listing With Private Edits',
    slug: 'local-demo-agency-live-listing-private-edits',
    status: 'pending_review',
    approvalStatus: 'pending',
    readinessScore: 98,
    qualityScore: 90,
    price: 1895000,
    city: 'Johannesburg',
    suburb: 'Bryanston',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 20 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 1 DAY)',
    publishedSql: 'DATE_SUB(NOW(), INTERVAL 14 DAY)',
  });
  await insertListingMedia(connection, privateEditsListingId, 4);
  await insertPublicListingMirror(connection, {
    listingId: privateEditsListingId,
    ownerUserId: input.agentUserId,
    agentProfileId,
    title: '[LOCAL DEMO] Agency Live Listing With Private Edits',
    status: 'available',
    price: 1895000,
    city: 'Johannesburg',
    suburb: 'Bryanston',
    views: 312,
    enquiries: 9,
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 14 DAY)',
  });
  await insertListingApprovalEvent(connection, {
    listingId: privateEditsListingId,
    submittedBy: input.agentUserId,
    status: 'pending',
    priority: 'high',
    submittedSql: 'DATE_SUB(NOW(), INTERVAL 1 DAY)',
  });

  const withdrawnListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Withdrawn Public Listing',
    slug: 'local-demo-agency-withdrawn-public-listing',
    status: 'published',
    approvalStatus: 'approved',
    readinessScore: 100,
    qualityScore: 88,
    propertyType: 'house',
    price: 1650000,
    city: 'Johannesburg',
    suburb: 'Linden',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 36 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 4 DAY)',
    publishedSql: 'DATE_SUB(NOW(), INTERVAL 30 DAY)',
  });
  await insertListingMedia(connection, withdrawnListingId, 3);
  await insertPublicListingMirror(connection, {
    listingId: withdrawnListingId,
    ownerUserId: input.agentUserId,
    agentProfileId,
    title: '[LOCAL DEMO] Agency Withdrawn Public Listing',
    propertyType: 'house',
    status: 'archived',
    price: 1650000,
    city: 'Johannesburg',
    suburb: 'Linden',
    views: 121,
    enquiries: 4,
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 4 DAY)',
  });

  const archivedListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agentUserId,
    agentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Archived Listing',
    slug: 'local-demo-agency-archived-listing',
    status: 'archived',
    approvalStatus: 'approved',
    readinessScore: 100,
    qualityScore: 80,
    price: 980000,
    city: 'Johannesburg',
    suburb: 'Melville',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 44 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 9 DAY)',
    publishedSql: 'DATE_SUB(NOW(), INTERVAL 38 DAY)',
    archivedSql: 'DATE_SUB(NOW(), INTERVAL 9 DAY)',
  });
  await insertListingMedia(connection, archivedListingId, 2);
  await insertPublicListingMirror(connection, {
    listingId: archivedListingId,
    ownerUserId: input.agentUserId,
    agentProfileId,
    title: '[LOCAL DEMO] Agency Archived Listing',
    status: 'archived',
    price: 980000,
    city: 'Johannesburg',
    suburb: 'Melville',
    views: 74,
    enquiries: 1,
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 9 DAY)',
  });

  const inactiveAssignmentListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agencyAdminId,
    agentProfileId: inactiveAgentProfileId,
    agencyId: input.agencyId,
    title: '[LOCAL DEMO] Agency Inactive Agent Assignment',
    slug: 'local-demo-agency-inactive-agent-assignment',
    status: 'draft',
    readinessScore: 80,
    qualityScore: 76,
    price: 1540000,
    city: 'Johannesburg',
    suburb: 'Illovo',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 9 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 2 DAY)',
  });
  await insertListingMedia(connection, inactiveAssignmentListingId, 2);

  const legacyConflictListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.agencyAdminId,
    agentProfileId: otherAgentProfileId,
    agencyId: null,
    title: '[LOCAL DEMO] Agency Legacy Owner Wins Conflict',
    slug: 'local-demo-agency-legacy-owner-wins-conflict',
    status: 'draft',
    readinessScore: 78,
    qualityScore: 72,
    price: 1420000,
    city: 'Johannesburg',
    suburb: 'Northcliff',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 5 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 1 DAY)',
  });
  await insertListingMedia(connection, legacyConflictListingId, 2);

  const boundaryCanonicalListingId = await insertCanonicalListing(connection, {
    ownerUserId: input.approvedBy,
    agentProfileId: otherAgentProfileId,
    agencyId: otherAgencyId,
    title: '[LOCAL DEMO] Boundary Canonical Listing',
    slug: 'local-demo-agency-boundary-canonical-listing',
    status: 'published',
    approvalStatus: 'approved',
    readinessScore: 100,
    qualityScore: 86,
    price: 1325000,
    city: 'Pretoria',
    suburb: 'Menlyn',
    createdSql: 'DATE_SUB(NOW(), INTERVAL 12 DAY)',
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 8 DAY)',
    publishedSql: 'DATE_SUB(NOW(), INTERVAL 8 DAY)',
  });
  await insertListingMedia(connection, boundaryCanonicalListingId, 3);
  await insertPublicListingMirror(connection, {
    listingId: boundaryCanonicalListingId,
    ownerUserId: input.approvedBy,
    agentProfileId: otherAgentProfileId,
    title: '[LOCAL DEMO] Boundary Canonical Listing',
    status: 'available',
    price: 1325000,
    city: 'Pretoria',
    suburb: 'Menlyn',
    views: 88,
    enquiries: 3,
    updatedSql: 'DATE_SUB(NOW(), INTERVAL 8 DAY)',
  });

  await execute(
    connection,
    `
      INSERT INTO commissions
        (agentId, propertyId, leadId, amount, percentage, status, transactionType, description, payoutDate, paymentReference)
      VALUES
        (?, ?, ?, 4200000, 300, 'pending', 'sale', ?, DATE_ADD(NOW(), INTERVAL 14 DAY), 'LOCAL-DEMO-AGENCY-PENDING'),
        (?, ?, ?, 1850000, 250, 'paid', 'sale', ?, DATE_SUB(NOW(), INTERVAL 5 DAY), 'LOCAL-DEMO-AGENCY-PAID')
    `,
    [
      agentProfileId,
      activePropertyId,
      firstLeadId + 3,
      `${LOCAL_DEMO_DESCRIPTION} Pending agency commission.`,
      agentProfileId,
      soldPropertyId,
      firstLeadId + 4,
      `${LOCAL_DEMO_DESCRIPTION} Paid agency commission.`,
    ],
  );

  return { agentProfileId, activePropertyId, pendingPropertyId, stalePropertyId };
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
    {
      code: 'sale_agreement',
      label: 'Developer sale agreement',
      category: 'developer_document',
      isRequired: 1,
      sortOrder: 1,
      fileUrl: 'http://localhost:3009/local-demo-docs/hillside-sale-agreement.pdf',
      fileName: '[LOCAL DEMO] Hillside sale agreement.pdf',
    },
    {
      code: 'custom',
      label: 'Building contract',
      category: 'developer_document',
      isRequired: 1,
      sortOrder: 2,
      fileUrl: 'http://localhost:3009/local-demo-docs/hillside-building-contract.pdf',
      fileName: '[LOCAL DEMO] Hillside building contract.pdf',
    },
    {
      code: 'id_document',
      label: 'Buyer ID document',
      category: 'client_required_document',
      isRequired: 1,
      sortOrder: 3,
      fileUrl: null,
      fileName: null,
    },
    {
      code: 'proof_of_income',
      label: 'Bond buyer: latest payslip or proof of income',
      category: 'client_required_document',
      isRequired: 1,
      sortOrder: 4,
      fileUrl: null,
      fileName: null,
    },
    {
      code: 'bank_statement',
      label: 'Bond or cash buyer: bank statements / proof of funds',
      category: 'client_required_document',
      isRequired: 1,
      sortOrder: 5,
      fileUrl: null,
      fileName: null,
    },
    {
      code: 'pre_approval',
      label: 'Bond buyer: pre-approval or affordability note',
      category: 'client_required_document',
      isRequired: 1,
      sortOrder: 6,
      fileUrl: null,
      fileName: null,
    },
    {
      code: 'custom',
      label: 'Unit / house plans',
      category: 'developer_document',
      isRequired: 0,
      sortOrder: 20,
      fileUrl: 'http://localhost:3009/local-demo-docs/hillside-unit-plans.pdf',
      fileName: '[LOCAL DEMO] Hillside unit plans.pdf',
    },
    {
      code: 'custom',
      label: 'Site map',
      category: 'developer_document',
      isRequired: 0,
      sortOrder: 21,
      fileUrl: 'http://localhost:3009/local-demo-docs/hillside-site-map.pdf',
      fileName: '[LOCAL DEMO] Hillside site map.pdf',
    },
    {
      code: 'custom',
      label: 'Specifications and finishes',
      category: 'developer_document',
      isRequired: 0,
      sortOrder: 22,
      fileUrl: 'http://localhost:3009/local-demo-docs/hillside-specifications.pdf',
      fileName: '[LOCAL DEMO] Hillside specifications.pdf',
    },
  ] as const;

  const ids: number[] = [];
  for (const doc of docs) {
    const result = await execute(
      connection,
      `
        INSERT INTO development_required_documents
          (development_id, document_code, document_label, category, template_file_url, template_file_name, is_required, sort_order, is_active)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        developmentId,
        doc.code,
        doc.label,
        doc.category,
        doc.fileUrl,
        doc.fileName,
        doc.isRequired,
        doc.sortOrder,
      ],
    );
    if (doc.isRequired) {
      ids.push(Number(result.insertId));
    }
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

async function ensureLocalDemoPlan(connection: mysql.Connection) {
  const hasSegment = await columnExists(connection, 'plans', 'segment');
  const hasPriceMonthly = await columnExists(connection, 'plans', 'price_monthly');
  const hasTrialDays = await columnExists(connection, 'plans', 'trial_days');
  const hasMetadata = await columnExists(connection, 'plans', 'metadata');
  const features = json(['Agency workspace', 'Lead routing', 'Team management', 'Reporting']);
  const limits = json({ max_active_listings: 50, max_team_members: 10 });
  const metadata = json({ source: 'local-demo-seed', localOnly: true });
  const [existing] = await queryRows<{ id: number }>(
    connection,
    hasSegment
      ? "SELECT id FROM plans WHERE name = 'agency_growth' AND segment = 'agency' LIMIT 1"
      : "SELECT id FROM plans WHERE name = 'agency_growth' LIMIT 1",
  );

  if (existing?.id) {
    const setClauses = [
      'displayName = ?',
      'description = ?',
      'price = 0',
      "currency = 'ZAR'",
      "`interval` = 'month'",
      'features = ?',
      'limits = ?',
      'isActive = 1',
      'isPopular = 0',
      'sortOrder = 10',
      'updatedAt = NOW()',
    ];
    const params: unknown[] = ['[LOCAL DEMO] Agency Growth', LOCAL_DEMO_DESCRIPTION, features, limits];

    if (hasSegment) {
      setClauses.push("segment = 'agency'");
    }
    if (hasPriceMonthly) {
      setClauses.push('price_monthly = 0');
    }
    if (hasTrialDays) {
      setClauses.push('trial_days = 0');
    }
    if (hasMetadata) {
      setClauses.push('metadata = CAST(? AS JSON)');
      params.push(metadata);
    }

    await execute(
      connection,
      `UPDATE plans SET ${setClauses.join(', ')} WHERE id = ?`,
      [...params, existing.id],
    );
    return Number(existing.id);
  }

  const columns = [
    'name',
    'displayName',
    'description',
    'price',
    'currency',
    '`interval`',
    'features',
    'limits',
    'isActive',
    'isPopular',
    'sortOrder',
  ];
  const valueTokens = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];
  const values: unknown[] = [
    'agency_growth',
    '[LOCAL DEMO] Agency Growth',
    LOCAL_DEMO_DESCRIPTION,
    0,
    'ZAR',
    'month',
    features,
    limits,
    1,
    0,
    10,
  ];

  if (hasSegment) {
    columns.push('segment');
    valueTokens.push('?');
    values.push('agency');
  }
  if (hasPriceMonthly) {
    columns.push('price_monthly');
    valueTokens.push('?');
    values.push(0);
  }
  if (hasTrialDays) {
    columns.push('trial_days');
    valueTokens.push('?');
    values.push(0);
  }
  if (hasMetadata) {
    columns.push('metadata');
    valueTokens.push('CAST(? AS JSON)');
    values.push(metadata);
  }

  const result = await execute(
    connection,
    `
      INSERT INTO plans
        (${columns.join(', ')})
      VALUES
        (${valueTokens.join(', ')})
    `,
    values,
  );
  return Number(result.insertId);
}

async function ensureLocalDemoPlanEntitlements(connection: mysql.Connection, planId: number) {
  if (!(await tableExists(connection, 'plan_entitlements'))) {
    console.warn(
      'Local demo plan entitlements skipped: plan_entitlements table is not present in this local schema.',
    );
    return;
  }

  const entitlements: Record<string, unknown> = {
    max_active_listings: 50,
    has_team_dashboard: true,
    has_commission_tracking: true,
    has_lead_routing: true,
    has_revenue_dashboard: true,
    has_area_intelligence: true,
  };

  for (const [featureKey, value] of Object.entries(entitlements)) {
    await execute(
      connection,
      `
        INSERT INTO plan_entitlements (plan_id, feature_key, value_json)
        VALUES (?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()
      `,
      [planId, featureKey, JSON.stringify(value)],
    );
  }
}

async function ensureLocalDemoSubscription(
  connection: mysql.Connection,
  input: {
    agencyId: number;
    planId: number;
    actorUserId: number;
  },
) {
  const metadata = json({ source: 'local-demo-seed', localOnly: true });
  let seededSubscription = false;

  if (await tableExists(connection, 'subscriptions')) {
    await execute(
      connection,
      `
        INSERT INTO subscriptions
          (owner_type, owner_id, plan_id, status, trial_ends_at, billing_cycle_anchor, metadata, created_by, updated_by)
        VALUES
          ('agency', ?, ?, 'active', NULL, NOW(), CAST(? AS JSON), ?, ?)
        ON DUPLICATE KEY UPDATE
          plan_id = VALUES(plan_id),
          status = 'active',
          trial_ends_at = NULL,
          billing_cycle_anchor = NOW(),
          metadata = VALUES(metadata),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
      [input.agencyId, input.planId, metadata, input.actorUserId, input.actorUserId],
    );
    seededSubscription = true;
  }

  if (await tableExists(connection, 'agency_subscriptions')) {
    await execute(
      connection,
      `
        INSERT INTO agency_subscriptions
          (agencyId, planId, stripeCustomerId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, metadata)
        VALUES
          (?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 0, ?)
      `,
      [input.agencyId, input.planId, `cus_local_demo_agency_${input.agencyId}`, metadata],
    );
    seededSubscription = true;
  }

  if (!seededSubscription) {
    console.warn(
      'Local demo subscription skipped: neither subscriptions nor agency_subscriptions is present in this local schema.',
    );
  }
}

async function seedDemoData(connection: mysql.Connection) {
  await resetDemoData(connection);

  const demoCredentials = getLocalDemoCredentials(process.env);
  const passwordHash = await bcrypt.hash(demoCredentials.password, 10);

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

  await execute(
    connection,
    `
      INSERT INTO agency_branding
        (agencyId, primaryColor, secondaryColor, accentColor, companyName, tagline, supportEmail, supportPhone, isEnabled)
      VALUES
        (?, '#0f766e', '#0f172a', '#f59e0b', '[LOCAL DEMO] Referral Agency', 'Local agency operating core', 'agency@listify.local', '+27000000000', 1)
    `,
    [agencyId],
  );

  const adminId = await insertUser(connection, {
    email: 'admin@listify.local',
    name: '[LOCAL DEMO] Super Admin',
    firstName: 'Local',
    lastName: 'Admin',
    role: 'super_admin',
    passwordHash,
  });
  const agencyAdminId = await insertUser(connection, {
    email: 'agency@listify.local',
    name: '[LOCAL DEMO] Agency Principal',
    firstName: 'Local',
    lastName: 'Principal',
    role: 'agency_admin',
    passwordHash,
    agencyId,
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
    isSubaccount: 1,
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

  await seedAgencyDashboardData(connection, {
    agencyId,
    agencyAdminId,
    agentUserId: agentId,
    approvedBy: adminId,
  });

  const agencyPlanId = await ensureLocalDemoPlan(connection);
  await ensureLocalDemoPlanEntitlements(connection, agencyPlanId);
  await ensureLocalDemoSubscription(connection, {
    agencyId,
    planId: agencyPlanId,
    actorUserId: adminId,
  });

  const developerResult = await execute(
    connection,
    `
      INSERT INTO developers
        (name, description, website, email, phone, address, city, province, category, establishedYear, isVerified, userId, status, approvedBy, approvedAt, completedProjects, currentProjects, upcomingProjects, specializations, slug, is_trusted)
      VALUES
        ('[LOCAL DEMO] Ubuntu Homes Developer', ?, 'http://localhost:3009', 'developer@listify.local', '+27000000000', 'Local demo only', 'Johannesburg', 'Gauteng', 'residential', 2020, 1, ?, 'approved', ?, NOW(), 2, 3, 1, ?, 'local-demo-ubuntu-homes-developer', 1)
    `,
    [
      LOCAL_DEMO_DESCRIPTION,
      developerUserId,
      adminId,
      json(['affordable_housing', 'family_estates']),
    ],
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
  await insertDealEvent(
    connection,
    submittedDealId,
    referrerId,
    'Buyer submitted and awaiting review.',
    'viewing_scheduled',
  );

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
  await insertDealEvent(
    connection,
    actionDealId,
    developerUserId,
    'Two buyer documents still need action.',
    'application_submitted',
  );

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
  await insertDealEvent(
    connection,
    payoutDealId,
    developerUserId,
    'Reward approved and waiting for payout processing.',
    'commission_pending',
  );
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
  await insertDealDocuments(
    connection,
    agentDealId,
    readyDocumentIds,
    ['received', 'pending'],
    agentId,
  );
  await insertDealEvent(
    connection,
    agentDealId,
    agentId,
    'Agency referral created for local demo testing.',
    'viewing_completed',
  );

  console.log('');
  console.log('Local demo seed complete.');
  console.log('Local demo agency account provisioned.');
  console.log('Email: configured development account');
  console.log(`Password: supplied through ${demoCredentials.passwordSource}`);
  console.log(`Accounts provisioned: ${DEMO_EMAILS.length} configured development accounts`);
  console.log('');
  console.log('Demo developments:');
  console.log('- [LOCAL DEMO] Hillside Gardens: submit-ready');
  console.log('- [LOCAL DEMO] River Quarter: pending setup / explore only');
  console.log('- [LOCAL DEMO] Mandate Locked Estate: blocked');
}

async function main() {
  const action = (process.argv[2] || 'seed') as SeedAction;
  const target = (process.argv[3] ||
    (process.env.NODE_ENV === 'test' ? 'test' : 'local')) as SeedTarget;

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
