import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { TRPCError } from '@trpc/server';
import { agencyRouter } from '../server/agencyRouter';
import { getDb } from '../server/db';
import { prospectJourneyRouter } from '../server/prospectJourneyRouter';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });

const DATABASE = 'listify_prospect_journey_e2e';
const PRIVATE_A = 'PRIVATE-A-NOTE-TASK-SCORE-COMMISSION-CLOSURE';
const PRIVATE_B = 'PRIVATE-B-NOTE-TASK-SCORE-COMMISSION-CLOSURE';

function databaseUrl() {
  const value = process.env.LISTIFY_E2E_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(value, 'Cross-agency verification requires a database URL.');
  const url = new URL(value);
  assert.equal(url.pathname, `/${DATABASE}`, 'Cross-agency verification must use the guarded disposable database.');
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'Cross-agency verification requires local MySQL.');
  return url.toString();
}

type Actor = { id: number; role: 'visitor' | 'agent' | 'agency_admin'; agencyId: number | null };

function journeyCaller(userId: number) {
  return prospectJourneyRouter.createCaller({
    user: { id: userId }, req: { headers: {}, socket: {} }, res: {}, requestId: `prospect-cross-agency-${userId}`,
  } as any);
}

function agencyCaller(actor: Actor) {
  return agencyRouter.createCaller({
    user: { ...actor, isSubaccount: actor.role === 'agent' ? 1 : 0 },
    req: { headers: {}, socket: {} }, res: {}, requestId: `agency-cross-agency-${actor.id}`,
  } as any);
}

async function scalar(connection: mysql.Connection, query: string, params: unknown[] = []) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(query, params);
  return rows[0];
}

async function closeDrizzlePool() {
  const db: any = await getDb();
  if (db?.$client && typeof db.$client.end === 'function') await db.$client.end();
}

