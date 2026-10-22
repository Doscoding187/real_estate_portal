import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import {
  affordabilityAssessments,
  affordabilityMatchSnapshots,
  distributionDeals,
  qualificationPackExports,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { assertDistributionReferralIntakeReady } from './distributionReferralIntakePolicy';

const CALC_VERSION = 'v1' as const;
const DEFAULT_INTEREST_RATE_ANNUAL = 11.75;
const DEFAULT_TERM_MONTHS = 240;
const DEFAULT_MAX_REPAYMENT_RATIO = 0.3;
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 12000;

export const QUALIFICATION_DISCLAIMER_LINES = [
  'This is an indicative affordability estimate, not a credit approval.',
  'Final eligibility depends on credit profile, lender criteria, and verified documents.',
  'A credit check requires the client’s explicit consent.',
] as const;

type DbExecutor = any;

function requireDeveloperSalesProjection(): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      'Development matching is unavailable because the Developer Engine sales projection is not connected to this Distribution build.',
  });
}

type ActorContext = {
  actorUserId: number;
  actorRole: string;
};

export type AffordabilityLocationFilter = {
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
};

export type AffordabilityAssumptions = {
  interestRateAnnual: number;
  termMonths: number;
  maxRepaymentRatio: number;
  calcVersion: typeof CALC_VERSION;
};

export type AffordabilityOutputs = {
  maxMonthlyRepayment: number;
  indicativeLoanAmount: number;
  indicativePurchaseMin: number;
  indicativePurchaseMax: number;
  purchasePrice: number;
  confidenceLabel: 'Indicative — needs credit verification';
  confidenceLevel: 'standard' | 'low';
};

type SerializedAssessmentRecord = {
  id: string;
  actorUserId: number;
  subjectName: string | null;
  subjectPhone: string | null;
  grossIncomeMonthly: number;
  deductionsMonthly: number;
  depositAmount: number;
  assumptions: AffordabilityAssumptions;
  outputs: AffordabilityOutputs;
  locationFilter: AffordabilityLocationFilter | null;
  creditCheckConsentGiven: boolean;
  creditCheckRequestedAt: string | null;
  lockedAt: string | null;
  lockedByDealId: number | null;
  lockedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

type MatchUnitOption = {
  unitTypeId: string | null;
  unitName: string;
  bedrooms: number | null;
  priceFrom: number;
  priceTo: number;
  fitRatio: number;
};

type MatchItem = {
  developmentId: number;
  developmentName: string;
  area: string;
  city: string | null;
  province: string | null;
  suburb: string | null;
  logoUrl: string | null;
  purchasePrice: number;
  bestFitRatio: number;
  developmentPriority: number;
  unitOptions: MatchUnitOption[];
};

type MatchSnapshotPayload = {
  assessmentId: string;
  generatedAt: string;
  purchasePrice: number;
  matches: MatchItem[];
};

function withConditions(conditions: SQL[]) {
  if (!conditions.length) return sql`1 = 1`;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions) as SQL;
}

function readNumberEnv(value: string | undefined, fallbackValue: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toWholeRand(value: number) {
  return Math.round(value);
}

function parseJsonField<T>(value: unknown, fallbackValue: T): T {
  if (value === null || typeof value === 'undefined') return fallbackValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallbackValue;
    }
  }
  if (typeof value === 'object') {
    return value as T;
  }
  return fallbackValue;
}

function normalizeString(value: unknown, maxLength: number) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeLocationFilter(
  value: AffordabilityLocationFilter | null | undefined,
): AffordabilityLocationFilter | null {
  if (!value) return null;
  const province = normalizeString(value.province, 100);
  const city = normalizeString(value.city, 100);
  const suburb = normalizeString(value.suburb, 100);

  let bounds: AffordabilityLocationFilter['bounds'] = null;
  if (value.bounds) {
    const north = Number(value.bounds.north);
    const south = Number(value.bounds.south);
    const east = Number(value.bounds.east);
    const west = Number(value.bounds.west);
    const isValid =
      Number.isFinite(north) &&
      Number.isFinite(south) &&
      Number.isFinite(east) &&
      Number.isFinite(west) &&
      north >= south &&
      east >= west;
    if (isValid) {
      bounds = { north, south, east, west };
    }
  }

  if (!province && !city && !suburb && !bounds) {
    return null;
  }

  return {
    province,
    city,
    suburb,
    bounds,
  };
}

