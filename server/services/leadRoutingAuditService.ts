import { desc, eq, gte } from 'drizzle-orm';
import { getDb } from '../db';
import { leads, properties, users } from '../../drizzle/schema';

type UserRole = 'visitor' | 'agent' | 'agency_admin' | 'property_developer' | 'super_admin' | null;
type LeadDeliveryMethod = 'email' | 'crm_export' | 'manual' | 'none' | null;

export interface LeadRoutingAuditRow {
  id: number;
  createdAt: string;
  name: string;
  email: string;
  propertyId: number | null;
  developmentId: number | null;
  agentId: number | null;
  agencyId: number | null;
  developerBrandProfileId: number | null;
  leadSource: string | null;
  source: string | null;
  brandLeadStatus: string | null;
  leadDeliveryMethod: LeadDeliveryMethod;
  propertyOwnerId: number | null;
  propertyOwnerRole: UserRole;
}

export interface LeadRoutingAuditSummary {
  totalLeads: number;
  brandRoute: number;
  directRoute: number;
  brandDeliveredEmail: number;
  brandDeliveredSubscriber: number;
  brandCapturedOnly: number;
  brandWithAgentContext: number;
  directToAgent: number;
  directToAgency: number;
  directToPrivate: number;
  directContextOnly: number;
  unknownRoute: number;
}

export interface LeadRoutingAuditAttentionLead {
  id: number;
  createdAt: string;
  name: string;
  email: string;
  routeType: 'brand' | 'direct' | 'unknown';
  recipientType: 'brand' | 'agent' | 'agency' | 'private' | 'context_only' | 'unknown';
  issue: 'brand_capture_only' | 'direct_context_without_owner' | 'unknown_route';
  leadSource: string;
  propertyId: number | null;
  developmentId: number | null;
}

export interface LeadRoutingAuditResult {
  generatedAt: string;
  days: number;
  summary: LeadRoutingAuditSummary;
  topSources: Array<{ source: string; count: number }>;
  attentionLeads: LeadRoutingAuditAttentionLead[];
}

interface LeadRoutingClassification {
  routeType: 'brand' | 'direct' | 'unknown';
  recipientType: 'brand' | 'agent' | 'agency' | 'private' | 'context_only' | 'unknown';
  normalizedSource: string;
  issue: LeadRoutingAuditAttentionLead['issue'] | null;
}

function normalizeSource(value?: string | null) {
  const normalized = (value || '').trim().toLowerCase();
  return normalized || 'unknown';
}

export function classifyLeadRouting(row: LeadRoutingAuditRow): LeadRoutingClassification {
  const normalizedSource = normalizeSource(row.leadSource || row.source);

  if (row.developerBrandProfileId) {
    return {
      routeType: 'brand',
      recipientType: 'brand',
      normalizedSource,
      issue: row.leadDeliveryMethod === 'none' ? 'brand_capture_only' : null,
    };
  }

  if (row.agentId) {
    return {
      routeType: 'direct',
      recipientType: 'agent',
      normalizedSource,
      issue: null,
    };
  }

  if (row.agencyId) {
    return {
      routeType: 'direct',
      recipientType: 'agency',
      normalizedSource,
      issue: null,
    };
  }

  if (row.propertyOwnerRole === 'visitor') {
    return {
      routeType: 'direct',
      recipientType: 'private',
      normalizedSource,
      issue: null,
    };
  }

  if (row.propertyId || row.developmentId) {
    return {
      routeType: 'direct',
      recipientType: 'context_only',
      normalizedSource,
      issue: 'direct_context_without_owner',
    };
  }

  return {
    routeType: 'unknown',
    recipientType: 'unknown',
    normalizedSource,
    issue: 'unknown_route',
  };
}

export function buildLeadRoutingAudit(
  rows: LeadRoutingAuditRow[],
  options: { days: number; attentionLimit: number },
): LeadRoutingAuditResult {
  const summary: LeadRoutingAuditSummary = {
    totalLeads: rows.length,
    brandRoute: 0,
    directRoute: 0,
    brandDeliveredEmail: 0,
    brandDeliveredSubscriber: 0,
    brandCapturedOnly: 0,
    brandWithAgentContext: 0,
    directToAgent: 0,
    directToAgency: 0,
    directToPrivate: 0,
    directContextOnly: 0,
    unknownRoute: 0,
  };

  const sourceCounts = new Map<string, number>();
  const attentionLeads: LeadRoutingAuditAttentionLead[] = [];

  for (const row of rows) {
    const classification = classifyLeadRouting(row);
    sourceCounts.set(
      classification.normalizedSource,
      (sourceCounts.get(classification.normalizedSource) || 0) + 1,
    );

    if (classification.routeType === 'brand') {
      summary.brandRoute += 1;
      if (row.leadDeliveryMethod === 'email') summary.brandDeliveredEmail += 1;
      if (row.leadDeliveryMethod === 'crm_export') summary.brandDeliveredSubscriber += 1;
      if (row.leadDeliveryMethod === 'none') summary.brandCapturedOnly += 1;
      if (row.agentId || row.agencyId) summary.brandWithAgentContext += 1;
    } else if (classification.routeType === 'direct') {
      summary.directRoute += 1;
      if (classification.recipientType === 'agent') summary.directToAgent += 1;
      if (classification.recipientType === 'agency') summary.directToAgency += 1;
      if (classification.recipientType === 'private') summary.directToPrivate += 1;
      if (classification.recipientType === 'context_only') summary.directContextOnly += 1;
    } else {
      summary.unknownRoute += 1;
    }

    if (classification.issue && attentionLeads.length < options.attentionLimit) {
      attentionLeads.push({
        id: row.id,
        createdAt: row.createdAt,
        name: row.name,
        email: row.email,
        routeType: classification.routeType,
        recipientType: classification.recipientType,
        issue: classification.issue,
        leadSource: classification.normalizedSource,
        propertyId: row.propertyId,
        developmentId: row.developmentId,
      });
    }
  }

  const topSources = Array.from(sourceCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  return {
    generatedAt: new Date().toISOString(),
    days: options.days,
    summary,
    topSources,
    attentionLeads,
  };
}

export async function getLeadRoutingAudit(input?: {
  days?: number;
  attentionLimit?: number;
}): Promise<LeadRoutingAuditResult> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const days = Math.min(Math.max(input?.days ?? 30, 1), 365);
  const attentionLimit = Math.min(Math.max(input?.attentionLimit ?? 10, 1), 50);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await db
    .select({
      id: leads.id,
      createdAt: leads.createdAt,
      name: leads.name,
      email: leads.email,
      propertyId: leads.propertyId,
      developmentId: leads.developmentId,
      agentId: leads.agentId,
      agencyId: leads.agencyId,
      developerBrandProfileId: leads.developerBrandProfileId,
      leadSource: leads.leadSource,
      source: leads.source,
      brandLeadStatus: leads.brandLeadStatus,
      leadDeliveryMethod: leads.leadDeliveryMethod,
      propertyOwnerId: properties.ownerId,
      propertyOwnerRole: users.role,
    })
    .from(leads)
    .leftJoin(properties, eq(leads.propertyId, properties.id))
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(gte(leads.createdAt, cutoff))
    .orderBy(desc(leads.createdAt));

  return buildLeadRoutingAudit(rows as LeadRoutingAuditRow[], { days, attentionLimit });
}