async function main() {
  const connection = await mysql.createConnection(databaseUrl());
  try {
    const prospect = await scalar(connection, 'SELECT id FROM users WHERE email = ?', ['buyer@listify.local']);
    const otherProspect = await scalar(connection, 'SELECT id FROM users WHERE email = ?', ['referrer@listify.local']);
    const managerA = await scalar(connection, 'SELECT id, agencyId FROM users WHERE email = ?', ['agency@listify.local']);
    const agencyA = { id: Number(managerA?.agencyId || 0) };
    const agentA = await scalar(connection, 'SELECT id FROM agents WHERE email = ?', ['agent@listify.local']);
    assert.ok(prospect?.id && otherProspect?.id && agencyA.id && managerA?.id && agentA?.id, 'Deterministic Agency A and prospect fixtures are required.');

    const suffix = `${process.pid}-${Date.now()}`;
    const [agencyBResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO agencies (name, slug, description, email, city, province, subscriptionPlan, subscriptionStatus, isVerified)
       VALUES (?, ?, 'Cross-agency disposable proof fixture', ?, 'Johannesburg', 'Gauteng', 'professional', 'active', 1)`,
      [`[E2E] Prospect Journey Agency B ${suffix}`, `prospect-journey-b-${suffix}`, `agency-b-${suffix}@listify.local`],
    );
    const agencyBId = Number(agencyBResult.insertId);
    const [managerBResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO users (openId, email, passwordHash, name, firstName, lastName, loginMethod, emailVerified, role, agencyId, isSubaccount, onboarding_complete, onboarding_step, subscription_tier, subscription_status)
       VALUES (?, ?, 'not-used-by-this-verifier', 'Agency B Manager', 'Agency', 'B', 'email', 1, 'agency_admin', ?, 0, 1, 0, 'professional', 'active')`,
      [`prospect-journey-manager-b-${suffix}`, `manager-b-${suffix}@listify.local`, agencyBId],
    );
    const managerBId = Number(managerBResult.insertId);
    const [agentBUserResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO users (openId, email, passwordHash, name, firstName, lastName, loginMethod, emailVerified, role, agencyId, isSubaccount, onboarding_complete, onboarding_step, subscription_tier, subscription_status)
       VALUES (?, ?, 'not-used-by-this-verifier', 'Agency B Agent', 'Agent', 'B', 'email', 1, 'agent', ?, 1, 1, 0, 'professional', 'active')`,
      [`prospect-journey-agent-b-${suffix}`, `agent-b-${suffix}@listify.local`, agencyBId],
    );
    const agentBUserId = Number(agentBUserResult.insertId);
    const [agentBResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO agents (userId, agencyId, firstName, lastName, displayName, email, role, isVerified, isFeatured, status, slug, profileCompletionScore)
       VALUES (?, ?, 'Agent', 'B', 'Agency B Agent', ?, 'agent', 1, 0, 'approved', ?, 100)`,
      [agentBUserId, agencyBId, `agent-b-${suffix}@listify.local`, `prospect-journey-agent-b-${suffix}`],
    );
    const agentBId = Number(agentBResult.insertId);

    const identityA = randomUUID();
    const identityB = randomUUID();
    await connection.execute('INSERT INTO prospect_identities (id, user_id, contact_preferences) VALUES (?, ?, JSON_OBJECT()), (?, ?, JSON_OBJECT())', [identityA, prospect.id, identityB, otherProspect.id]);
    const [leadAResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO leads (agencyId, agentId, prospect_identity_id, name, email, message, leadType, status, notes, qualification_status, qualification_score, lost_reason, nextAction, affordability_data, lead_source, funnel_stage)
       VALUES (?, ?, ?, 'Prospect A Agency A enquiry', 'buyer@listify.local', ?, 'inquiry', 'qualified', ?, 'qualified', 97, ?, ?, JSON_OBJECT('internal', ?), 'cross_agency', 'qualification')`,
      [agencyA.id, agentA.id, identityA, PRIVATE_A, PRIVATE_A, PRIVATE_A, PRIVATE_A, PRIVATE_A],
    );
    const leadAId = Number(leadAResult.insertId);
    const [leadBResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO leads (agencyId, agentId, prospect_identity_id, name, email, message, leadType, status, notes, qualification_status, qualification_score, lost_reason, nextAction, affordability_data, lead_source, funnel_stage)
       VALUES (?, ?, ?, 'Prospect A Agency B enquiry', 'buyer@listify.local', ?, 'inquiry', 'lost', ?, 'unqualified', 3, ?, ?, JSON_OBJECT('internal', ?), 'cross_agency', 'qualification')`,
      [agencyBId, agentBId, identityA, PRIVATE_B, PRIVATE_B, PRIVATE_B, PRIVATE_B, PRIVATE_B],
    );
    const leadBId = Number(leadBResult.insertId);
    const [otherLeadResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO leads (agencyId, agentId, prospect_identity_id, name, email, leadType, status, notes, qualification_score, lead_source, funnel_stage)
       VALUES (?, ?, ?, 'Other Prospect private enquiry', 'referrer@listify.local', 'inquiry', 'new', ?, 88, 'cross_agency', 'interest')`,
      [agencyA.id, agentA.id, identityB, PRIVATE_A],
    );
    const otherLeadId = Number(otherLeadResult.insertId);
    const [showingAResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO showings (leadId, agentId, prospect_identity_id, scheduledAt, status, visitorName, durationMinutes, notes, feedback, createdByUserId)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'confirmed', 'Prospect A', 45, ?, ?, ?)`,
      [leadAId, agentA.id, identityA, PRIVATE_A, PRIVATE_A, managerA.id],
    );
    const showingAId = Number(showingAResult.insertId);
    const [showingBResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO showings (leadId, agentId, prospect_identity_id, scheduledAt, status, visitorName, durationMinutes, notes, feedback, createdByUserId)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY), 'confirmed', 'Prospect A', 45, ?, ?, ?)`,
      [leadBId, agentBId, identityA, PRIVATE_B, PRIVATE_B, managerBId],
    );
    const showingBId = Number(showingBResult.insertId);
    await connection.execute(
      `INSERT INTO lead_activities (leadId, userId, type, description, metadata) VALUES
       (?, ?, 'note', ?, ?), (?, ?, 'note', ?, ?)`,
      [leadAId, managerA.id, `${PRIVATE_A} task`, JSON.stringify({ score: 97, commission: PRIVATE_A }), leadBId, managerBId, `${PRIVATE_B} task`, JSON.stringify({ score: 3, commission: PRIVATE_B })],
    );

    const prospectJourney = journeyCaller(Number(prospect.id));
    const [enquiries, viewings, timeline] = await Promise.all([
      prospectJourney.enquiries(), prospectJourney.viewings(), prospectJourney.timeline(),
    ]);
    assert.deepEqual(new Set(enquiries.filter(item => item.id === leadAId || item.id === leadBId).map(item => item.id)), new Set([leadAId, leadBId]), 'Prospect A must see both agency enquiries.');
    assert.deepEqual(new Set(viewings.filter(item => item.id === showingAId || item.id === showingBId).map(item => item.id)), new Set([showingAId, showingBId]), 'Prospect A must see both agency viewings.');
    assert.ok(!enquiries.some(item => item.id === otherLeadId), 'Prospect A must not see another prospect.');
    assert.ok(timeline.some(item => item.subject?.title === 'Property enquiry' || item.type === 'viewing_updated'), 'Prospect A must receive a safe timeline.');
    const prospectPayload = JSON.stringify({ enquiries, viewings, timeline });
    for (const privateValue of [PRIVATE_A, PRIVATE_B, 'qualification_score', 'lost_reason', 'affordability_data', 'commission']) {
      assert.ok(!prospectPayload.includes(privateValue), `Prospect output leaked ${privateValue}.`);
    }
    assert.ok(enquiries.every(item => item.status.code && item.status.label && item.publicContact), 'Prospect enquiries must use safe statuses and public contact identity.');
    assert.ok(viewings.every(item => item.status.code && item.status.label && item.publicContact), 'Prospect viewings must use safe statuses and public contact identity.');

    const agencyAActor: Actor = { id: Number(managerA.id), role: 'agency_admin', agencyId: Number(agencyA.id) };
    const agencyBActor: Actor = { id: managerBId, role: 'agency_admin', agencyId: agencyBId };
    const [agencyALeads, agencyAViewings, agencyBLeads, agencyBViewings] = await Promise.all([
      agencyCaller(agencyAActor).getLeads({ status: 'all', limit: 200 }),
      agencyCaller(agencyAActor).getViewings({ status: 'all', limit: 200, offset: 0 }),
      agencyCaller(agencyBActor).getLeads({ status: 'all', limit: 200 }),
      agencyCaller(agencyBActor).getViewings({ status: 'all', limit: 200, offset: 0 }),
    ]);
    const aLead = agencyALeads.find(item => item.id === leadAId);
    const bLead = agencyBLeads.find(item => item.id === leadBId);
    assert.ok(aLead && JSON.stringify(aLead).includes(PRIVATE_A), 'Agency A must retain its operational private lead fields.');
    assert.ok(bLead && JSON.stringify(bLead).includes(PRIVATE_B), 'Agency B must retain its operational private lead fields.');
    assert.ok(!agencyALeads.some(item => item.id === leadBId) && !agencyALeads.some(item => JSON.stringify(item).includes(PRIVATE_B)), 'Agency A must not receive Agency B lead data.');
    assert.ok(!agencyBLeads.some(item => item.id === leadAId) && !agencyBLeads.some(item => JSON.stringify(item).includes(PRIVATE_A)), 'Agency B must not receive Agency A lead data.');
    assert.ok(agencyAViewings.viewings.some(item => item.id === showingAId) && !agencyAViewings.viewings.some(item => item.id === showingBId), 'Agency A viewing isolation failed.');
    assert.ok(agencyBViewings.viewings.some(item => item.id === showingBId) && !agencyBViewings.viewings.some(item => item.id === showingAId), 'Agency B viewing isolation failed.');
    await assert.rejects(() => agencyCaller(agencyAActor).getViewingDetail({ viewingId: showingBId }), (error: unknown) => error instanceof TRPCError && error.code === 'NOT_FOUND');
    await assert.rejects(() => agencyCaller(agencyBActor).getViewingDetail({ viewingId: showingAId }), (error: unknown) => error instanceof TRPCError && error.code === 'NOT_FOUND');

    const persisted = await scalar(connection, `SELECT
      (SELECT COUNT(*) FROM lead_activities WHERE leadId IN (?, ?) AND description IN (?, ?)) AS private_tasks,
      (SELECT COUNT(*) FROM leads WHERE id IN (?, ?) AND qualification_score IN (97, 3)) AS private_scores,
      (SELECT COUNT(*) FROM showings WHERE id IN (?, ?) AND notes IN (?, ?)) AS private_showing_notes`,
      [leadAId, leadBId, `${PRIVATE_A} task`, `${PRIVATE_B} task`, leadAId, leadBId, showingAId, showingBId, PRIVATE_A, PRIVATE_B],
    );
    assert.equal(Number(persisted.private_tasks), 2, 'Both agency-private task records must persist.');
    assert.equal(Number(persisted.private_scores), 2, 'Both agency-private scores must persist.');
    assert.equal(Number(persisted.private_showing_notes), 2, 'Both agency-private viewing notes must persist.');
    console.log('[Prospect Journey cross-agency] prospect-safe dual-agency view, Agency A/B isolation, private-field exclusions, and persisted private fixtures passed.');
  } finally {
    await connection.end();
    await closeDrizzlePool();
  }
}

main().then(() => process.exit(0), error => { console.error(error instanceof Error ? error.stack || error.message : error); process.exit(1); });
