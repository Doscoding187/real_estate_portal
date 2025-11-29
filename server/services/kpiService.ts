/**
 * KPI Calculation Service for Mission Control Dashboard
 * Calculates and caches developer KPIs with 5-minute TTL
 * Requirements: 2.3, 2.4
 */

import { db } from '../db';
import { developers, developmentUnits, developments } from '../../drizzle/schema';
import { eq, and, gte, sql, count, avg } from 'drizzle-orm';
import type { DeveloperKPIs, DeveloperKPICache } from '../../shared/types';

const CACHE_TTL_MINUTES = 5;

interface TimeRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

/**
 * Get time range boundaries for KPI calculations
 */
function getTimeRange(range: '7d' | '30d' | '90d'): TimeRange {
  const now = new Date();
  const end = now;
  
  let daysBack: number;
  switch (range) {
    case '7d':
      daysBack = 7;
      break;
    case '30d':
      daysBack = 30;
      break;
    case '90d':
      daysBack = 90;
      break;
  }
  
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  
  // Previous period for trend comparison
  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - daysBack);
  
  return { start, end, previousStart, previousEnd };
}

/**
 * Check if cached KPIs are still valid
 */
function isCacheValid(lastCalculation: Date | null): boolean {
  if (!lastCalculation) return false;
  
  const now = new Date();
  const cacheAge = (now.getTime() - new Date(lastCalculation).getTime()) / 1000 / 60; // minutes
  
  return cacheAge < CACHE_TTL_MINUTES;
}

/**
 * Calculate total leads for a developer in a time range
 */
async function calculateTotalLeads(developerId: number, timeRange: TimeRange): Promise<{ current: number; previous: number }> {
  // Query leads table (from developer-lead-management feature)
  const currentLeads = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND created_at >= ${timeRange.start}
    AND created_at <= ${timeRange.end}
  `);
  
  const previousLeads = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND created_at >= ${timeRange.previousStart}
    AND created_at < ${timeRange.previousEnd}
  `);
  
  return {
    current: Number((currentLeads.rows[0] as any)?.count || 0),
    previous: Number((previousLeads.rows[0] as any)?.count || 0),
  };
}

/**
 * Calculate qualified leads percentage
 */
async function calculateQualifiedLeads(developerId: number, timeRange: TimeRange): Promise<{ current: number; previous: number }> {
  const currentQualified = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND status IN ('qualified', 'viewing_scheduled', 'offer_made', 'converted')
    AND created_at >= ${timeRange.start}
    AND created_at <= ${timeRange.end}
  `);
  
  const previousQualified = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND status IN ('qualified', 'viewing_scheduled', 'offer_made', 'converted')
    AND created_at >= ${timeRange.previousStart}
    AND created_at < ${timeRange.previousEnd}
  `);
  
  return {
    current: Number((currentQualified.rows[0] as any)?.count || 0),
    previous: Number((previousQualified.rows[0] as any)?.count || 0),
  };
}

/**
 * Calculate conversion rate (leads to sales)
 */
async function calculateConversionRate(developerId: number, timeRange: TimeRange): Promise<{ current: number; previous: number }> {
  const currentConverted = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND status = 'converted'
    AND created_at >= ${timeRange.start}
    AND created_at <= ${timeRange.end}
  `);
  
  const currentTotal = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND created_at >= ${timeRange.start}
    AND created_at <= ${timeRange.end}
  `);
  
  const previousConverted = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND status = 'converted'
    AND created_at >= ${timeRange.previousStart}
    AND created_at < ${timeRange.previousEnd}
  `);
  
  const previousTotal = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND created_at >= ${timeRange.previousStart}
    AND created_at < ${timeRange.previousEnd}
  `);
  
  const currentRate = Number((currentTotal.rows[0] as any)?.count || 0) > 0
    ? (Number((currentConverted.rows[0] as any)?.count || 0) / Number((currentTotal.rows[0] as any)?.count || 1)) * 100
    : 0;
    
  const previousRate = Number((previousTotal.rows[0] as any)?.count || 0) > 0
    ? (Number((previousConverted.rows[0] as any)?.count || 0) / Number((previousTotal.rows[0] as any)?.count || 1)) * 100
    : 0;
  
  return {
    current: Math.round(currentRate * 10) / 10, // Round to 1 decimal
    previous: Math.round(previousRate * 10) / 10,
  };
}

/**
 * Calculate units sold vs available
 */
async function calculateUnitsMetrics(developerId: number): Promise<{ sold: number; available: number }> {
  const units = await db
    .select({
      sold: count(sql`CASE WHEN status = 'sold' THEN 1 END`),
      available: count(sql`CASE WHEN status = 'available' THEN 1 END`),
    })
    .from(developmentUnits)
    .innerJoin(developments, eq(developments.id, developmentUnits.developmentId))
    .where(eq(developments.developerId, developerId));
  
  return {
    sold: Number(units[0]?.sold || 0),
    available: Number(units[0]?.available || 0),
  };
}

/**
 * Calculate affordability match percentage
 */
