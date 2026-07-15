import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { capturePublicLead } from '../server/services/publicLeadCaptureService';
import { issueProspectActionClaimToken } from '../server/services/prospectJourneyService';
import { prospectJourneyRouter } from '../server/prospectJourneyRouter';
import { getDb } from '../server/db';
import { TRPCError } from '@trpc/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });

const database = 'listify_prospect_journey_e2e';
const forbidden = ['Private CRM note', 'qualification_score', 'token_hash', 'passwordHash', 'stack', 'SELECT ', 'mysql'];
const classify = (message: unknown) => {
  const text = typeof message === 'string' ? message : '';
  return { neutral: text === 'This claim link is invalid or expired.', sensitive: /duplicate entry|er_dup_entry|\b(select|insert|update|delete|alter table|index)\b/i.test(text), length: text.length };
};
function inspectError(error: unknown, depth = 0): any {
  if (!error || typeof error !== 'object' || depth > 4) return null;
  const value: any = error;
  return { depth, constructor: value.constructor?.name, name: value.name, isTrpcError: error instanceof TRPCError, code: error instanceof TRPCError ? error.code : undefined, message: classify(value.message), ownKeys: Object.keys(value).sort(), dataKeys: value.data && typeof value.data === 'object' ? Object.keys(value.data).sort() : [], cause: inspectError(value.cause, depth + 1) };
}

function requiredUrl() {
  const value = process.env.LISTIFY_E2E_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(value, 'Prospect Journey security verification requires a database URL.');
  const url = new URL(value);
  assert.equal(url.pathname, `/${database}`, 'Security verification must use only the disposable E2E database.');
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'Security verification requires local MySQL.');
  return url.toString();
}

function caller(userId: number) {
  return prospectJourneyRouter.createCaller({
    user: { id: userId },
    req: { headers: {}, socket: {} },
    res: {},
    requestId: `prospect-security-${userId}`,
  } as any);
}

async function expectNeutral(promise: Promise<unknown>) {
  try {
    await promise;
    assert.fail('Expected a neutral claim failure.');
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message !== 'This claim link is invalid or expired.') {
      throw new Error(`Unsafe router error shape: ${JSON.stringify(inspectError(error))}`);
    }
    assert.equal(message, 'This claim link is invalid or expired.');
    for (const value of forbidden) assert.ok(!message.includes(value), `Claim error leaked ${value}`);
  }
}

