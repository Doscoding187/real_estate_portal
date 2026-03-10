import path from 'path';

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

import { getDb } from '../db';
import {
  upsertBrandPartnershipWithAudit,
  upsertDevelopmentAccessWithAudit,
} from '../services/distributionAccessAdminService';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

type ScenarioKey =
  | 'visible_unpartnered'
  | 'included_not_ready'
  | 'ready_not_enabled'
  | 'enabled'
  | 'excluded'
  | 'parent_paused';

type ScenarioSeed = {
  key: ScenarioKey;
  brandName: string;
  brandSlug: string;
  developmentName: string;
  developmentSlug: string;
  seedBatchId: string;
};

const SCENARIOS: ScenarioSeed[] = [
  {
    key: 'visible_unpartnered',
    brandName: 'Distribution Access Sanity Visible Brand',
    brandSlug: 'dist-access-sanity-visible-unpartnered',
    developmentName: 'Distribution Access Visible Unpartnered Development',
    developmentSlug: 'dist-access-sanity-visible-unpartnered-dev',
    seedBatchId: 'das_visible_unpartnered',
  },
  {
    key: 'included_not_ready',
    brandName: 'Distribution Access Sanity Included Not Ready Brand',
    brandSlug: 'dist-access-sanity-included-not-ready',
    developmentName: 'Distribution Access Included Not Ready Development',
    developmentSlug: 'dist-access-sanity-included-not-ready-dev',
    seedBatchId: 'das_included_not_ready',
  },
  {
    key: 'ready_not_enabled',
    brandName: 'Distribution Access Sanity Ready Not Enabled Brand',
    brandSlug: 'dist-access-sanity-ready-not-enabled',
    developmentName: 'Distribution Access Ready Not Enabled Development',
    developmentSlug: 'dist-access-sanity-ready-not-enabled-dev',
    seedBatchId: 'das_ready_not_enabled',
  },
  {
    key: 'enabled',
    brandName: 'Distribution Access Sanity Enabled Brand',
    brandSlug: 'dist-access-sanity-enabled',
    developmentName: 'Distribution Access Enabled Development',
    developmentSlug: 'dist-access-sanity-enabled-dev',
    seedBatchId: 'das_enabled',
  },
  {
    key: 'excluded',
    brandName: 'Distribution Access Sanity Excluded Brand',
    brandSlug: 'dist-access-sanity-excluded',
    developmentName: 'Distribution Access Excluded Development',
    developmentSlug: 'dist-access-sanity-excluded-dev',
    seedBatchId: 'das_excluded',
  },
  {
    key: 'parent_paused',
    brandName: 'Distribution Access Sanity Parent Paused Brand',
    brandSlug: 'dist-access-sanity-parent-paused',
    developmentName: 'Distribution Access Parent Paused Development',
    developmentSlug: 'dist-access-sanity-parent-paused-dev',
    seedBatchId: 'das_parent_paused',
  },
];

function assertLocalDevTarget(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, '');
  const host = url.hostname;

  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`Refusing to seed non-local database host: ${host}`);
  }

  if (databaseName !== 'listify_local_dev') {
    throw new Error(`Refusing to seed unexpected database: ${databaseName}`);
  }

  return url;
}

function toMysqlDateTime(value = new Date()) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function placeholders(count: number) {
  return Array.from({ length: count }, () => '?').join(', ');
}

