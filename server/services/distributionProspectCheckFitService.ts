import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  distributionProspectCheckFitMatches,
  distributionProspectCheckFits,
} from '../../drizzle/schema';
import {
  calculatePurchaseCapacity,
  CHECKFIT_RATE_SOURCE_KEY,
  CHECKFIT_RATE_SOURCE_LABEL,
  resolveCheckfitRate,
} from './checkfitPolicy';

type DbHandle = any;

/**
 * The referrer prospect check fit is the first gate of a referral: a
 * referrer says they have a prospect, and before any personal detail is
 * collected the gross income is tested against the approved purchase
 * assumptions. It prunes referrals that cannot reach any current opportunity
 * and names the developments the prospect may qualify for.
 *
 * The assumptions are approved and versioned. The interest rate is the
 * canonical SARB prime rate with no added margin; the term is 240 months; the
 * repayment allowance is 30% of gross income less declared monthly debts. A
 * joint application is one combined assessment over the combined gross
 * income, because that is how a lender assesses a joint application.
 *
 * The check fit is a pre-qualification estimate on the referrer's own
 * statement. It is not a credit decision, it does not verify the prospect, and
 * it never stores the prospect's identity: the information sheet, identity
 * document and signed consent are collected in the guided referral step that
 * follows.
 */
export const PROSPECT_CHECK_FIT_POLICY = Object.freeze({
  version: 'prospect_check_fit_v1' as const,
  termMonths: 240,
  repaymentAllowanceRatio: 0.3,
  rateSourceKey: CHECKFIT_RATE_SOURCE_KEY,
  rateSourceLabel: CHECKFIT_RATE_SOURCE_LABEL,
  approvalReference: 'EDWARD-CHECKFIT-MODEL-2026-10-21',
  maxApplicants: 2,
  maxStoredMatches: 50,
});

export const PROSPECT_CHECK_FIT_DISCLAIMERS = Object.freeze([
  'Indicative pre-qualification only. Not a final bond approval.',
  'This is an estimate based on the income you provided and the stated assumptions. It is not a credit decision, lending decision, guaranteed finance offer, or bond approval. A lender or authorised financial provider makes its own assessment.',
  'The final affordability assessment is completed by the Property Listify distribution manager once the prospect has submitted their documents and signed their consent.',
]);

export const prospectCheckFitInputSchema = z.object({
  prospectName: z.string().trim().min(1).max(200),
  grossIncomeMonthly: z.number().int().positive().max(100_000_000),
  coApplicantName: z.string().trim().min(1).max(200).optional(),
  coApplicantGrossIncomeMonthly: z.number().int().positive().max(100_000_000).optional(),
});

export type ProspectCheckFitInput = z.input<typeof prospectCheckFitInputSchema>;

export type ProspectCheckFitAssumptions = {
  policyVersion: typeof PROSPECT_CHECK_FIT_POLICY.version;
  approvalReference: string;
  annualInterestRate: number;
  rateSource: string;
  rateSourceLabel: string;
  rateUpdatedAt: string | null;
  termMonths: number;
  repaymentAllowanceRatio: number;
  applicantCount: number;
  jointAssessment: boolean;
};

export type ProspectCheckFitOutputs = {
  combinedGrossIncomeMonthly: number;
  repaymentAllowanceMonthly: number;
  estimatedLoanAmount: number;
  estimatedPurchasePrice: number;
  qualifiedDevelopmentCount: number;
};

export type ProspectCheckFitMatch = {
  developmentId: number;
  programId: number;
  developmentName: string;
  city: string;
  province: string;
  entryPrice: number;
  currencyCode: string;
  qualified: boolean;
  matchRank: number;
};

export type ProspectCheckFitRecord = {
  id: string;
  actorUserId: number;
  prospectName: string | null;
  coApplicantName: string | null;
  grossIncomeMonthly: number;
  coApplicantGrossIncomeMonthly: number | null;
  combinedGrossIncomeMonthly: number;
  policyVersion: string;
  assumptions: ProspectCheckFitAssumptions;
  outputs: ProspectCheckFitOutputs;
  matches: ProspectCheckFitMatch[];
  lockedAt: string | null;
  lockedByDealId: number | null;
  createdAt: string;
};

export type QualifiedOpportunity = {
  developmentId: number;
  programId: number;
  developmentName: string;
  city: string;
  province: string;
  entryPrice: number;
  currencyCode: string;
};

function toSqlDateTime(input: Date): string {
  return input.toISOString().slice(0, 19).replace('T', ' ');
}