function getDefaultAssumptions(): AffordabilityAssumptions {
  return {
    interestRateAnnual: readNumberEnv(
      process.env.DISTRIBUTION_AFFORDABILITY_INTEREST_RATE_ANNUAL,
      DEFAULT_INTEREST_RATE_ANNUAL,
    ),
    termMonths: readNumberEnv(
      process.env.DISTRIBUTION_AFFORDABILITY_TERM_MONTHS,
      DEFAULT_TERM_MONTHS,
    ),
    maxRepaymentRatio: readNumberEnv(
      process.env.DISTRIBUTION_AFFORDABILITY_MAX_REPAYMENT_RATIO,
      DEFAULT_MAX_REPAYMENT_RATIO,
    ),
    calcVersion: CALC_VERSION,
  };
}

function getLowConfidenceThreshold() {
  return readNumberEnv(
    process.env.DISTRIBUTION_AFFORDABILITY_LOW_CONFIDENCE_INCOME,
    DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  );
}

function normalizeDateTimeForSql(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function formatCurrency(amount: number) {
  return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

function ensurePositiveAssumptions(assumptions: AffordabilityAssumptions) {
  if (assumptions.interestRateAnnual <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'interestRateAnnual must be greater than 0.',
    });
  }
  if (assumptions.termMonths <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'termMonths must be greater than 0.',
    });
  }
  if (assumptions.maxRepaymentRatio <= 0 || assumptions.maxRepaymentRatio > 1) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'maxRepaymentRatio must be between 0 and 1.',
    });
  }
}

function resolveDbOrThrow(db?: DbExecutor) {
  return (async () => {
    if (db) return db;
    const connection = await getDb();
    if (!connection) throw new Error('Database not available');
    return connection;
  })();
}

function serializeAssessmentRow(row: any): SerializedAssessmentRecord {
  return {
    id: String(row.id),
    actorUserId: Number(row.actorUserId),
    subjectName: row.subjectName ? String(row.subjectName) : null,
    subjectPhone: row.subjectPhone ? String(row.subjectPhone) : null,
    grossIncomeMonthly: Number(row.grossIncomeMonthly || 0),
    deductionsMonthly: Number(row.deductionsMonthly || 0),
    depositAmount: Number(row.depositAmount || 0),
    assumptions: parseJsonField<AffordabilityAssumptions>(row.assumptionsJson, getDefaultAssumptions()),
    outputs: parseJsonField<AffordabilityOutputs>(row.outputsJson, {
      maxMonthlyRepayment: 0,
      indicativeLoanAmount: 0,
      indicativePurchaseMin: 0,
      indicativePurchaseMax: 0,
      purchasePrice: 0,
      confidenceLabel: 'Indicative — needs credit verification',
      confidenceLevel: 'standard',
    }),
    locationFilter: parseJsonField<AffordabilityLocationFilter | null>(row.locationFilterJson, null),
    creditCheckConsentGiven: Number(row.creditCheckConsentGiven || 0) === 1,
    creditCheckRequestedAt: row.creditCheckRequestedAt ? String(row.creditCheckRequestedAt) : null,
    lockedAt: row.lockedAt ? String(row.lockedAt) : null,
    lockedByDealId: toNumberOrNull(row.lockedByDealId),
    lockedByUserId: toNumberOrNull(row.lockedByUserId),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || row.createdAt || ''),
  };
}