async function ensureActorUser(connection: mysql.Connection) {
  const email = 'distribution-access-sanity-admin@test.local';

  const [existingRows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ? ORDER BY id DESC LIMIT 1`,
    [email],
  );

  if (existingRows.length) {
    return Number(existingRows[0].id);
  }

  const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
    `
    INSERT INTO users
      (email, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt, updatedAt)
    VALUES
      (?, ?, ?, ?, 'super_admin', 1, 0, NOW(), NOW(), NOW())
    `,
    [email, 'Distribution Access Sanity Admin', 'Distribution', 'Sanity'],
  );

  return Number(insertResult.insertId);
}

async function cleanupPreviousSeed(connection: mysql.Connection) {
  const brandSlugs = SCENARIOS.map(scenario => scenario.brandSlug);

  const [brandRows] = await connection.execute<mysql.RowDataPacket[]>(
    `
    SELECT id
    FROM developer_brand_profiles
    WHERE slug IN (${placeholders(brandSlugs.length)})
    `,
    brandSlugs,
  );

  const brandIds = brandRows.map(row => Number(row.id)).filter(Boolean);
  if (!brandIds.length) {
    return;
  }

  const [developmentRows] = await connection.execute<mysql.RowDataPacket[]>(
    `
    SELECT id
    FROM developments
    WHERE developer_brand_profile_id IN (${placeholders(brandIds.length)})
       OR marketing_brand_profile_id IN (${placeholders(brandIds.length)})
    `,
    [...brandIds, ...brandIds],
  );

  const developmentIds = developmentRows.map(row => Number(row.id)).filter(Boolean);

  if (developmentIds.length) {
    await connection.execute(
      `
      DELETE FROM distribution_manager_assignments
      WHERE development_id IN (${placeholders(developmentIds.length)})
      `,
      developmentIds,
    );

    await connection.execute(
      `
      DELETE FROM distribution_programs
      WHERE development_id IN (${placeholders(developmentIds.length)})
      `,
      developmentIds,
    );

    await connection.execute(
      `
      DELETE FROM distribution_development_access
      WHERE development_id IN (${placeholders(developmentIds.length)})
      `,
      developmentIds,
    );
  }

  await connection.execute(
    `
    DELETE FROM distribution_brand_partnerships
    WHERE brand_profile_id IN (${placeholders(brandIds.length)})
    `,
    brandIds,
  );

  if (developmentIds.length) {
    await connection.execute(
      `
      DELETE FROM developments
      WHERE id IN (${placeholders(developmentIds.length)})
      `,
      developmentIds,
    );
  }

  await connection.execute(
    `
    DELETE FROM developer_brand_profiles
    WHERE id IN (${placeholders(brandIds.length)})
    `,
    brandIds,
  );
}

async function createBrandProfile(
  connection: mysql.Connection,
  actorUserId: number,
  scenario: ScenarioSeed,
) {
  const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
    `
    INSERT INTO developer_brand_profiles
      (brand_name, slug, owner_type, profile_type, identity_type, seed_batch_id, is_visible, is_claimable, created_by, created_at, updated_at)
    VALUES
      (?, ?, 'platform', 'industry_reference', 'developer', ?, 1, 1, ?, NOW(), NOW())
    `,
    [scenario.brandName, scenario.brandSlug, scenario.seedBatchId, actorUserId],
  );

  return Number(insertResult.insertId);
}

async function createDevelopment(
  connection: mysql.Connection,
  scenario: ScenarioSeed,
  brandProfileId: number,
) {
  const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
    `
    INSERT INTO developments
      (name, slug, developer_brand_profile_id, city, province, developmentType, status, transaction_type, isPublished, approval_status, dev_owner_type, createdAt, updatedAt)
    VALUES
      (?, ?, ?, 'Johannesburg', 'Gauteng', 'residential', 'selling', 'for_sale', 1, 'approved', 'platform', NOW(), NOW())
    `,
    [scenario.developmentName, scenario.developmentSlug, brandProfileId],
  );

  return Number(insertResult.insertId);
}

async function createProgram(
  connection: mysql.Connection,
  input: {
    actorUserId: number;
    developmentId: number;
    isReferralEnabled: boolean;
    defaultCommissionPercent: number | null;
  },
) {
  const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
    `
    INSERT INTO distribution_programs
      (development_id, is_referral_enabled, is_active, commission_model, default_commission_percent, default_commission_amount, tier_access_policy, created_by, updated_by, created_at, updated_at)
    VALUES
      (?, ?, 1, 'flat_percentage', ?, NULL, 'restricted', ?, ?, NOW(), NOW())
    `,
    [
      input.developmentId,
      input.isReferralEnabled ? 1 : 0,
      input.defaultCommissionPercent,
      input.actorUserId,
      input.actorUserId,
    ],
  );

  return Number(insertResult.insertId);
}

async function createPrimaryManagerAssignment(
  connection: mysql.Connection,
  input: {
    programId: number;
    developmentId: number;
    managerUserId: number;
  },
) {
  await connection.execute(
    `
    INSERT INTO distribution_manager_assignments
      (program_id, development_id, manager_user_id, is_primary, workload_capacity, timezone, is_active, created_at, updated_at)
    VALUES
      (?, ?, ?, 1, 10, 'Africa/Johannesburg', 1, NOW(), NOW())
    `,
    [input.programId, input.developmentId, input.managerUserId],
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  const target = assertLocalDevTarget(databaseUrl);
  const connection = await mysql.createConnection({
    host: target.hostname,
    port: Number(target.port || 3306),
    user: decodeURIComponent(target.username),
    password: decodeURIComponent(target.password),
    database: target.pathname.replace(/^\//, ''),
    multipleStatements: true,
  });

  try {
    const actorUserId = await ensureActorUser(connection);
    await cleanupPreviousSeed(connection);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available.');
    }

    const results: Array<Record<string, unknown>> = [];

    for (const scenario of SCENARIOS) {
      const brandProfileId = await createBrandProfile(connection, actorUserId, scenario);
      const developmentId = await createDevelopment(connection, scenario, brandProfileId);

      if (scenario.key === 'visible_unpartnered') {
        results.push({
          scenario: scenario.key,
          brandProfileId,
          developmentId,
          note: 'Visible seeded brand with no partnership/access rows. This also covers fallback.',
        });
        continue;
      }

      const activePartnership =
        scenario.key === 'parent_paused'
          ? await upsertBrandPartnershipWithAudit({
              db,
              actorUserId,
              brandProfileId,
              status: 'active',
              channelScope: ['distribution_network', 'admin', 'developer', 'referrer'],
              reasonCode: 'sanity_seed_active_parent',
              notes: `Distribution access sanity seed for ${scenario.key}.`,
            })
          : null;

      const partnershipResult =
        activePartnership ||
        (await upsertBrandPartnershipWithAudit({
          db,
          actorUserId,
          brandProfileId,
          status: 'active',
          channelScope: ['distribution_network', 'admin', 'developer', 'referrer'],
          reasonCode: 'sanity_seed_active_parent',
          notes: `Distribution access sanity seed for ${scenario.key}.`,
        }));

      if (scenario.key === 'included_not_ready') {
        await createProgram(connection, {
          actorUserId,
          developmentId,
          isReferralEnabled: true,
          defaultCommissionPercent: null,
        });

        const accessResult = await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId,
          developmentId,
          status: 'included',
          submissionAllowed: true,
          reasonCode: 'sanity_seed_included_not_ready',
          notes: 'Included with an incomplete program configuration.',
        });

        results.push({
          scenario: scenario.key,
          brandProfileId,
          developmentId,
          partnershipId: Number(partnershipResult.partnership.id),
          accessId: Number(accessResult.access.id),
        });
        continue;
      }

      const programId = await createProgram(connection, {
        actorUserId,
        developmentId,
        isReferralEnabled:
          scenario.key === 'enabled' ||
          scenario.key === 'excluded' ||
          scenario.key === 'parent_paused',
        defaultCommissionPercent: 5,
      });

      await createPrimaryManagerAssignment(connection, {
        programId,
        developmentId,
        managerUserId: actorUserId,
      });

      if (scenario.key === 'ready_not_enabled') {
        const accessResult = await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId,
          developmentId,
          status: 'included',
          submissionAllowed: true,
          reasonCode: 'sanity_seed_ready_not_enabled',
          notes: 'Program is ready but referral enablement remains off.',
        });

        results.push({
          scenario: scenario.key,
          brandProfileId,
          developmentId,
          programId,
          partnershipId: Number(partnershipResult.partnership.id),
          accessId: Number(accessResult.access.id),
        });
        continue;
      }

      if (scenario.key === 'enabled') {
        const accessResult = await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId,
          developmentId,
          status: 'included',
          submissionAllowed: true,
          reasonCode: 'sanity_seed_enabled',
          notes: 'Program is ready and referral enablement is on.',
        });

        results.push({
          scenario: scenario.key,
          brandProfileId,
          developmentId,
          programId,
          partnershipId: Number(partnershipResult.partnership.id),
          accessId: Number(accessResult.access.id),
        });
        continue;
      }

      if (scenario.key === 'excluded') {
        const accessResult = await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId,
          developmentId,
          status: 'included',
          submissionAllowed: true,
          excludedByExclusivity: true,
          reasonCode: 'sanity_seed_excluded_by_exclusivity',
          notes: 'Program is ready but excluded by exclusivity.',
        });

        results.push({
          scenario: scenario.key,
          brandProfileId,
          developmentId,
          programId,
          partnershipId: Number(partnershipResult.partnership.id),
          accessId: Number(accessResult.access.id),
        });
        continue;
      }

      if (scenario.key === 'parent_paused') {
        const initialAccessResult = await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId,
          developmentId,
          status: 'included',
          submissionAllowed: true,
          reasonCode: 'sanity_seed_parent_pause_initial',
          notes: 'Initially included before parent pause.',
        });

        const pausedPartnership = await upsertBrandPartnershipWithAudit({
          db,
          actorUserId,
          brandProfileId,
          status: 'paused',
          channelScope: ['distribution_network', 'admin', 'developer', 'referrer'],
          reasonCode: 'sanity_seed_parent_paused',
          notes: 'Parent brand paused after child inclusion.',
        });

        results.push({
          scenario: scenario.key,
          brandProfileId,
          developmentId,
          programId,
          partnershipId: Number(pausedPartnership.partnership.id),
          accessId: Number(initialAccessResult.access.id),
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          seededAt: toMysqlDateTime(),
          actorUserId,
          scenarios: results,
          note: 'Run pnpm exec tsx server/scripts/verify-distribution-access-sanity.ts next.',
        },
        null,
        2,
      ),
    );
  } finally {
    await connection.end();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Distribution access sanity seed failed:', error);
    process.exit(1);
  });
