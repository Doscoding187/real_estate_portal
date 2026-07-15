import { TRPCError } from '@trpc/server';
import { desc, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { agencies, agents, developments, leads, properties, prospectIdentities, showings } from '../drizzle/schema';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { getOrCreateProspectIdentity, ProspectClaimError, PROSPECT_CLAIM_NEUTRAL_MESSAGE, redeemProspectActionClaim } from './services/prospectJourneyService';

const preferencesSchema = z.object({
  preferredContactMethod: z.enum(['email', 'phone', 'whatsapp']).optional(),
  journeyUpdates: z.boolean().optional(),
}).strict();
const neutralClaimError = () => new TRPCError({ code: 'BAD_REQUEST', message: PROSPECT_CLAIM_NEUTRAL_MESSAGE });

/** The only status vocabulary emitted to a prospect; raw CRM states never leave this module. */
export function toProspectSafeLeadStatus(status: unknown) {
  const values: Record<string, [string, string, string | null]> = {
    new: ['enquiry_sent', 'Enquiry sent', 'Wait for the agency to respond'],
    contacted: ['contact_made', 'Contact made', 'Check your contact details are up to date'],
    qualified: ['requirements_confirmed', 'Requirements confirmed', 'Continue with the agency'],
    viewing_scheduled: ['viewing_arranging', 'Viewing being arranged', 'Wait for confirmation'],
    converted: ['journey_progressed', 'Journey progressed', 'Continue with the agency'],
    offer_sent: ['journey_progressed', 'Journey progressed', 'Continue with the agency'],
    lost: ['journey_closed', 'Journey closed', null],
    closed: ['journey_closed', 'Journey closed', null],
  };
  const [code, label, nextAction] = values[String(status)] || ['enquiry_sent', 'Enquiry received', 'Wait for the agency to respond'];
  return { code, label, nextAction };
}

export function toProspectSafeViewingStatus(status: unknown) {
  const values: Record<string, [string, string, string | null]> = {
    requested: ['viewing_requested', 'Viewing requested', 'Wait for confirmation'],
    awaiting_confirmation: ['viewing_requested', 'Viewing requested', 'Wait for confirmation'],
    confirmed: ['viewing_confirmed', 'Viewing confirmed', 'Attend your viewing'],
    completed: ['viewing_completed', 'Viewing completed', 'Continue with the agency'],
    cancelled: ['viewing_inactive', 'Viewing no longer active', 'Contact the agency if you need a new time'],
    rescheduled: ['viewing_inactive', 'Viewing no longer active', 'Contact the agency if you need a new time'],
    no_show: ['viewing_inactive', 'Viewing no longer active', 'Contact the agency if you need a new time'],
  };
  const [code, label, nextAction] = values[String(status)] || values.requested;
  return { code, label, nextAction };
}

function subject(row: any) {
  const isDevelopment = Boolean(row.developmentId && !row.propertyId);
  return {
    kind: isDevelopment ? 'development' : 'property',
    title: row.propertyTitle || row.developmentName || 'Property enquiry',
    location: [row.propertyCity || row.developmentCity, row.propertyProvince || row.developmentProvince].filter(Boolean).join(', ') || null,
    imageUrl: row.propertyImage || null,
    href: row.propertyId ? `/property/${row.propertyId}` : row.developmentSlug ? `/development/${row.developmentSlug}` : null,
  };
}

async function identityFor(db: any, userId: number) {
  return getOrCreateProspectIdentity(db, userId);
}

async function ownedLeads(db: any, identityId: string) {
  return db.select({
    id: leads.id, propertyId: leads.propertyId, developmentId: leads.developmentId, status: leads.status,
    createdAt: leads.createdAt, firstRespondedAt: leads.firstRespondedAt, lastContactedAt: leads.lastContactedAt, updatedAt: leads.updatedAt,
    propertyTitle: properties.title, propertyCity: properties.city, propertyProvince: properties.province, propertyImage: properties.mainImage,
    developmentName: developments.name, developmentCity: developments.city, developmentProvince: developments.province, developmentSlug: developments.slug,
    agencyName: agencies.name, agentName: agents.displayName,
  }).from(leads).leftJoin(properties, eq(leads.propertyId, properties.id)).leftJoin(developments, eq(leads.developmentId, developments.id)).leftJoin(agencies, eq(leads.agencyId, agencies.id)).leftJoin(agents, eq(leads.agentId, agents.id)).where(eq(leads.prospectIdentityId, identityId)).orderBy(desc(leads.createdAt));
}

async function ownedViewings(db: any, identityId: string) {
  return db.select({
    id: showings.id, leadId: showings.leadId, scheduledAt: showings.scheduledAt, status: showings.status, createdAt: showings.createdAt, updatedAt: showings.updatedAt,
    propertyId: leads.propertyId, developmentId: leads.developmentId,
    propertyTitle: properties.title, propertyCity: properties.city, propertyProvince: properties.province, propertyImage: properties.mainImage,
    developmentName: developments.name, developmentCity: developments.city, developmentProvince: developments.province, developmentSlug: developments.slug,
    agencyName: agencies.name, agentName: agents.displayName,
  }).from(showings).leftJoin(leads, eq(showings.leadId, leads.id)).leftJoin(properties, eq(leads.propertyId, properties.id)).leftJoin(developments, eq(leads.developmentId, developments.id)).leftJoin(agencies, eq(leads.agencyId, agencies.id)).leftJoin(agents, eq(leads.agentId, agents.id)).where(or(eq(showings.prospectIdentityId, identityId), eq(leads.prospectIdentityId, identityId))).orderBy(desc(showings.scheduledAt));
}

function mapLead(row: any) {
  return { id: row.id, submittedAt: row.createdAt, status: toProspectSafeLeadStatus(row.status), subject: subject(row), publicContact: { agencyName: row.agencyName || null, agentName: row.agentName || null } };
}

function mapViewing(row: any) {
  return { id: row.id, scheduledAt: row.scheduledAt, status: toProspectSafeViewingStatus(row.status), subject: subject(row), publicContact: { agencyName: row.agencyName || null, agentName: row.agentName || null } };
}

export const prospectJourneyRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const identity = await identityFor(db, ctx.user!.id);
    const [leadRows, viewingRows] = await Promise.all([ownedLeads(db, identity.id), ownedViewings(db, identity.id)]);
    const viewings = viewingRows.map(mapViewing);
    const upcoming = viewings.filter((item: any) => item.status.code === 'viewing_confirmed' && new Date(item.scheduledAt).getTime() >= Date.now());
    return { identity: { id: identity.id, preferences: preferencesSchema.parse(identity.contactPreferences || {}) }, activeEnquiries: leadRows.filter((row: any) => !['lost', 'closed', 'converted'].includes(String(row.status))).length, upcomingViewings: upcoming.length, nextAction: upcoming[0]?.status.nextAction || leadRows.map(mapLead).find((item: any) => item.status.nextAction)?.status.nextAction || null };
  }),
  enquiries: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    return (await ownedLeads(db, (await identityFor(db, ctx.user!.id)).id)).map(mapLead);
  }),
  viewings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    return (await ownedViewings(db, (await identityFor(db, ctx.user!.id)).id)).map(mapViewing);
  }),
  timeline: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const identity = await identityFor(db, ctx.user!.id);
    const [leadRows, viewingRows] = await Promise.all([ownedLeads(db, identity.id), ownedViewings(db, identity.id)]);
    const items: any[] = [];
    leadRows.forEach((row: any) => {
      const safe = toProspectSafeLeadStatus(row.status); const itemSubject = subject(row);
      items.push({ type: 'enquiry_submitted', occurredAt: row.createdAt, message: 'Enquiry sent', subject: itemSubject, nextAction: 'Wait for the agency to respond' });
      if (row.firstRespondedAt) items.push({ type: 'agent_acknowledged', occurredAt: row.firstRespondedAt, message: 'Agent received your enquiry', subject: itemSubject, nextAction: safe.nextAction });
      if (row.lastContactedAt) items.push({ type: 'contact_progress', occurredAt: row.lastContactedAt, message: safe.label, subject: itemSubject, nextAction: safe.nextAction });
      if (['lost', 'closed', 'converted'].includes(String(row.status))) items.push({ type: 'journey_updated', occurredAt: row.updatedAt, message: safe.label, subject: itemSubject, nextAction: null });
    });
    viewingRows.forEach((row: any) => { const safe = toProspectSafeViewingStatus(row.status); items.push({ type: 'viewing_updated', occurredAt: row.updatedAt || row.createdAt, message: safe.label, subject: subject(row), nextAction: safe.nextAction, scheduledAt: row.scheduledAt }); });
    return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }),
  contactPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    return preferencesSchema.parse((await identityFor(db, ctx.user!.id)).contactPreferences || {});
  }),
  updateContactPreferences: protectedProcedure.input(preferencesSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const identity = await identityFor(db, ctx.user!.id); await db.update(prospectIdentities).set({ contactPreferences: input }).where(eq(prospectIdentities.id, identity.id)); return input;
  }),
  claimAction: protectedProcedure.input(z.object({ token: z.string().min(32).max(256) })).mutation(async ({ ctx, input }) => {
    try {
      const db = await getDb(); if (!db) throw new Error('Database unavailable');
      const claim = await redeemProspectActionClaim({ db, userId: ctx.user!.id, token: input.token });
      return { success: true };
    } catch (error) {
      throw neutralClaimError();
    }
  }),
});