async function getAssessmentForActor(
  db: DbExecutor,
  input: { assessmentId: string } & ActorContext,
): Promise<SerializedAssessmentRecord> {
  const normalizedId = String(input.assessmentId || '').trim();
  if (!normalizedId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'assessmentId is required.',
    });
  }

  const conditions: SQL[] = [eq(affordabilityAssessments.id, normalizedId)];
  if (input.actorRole !== 'super_admin') {
    conditions.push(eq(affordabilityAssessments.actorUserId, input.actorUserId));
  }

  const [row] = await db
    .select({
      id: affordabilityAssessments.id,
      actorUserId: affordabilityAssessments.actorUserId,
      subjectName: affordabilityAssessments.subjectName,
      subjectPhone: affordabilityAssessments.subjectPhone,
      grossIncomeMonthly: affordabilityAssessments.grossIncomeMonthly,
      deductionsMonthly: affordabilityAssessments.deductionsMonthly,
      depositAmount: affordabilityAssessments.depositAmount,
      assumptionsJson: affordabilityAssessments.assumptionsJson,
      outputsJson: affordabilityAssessments.outputsJson,
      locationFilterJson: affordabilityAssessments.locationFilterJson,
      creditCheckConsentGiven: affordabilityAssessments.creditCheckConsentGiven,
      creditCheckRequestedAt: affordabilityAssessments.creditCheckRequestedAt,
      lockedAt: affordabilityAssessments.lockedAt,
      lockedByDealId: affordabilityAssessments.lockedByDealId,
      lockedByUserId: affordabilityAssessments.lockedByUserId,
      createdAt: affordabilityAssessments.createdAt,
      updatedAt: affordabilityAssessments.updatedAt,
    })
    .from(affordabilityAssessments)
    .where(withConditions(conditions))
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Affordability assessment not found.',
    });
  }

  return serializeAssessmentRow(row);
}

function normalizeMatchSnapshotPayload(value: unknown): MatchSnapshotPayload {
  const parsed = parseJsonField<MatchSnapshotPayload | null>(value, null);
  if (parsed && Array.isArray(parsed.matches)) {
    return parsed;
  }
  return {
    assessmentId: '',
    generatedAt: new Date(0).toISOString(),
    purchasePrice: 0,
    matches: [],
  };
}

function sanitizeMatchUnitOption(value: MatchUnitOption): MatchUnitOption {
  return {
    unitTypeId: value.unitTypeId,
    unitName: value.unitName,
    bedrooms: value.bedrooms,
    priceFrom: Math.max(0, toWholeRand(value.priceFrom)),
    priceTo: Math.max(0, toWholeRand(value.priceTo)),
    fitRatio: Number(value.fitRatio.toFixed(4)),
  };
}

function sanitizeMatchItem(value: MatchItem): MatchItem {
  return {
    ...value,
    purchasePrice: toWholeRand(value.purchasePrice),
    bestFitRatio: Number(value.bestFitRatio.toFixed(4)),
    developmentPriority: Number(value.developmentPriority || 0),
    unitOptions: value.unitOptions.map(sanitizeMatchUnitOption),
  };
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
}

