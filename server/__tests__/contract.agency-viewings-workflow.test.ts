import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('agency viewings operating workflow contract', () => {
  const agencyRouter = readRepoFile('server/agencyRouter.ts');
  const leadsSchema = readRepoFile('drizzle/schema/leads.ts');
  const workspace = readRepoFile('client/src/features/agency/viewings/AgencyViewingsWorkspace.tsx');

  it('extends canonical showings instead of introducing a parallel appointment table', () => {
    expect(agencyRouter).toContain('showings');
    expect(agencyRouter).toContain('createViewing: agentProcedure');
    expect(agencyRouter).toContain('getMyDay: agentProcedure');
    expect(agencyRouter).not.toContain('agencyViewings');
    expect(agencyRouter).not.toContain('appointments');
    expect(leadsSchema).toContain("createdByUserId: int('createdByUserId')");

    for (const status of [
      'requested',
      'awaiting_confirmation',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled',
    ]) {
      expect(leadsSchema).toContain(`'${status}'`);
    }
  });

  it('keeps lifecycle transitions server-owned and rejects invalid jumps', () => {
    expect(agencyRouter).toContain('const VIEWING_TRANSITIONS');
    expect(agencyRouter).toContain('assertViewingTransitionAllowed(viewing.status, input.status)');
    expect(agencyRouter).toContain("status: z.enum(['rescheduled', 'awaiting_confirmation', 'confirmed']).default('rescheduled')");
    expect(agencyRouter).toContain('appendViewingRescheduleHistory');
    expect(agencyRouter).toContain("message: `Cannot move viewing from ${current} to ${targetStatus}.`");
    expect(agencyRouter).toContain("completed: []");
    expect(agencyRouter).toContain("cancelled: []");
  });

  it('validates agency tenancy for every linked viewing identity', () => {
    const requireViewing = agencyRouter.slice(
      agencyRouter.indexOf('async function requireAgencyViewing'),
      agencyRouter.indexOf('function getViewingQueueStatus'),
    );
    const createViewing = agencyRouter.slice(
      agencyRouter.indexOf('createViewing: agentProcedure'),
      agencyRouter.indexOf('updateViewingStatus: agentProcedure'),
    );

    expect(requireViewing).toContain('Number(row.agent.agencyId || 0) !== agencyId');
    expect(requireViewing).toContain('Number(row.creatorAgencyId || 0) !== agencyId');
    expect(requireViewing).toContain('eq(leads.agencyId, agencyId)');
    expect(requireViewing).toContain('await requireAgencyListing(db, agencyId, row.showing.listingId)');
    expect(requireViewing).toContain('await requireAgencyProperty(db, agencyId, row.showing.propertyId)');
    expect(createViewing).toContain('await requireAgencyLead(db, user, input.leadId)');
    expect(createViewing).toContain('await requireAgencyAgent(db, agencyId, input.agentId)');
    expect(createViewing).toContain('resolveViewingInventory');
  });

  it('keeps reassignment manager-only and preserves history for completed/cancelled viewings', () => {
    const reassignViewing = agencyRouter.slice(
      agencyRouter.indexOf('reassignViewing: agentProcedure'),
      agencyRouter.indexOf('submitViewingFeedback: agentProcedure'),
    );

    expect(reassignViewing).toContain('requireAgencyManager(user)');
    expect(reassignViewing).toContain("['completed', 'cancelled'].includes");
    expect(reassignViewing).toContain('agency.viewing_reassigned');
    expect(reassignViewing).not.toContain('delete(showings)');
  });

  it('captures feedback only after completion and can schedule the next follow-up', () => {
    const feedbackPath = agencyRouter.slice(
      agencyRouter.indexOf('submitViewingFeedback: agentProcedure'),
      agencyRouter.indexOf('getMyDay: agentProcedure'),
    );

    expect(feedbackPath).toContain("normalizeViewingStatus(viewing.status) !== 'completed'");
    expect(feedbackPath).toContain('serializeViewingFeedback');
    expect(feedbackPath).toContain('await db.transaction(async tx =>');
    expect(feedbackPath).toContain('nextFollowUp: followUp');
    expect(feedbackPath).toContain('agency.viewing_feedback_saved');
    expect(feedbackPath).not.toMatch(/\b(?:AI|artificial intelligence|machine learning)\b/i);
  });

  it('pins My Day to the agency operating timezone and avoids notification duplicates', () => {
    expect(agencyRouter).toContain("const AGENCY_WORKSPACE_TIME_ZONE = 'Africa/Johannesburg'");
    expect(agencyRouter).toContain('const dayKey = bounds.dateKey');
    expect(agencyRouter).toContain('dedupeKey');
    expect(agencyRouter).toContain('return { success: true, idempotent: true }');
  });

  it('surfaces direct daily actions in the existing agency workspace', () => {
    for (const action of [
      'Complete',
      'Book',
      'Confirm',
      'Attended',
      'No-show',
      'Save feedback',
      'Reschedule',
      'Reassign',
      'Open listing',
    ]) {
      expect(workspace).toContain(action);
    }
  });
});
