/**
 * Lead Service
 * 
 * Handles lead capture, qualification, and management
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { db } from '../db';
import { leads } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface CreateLeadInput {
  developmentId: number;
  unitId?: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  
  // Affordability data (Requirements 5.3)
  affordabilityData?: {
    monthlyIncome: number;
    monthlyExpenses?: number;
    monthlyDebts?: number;
    availableDeposit?: number;
    maxAffordable: number;
    calculatedAt: string;
  };
  
  // Lead source tracking (Requirements 14.1, 14.2, 14.3, 14.4)
  leadSource?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface LeadQualificationResult {
  qualificationStatus: 'qualified' | 'partially_qualified' | 'unqualified' | 'pending';
  qualificationScore: number; // 0-100
  reasons: string[];
}

/**
 * Calculate lead qualification based on affordability match
 * Validates: Requirements 4.4, 4.5
 */
export function calculateLeadQualification(
  affordabilityData: CreateLeadInput['affordabilityData'],
  unitPrice?: number,
  developmentPriceRange?: { priceFrom: number; priceTo: number }
): LeadQualificationResult {
  const reasons: string[] = [];
  let score = 0;

  // No affordability data = pending qualification
  if (!affordabilityData) {
    return {
      qualificationStatus: 'pending',
      qualificationScore: 0,
      reasons: ['No affordability data provided'],
    };
  }

  const maxAffordable = affordabilityData.maxAffordable;

  // Check against specific unit price
  if (unitPrice) {
    const priceInCents = unitPrice * 100;
    const percentOfMax = (priceInCents / maxAffordable) * 100;

    if (percentOfMax <= 80) {
      score = 100;
      reasons.push('Buyer can comfortably afford this unit (within 80% of max)');
      return {
        qualificationStatus: 'qualified',
        qualificationScore: score,
        reasons,
      };
    } else if (percentOfMax <= 95) {
      score = 85;
      reasons.push('Buyer can afford this unit (within 95% of max)');
      return {
        qualificationStatus: 'qualified',
        qualificationScore: score,
        reasons,
      };
    } else if (percentOfMax <= 110) {
      score = 60;
      reasons.push('Unit is a stretch but potentially affordable');
      return {
        qualificationStatus: 'partially_qualified',
        qualificationScore: score,
        reasons,
      };
    } else {
      score = 30;
      reasons.push('Unit is currently out of reach');
      return {
        qualificationStatus: 'unqualified',
        qualificationScore: score,
        reasons,
      };
    }
  }

  // Check against development price range
  if (developmentPriceRange) {
    const priceFromCents = developmentPriceRange.priceFrom * 100;
    const priceToCents = developmentPriceRange.priceTo * 100;

    if (maxAffordable >= priceToCents) {
      score = 100;
      reasons.push('Buyer can afford all units in this development');
      return {
        qualificationStatus: 'qualified',
        qualificationScore: score,
        reasons,
      };
    } else if (maxAffordable >= priceFromCents) {
      score = 75;
      reasons.push('Buyer can afford some units in this development');
      return {
        qualificationStatus: 'qualified',
        qualificationScore: score,
        reasons,
      };
    } else if (maxAffordable >= priceFromCents * 0.8) {
      score = 50;
      reasons.push('Buyer is close to affording units in this development');
      return {
        qualificationStatus: 'partially_qualified',
        qualificationScore: score,
        reasons,
      };
    } else {
      score = 25;
      reasons.push('Development is currently out of reach');
      return {
        qualificationStatus: 'unqualified',
        qualificationScore: score,
        reasons,
      };
    }
  }

  // Default: has affordability data but no price to compare
  return {
    qualificationStatus: 'pending',
    qualificationScore: 50,
    reasons: ['Affordability calculated, awaiting unit selection'],
  };
}

/**
 * Create a new lead
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
export async function createLead(
  input: CreateLeadInput,
  unitPrice?: number,
  developmentPriceRange?: { priceFrom: number; priceTo: number }
) {
  // Calculate qualification
  const qualification = calculateLeadQualification(
    input.affordabilityData,
    unitPrice,
    developmentPriceRange
  );

  // Create lead record
  const [lead] = await db.insert(leads).values({
    developmentId: input.developmentId,
    unitId: input.unitId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
    
    // Affordability data
    affordabilityData: input.affordabilityData ? JSON.stringify(input.affordabilityData) : null,
    qualificationStatus: qualification.qualificationStatus,
    qualificationScore: qualification.qualificationScore,
    
    // Lead source tracking
    leadSource: input.leadSource || 'direct',
    referrerUrl: input.referrerUrl,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    
    // Funnel stage
    funnelStage: input.affordabilityData ? 'affordability' : 'interest',
    
    // Status
    status: 'new',
    leadType: 'inquiry',
  }).returning();

  return {
    lead,
    qualification,
  };
}

/**
 * Get leads for a development
 * Validates: Requirements 7.1, 7.2
 */