function buildPdfFromLines(lines: string[]) {
  const clipped = lines.slice(0, 72);
  const stream = [
    'BT',
    '/F1 11 Tf',
    '14 TL',
    '40 800 Td',
    ...clipped.flatMap((line, index) =>
      index === clipped.length - 1 ? [`(${escapePdfText(line)}) Tj`] : [`(${escapePdfText(line)}) Tj`, 'T*'],
    ),
    'ET',
  ].join('\n');

  const streamLength = Buffer.byteLength(stream, 'utf8');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const objectText of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${objectText}\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function makeQualificationPdfLines(input: {
  assessment: SerializedAssessmentRecord;
  snapshot: MatchSnapshotPayload;
}) {
  const { assessment, snapshot } = input;
  const lines: string[] = [
    'Indicative Affordability Snapshot',
    '',
    `Assessment ID: ${assessment.id}`,
    `Generated at: ${new Date().toISOString()}`,
    '',
    'Inputs',
    `Gross income monthly: ${formatCurrency(assessment.grossIncomeMonthly)}`,
    `Deductions monthly: ${formatCurrency(assessment.deductionsMonthly)}`,
    `Deposit amount: ${formatCurrency(assessment.depositAmount)}`,
  ];

  const locationParts = [
    assessment.locationFilter?.suburb || null,
    assessment.locationFilter?.city || null,
    assessment.locationFilter?.province || null,
  ].filter(Boolean);
  if (locationParts.length) {
    lines.push(`Location filter: ${locationParts.join(', ')}`);
  }

  lines.push(
    '',
    'Assumptions',
    `Interest rate annual: ${assessment.assumptions.interestRateAnnual}%`,
    `Term months: ${assessment.assumptions.termMonths}`,
    `Max repayment ratio: ${assessment.assumptions.maxRepaymentRatio}`,
    `Calc version: ${assessment.assumptions.calcVersion}`,
    '',
    'Results',
    `Max monthly repayment: ${formatCurrency(assessment.outputs.maxMonthlyRepayment)}`,
    `Indicative loan amount: ${formatCurrency(assessment.outputs.indicativeLoanAmount)}`,
    `Indicative purchase price: ${formatCurrency(assessment.outputs.purchasePrice)}`,
    `Confidence: ${assessment.outputs.confidenceLabel}`,
    '',
    'Matches',
  );

  if (!snapshot.matches.length) {
    lines.push('No qualifying development matches found for this snapshot.');
  } else {
    snapshot.matches.forEach((match, matchIndex) => {
      lines.push(`${matchIndex + 1}. ${match.developmentName} (${match.area})`);
      match.unitOptions.slice(0, 4).forEach(unit => {
        lines.push(
          `   - ${unit.unitName}: ${formatCurrency(unit.priceFrom)} to ${formatCurrency(unit.priceTo)}`,
        );
      });
    });
  }

  lines.push('', 'Disclaimers', ...QUALIFICATION_DISCLAIMER_LINES);
  return lines;
}

export function calculateAffordabilityOutputs(input: {
  grossIncomeMonthly: number;
  deductionsMonthly?: number;
  depositAmount?: number;
  assumptions?: Partial<AffordabilityAssumptions>;
}) {
  const grossIncomeMonthly = Number(input.grossIncomeMonthly || 0);
  const deductionsMonthly = Number(input.deductionsMonthly || 0);
  const depositAmount = Math.max(0, Number(input.depositAmount || 0));

  if (!Number.isFinite(grossIncomeMonthly) || grossIncomeMonthly <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'grossIncomeMonthly must be greater than 0.',
    });
  }
  if (!Number.isFinite(deductionsMonthly) || deductionsMonthly < 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'deductionsMonthly must be 0 or greater.',
    });
  }

  const assumptions: AffordabilityAssumptions = {
    ...getDefaultAssumptions(),
    ...(input.assumptions || {}),
    calcVersion: CALC_VERSION,
  };
  ensurePositiveAssumptions(assumptions);

  const baseIncome = grossIncomeMonthly;
  const maxMonthlyRepayment = Math.floor(baseIncome * assumptions.maxRepaymentRatio);
  const monthlyRate = assumptions.interestRateAnnual / 100 / 12;
  const n = assumptions.termMonths;
  const growth = Math.pow(1 + monthlyRate, n);
  const indicativeLoanAmount =
    monthlyRate > 0
      ? toWholeRand(maxMonthlyRepayment * ((growth - 1) / (monthlyRate * growth)))
      : toWholeRand(maxMonthlyRepayment * n);
  const purchasePrice = toWholeRand(indicativeLoanAmount + depositAmount);

  const lowConfidenceThreshold = getLowConfidenceThreshold();
  const confidenceLevel: 'standard' | 'low' =
    grossIncomeMonthly < lowConfidenceThreshold ? 'low' : 'standard';

  const outputs: AffordabilityOutputs = {
    maxMonthlyRepayment: toWholeRand(maxMonthlyRepayment),
    indicativeLoanAmount,
    indicativePurchaseMin: purchasePrice,
    indicativePurchaseMax: purchasePrice,
    purchasePrice,
    confidenceLabel: 'Indicative — needs credit verification',
    confidenceLevel,
  };

  return {
    assumptions,
    outputs,
    normalizedInput: {
      grossIncomeMonthly: toWholeRand(grossIncomeMonthly),
      deductionsMonthly: toWholeRand(deductionsMonthly),
      depositAmount: toWholeRand(depositAmount),
    },
  };
}

export async function ensureAssessmentBelongsToActor(input: {
  assessmentId: string;
  actorUserId: number;
  actorRole: string;
  db?: DbExecutor;
}) {
  const db = await resolveDbOrThrow(input.db);
  return await getAssessmentForActor(db, {
    assessmentId: input.assessmentId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
  });
}

