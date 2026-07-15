import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { runSqlMigrations } from '../server/migrations/runSqlMigrations';
import { ProspectJourneyChildError, ProspectJourneyProcessRunner } from './prospectJourneyProcessRunner';

const DATABASE = 'listify_prospect_journey_migration_proof';
const LOCK_FILE = '/tmp/prospect-journey-migration-proof.lock';
const MIGRATION = '0073_create_prospect_journey_tracker_mvp.sql';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });

function proofDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const runtime = String(env.APP_ENV || env.NODE_ENV || '').toLowerCase();
  if (!['development', 'test'].includes(runtime)) throw new Error('Migration proof refused: runtime must be development or test.');
  if (!env.DATABASE_URL || !env.LOCAL_DEMO_AGENCY_PASSWORD) throw new Error('Migration proof refused: local database URL and demo password are required.');
  const url = new URL(env.DATABASE_URL);
  if (!LOCAL_HOSTS.has(url.hostname.toLowerCase())) throw new Error('Migration proof refused: database host must be local.');
  if (/production|staging|prod|stage/i.test(`${env.NODE_ENV || ''}${env.APP_ENV || ''}${url.hostname}`)) throw new Error('Migration proof refused: production/staging target detected.');
  url.pathname = `/${DATABASE}`;
  return url.toString();
}

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const pid = Number(readFileSync(LOCK_FILE, 'utf8').trim());
    try {
      if (pid > 0) {
        process.kill(pid, 0);
        throw new Error(`Migration proof refused: run ${pid} is already active.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already active')) throw error;
      unlinkSync(LOCK_FILE);
    }
  }
  const descriptor = openSync(LOCK_FILE, 'wx', 0o600);
  try { writeFileSync(descriptor, `${process.pid}\n`); } finally { closeSync(descriptor); }
}

function releaseLock() {
  try { unlinkSync(LOCK_FILE); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; }
}

async function queryRows(connection: mysql.Connection, sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(sql, params);
  return rows;
}

async function verifyNoMigrationLock(url: string) {
  const connection = await mysql.createConnection(url);
  try {
    const [row] = await queryRows(connection, "SELECT IS_USED_LOCK('real_estate_portal_sql_migrations') AS owner");
    assert.equal(row?.owner ?? null, null, 'Migration lock must be released.');
  } finally { await connection.end(); }
}

async function verifyDatabaseAbsent(url: string) {
  const admin = new URL(url); admin.pathname = '/';
  const connection = await mysql.createConnection(admin.toString());
  try {
    const [row] = await queryRows(connection, 'SELECT COUNT(*) AS count_value FROM information_schema.schemata WHERE schema_name = ?', [DATABASE]);
    assert.equal(Number(row?.count_value || 0), 0, 'Migration proof database must be removed.');
  } finally { await connection.end(); }
}

async function run(runner: ProspectJourneyProcessRunner, command: string, args: string[], env: NodeJS.ProcessEnv) {
  try {
    const result = await runner.run(command, args, { cwd: process.cwd(), env, onChildStart: pid => console.log(`[Migration 0073 proof] started pid=${pid ?? 'unknown'}: ${command} ${args.join(' ')}`) });
    const report = result.output.split(/\r?\n/).filter(Boolean).slice(-100).join('\n');
    if (report) console.log(report);
    return result.output;
  } catch (error) {
    if (error instanceof ProspectJourneyChildError) console.error(error.result.output.split(/\r?\n/).filter(Boolean).slice(-100).join('\n'));
    throw error;
  }
}

async function insertPre0073Fixture(url: string) {
  const connection = await mysql.createConnection(url);
  try {
    const [agency] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO agencies (name, slug, isVerified) VALUES ('[E2E] 0073 Proof Agency', 'e2e-0073-proof-agency', 1)");
    const agencyId = Number(agency.insertId);
    const [user] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO users (email, role, agencyId, isSubaccount) VALUES ('e2e-0073-proof-agent@listify.local', 'agent', ?, 0)", [agencyId]);
    const userId = Number(user.insertId);
    const [agent] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO agents (userId, agencyId, firstName, lastName, isVerified, isFeatured, status, slug) VALUES (?, ?, 'Migration', 'Proof', 1, 0, 'approved', 'e2e-0073-proof-agent')", [userId, agencyId]);
    const agentId = Number(agent.insertId);
    const [property] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, status, featured, views, enquiries, ownerId, agentId) VALUES ('[E2E] 0073 Proof Property', 'Existing property fixture for incremental migration proof.', 'house', 'sale', 'sale', 1200000, 3, 2, 120, '1 Proof Street', 'Johannesburg', 'Gauteng', 'available', 0, 0, 0, ?, ?)", [userId, agentId]);
    const propertyId = Number(property.insertId);
    const [lead] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO leads (agencyId, agentId, name, email, leadType, status) VALUES (?, ?, '0073 existing lead', 'e2e-0073-proof-buyer@listify.local', 'inquiry', 'new')", [agencyId, agentId]);
    const leadId = Number(lead.insertId);
    const [showing] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO showings (propertyId, leadId, agentId, scheduledAt, status) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'confirmed')", [propertyId, leadId, agentId]);
    return { agencyId, leadId, showingId: Number(showing.insertId) };
  } finally { await connection.end(); }
}

async function main() {
  const url = proofDatabaseUrl();
  const runner = new ProspectJourneyProcessRunner();
  const env = { ...process.env, CI: '1', NODE_ENV: 'development', APP_ENV: 'development', DATABASE_URL: url, LISTIFY_E2E_DATABASE_URL: url, LISTIFY_PROSPECT_JOURNEY_MIGRATION_PROOF_DATABASE: DATABASE, LOCAL_SEED_ALLOWED: 'true' };
  acquireLock();
  let primaryError: unknown;
  let cleanupError: unknown;
  try {
    // The preparatory through-0072 run is in-process; bind it to the same
    // guarded URL used by the external normal migration command below.
    process.env.DATABASE_URL = url;
    process.env.LISTIFY_E2E_DATABASE_URL = url;
    await run(runner, 'pnpm', ['db:prospect-journey-migration-proof:reset'], env);
    await run(runner, 'pnpm', ['exec', 'drizzle-kit', 'migrate', '--config', 'drizzle.config.ts'], env);
    // This models an already-merged main database through 0072 using the real
    // custom runner, so its ledger entries are executed rather than invented.
    await runSqlMigrations({ filePattern: /^(?:00[0-6]\d|007[0-2])_.*\.sql$/ });
    const fixture = await insertPre0073Fixture(url);
    const before = await mysql.createConnection(url);
    let beforeLedger: mysql.RowDataPacket[];
    try {
      beforeLedger = await queryRows(before, 'SELECT filename, checksum, application_mode FROM sql_migration_history ORDER BY filename');
      const noProspectTables = await queryRows(before, "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('prospect_identities', 'prospect_action_attributions', 'prospect_action_claim_tokens')");
      const noProspectColumns = await queryRows(before, "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND ((table_name = 'leads' AND column_name = 'prospect_identity_id') OR (table_name = 'showings' AND column_name = 'prospect_identity_id'))");
      assert.equal(beforeLedger.filter(row => row.filename === MIGRATION).length, 0, '0073 must be absent from the initial ledger.');
      assert.ok(beforeLedger.some(row => row.filename === '0072_add_listing_performance_contact_date.sql'), 'Initial custom ledger must be through 0072.');
      assert.equal(noProspectTables.length, 0, 'No Prospect Journey tables may exist before 0073.');
      assert.equal(noProspectColumns.length, 0, 'No Prospect Journey link columns may exist before 0073.');
      const [fixtureRows] = await queryRows(before, 'SELECT (SELECT COUNT(*) FROM leads WHERE id = ?) AS leads_count, (SELECT COUNT(*) FROM showings WHERE id = ?) AS showings_count, (SELECT agencyId FROM leads WHERE id = ?) AS agency_id', [fixture.leadId, fixture.showingId, fixture.leadId]);
      assert.deepEqual({ leads: Number(fixtureRows.leads_count), showings: Number(fixtureRows.showings_count), agency: Number(fixtureRows.agency_id) }, { leads: 1, showings: 1, agency: fixture.agencyId }, 'Pre-0073 lead/showing fixture must be valid and agency-owned.');
    } finally { await before.end(); }
    await verifyNoMigrationLock(url);

    const firstOutput = await run(runner, 'pnpm', ['exec', 'tsx', 'server/migrations/runSqlMigrations.ts'], env);
    assert.match(firstOutput, new RegExp(`Applying: ${MIGRATION.replace('.', '\\.')} \\(7 statement\\(s\\)\\)`), 'Only 0073 must be applied with seven statements.');
    assert.match(firstOutput, new RegExp(`Applied: ${MIGRATION.replace('.', '\\.')} \\(executed=7, skipped=0\\)`), 'All seven 0073 statements must execute.');
    const migrationSql = readFileSync(path.join(process.cwd(), 'server/migrations', MIGRATION));
    const checksum = createHash('sha256').update(migrationSql).digest('hex');
    const after = await mysql.createConnection(url);
    let afterLedger: mysql.RowDataPacket[];
    try {
      const [ledger] = await queryRows(after, 'SELECT filename, checksum, application_mode FROM sql_migration_history WHERE filename = ?', [MIGRATION]);
      assert.deepEqual({ filename: ledger.filename, checksum: ledger.checksum, mode: ledger.application_mode }, { filename: MIGRATION, checksum, mode: 'executed' }, '0073 ledger checksum and mode must match the committed migration.');
      const tables = await queryRows(after, "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('prospect_identities', 'prospect_action_attributions', 'prospect_action_claim_tokens')");
      const columns = await queryRows(after, "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND ((table_name = 'leads' AND column_name = 'prospect_identity_id') OR (table_name = 'showings' AND column_name = 'prospect_identity_id'))");
      const indexes = await queryRows(after, "SELECT table_name, index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND ((table_name = 'leads' AND index_name = 'idx_leads_prospect_identity') OR (table_name = 'showings' AND index_name = 'idx_showings_prospect_identity') OR (table_name = 'prospect_action_claim_tokens' AND index_name = 'idx_prospect_action_claim_lead'))");
      const foreignKeys = await queryRows(after, "SELECT table_name, constraint_name FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND constraint_type = 'FOREIGN KEY' AND constraint_name IN ('prospect_identity_user_fk', 'lead_prospect_identity_fk', 'showing_prospect_identity_fk', 'prospect_action_attribution_lead_fk', 'prospect_action_claim_lead_fk', 'prospect_action_claim_user_fk')");
      assert.equal(tables.length, 3, '0073 must create all three Prospect Journey tables.');
      assert.equal(columns.length, 2, '0073 must add both canonical prospect links.');
      assert.equal(indexes.length, 3, '0073 must create its required indexes.');
      assert.equal(foreignKeys.length, 6, '0073 must create its required foreign keys.');
      const [fixtureRows] = await queryRows(after, 'SELECT (SELECT COUNT(*) FROM leads WHERE id = ?) AS leads_count, (SELECT agencyId FROM leads WHERE id = ?) AS agency_id, (SELECT COUNT(*) FROM showings WHERE id = ?) AS showings_count', [fixture.leadId, fixture.leadId, fixture.showingId]);
      assert.deepEqual({ leads: Number(fixtureRows.leads_count), showings: Number(fixtureRows.showings_count), agency: Number(fixtureRows.agency_id) }, { leads: 1, showings: 1, agency: fixture.agencyId }, '0073 must preserve existing lead/showing rows and agency ownership.');
      afterLedger = await queryRows(after, 'SELECT filename, checksum, application_mode FROM sql_migration_history ORDER BY filename');
    } finally { await after.end(); }
    await verifyNoMigrationLock(url);

    const secondOutput = await run(runner, 'pnpm', ['exec', 'tsx', 'server/migrations/runSqlMigrations.ts'], env);
    assert.match(secondOutput, new RegExp(`Skipped: ${MIGRATION.replace('.', '\\.')}`), 'Second migration run must be a no-op for 0073.');
    const second = await mysql.createConnection(url);
    try {
      const secondLedger = await queryRows(second, 'SELECT filename, checksum, application_mode FROM sql_migration_history ORDER BY filename');
      assert.deepEqual(secondLedger.map(row => ({ filename: row.filename, checksum: row.checksum, application_mode: row.application_mode })), afterLedger.map(row => ({ filename: row.filename, checksum: row.checksum, application_mode: row.application_mode })), 'Second run must leave the ledger unchanged.');
      const [fixtureRows] = await queryRows(second, 'SELECT (SELECT COUNT(*) FROM leads WHERE id = ?) AS leads_count, (SELECT COUNT(*) FROM showings WHERE id = ?) AS showings_count', [fixture.leadId, fixture.showingId]);
      assert.deepEqual({ leads: Number(fixtureRows.leads_count), showings: Number(fixtureRows.showings_count) }, { leads: 1, showings: 1 }, 'Second run must not change fixture data.');
    } finally { await second.end(); }
    await verifyNoMigrationLock(url);
    console.log('[Migration 0073 proof] initial 0072 baseline, seven-statement execution, ledger checksum/mode, schema witnesses, data preservation, no-op rerun, and lock release passed.');
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await runner.stop();
      await run(runner, 'pnpm', ['db:prospect-journey-migration-proof:drop'], env);
      await verifyDatabaseAbsent(url);
    } catch (error) { cleanupError = error; }
    releaseLock();
  }
  if (primaryError && cleanupError) throw new AggregateError([primaryError, cleanupError], String(primaryError));
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
}

main().then(() => process.exit(0), error => { console.error(error instanceof Error ? error.stack || error.message : error); process.exit(1); });