export async function getDevelopmentLeads(
  developmentId: number,
  filters?: {
    status?: string;
    qualificationStatus?: string;
    funnelStage?: string;
    assignedTo?: number;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  let query = db.select().from(leads).where(eq(leads.developmentId, developmentId));

  // Apply filters
  const conditions = [eq(leads.developmentId, developmentId)];

  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as any));
  }

  if (filters?.qualificationStatus) {
    conditions.push(eq(leads.qualificationStatus, filters.qualificationStatus as any));
  }

  if (filters?.funnelStage) {
    conditions.push(eq(leads.funnelStage, filters.funnelStage as any));
  }

  if (filters?.assignedTo) {
    conditions.push(eq(leads.assignedTo, filters.assignedTo));
  }

  const result = await db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));

  return result;
}

/**
 * Get lead by ID
 * Validates: Requirements 7.4, 7.5
 */
export async function getLeadById(leadId: number) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Parse affordability data if present
  if (lead.affordabilityData && typeof lead.affordabilityData === 'string') {
    lead.affordabilityData = JSON.parse(lead.affordabilityData);
  }

  return lead;
}

/**
 * Update lead status
 * Validates: Requirements 7.3
 */
export async function updateLeadStatus(
  leadId: number,
  status: 'new' | 'contacted' | 'qualified' | 'viewing_scheduled' | 'offer_sent' | 'converted' | 'closed' | 'lost',
  notes?: string
) {
  const updateData: any = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === 'contacted') {
    updateData.lastContactedAt = new Date().toISOString();
  }

  if (status === 'converted') {
    updateData.convertedAt = new Date().toISOString();
  }

  if (notes) {
    // Append notes to existing notes
    const [existingLead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (existingLead) {
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${notes}`;
      updateData.notes = existingLead.notes 
        ? `${existingLead.notes}\n${newNote}`
        : newNote;
    }
  }

  const [updatedLead] = await db
    .update(leads)
    .set(updateData)
    .where(eq(leads.id, leadId))
    .returning();

  return updatedLead;
}

/**
 * Assign lead to team member
 * Validates: Requirements 5.5, 6.3
 */
export async function assignLead(leadId: number, userId: number) {
  const [updatedLead] = await db
    .update(leads)
    .set({
      assignedTo: userId,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(leads.id, leadId))
    .returning();

  return updatedLead;
}

/**
 * Update lead funnel stage
 * Validates: Requirements 20.1, 20.2
 */
export async function updateLeadFunnelStage(
  leadId: number,
  funnelStage: 'interest' | 'affordability' | 'qualification' | 'viewing' | 'offer' | 'bond' | 'sale'
) {
  const [updatedLead] = await db
    .update(leads)
    .set({
      funnelStage,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(leads.id, leadId))
    .returning();

  return updatedLead;
}

/**
 * Get lead statistics for a development
 * Validates: Requirements 8.2
 */
export async function getDevelopmentLeadStats(developmentId: number) {
  const allLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.developmentId, developmentId));

  const stats = {
    total: allLeads.length,
    qualified: allLeads.filter((l: any) => l.qualificationStatus === 'qualified').length,
    partiallyQualified: allLeads.filter((l: any) => l.qualificationStatus === 'partially_qualified').length,
    unqualified: allLeads.filter((l: any) => l.qualificationStatus === 'unqualified').length,
    pending: allLeads.filter((l: any) => l.qualificationStatus === 'pending').length,
    converted: allLeads.filter((l: any) => l.status === 'converted').length,
    conversionRate: allLeads.length > 0 
      ? (allLeads.filter((l: any) => l.status === 'converted').length / allLeads.length) * 100 
      : 0,
    bySource: {} as Record<string, number>,
    byFunnelStage: {} as Record<string, number>,
  };

  // Group by source
  allLeads.forEach((lead: any) => {
    const source = lead.leadSource || 'unknown';
    stats.bySource[source] = (stats.bySource[source] || 0) + 1;
  });

  // Group by funnel stage
  allLeads.forEach((lead: any) => {
    const stage = lead.funnelStage || 'interest';
    stats.byFunnelStage[stage] = (stats.byFunnelStage[stage] || 0) + 1;
  });

  return stats;
}

export const leadService = {
  createLead,
  getDevelopmentLeads,
  getLeadById,
  updateLeadStatus,
  assignLead,
  updateLeadFunnelStage,
  getDevelopmentLeadStats,
  calculateLeadQualification,
};