export async function createAffordabilityAssessment(input: {
  actorUserId: number;
  actorRole: string;
  subjectName?: string | null;
  subjectPhone?: string | null;
  grossIncomeMonthly: number;
  deductionsMonthly?: number;
  depositAmount?: number;
  locationFilter?: AffordabilityLocationFilter | null;
  db?: DbExecutor;
}) {
  assertDistributionReferralIntakeReady();
  const db = await resolveDbOrThrow(input.db);

  const calculation = calculateAffordabilityOutputs({
    grossIncomeMonthly: input.grossIncomeMonthly,
    deductionsMonthly: input.deductionsMonthly,
    depositAmount: input.depositAmount,
  });

  const assessmentId = randomUUID();
  await db.insert(affordabilityAssessments).values({
    id: assessmentId,
    actorUserId: Number(input.actorUserId),
    subjectName: normalizeString(input.subjectName, 200),
    subjectPhone: normalizeString(input.subjectPhone, 50),
    grossIncomeMonthly: calculation.normalizedInput.grossIncomeMonthly,
    deductionsMonthly: calculation.normalizedInput.deductionsMonthly,
    depositAmount: calculation.normalizedInput.depositAmount,
    assumptionsJson: calculation.assumptions as any,
    outputsJson: calculation.outputs as any,
    locationFilterJson: normalizeLocationFilter(input.locationFilter) as any,
  });

  return {
    assessmentId,
  };
}

export async function getAffordabilityAssessment(input: {
  assessmentId: string;
  actorUserId: number;
  actorRole: string;
  db?: DbExecutor;
}) {
  const db = await resolveDbOrThrow(input.db);
  const assessment = await getAssessmentForActor(db, input);
  return {
    assessmentId: assessment.id,
    actorUserId: assessment.actorUserId,
    subjectName: assessment.subjectName,
    subjectPhone: assessment.subjectPhone,
    grossIncomeMonthly: assessment.grossIncomeMonthly,
    deductionsMonthly: assessment.deductionsMonthly,
    depositAmount: assessment.depositAmount,
    assumptions: assessment.assumptions,
    outputs: assessment.outputs,
    locationFilter: assessment.locationFilter,
    creditCheck: {
      consentGiven: assessment.creditCheckConsentGiven,
      requestedAt: assessment.creditCheckRequestedAt,
    },
    lock: {
      lockedAt: assessment.lockedAt,
      lockedByDealId: assessment.lockedByDealId,
      lockedByUserId: assessment.lockedByUserId,
    },
    disclaimers: [...QUALIFICATION_DISCLAIMER_LINES],
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

export async function getAffordabilityMatches(input: {
  assessmentId: string;
  actorUserId: number;
  actorRole: string;
  db?: DbExecutor;
}): Promise<{
  assessmentId: string;
  matchSnapshotId: string;
  createdAt: string;
  purchasePrice: number;
  matches: MatchItem[];
  createdNewSnapshot: boolean;
}> {
  void input;
  // The legacy Developer-table matcher and its stored snapshots are intentionally retired.
  // Re-enable matching only after the Distribution build can call the Developer projection.
  return requireDeveloperSalesProjection();
}

export async function requestCreditCheckPlaceholder(input: {
  assessmentId: string;
  actorUserId: number;
  actorRole: string;
  consentGiven: boolean;
  db?: DbExecutor;
}) {
  assertDistributionReferralIntakeReady();
  if (!input.consentGiven) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A credit check requires the client’s explicit consent.',
    });
  }

  const db = await resolveDbOrThrow(input.db);
  const assessment = await getAssessmentForActor(db, input);
  if (assessment.lockedAt) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This affordability assessment has already been attached and is immutable.',
    });
  }
  const requestedAt = normalizeDateTimeForSql(new Date());

  await db
    .update(affordabilityAssessments)
    .set({
      creditCheckConsentGiven: 1,
      creditCheckRequestedAt: requestedAt,
    })
    .where(eq(affordabilityAssessments.id, assessment.id));

  return {
    assessmentId: assessment.id,
    consentGiven: true,
    requestedAt,
    status: 'placeholder_requested',
  };
}