export function calculateProspectCheckFit(input: {
  grossIncomeMonthly: number;
  coApplicantGrossIncomeMonthly?: number | null;
  monthlyDebts?: number;
  annualInterestRate: number;
  rateUpdatedAt: string | null;
}): {
  assumptions: ProspectCheckFitAssumptions;
  outputs: ProspectCheckFitOutputs;
} {
  const monthlyDebts = Math.max(0, Math.trunc(input.monthlyDebts ?? 0));
  const coApplicant = input.coApplicantGrossIncomeMonthly ?? null;
  const jointAssessment = coApplicant !== null && coApplicant > 0;
  const combinedGrossIncomeMonthly =
    Math.trunc(input.grossIncomeMonthly) + (jointAssessment ? Math.trunc(coApplicant) : 0);

  const capacity = calculatePurchaseCapacity({
    grossMonthlyIncome: combinedGrossIncomeMonthly,
    monthlyDebts,
    annualInterestRate: input.annualInterestRate,
    termMonths: PROSPECT_CHECK_FIT_POLICY.termMonths,
    repaymentAllowanceRatio: PROSPECT_CHECK_FIT_POLICY.repaymentAllowanceRatio,
  });

  return {
    assumptions: {
      policyVersion: PROSPECT_CHECK_FIT_POLICY.version,
      approvalReference: PROSPECT_CHECK_FIT_POLICY.approvalReference,
      annualInterestRate: input.annualInterestRate,
      rateSource: PROSPECT_CHECK_FIT_POLICY.rateSourceKey,
      rateSourceLabel: PROSPECT_CHECK_FIT_POLICY.rateSourceLabel,
      rateUpdatedAt: input.rateUpdatedAt,
      termMonths: PROSPECT_CHECK_FIT_POLICY.termMonths,
      repaymentAllowanceRatio: PROSPECT_CHECK_FIT_POLICY.repaymentAllowanceRatio,
      applicantCount: jointAssessment ? 2 : 1,
      jointAssessment,
    },
    outputs: {
      combinedGrossIncomeMonthly,
      repaymentAllowanceMonthly: capacity.repaymentAllowanceMonthly,
      estimatedLoanAmount: capacity.estimatedLoanAmount,
      estimatedPurchasePrice: capacity.estimatedLoanAmount,
      qualifiedDevelopmentCount: 0,
    },
  };
}

/**
 * A development qualifies when its current entry price is within the
 * estimated purchase price. The entry price is the cheapest published sale
 * price in the developer projection, so the referrer is told the honest
 * floor of the opportunity rather than a brochure headline.
 */
export function buildProspectCheckFitMatches(
  opportunities: QualifiedOpportunity[],
  estimatedPurchasePrice: number,
): ProspectCheckFitMatch[] {
  return opportunities
    .filter(opportunity => opportunity.entryPrice > 0)
    .map(opportunity => ({
      developmentId: opportunity.developmentId,
      programId: opportunity.programId,
      developmentName: opportunity.developmentName,
      city: opportunity.city,
      province: opportunity.province,
      entryPrice: opportunity.entryPrice,
      currencyCode: opportunity.currencyCode,
      qualified: opportunity.entryPrice <= estimatedPurchasePrice,
      matchRank: 0,
    }))
    .sort((left, right) => {
      if (left.qualified !== right.qualified) return left.qualified ? -1 : 1;
      if (left.entryPrice !== right.entryPrice) return left.entryPrice - right.entryPrice;
      return left.developmentName.localeCompare(right.developmentName);
    })
    .slice(0, PROSPECT_CHECK_FIT_POLICY.maxStoredMatches)
    .map((match, index) => ({ ...match, matchRank: index + 1 }));
}

