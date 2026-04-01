import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const REQUIRED_CONFIRM = 'RESET-PROD-NOW';
const REQUIRED_ENABLED = 'true';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function sanitizeDbTarget(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 4000,
    database: parsed.pathname.replace(/^\//, '') || '(missing)',
    user: parsed.username ? decodeURIComponent(parsed.username) : '(missing)',
  };
}

function buildNameParts(email) {
  const [local] = email.split('@');
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return {
      name: 'Super Admin',
      firstName: 'Super',
      lastName: 'Admin',
    };
  }

  const normalizedTokens = tokens.map(
    token => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
  );
  const firstName = normalizedTokens[0];
  const lastName = normalizedTokens.slice(1).join(' ') || 'Admin';

  return {
    name: normalizedTokens.join(' '),
    firstName,
    lastName,
  };
}

async function createConnection(databaseUrl) {
  try {
    return await mysql.createConnection({
      uri: databaseUrl,
      ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    });
  } catch (_firstError) {
    const parsed = new URL(databaseUrl);
    return mysql.createConnection({
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 4000,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    });
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail('DATABASE_URL is required.');
  }

  if (process.env.PROD_RESET_ENABLED !== REQUIRED_ENABLED) {
    fail('PROD_RESET_ENABLED must be exactly true.');
  }
  if (process.env.PROD_RESET_CONFIRM !== REQUIRED_CONFIRM) {
    fail(`PROD_RESET_CONFIRM must be exactly ${REQUIRED_CONFIRM}.`);
  }

  const adminEmail = (process.env.PROD_SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.PROD_SUPERADMIN_PASSWORD || '';

  if (!adminEmail || !adminEmail.includes('@')) {
    fail('PROD_SUPERADMIN_EMAIL is required and must be a valid email.');
  }
  if (!adminPassword) {
    fail('PROD_SUPERADMIN_PASSWORD is required.');
  }

  const target = sanitizeDbTarget(databaseUrl);
  console.log('=== PRODUCTION RESET TARGET (SANITIZED) ===');
  console.log(`host     : ${target.host}`);
  console.log(`port     : ${target.port}`);
  console.log(`database : ${target.database}`);
  console.log(`user     : ${target.user}`);
  console.log('tls      : required (TLSv1.2+)');
  console.log('===========================================');

  if (target.host.includes('localhost') || target.host.includes('127.0.0.1')) {
    fail('Refusing to run against localhost/127.0.0.1 target.');
  }

  const connection = await createConnection(databaseUrl);

  try {
    const [dbRows] = await connection.query('SELECT DATABASE() AS dbName, @@hostname AS hostName');
    const dbName = dbRows?.[0]?.dbName || '(unknown)';
    const hostName = dbRows?.[0]?.hostName || '(unknown)';
    console.log(`connected_db : ${dbName}`);
    console.log(`server_host  : ${hostName}`);

    const preserve = new Set([
      '__drizzle_migrations',
      'drizzle_migrations',
      'schema_migrations',
    ]);

    const [migrationRows] = await connection.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND (table_name LIKE '%drizzle%' OR table_name LIKE '%migration%')
      `,
    );
    for (const row of migrationRows) {
      if (row?.table_name) {
        preserve.add(String(row.table_name));
      }
    }

    const [tableRows] = await connection.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
    );

    const allTables = tableRows.map(row => String(row.table_name));
    const truncateTables = allTables.filter(tableName => !preserve.has(tableName));

    if (truncateTables.length === 0) {
      fail('No application tables found to truncate. Aborting.');
    }

    console.log(`tables_total       : ${allTables.length}`);
    console.log(`tables_preserved   : ${preserve.size}`);
    console.log(`tables_to_truncate : ${truncateTables.length}`);
    console.log(`preserved_tables   : ${Array.from(preserve).sort().join(', ')}`);

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const tableName of truncateTables) {
        const escaped = tableName.replace(/`/g, '``');
        await connection.query(`TRUNCATE TABLE \`${escaped}\``);
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const nameParts = buildNameParts(adminEmail);

    await connection.execute(
      `
        INSERT INTO users (
          email,
          passwordHash,
          name,
          firstName,
          lastName,
          role,
          emailVerified,
          isSubaccount,
          lastSignedIn,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, 'super_admin', 1, 0, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          passwordHash = VALUES(passwordHash),
          name = VALUES(name),
          firstName = VALUES(firstName),
          lastName = VALUES(lastName),
          role = 'super_admin',
          emailVerified = 1,
          isSubaccount = 0,
          lastSignedIn = NOW()
      `,
      [adminEmail, hashedPassword, nameParts.name, nameParts.firstName, nameParts.lastName],
    );

    const [verificationRows] = await connection.execute(
      `
        SELECT id, email, role, emailVerified
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [adminEmail],
    );

    if (!Array.isArray(verificationRows) || verificationRows.length === 0) {
      fail('Super admin verification failed after insert.');
    }

    console.log('PROD RESET COMPLETE');
    console.log(`Super admin created: ${adminEmail}`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('Reset failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