async function main() {
  const connection = await mysql.createConnection(requiredUrl());
  let drizzleDb: any = null;
  let stage = 'fixture setup';
  try {
    const [[prospectA]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM users WHERE email = ?', ['buyer@listify.local']);
    const [[prospectB]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM users WHERE email = ?', ['referrer@listify.local']);
    assert.ok(prospectA?.id && prospectB?.id, 'Deterministic prospect fixtures are required.');
    const [[agency]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM agencies ORDER BY id LIMIT 1');
    const [[agent]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM agents WHERE agencyId = ? AND status = ? LIMIT 1', [agency.id, 'approved']);
    assert.ok(agency?.id && agent?.id, 'Deterministic agency fixture is required.');

    const [propertyResult] = await connection.execute(
      "INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, status, featured, views, enquiries, ownerId, agentId) VALUES (?, ?, 'house', 'sale', 'sale', 1000000, 3, 2, 100, '1 Proof Street', 'Johannesburg', 'Gauteng', 'available', 0, 0, 0, ?, ?)",
      ['[E2E Security] Claim scope property', 'Disposable security fixture', prospectA.id, agent.id],
    );
    const propertyId = Number((propertyResult as mysql.ResultSetHeader).insertId);
    const insertLead = async (email: string, phone: string | null, note = 'Private CRM note') => {
      const [result] = await connection.execute(
        "INSERT INTO leads (propertyId, agencyId, agentId, name, email, phone, message, leadType, status, notes, qualification_score) VALUES (?, ?, ?, 'Prospect', ?, ?, 'Private enquiry', 'inquiry', 'new', ?, 99)",
        [propertyId, agency.id, agent.id, email, phone, note],
      );
      return Number((result as mysql.ResultSetHeader).insertId);
    };
    const leadA = await insertLead('shared@claim-proof.local', '+27000000001');
    const leadB = await insertLead('shared@claim-proof.local', '+27000000001');
    const unrelatedLead = await insertLead('unrelated@claim-proof.local', '+27000000002');
    const [relatedShowingResult] = await connection.execute(
      "INSERT INTO showings (propertyId, leadId, agentId, scheduledAt, status, visitorName, durationMinutes) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'confirmed', 'Prospect', 30)",
      [propertyId, leadA, agent.id],
    );
    const relatedShowing = Number((relatedShowingResult as mysql.ResultSetHeader).insertId);
    const [unrelatedShowingResult] = await connection.execute(
      "INSERT INTO showings (propertyId, leadId, agentId, scheduledAt, status, visitorName, durationMinutes) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'requested', 'Other', 30)",
      [propertyId, unrelatedLead, agent.id],
    );
    const unrelatedShowing = Number((unrelatedShowingResult as mysql.ResultSetHeader).insertId);

    drizzleDb = await getDb();
    assert.ok(drizzleDb, 'Drizzle database connection is required.');
    const issued = await issueProspectActionClaimToken({ db: drizzleDb, leadId: leadA });
    assert.match(issued.token, /^[a-f0-9]{64}$/i, 'Claim token must use 256 bits of cryptographic hex entropy.');
    const tokenHash = createHash('sha256').update(issued.token).digest('hex');
    const [[stored]] = await connection.query<mysql.RowDataPacket[]>('SELECT lead_id, token_hash, expires_at, used_at FROM prospect_action_claim_tokens WHERE token_hash = ?', [tokenHash]);
    assert.equal(stored.lead_id, leadA); assert.equal(stored.token_hash, tokenHash); assert.ok(stored.expires_at); assert.equal(stored.used_at, null);
    const [[freshness]] = await connection.query<mysql.RowDataPacket[]>('SELECT expires_at > NOW() AS is_future FROM prospect_action_claim_tokens WHERE token_hash = ?', [tokenHash]);
    assert.equal(Number(freshness.is_future), 1, 'Issued token expiry must be in the future according to MySQL.');
    assert.ok(new Date(stored.expires_at).getTime() > Date.now(), 'Issued token expiry must also be future-dated for the application clock.');
    const [rawRows] = await connection.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count_value FROM prospect_action_claim_tokens WHERE token_hash = ?', [issued.token]);
    assert.equal(Number(rawRows[0].count_value), 0, 'Raw claim token must never be persisted.');
    const [[preClaim]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM leads WHERE id = ?', [leadA]);
    assert.equal(preClaim.prospect_identity_id, null, 'Issuance must not claim a lead.');

    stage = 'valid claim';
    await caller(prospectA.id).claimAction({ token: issued.token });
    const [[claimed]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM leads WHERE id = ?', [leadA]);
    const [[identity]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM prospect_identities WHERE user_id = ?', [prospectA.id]);
    const [[claimedShowing]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM showings WHERE id = ?', [relatedShowing]);
    const [[unchangedLead]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM leads WHERE id = ?', [leadB]);
    const [[unchangedShowing]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM showings WHERE id = ?', [unrelatedShowing]);
    const [[consumed]] = await connection.query<mysql.RowDataPacket[]>('SELECT used_at, claimed_by_user_id FROM prospect_action_claim_tokens WHERE token_hash = ?', [tokenHash]);
    assert.equal(claimed.prospect_identity_id, identity.id); assert.equal(claimedShowing.prospect_identity_id, identity.id);
    assert.equal(unchangedLead.prospect_identity_id, null); assert.equal(unchangedShowing.prospect_identity_id, null);
    assert.ok(consumed.used_at, 'MySQL consumed timestamp must persist.'); assert.equal(consumed.claimed_by_user_id, prospectA.id);
    const [[audit]] = await connection.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count_value FROM audit_logs WHERE action = ? AND targetId = ?', ['prospect.action_claimed', leadA]);
    assert.equal(Number(audit.count_value), 1, 'Successful claim must create one audit event.');

    const journey = await caller(prospectA.id).enquiries();
    assert.ok(journey.some((item: any) => item.id === leadA)); assert.ok(!journey.some((item: any) => item.id === leadB));
    const serialized = JSON.stringify({ summary: await caller(prospectA.id).summary(), journey, viewings: await caller(prospectA.id).viewings(), timeline: await caller(prospectA.id).timeline() });
    for (const value of forbidden) assert.ok(!serialized.includes(value), `Prospect response leaked ${value}`);
    assert.ok(!serialized.includes('shared@claim-proof.local'), 'Prospect response must not expose lead email.');
    assert.ok(!serialized.includes('+27000000001'), 'Prospect response must not expose lead phone.');

    await expectNeutral(caller(prospectA.id).claimAction({ token: issued.token }));
    await expectNeutral(caller(prospectB.id).claimAction({ token: issued.token }));
    const [[reuseAudit]] = await connection.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count_value FROM audit_logs WHERE action = ? AND targetId = ?', ['prospect.action_claimed', leadA]);
    assert.equal(Number(reuseAudit.count_value), 1, 'Reuse must not add audit events.');

    stage = 'expired claim';
    const expired = await issueProspectActionClaimToken({ db: drizzleDb, leadId: leadB });
    await connection.execute('UPDATE prospect_action_claim_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE token_hash = ?', [createHash('sha256').update(expired.token).digest('hex')]);
    await expectNeutral(caller(prospectA.id).claimAction({ token: expired.token }));
    const [[expiredLead]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM leads WHERE id = ?', [leadB]);
    assert.equal(expiredLead.prospect_identity_id, null, 'Expired token must not claim activity.');
    await expectNeutral(caller(prospectA.id).claimAction({ token: 'c'.repeat(64) }));

    stage = 'rollback claim';
    const rollbackLead = await insertLead('rollback@claim-proof.local', '+27000000004');
    const rollback = await issueProspectActionClaimToken({ db: drizzleDb, leadId: rollbackLead });
    // This disposable-schema index forces the canonical lead link to fail only
    // after the token update. It needs no privileged trigger capability.
    await connection.query('CREATE UNIQUE INDEX uq_prospect_journey_rollback_identity ON leads (prospect_identity_id)');
    let rollbackError: unknown;
    try {
      await caller(prospectA.id).claimAction({ token: rollback.token });
    } catch (error) {
      rollbackError = error;
    } finally {
      await connection.query('DROP INDEX uq_prospect_journey_rollback_identity ON leads');
    }
    assert.ok(rollbackError, 'Rollback fixture must reject the router call.');
    const rollbackMessage = String((rollbackError as Error).message || '');
    if (rollbackMessage !== 'This claim link is invalid or expired.') {
      throw new Error(`Unsafe router error shape: ${JSON.stringify(inspectError(rollbackError))}`);
    }
    const rollbackHash = createHash('sha256').update(rollback.token).digest('hex');
    const [[rollbackToken]] = await connection.query<mysql.RowDataPacket[]>('SELECT used_at FROM prospect_action_claim_tokens WHERE token_hash = ?', [rollbackHash]);
    const [[rollbackLeadRow]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM leads WHERE id = ?', [rollbackLead]);
    assert.equal(rollbackToken.used_at, null); assert.equal(rollbackLeadRow.prospect_identity_id, null, 'Failed transaction must roll back token and ownership.');
    stage = 'rollback retry';
    await caller(prospectA.id).claimAction({ token: rollback.token });

    stage = 'concurrent claim';
    const concurrentLead = await insertLead('concurrent@claim-proof.local', '+27000000003');
    const concurrent = await issueProspectActionClaimToken({ db: drizzleDb, leadId: concurrentLead });
    const settled = await Promise.allSettled([caller(prospectA.id).claimAction({ token: concurrent.token }), caller(prospectB.id).claimAction({ token: concurrent.token })]);
    assert.equal(settled.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one first redeemer may win.');
    assert.equal(settled.filter(result => result.status === 'rejected').length, 1, 'Second redeemer must fail.');

    const captured = await capturePublicLead({ propertyId, name: 'Authenticated A', email: 'authenticated@claim-proof.local', phone: '+27000000005', authenticatedUserId: prospectA.id, sourceSurface: 'property_detail', utmSource: 'security', utmMedium: 'test', utmCampaign: 'journey' });
    const [[capturedLead]] = await connection.query<mysql.RowDataPacket[]>('SELECT prospect_identity_id FROM leads WHERE id = ?', [captured.leadId]);
    const [[attribution]] = await connection.query<mysql.RowDataPacket[]>('SELECT source_type, utm_context FROM prospect_action_attributions WHERE lead_id = ?', [captured.leadId]);
    assert.equal(capturedLead.prospect_identity_id, identity.id); assert.equal(attribution.source_type, 'property_detail'); assert.match(JSON.stringify(attribution.utm_context), /security/);

    console.log('[Prospect Journey security] persisted claim, scope, rollback, privacy, and authenticated-capture checks passed.');
  } catch (error) {
    throw new Error(`Prospect Journey security verification failed at ${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await connection.end();
    const pool = drizzleDb?.$client;
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