export async function createProspectCheckFit(input: {
  db: DbHandle;
  actorUserId: number;
  checkFit: ProspectCheckFitInput;
  opportunities: QualifiedOpportunity[];
}): Promise<ProspectCheckFitRecord> {
  const rate = await resolveCheckfitRate(input.db);
  if (!rate) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'The check fit is temporarily unavailable because the current prime rate is not configured.',
    });
  }

  const { assumptions, outputs } = calculateProspectCheckFit({
    grossIncomeMonthly: input.checkFit.grossIncomeMonthly,
    coApplicantGrossIncomeMonthly: input.checkFit.coApplicantGrossIncomeMonthly ?? null,
    annualInterestRate: rate.annualInterestRate,
    rateUpdatedAt: rate.rateUpdatedAt,
  });
  const matches = buildProspectCheckFitMatches(
    input.opportunities,
    outputs.estimatedPurchasePrice,
  );
  const qualifiedDevelopmentCount = matches.filter(match => match.qualified).length;

  const id = randomUUID();
  const now = toSqlDateTime(new Date());
  const combinedGrossIncomeMonthly = outputs.combinedGrossIncomeMonthly;

  await input.db.transaction(async (tx: any) => {
    await tx.insert(distributionProspectCheckFits).values({
      id,
      actorUserId: input.actorUserId,
      prospectName: input.checkFit.prospectName.trim(),
      grossIncomeMonthly: Math.trunc(input.checkFit.grossIncomeMonthly),
      coApplicantName: input.checkFit.coApplicantName?.trim() || null,
      coApplicantGrossIncomeMonthly: input.checkFit.coApplicantGrossIncomeMonthly
        ? Math.trunc(input.checkFit.coApplicantGrossIncomeMonthly)
        : null,
      combinedGrossIncomeMonthly,
      policyVersion: assumptions.policyVersion,
      assumptionsJson: assumptions,
      outputsJson: { ...outputs, qualifiedDevelopmentCount },
      createdAt: now,
      updatedAt: now,
    });
    if (matches.length) {
      await tx.insert(distributionProspectCheckFitMatches).values(
        matches.map(match => ({
          id: randomUUID(),
          checkFitId: id,
          programId: match.programId,
          developmentId: match.developmentId,
          developmentName: match.developmentName,
          city: match.city,
          province: match.province,
          entryPrice: match.entryPrice,
          currencyCode: match.currencyCode,
          qualified: match.qualified ? 1 : 0,
          matchRank: match.matchRank,
          observedAt: now,
          createdAt: now,
        })),
      );
    }
  });

  return {
    id,
    actorUserId: input.actorUserId,
    prospectName: input.checkFit.prospectName.trim(),
    coApplicantName: input.checkFit.coApplicantName?.trim() || null,
    grossIncomeMonthly: Math.trunc(input.checkFit.grossIncomeMonthly),
    coApplicantGrossIncomeMonthly: input.checkFit.coApplicantGrossIncomeMonthly
      ? Math.trunc(input.checkFit.coApplicantGrossIncomeMonthly)
      : null,
    combinedGrossIncomeMonthly,
    policyVersion: assumptions.policyVersion,
    assumptions,
    outputs: { ...outputs, qualifiedDevelopmentCount },
    matches,
    lockedAt: null,
    lockedByDealId: null,
    createdAt: now,
  };
}

function toRecord(row: any, matches: ProspectCheckFitMatch[]): ProspectCheckFitRecord {
  const outputs = (row.outputsJson || {}) as ProspectCheckFitOutputs;
  return {
    id: String(row.id),
    actorUserId: Number(row.actorUserId),
    prospectName: row.prospectName || null,
    coApplicantName: row.coApplicantName || null,
    grossIncomeMonthly: Number(row.grossIncomeMonthly),
    coApplicantGrossIncomeMonthly: row.coApplicantGrossIncomeMonthly
      ? Number(row.coApplicantGrossIncomeMonthly)
      : null,
    combinedGrossIncomeMonthly: Number(row.combinedGrossIncomeMonthly),
    policyVersion: String(row.policyVersion),
    assumptions: row.assumptionsJson as ProspectCheckFitAssumptions,
    outputs,
    matches,
    lockedAt: row.lockedAt || null,
    lockedByDealId: row.lockedByDealId ? Number(row.lockedByDealId) : null,
    createdAt: String(row.createdAt),
  };
}

async function readProspectCheckFitMatches(
  db: DbHandle,
  checkFitIds: string[],
): Promise<Map<string, ProspectCheckFitMatch[]>> {
  const matchesByCheckFit = new Map<string, ProspectCheckFitMatch[]>();
  if (!checkFitIds.length) return matchesByCheckFit;

  const matchRows = await db
    .select()
    .from(distributionProspectCheckFitMatches)
    .where(
      inArray(
        distributionProspectCheckFitMatches.checkFitId,
        checkFitIds,
      ),
    );

  for (const match of matchRows) {
    const checkFitId = String(match.checkFitId);
    const list = matchesByCheckFit.get(checkFitId) || [];
    list.push({
      developmentId: Number(match.developmentId),
      programId: Number(match.programId),
      developmentName: String(match.developmentName),
      city: String(match.city || ''),
      province: String(match.province || ''),
      entryPrice: Number(match.entryPrice),
      currencyCode: String(match.currencyCode || 'ZAR'),
      qualified: Number(match.qualified) === 1,
      matchRank: Number(match.matchRank),
    });
    matchesByCheckFit.set(checkFitId, list);
  }
  return matchesByCheckFit;
}