export async function exportQualificationPackPdf(input: {
  assessmentId: string;
  actorUserId: number;
  actorRole: string;
  db?: DbExecutor;
}) {
  const db = await resolveDbOrThrow(input.db);
  const assessment = await getAssessmentForActor(db, input);
  const snapshot = await getAffordabilityMatches({
    assessmentId: assessment.id,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    db,
  });

  const pdfBuffer = buildPdfFromLines(
    makeQualificationPdfLines({
      assessment,
      snapshot: {
        assessmentId: snapshot.assessmentId,
        generatedAt: snapshot.createdAt,
        purchasePrice: snapshot.purchasePrice,
        matches: snapshot.matches as MatchItem[],
      },
    }),
  );
  const base64 = pdfBuffer.toString('base64');
  const exportId = randomUUID();
  await db.insert(qualificationPackExports).values({
    id: exportId,
    assessmentId: assessment.id,
    matchSnapshotId: snapshot.matchSnapshotId,
    pdfBytes: base64,
  });

  return {
    exportId,
    assessmentId: assessment.id,
    matchSnapshotId: snapshot.matchSnapshotId,
    mimeType: 'application/pdf',
    fileName: `qualification-pack-${assessment.id}.pdf`,
    base64,
  };
}

export async function exportQualificationPackPdfForReferral(input: {
  dealId: number;
  actorUserId: number;
  actorRole: string;
  db?: DbExecutor;
}) {
  requireDeveloperSalesProjection();
  const db = await resolveDbOrThrow(input.db);
  const [deal] = await db
    .select({
      id: distributionDeals.id,
      agentId: distributionDeals.agentId,
      assessmentId: distributionDeals.affordabilityAssessmentId,
      matchSnapshotId: distributionDeals.affordabilityMatchSnapshotId,
    })
    .from(distributionDeals)
    .where(eq(distributionDeals.id, input.dealId))
    .limit(1);

  if (!deal) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Referral deal not found.',
    });
  }

  if (input.actorRole !== 'super_admin' && Number(deal.agentId) !== Number(input.actorUserId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only export qualification packs for your own referrals.',
    });
  }

  const assessmentId = String(deal.assessmentId || '').trim();
  const matchSnapshotId = String(deal.matchSnapshotId || '').trim();
  if (!assessmentId || !matchSnapshotId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No attached affordability snapshot is available for this referral.',
    });
  }

  const assessment = await getAssessmentForActor(db, {
    assessmentId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
  });

  const [snapshotRow] = await db
    .select({
      id: affordabilityMatchSnapshots.id,
      assessmentId: affordabilityMatchSnapshots.assessmentId,
      matchesJson: affordabilityMatchSnapshots.matchesJson,
      createdAt: affordabilityMatchSnapshots.createdAt,
    })
    .from(affordabilityMatchSnapshots)
    .where(
      and(
        eq(affordabilityMatchSnapshots.id, matchSnapshotId),
        eq(affordabilityMatchSnapshots.assessmentId, assessment.id),
      ),
    )
    .limit(1);

  if (!snapshotRow) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Attached affordability match snapshot could not be found.',
    });
  }

  const payload = normalizeMatchSnapshotPayload(snapshotRow.matchesJson);
  const snapshot = {
    assessmentId: assessment.id,
    generatedAt: String(snapshotRow.createdAt || payload.generatedAt || new Date().toISOString()),
    purchasePrice: Number(payload.purchasePrice || assessment.outputs.purchasePrice || 0),
    matches: Array.isArray(payload.matches) ? (payload.matches as MatchItem[]) : [],
  };

  const pdfBuffer = buildPdfFromLines(
    makeQualificationPdfLines({
      assessment,
      snapshot,
    }),
  );
  const base64 = pdfBuffer.toString('base64');
  const exportId = randomUUID();
  await db.insert(qualificationPackExports).values({
    id: exportId,
    assessmentId: assessment.id,
    matchSnapshotId: matchSnapshotId,
    pdfBytes: base64,
  });

  return {
    exportId,
    assessmentId: assessment.id,
    matchSnapshotId,
    mimeType: 'application/pdf',
    fileName: `qualification-pack-${assessment.id}.pdf`,
    base64,
  };
}
