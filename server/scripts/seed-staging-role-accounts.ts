import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const REQUIRED_CONFIRMATION = 'seed-staging-accounts';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const firstNumericId = (rows: unknown): number | null => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const value = Number((rows[0] as Record<string, unknown>).id);
  return Number.isFinite(value) && value > 0 ? value : null;
};

async function main() {
  const enabled = process.env.STAGING_SEED_ENABLED === 'true';
  const confirmation = process.env.STAGING_SEED_CONFIRM;

  if (!enabled || confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Refusing to run. Set STAGING_SEED_ENABLED=true and STAGING_SEED_CONFIRM=${REQUIRED_CONFIRMATION}`,
    );
  }

  const databaseUrl = requireEnv('DATABASE_URL');
  const sharedPassword = requireEnv('STAGING_SEED_PASSWORD');

  const superAdminEmail =
    process.env.STAGING_SUPERADMIN_EMAIL || 'superadmin+staging@propertylistify.co.za';
  const agentEmail = process.env.STAGING_AGENT_EMAIL || 'agent+staging@propertylistify.co.za';
  const agencyEmail = process.env.STAGING_AGENCY_EMAIL || 'agency+staging@propertylistify.co.za';
  const developerEmail =
    process.env.STAGING_DEVELOPER_EMAIL || 'developer+staging@propertylistify.co.za';

  const agencySlug = process.env.STAGING_AGENCY_SLUG || 'staging-pilot-agency';
  const agencyName = process.env.STAGING_AGENCY_NAME || 'Staging Pilot Agency';
  const developerSlug = process.env.STAGING_DEVELOPER_SLUG || 'staging-pilot-developer';
  const developerName = process.env.STAGING_DEVELOPER_NAME || 'Staging Pilot Developer';

  const passwordHash = await bcrypt.hash(sharedPassword, 10);

  const connection = await mysql.createConnection(databaseUrl);
  await connection.beginTransaction();

  try {
    const [superAdminRows] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [
      superAdminEmail,
    ]);
    const existingSuperAdminId = firstNumericId(superAdminRows);
    if (existingSuperAdminId) {
      await connection.execute(
        `
        UPDATE users
        SET passwordHash = ?, role = 'super_admin', emailVerified = 1
        WHERE id = ?
      `,
        [passwordHash, existingSuperAdminId],
      );
    } else {
      await connection.execute(
        `
        INSERT INTO users (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
        VALUES (?, ?, ?, ?, ?, 'super_admin', 1, 0, NOW(), NOW())
      `,
        [superAdminEmail, passwordHash, 'Staging Super Admin', 'Staging', 'SuperAdmin'],
      );
    }

    const [agencyRows] = await connection.execute('SELECT id FROM agencies WHERE slug = ? LIMIT 1', [
      agencySlug,
    ]);
    let agencyId = firstNumericId(agencyRows);
    if (agencyId) {
      await connection.execute(
        `
        UPDATE agencies
        SET name = ?, isVerified = 1
        WHERE id = ?
      `,
        [agencyName, agencyId],
      );
    } else {
      const [insertAgencyResult] = await connection.execute(
        `
        INSERT INTO agencies (name, slug, isVerified, createdAt)
        VALUES (?, ?, 1, NOW())
      `,
        [agencyName, agencySlug],
      );
      agencyId = Number((insertAgencyResult as mysql.ResultSetHeader).insertId);
    }

    if (!agencyId) {
      throw new Error(`Failed to resolve agency id for slug ${agencySlug}`);
    }

    const upsertUser = async (params: {
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      role: 'agency_admin' | 'agent' | 'property_developer';
      agencyId?: number;
    }): Promise<number> => {
      const [userRows] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [
        params.email,
      ]);
      const existingId = firstNumericId(userRows);
      if (existingId) {
        await connection.execute(
          `
          UPDATE users
          SET passwordHash = ?, role = ?, agencyId = ?, emailVerified = 1
          WHERE id = ?
        `,
          [passwordHash, params.role, params.agencyId ?? null, existingId],
        );
        return existingId;
      }

      const [insertUserResult] = await connection.execute(
        `
        INSERT INTO users (email, passwordHash, name, firstName, lastName, role, agencyId, emailVerified, isSubaccount, lastSignedIn, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())
      `,
        [
          params.email,
          passwordHash,
          params.name,
          params.firstName,
          params.lastName,
          params.role,
          params.agencyId ?? null,
        ],
      );
      return Number((insertUserResult as mysql.ResultSetHeader).insertId);
    };

    await upsertUser({
      email: agencyEmail,
      name: 'Staging Agency Admin',
      firstName: 'Staging',
      lastName: 'Agency',
      role: 'agency_admin',
      agencyId,
    });

    const agentUserId = await upsertUser({
      email: agentEmail,
      name: 'Staging Agent',
      firstName: 'Staging',
      lastName: 'Agent',
      role: 'agent',
      agencyId,
    });
    if (!agentUserId) {
      throw new Error(`Failed to resolve agent user id for email ${agentEmail}`);
    }

    const [agentRows] = await connection.execute('SELECT id FROM agents WHERE userId = ? LIMIT 1', [
      agentUserId,
    ]);
    const existingAgentId = firstNumericId(agentRows);
    if (existingAgentId) {
      await connection.execute(
        `
        UPDATE agents
        SET agencyId = ?, displayName = ?, phone = ?, status = 'approved', isVerified = 1, updatedAt = NOW()
        WHERE id = ?
      `,
        [agencyId, 'Staging Agent', process.env.STAGING_AGENT_PHONE || '+27110002000', existingAgentId],
      );
    } else {
      await connection.execute(
        `
        INSERT INTO agents (userId, agencyId, firstName, lastName, displayName, phone, role, isVerified, isFeatured, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, 'agent', 1, 0, 'approved', NOW(), NOW())
      `,
        [
          agentUserId,
          agencyId,
          'Staging',
          'Agent',
          'Staging Agent',
          process.env.STAGING_AGENT_PHONE || '+27110002000',
        ],
      );
    }

    const developerUserId = await upsertUser({
      email: developerEmail,
      name: 'Staging Developer',
      firstName: 'Staging',
      lastName: 'Developer',
      role: 'property_developer',
    });
    if (!developerUserId) {
      throw new Error(`Failed to resolve developer user id for email ${developerEmail}`);
    }

    const [developerRows] = await connection.execute(
      'SELECT id FROM developers WHERE userId = ? LIMIT 1',
      [developerUserId],
    );
    const existingDeveloperId = firstNumericId(developerRows);
    if (existingDeveloperId) {
      await connection.execute(
        `
        UPDATE developers
        SET name = ?, slug = ?, email = ?, status = 'approved', isVerified = 1, updatedAt = NOW()
        WHERE id = ?
      `,
        [developerName, developerSlug, developerEmail, existingDeveloperId],
      );
    } else {
      await connection.execute(
        `
        INSERT INTO developers (userId, name, slug, email, status, isVerified, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'approved', 1, NOW(), NOW())
      `,
        [developerUserId, developerName, developerSlug, developerEmail],
      );
    }

    await connection.commit();

    console.log('Seeded staging role accounts successfully.');
    console.log(`super_admin: ${superAdminEmail}`);
    console.log(`agent: ${agentEmail}`);
    console.log(`agency_admin: ${agencyEmail}`);
    console.log(`property_developer: ${developerEmail}`);
    console.log(`agency_slug: ${agencySlug}`);
    console.log(`developer_slug: ${developerSlug}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('[seed-staging-role-accounts] Failed:', error);
  process.exit(1);
});