export async function listProspectCheckFits(input: {
  db: DbHandle;
  actorUserId: number;
  limit?: number;
}): Promise<ProspectCheckFitRecord[]> {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 20), 1), 100);
  const rows = await input.db
    .select()
    .from(distributionProspectCheckFits)
    .where(eq(distributionProspectCheckFits.actorUserId, input.actorUserId))
    .orderBy(desc(distributionProspectCheckFits.createdAt))
    .limit(limit);

  if (!rows.length) return [];
  const matchesByCheckFit = await readProspectCheckFitMatches(
    input.db,
    rows.map(row => String(row.id)),
  );

  return rows.map(row =>
    toRecord(
      row,
      (matchesByCheckFit.get(String(row.id)) || []).sort((a, b) => a.matchRank - b.matchRank),
    ),
  );
}

export async function getProspectCheckFit(input: {
  db: DbHandle;
  actorUserId: number;
  checkFitId: string;
}): Promise<ProspectCheckFitRecord | null> {
  const [row] = await input.db
    .select()
    .from(distributionProspectCheckFits)
    .where(
      and(
        eq(distributionProspectCheckFits.id, input.checkFitId),
        eq(distributionProspectCheckFits.actorUserId, input.actorUserId),
      ),
    )
    .limit(1);
  if (!row) return null;

  const matchesByCheckFit = await readProspectCheckFitMatches(input.db, [input.checkFitId]);
  return toRecord(
    row,
    (matchesByCheckFit.get(input.checkFitId) || []).sort((a, b) => a.matchRank - b.matchRank),
  );
}

/**
 * A check fit can only be attached to a referral once, and only to an
 * opportunity it actually qualified. The lock is taken in the same
 * transaction that creates the deal so a check fit cannot be reused to
 * justify two referrals.
 */
export async function readProspectCheckFitForSubmission(input: {
  db: DbHandle;
  actorUserId: number;
  checkFitId: string;
  developmentId: number;
}): Promise<{ record: ProspectCheckFitRecord; match: ProspectCheckFitMatch }> {
  const record = await getProspectCheckFit({
    db: input.db,
    actorUserId: input.actorUserId,
    checkFitId: input.checkFitId,
  });
  if (!record) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Prospect check fit not found.',
    });
  }
  if (record.lockedAt || record.lockedByDealId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This check fit is already attached to a referral.',
    });
  }

  const match = record.matches.find(
    candidate => candidate.developmentId === input.developmentId,
  );
  if (!match) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'This check fit did not measure the selected opportunity. Run a fresh check fit for this opportunity.',
    });
  }
  if (!match.qualified) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'This check fit did not qualify for the selected opportunity. Run a fresh check fit before referring it.',
    });
  }

  return { record, match };
}

export async function attachProspectCheckFitToDeal(input: {
  tx: DbHandle;
  actorUserId: number;
  checkFitId: string;
  dealId: number;
}): Promise<boolean> {
  const [row] = await input.tx
    .select({
      id: distributionProspectCheckFits.id,
      lockedAt: distributionProspectCheckFits.lockedAt,
    })
    .from(distributionProspectCheckFits)
    .where(
      and(
        eq(distributionProspectCheckFits.id, input.checkFitId),
        eq(distributionProspectCheckFits.actorUserId, input.actorUserId),
      ),
    )
    .for('update')
    .limit(1);

  if (!row || row.lockedAt) return false;

  await input.tx
    .update(distributionProspectCheckFits)
    .set({
      lockedAt: toSqlDateTime(new Date()),
      lockedByDealId: input.dealId,
      lockedByUserId: input.actorUserId,
      updatedAt: toSqlDateTime(new Date()),
    })
    .where(eq(distributionProspectCheckFits.id, input.checkFitId));

  return true;
}

export async function countQualifiedDevelopmentsForCheckFit(input: {
  db: DbHandle;
  checkFitId: string;
}): Promise<number> {
  const rows = await input.db
    .select({ id: distributionProspectCheckFitMatches.id })
    .from(distributionProspectCheckFitMatches)
    .where(
      and(
        eq(distributionProspectCheckFitMatches.checkFitId, input.checkFitId),
        eq(distributionProspectCheckFitMatches.qualified, 1),
      ),
    );
  return rows.length;
}
