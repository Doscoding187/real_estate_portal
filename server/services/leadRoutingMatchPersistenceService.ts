import { desc, eq } from 'drizzle-orm';
import { leadDevelopmentMatches, leadEvents } from '../../drizzle/schema';
import { getDb } from '../db';
import type { RecordLeadDevelopmentMatchesInput } from '../../shared/leadRouting';

type LeadDevelopmentMatchInsert = typeof leadDevelopmentMatches.$inferInsert;

type StoredLeadDevelopmentMatch = {
  id: number;
  developmentId: number;
  matchScore: number;
  matchLabel: string;
  incomeEligible: boolean;
  locationMatch: boolean;
  campaignEligible: boolean;
  distributionReady: boolean;
  submissionAllowed: boolean;
  selectedByBuyer: boolean;
};

function tinyInt(value: boolean | undefined | null): number {
  return value ? 1 : 0;
}

function scoreToDecimal(score: number): string {
  const safeScore = Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  return safeScore.toFixed(4);
}

function boolFromTinyInt(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function buildLeadDevelopmentMatchRows(
  input: RecordLeadDevelopmentMatchesInput,
): LeadDevelopmentMatchInsert[] {
  return input.matches.map(match => ({
    buyerLeadId: input.buyerLeadId,
    sessionId: input.sessionId ?? null,
    campaignId: input.campaignId ?? null,
    developmentId: match.developmentId,
    matchScore: scoreToDecimal(match.matchScore),
    matchLabel: match.matchLabel,
    matchReasons: match.matchReasons ?? null,
    incomeEligible: tinyInt(match.incomeEligible),
    locationMatch: tinyInt(match.locationMatch),
    campaignEligible: tinyInt(match.campaignEligible),
    distributionReady: tinyInt(match.distributionReady),
    submissionAllowed: tinyInt(match.submissionAllowed),
    selectedByBuyer: tinyInt(match.developmentId === input.selectedDevelopmentId),
  }));
}

export async function recordLeadDevelopmentMatches(input: RecordLeadDevelopmentMatchesInput) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const rows = buildLeadDevelopmentMatchRows(input);

  await db
    .delete(leadDevelopmentMatches)
    .where(eq(leadDevelopmentMatches.buyerLeadId, input.buyerLeadId));
  await db.insert(leadDevelopmentMatches).values(rows);

  const storedRows = await db
    .select({
      id: leadDevelopmentMatches.id,
      developmentId: leadDevelopmentMatches.developmentId,
      matchScore: leadDevelopmentMatches.matchScore,
      matchLabel: leadDevelopmentMatches.matchLabel,
      incomeEligible: leadDevelopmentMatches.incomeEligible,
      locationMatch: leadDevelopmentMatches.locationMatch,
      campaignEligible: leadDevelopmentMatches.campaignEligible,
      distributionReady: leadDevelopmentMatches.distributionReady,
      submissionAllowed: leadDevelopmentMatches.submissionAllowed,
      selectedByBuyer: leadDevelopmentMatches.selectedByBuyer,
    })
    .from(leadDevelopmentMatches)
    .where(eq(leadDevelopmentMatches.buyerLeadId, input.buyerLeadId))
    .orderBy(desc(leadDevelopmentMatches.matchScore));

  const matches: StoredLeadDevelopmentMatch[] = storedRows.map(row => ({
    id: row.id,
    developmentId: row.developmentId,
    matchScore: Number(row.matchScore ?? 0),
    matchLabel: row.matchLabel,
    incomeEligible: boolFromTinyInt(row.incomeEligible),
    locationMatch: boolFromTinyInt(row.locationMatch),
    campaignEligible: boolFromTinyInt(row.campaignEligible),
    distributionReady: boolFromTinyInt(row.distributionReady),
    submissionAllowed: boolFromTinyInt(row.submissionAllowed),
    selectedByBuyer: boolFromTinyInt(row.selectedByBuyer),
  }));

  const selectedMatch = matches.find(match => match.selectedByBuyer) ?? null;

  await db.insert(leadEvents).values({
    buyerLeadId: input.buyerLeadId,
    sessionId: input.sessionId ?? null,
    campaignId: input.campaignId ?? null,
    sourceType: input.sourceType ?? 'direct',
    eventType: 'matches_generated',
    payload: {
      matchCount: matches.length,
      selectedDevelopmentId: input.selectedDevelopmentId ?? null,
      selectedMatchId: selectedMatch?.id ?? null,
    },
  });

  if (selectedMatch) {
    await db.insert(leadEvents).values({
      buyerLeadId: input.buyerLeadId,
      sessionId: input.sessionId ?? null,
      campaignId: input.campaignId ?? null,
      sourceType: input.sourceType ?? 'direct',
      eventType: 'development_selected',
      payload: {
        selectedMatchId: selectedMatch.id,
        selectedDevelopmentId: selectedMatch.developmentId,
      },
    });
  }

  return {
    selectedMatchId: selectedMatch?.id ?? null,
    matches,
  };
}