async function calculateAffordabilityMatch(developerId: number, timeRange: TimeRange): Promise<{ current: number; previous: number }> {
  // Calculate percentage of leads that have affordability match
  const currentMatched = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND affordability_match_percentage >= 80
    AND created_at >= ${timeRange.start}
    AND created_at <= ${timeRange.end}
  `);
  
  const currentTotal = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND affordability_match_percentage IS NOT NULL
    AND created_at >= ${timeRange.start}
    AND created_at <= ${timeRange.end}
  `);
  
  const previousMatched = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND affordability_match_percentage >= 80
    AND created_at >= ${timeRange.previousStart}
    AND created_at < ${timeRange.previousEnd}
  `);
  
  const previousTotal = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM developer_leads
    WHERE developer_id = ${developerId}
    AND affordability_match_percentage IS NOT NULL
    AND created_at >= ${timeRange.previousStart}
    AND created_at < ${timeRange.previousEnd}
  `);
  
  const currentRate = Number((currentTotal.rows[0] as any)?.count || 0) > 0
    ? (Number((currentMatched.rows[0] as any)?.count || 0) / Number((currentTotal.rows[0] as any)?.count || 1)) * 100
    : 0;
    
  const previousRate = Number((previousTotal.rows[0] as any)?.count || 0) > 0
    ? (Number((previousMatched.rows[0] as any)?.count || 0) / Number((previousTotal.rows[0] as any)?.count || 1)) * 100
    : 0;
  
  return {
    current: Math.round(currentRate * 10) / 10,
    previous: Math.round(previousRate * 10) / 10,
  };
}

/**
 * Calculate marketing performance score
 * Based on: lead quality, conversion rate, response time, engagement
 */
async function calculateMarketingScore(developerId: number, timeRange: TimeRange): Promise<{ current: number; previous: number }> {
  // Simplified scoring algorithm (0-100)
  // In production, this would be more sophisticated
  
  const conversionRate = await calculateConversionRate(developerId, timeRange);
  const qualifiedLeads = await calculateQualifiedLeads(developerId, timeRange);
  const totalLeads = await calculateTotalLeads(developerId, timeRange);
  
  const currentQualifiedRate = totalLeads.current > 0
    ? (qualifiedLeads.current / totalLeads.current) * 100
    : 0;
    
  const previousQualifiedRate = totalLeads.previous > 0
    ? (qualifiedLeads.previous / totalLeads.previous) * 100
    : 0;
  
  // Score = (conversion rate * 0.5) + (qualified rate * 0.5)
  const currentScore = (conversionRate.current * 0.5) + (currentQualifiedRate * 0.5);
  const previousScore = (conversionRate.previous * 0.5) + (previousQualifiedRate * 0.5);
  
  return {
    current: Math.round(currentScore * 10) / 10,
    previous: Math.round(previousScore * 10) / 10,
  };
}

/**
 * Calculate percentage change between current and previous period
 */
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Calculate all KPIs for a developer
 */
export async function calculateKPIs(
  developerId: number,
  timeRange: '7d' | '30d' | '90d' = '30d'
): Promise<DeveloperKPIs> {
  const range = getTimeRange(timeRange);
  
  // Calculate all metrics in parallel
  const [
    totalLeads,
    qualifiedLeads,
    conversionRate,
    unitsMetrics,
    affordabilityMatch,
    marketingScore,
  ] = await Promise.all([
    calculateTotalLeads(developerId, range),
    calculateQualifiedLeads(developerId, range),
    calculateConversionRate(developerId, range),
    calculateUnitsMetrics(developerId),
    calculateAffordabilityMatch(developerId, range),
    calculateMarketingScore(developerId, range),
  ]);
  
  return {
    totalLeads: totalLeads.current,
    qualifiedLeads: qualifiedLeads.current,
    conversionRate: conversionRate.current,
    unitsSold: unitsMetrics.sold,
    unitsAvailable: unitsMetrics.available,
    affordabilityMatchPercent: affordabilityMatch.current,
    marketingPerformanceScore: marketingScore.current,
    trends: {
      totalLeads: calculateTrend(totalLeads.current, totalLeads.previous),
      qualifiedLeads: calculateTrend(qualifiedLeads.current, qualifiedLeads.previous),
      conversionRate: calculateTrend(conversionRate.current, conversionRate.previous),
      unitsSold: 0, // Units sold doesn't have time-based trend in this implementation
      affordabilityMatchPercent: calculateTrend(affordabilityMatch.current, affordabilityMatch.previous),
      marketingPerformanceScore: calculateTrend(marketingScore.current, marketingScore.previous),
    },
  };
}

/**
 * Get KPIs with caching
 */
export async function getKPIsWithCache(
  developerId: number,
  timeRange: '7d' | '30d' | '90d' = '30d',
  forceRefresh: boolean = false
): Promise<DeveloperKPIs> {
  // Get developer with cache data
  const [developer] = await db
    .select()
    .from(developers)
    .where(eq(developers.id, developerId))
    .limit(1);
  
  if (!developer) {
    throw new Error(`Developer ${developerId} not found`);
  }
  
  // Check if cache is valid
  if (!forceRefresh && developer.kpiCache && developer.lastKpiCalculation) {
    const cache = developer.kpiCache as DeveloperKPICache;
    
    if (cache.timeRange === timeRange && isCacheValid(developer.lastKpiCalculation)) {
      console.log(`Using cached KPIs for developer ${developerId}`);
      return cache.kpis;
    }
  }
  
  // Calculate fresh KPIs
  console.log(`Calculating fresh KPIs for developer ${developerId}`);
  const kpis = await calculateKPIs(developerId, timeRange);
  
  // Update cache
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MINUTES * 60 * 1000);
  
  const cacheData: DeveloperKPICache = {
    kpis,
    timeRange,
    calculatedAt: now,
    expiresAt,
  };
  
  await db
    .update(developers)
    .set({
      kpiCache: cacheData as any,
      lastKpiCalculation: now.toISOString(),
    })
    .where(eq(developers.id, developerId));
  
  return kpis;
}

/**
 * Invalidate KPI cache for a developer
 */
export async function invalidateKPICache(developerId: number): Promise<void> {
  await db
    .update(developers)
    .set({
      kpiCache: null,
      lastKpiCalculation: null,
    })
    .where(eq(developers.id, developerId));
}
