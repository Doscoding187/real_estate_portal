import { and, desc, eq, gte, inArray, like } from 'drizzle-orm';
import { getDb } from '../db';
import { leadActivities, leads, properties, users } from '../../drizzle/schema';
import {
  classifyLeadRouting,
  type LeadRoutingAuditRow,
} from './leadRoutingAuditService';

type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'closed'
  | 'viewing_scheduled'
  | 'offer_sent'
  | 'lost'
  | null;

interface LeadRoutingConversionRow extends LeadRoutingAuditRow {
  status: LeadStatus;
  corrected: boolean;
}

export interface LeadRoutingConversionBucket {
  key: string;
  routeType: 'brand' | 'direct' | 'unknown';
  recipientType: 'brand' | 'agent' | 'agency' | 'private' | 'context_only' | 'unknown';
  totalLeads: number;
  correctedLeads: number;
  qualifiedLeads: number;
  viewingLeads: number;
  offerLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
}

export interface LeadRoutingConversionSummary {
  totalLeads: number;
  correctedLeads: number;
  convertedLeads: number;
  correctedConvertedLeads: number;
  qualifiedLeads: number;
  viewingLeads: number;
  offerLeads: number;
  lostLeads: number;
  conversionRate: number;
  correctedConversionRate: number;
}

export interface LeadRoutingConversionReport {
  generatedAt: string;
  days: number;
  summary: LeadRoutingConversionSummary;
  sourceBreakdown: Array<{
    source: string;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
  }>;
  routeBreakdown: LeadRoutingConversionBucket[];
}

function hasQualified(status: LeadStatus) {
  return status === 'qualified' || status === 'viewing_scheduled' || status === 'offer_sent' || status === 'converted' || status === 'closed';
}

function hasViewing(status: LeadStatus) {
  return status === 'viewing_scheduled' || status === 'offer_sent' || status === 'converted' || status === 'closed';
}

function hasOffer(status: LeadStatus) {
  return status === 'offer_sent' || status === 'converted' || status === 'closed';
}

function hasConverted(status: LeadStatus) {
  return status === 'converted' || status === 'closed';
}

function asPercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function buildLeadRoutingConversionReport(
  rows: LeadRoutingConversionRow[],
  options: { days: number },
): LeadRoutingConversionReport {
  const summary: LeadRoutingConversionSummary = {
    totalLeads: rows.length,
    correctedLeads: 0,
    convertedLeads: 0,
    correctedConvertedLeads: 0,
    qualifiedLeads: 0,
    viewingLeads: 0,
    offerLeads: 0,
    lostLeads: 0,
    conversionRate: 0,
    correctedConversionRate: 0,
  };

  const routeBuckets = new Map<string, LeadRoutingConversionBucket>();
  const sourceBuckets = new Map<string, { totalLeads: number; convertedLeads: number }>();

  for (const row of rows) {
    const classification = classifyLeadRouting(row);
    const key = `${classification.routeType}:${classification.recipientType}`;
    const bucket =
      routeBuckets.get(key) ||
      {
        key,
        routeType: classification.routeType,
        recipientType: classification.recipientType,
        totalLeads: 0,
        correctedLeads: 0,
        qualifiedLeads: 0,
        viewingLeads: 0,
        offerLeads: 0,
        convertedLeads: 0,
        lostLeads: 0,
        conversionRate: 0,
      };

    bucket.totalLeads += 1;
    if (row.corrected) bucket.correctedLeads += 1;
    if (hasQualified(row.status)) bucket.qualifiedLeads += 1;
    if (hasViewing(row.status)) bucket.viewingLeads += 1;
    if (hasOffer(row.status)) bucket.offerLeads += 1;
    if (hasConverted(row.status)) bucket.convertedLeads += 1;
    if (row.status === 'lost') bucket.lostLeads += 1;
    routeBuckets.set(key, bucket);

    const source = classification.normalizedSource;
    const sourceBucket = sourceBuckets.get(source) || { totalLeads: 0, convertedLeads: 0 };
    sourceBucket.totalLeads += 1;
    if (hasConverted(row.status)) sourceBucket.convertedLeads += 1;
    sourceBuckets.set(source, sourceBucket);

    if (row.corrected) summary.correctedLeads += 1;
    if (hasConverted(row.status)) summary.convertedLeads += 1;
    if (row.corrected && hasConverted(row.status)) summary.correctedConvertedLeads += 1;
    if (hasQualified(row.status)) summary.qualifiedLeads += 1;
    if (hasViewing(row.status)) summary.viewingLeads += 1;
    if (hasOffer(row.status)) summary.offerLeads += 1;
    if (row.status === 'lost') summary.lostLeads += 1;
  }

  const routeBreakdown = Array.from(routeBuckets.values())
    .map(bucket => ({
      ...bucket,
      conversionRate: asPercent(bucket.convertedLeads, bucket.totalLeads),
    }))
    .sort((left, right) => {
      if (right.convertedLeads !== left.convertedLeads) {
        return right.convertedLeads - left.convertedLeads;
      }
      return right.totalLeads - left.totalLeads;
    });

  const sourceBreakdown = Array.from(sourceBuckets.entries())
    .map(([source, bucket]) => ({
      source,
      totalLeads: bucket.totalLeads,
      convertedLeads: bucket.convertedLeads,
      conversionRate: asPercent(bucket.convertedLeads, bucket.totalLeads),
    }))
    .sort((left, right) => right.totalLeads - left.totalLeads)
    .slice(0, 6);

  summary.conversionRate = asPercent(summary.convertedLeads, summary.totalLeads);
  summary.correctedConversionRate = asPercent(summary.correctedConvertedLeads, summary.correctedLeads);

  return {
    generatedAt: new Date().toISOString(),
    days: options.days,
    summary,
    sourceBreakdown,
    routeBreakdown,
  };
}

export async function getLeadRoutingConversionReport(input?: {
  days?: number;
}): Promise<LeadRoutingConversionReport> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const days = Math.min(Math.max(input?.days ?? 30, 1), 365);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const leadRows = await db
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
      status: leads.status,
    })
    .from(leads)
    .leftJoin(properties, eq(leads.propertyId, properties.id))
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(gte(leads.createdAt, cutoff))
    .orderBy(desc(leads.createdAt));

  const leadIds = leadRows.map(row => Number(row.id)).filter(Boolean);
  const correctedLeadIds = new Set<number>();

  if (leadIds.length > 0) {
    const correctionRows = await db
      .select({
        leadId: leadActivities.leadId,
      })
      .from(leadActivities)
      .where(
        and(
          inArray(leadActivities.leadId, leadIds),
          eq(leadActivities.type, 'note'),
          like(leadActivities.description, 'Lead routing corrected%'),
        ),
      );

    for (const row of correctionRows) {
      correctedLeadIds.add(Number(row.leadId));
    }
  }

  const rows: LeadRoutingConversionRow[] = leadRows.map(row => ({
    ...(row as unknown as LeadRoutingAuditRow),
    status: (row.status as LeadStatus) || null,
    corrected: correctedLeadIds.has(Number(row.id)),
  }));

  return buildLeadRoutingConversionReport(rows, { days });
}
