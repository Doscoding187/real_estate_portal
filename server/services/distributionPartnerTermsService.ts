import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  developerBrandProfiles,
  developments,
  distributionPrograms,
  unitTypes,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';

type ListPartnerProgramTermsInput = {
  brandProfileId?: number;
  developmentIds?: number[];
  includeDisabled?: boolean;
};

export type PartnerProgramTermsItem = {
  developmentId: number;
  developmentName: string;
  city?: string | null;
  province?: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  imageUrl: string | null;
  brand: { brandProfileId: number; brandName: string } | null;
  program: {
    programId: number;
    isActive: boolean;
    isReferralEnabled: boolean;
    tierAccessPolicy: string | null;
    commissionModel: 'flat_percentage' | 'flat_amount' | string;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    currencyCode: string | null;
    payoutMilestone: string | null;
    payoutMilestoneNotes: string | null;
  };
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    isRequired: boolean;
    sortOrder: number;
  }>;
  computed: {
    commissionDisplay: string;
    payoutDisplay: string;
    requiredDocsSummary: string;
  };
};

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toPositiveNumberOrNull(value: unknown) {
  const numeric = toNumberOrNull(value);
  if (numeric === null || numeric <= 0) return null;
  return numeric;
}

function extractHeroImageUrl(rawImages: unknown): string | null {
  if (!rawImages) return null;

  const normalize = (value: unknown): string | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate =
      (value as any).url || (value as any).src || (value as any).imageUrl || (value as any).key;
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
  };

  const fromList = (list: unknown[]): string | null => {
    const hero = list.find(entry => {
      if (!entry || typeof entry !== 'object') return false;
      const category = String((entry as any).category || '').toLowerCase();
      return category === 'hero' || category === 'featured';
    });
    return normalize(hero) || normalize(list[0]) || (typeof list[0] === 'string' ? String(list[0]) : null);
  };

  if (Array.isArray(rawImages)) {
    return fromList(rawImages);
  }

  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map(item => item.trim())
          .find(Boolean) || null;
      }
      return trimmed;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return fromList(parsed);
      return normalize(parsed);
    } catch {
      return null;
    }
  }

  return normalize(rawImages);
}

function normalizeCommissionModel(value: unknown): PartnerProgramTermsItem['program']['commissionModel'] {
  const model = value ? String(value) : '';
  if (model === 'fixed_amount') return 'flat_amount';
  if (!model) return 'flat_amount';
  return model as PartnerProgramTermsItem['program']['commissionModel'];
}

function mapPayoutMilestoneLabel(value: string | null) {
  if (!value) return null;
  switch (value) {
    case 'attorney_instruction':
      return 'Paid after attorney instruction';
    case 'attorney_signing':
      return 'Paid after attorney signing';
    case 'bond_approval':
      return 'Paid after bond approval';
    case 'transfer_registration':
      return 'Paid after transfer registration';
    case 'occupation':
      return 'Paid after occupation';
    case 'custom':
      return 'Paid according to custom milestone';
    default:
      return 'Payout rules not configured';
  }
}

function formatCurrencyAmount(amount: number, currencyCode: string) {
  const rounded = Math.round(amount);
  if (currencyCode === 'ZAR') {
    return `R${rounded.toLocaleString('en-ZA')}`;
  }
  return `${currencyCode} ${rounded.toLocaleString('en-US')}`;
}

function buildCommissionDisplay(input: {
  commissionModel: string;
  defaultCommissionPercent: number | null;
  defaultCommissionAmount: number | null;
  currencyCode: string | null;
}) {
  if (!input.currencyCode) {
    return 'Commission not configured';
  }

  if (input.commissionModel === 'flat_percentage') {
    if (!input.defaultCommissionPercent || input.defaultCommissionPercent <= 0) {
      return 'Commission not configured';
    }
    return `${input.defaultCommissionPercent}% referral fee`;
  }

  if (input.commissionModel === 'flat_amount') {
    if (!input.defaultCommissionAmount || input.defaultCommissionAmount <= 0) {
      return 'Commission not configured';
    }
    return `${formatCurrencyAmount(input.defaultCommissionAmount, input.currencyCode)} referral fee`;
  }

  return 'Commission not configured';
}

function buildPayoutDisplay(payoutMilestone: string | null, payoutMilestoneNotes: string | null) {
  const label = mapPayoutMilestoneLabel(payoutMilestone);
  if (!label) {
    return 'Payout rules not configured';
  }

  const notes = (payoutMilestoneNotes || '').trim();
  return notes ? `${label} (${notes})` : label;
}

function buildRequiredDocsSummary(requiredDocuments: PartnerProgramTermsItem['requiredDocuments']) {
  const requiredCount = requiredDocuments.filter(document => document.isRequired).length;
  if (!requiredCount) {
    return 'No required documents configured';
  }
  return `${requiredCount} required document${requiredCount === 1 ? '' : 's'}`;
}

function withConditions(conditions: SQL[]) {
  if (conditions.length === 0) {
    return sql`1 = 1`;
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return and(...conditions) as SQL;
}

export async function listPartnerProgramTerms(
  input: ListPartnerProgramTermsInput,
): Promise<{ items: PartnerProgramTermsItem[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const includeDisabled = Boolean(input.includeDisabled);
  const conditions: SQL[] = [];

  if (!includeDisabled) {
    conditions.push(eq(distributionPrograms.isActive, 1));
    conditions.push(eq(distributionPrograms.isReferralEnabled, 1));
  }

  if (typeof input.brandProfileId === 'number') {
    conditions.push(
      sql`(${developments.developerBrandProfileId} = ${input.brandProfileId} OR ${developments.marketingBrandProfileId} = ${input.brandProfileId})`,
    );
  }

  if (input.developmentIds?.length) {
    conditions.push(inArray(distributionPrograms.developmentId, input.developmentIds));
  }

  const rows = await db
    .select({
      developmentId: developments.id,
      developmentName: developments.name,
      city: developments.city,
      province: developments.province,
      developmentPriceFrom: developments.priceFrom,
      developmentPriceTo: developments.priceTo,
      developmentImages: developments.images,
      developerBrandProfileId: developments.developerBrandProfileId,
      marketingBrandProfileId: developments.marketingBrandProfileId,
      programId: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
      commissionModel: distributionPrograms.commissionModel,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      currencyCode: distributionPrograms.currencyCode,
      payoutMilestone: distributionPrograms.payoutMilestone,
      payoutMilestoneNotes: distributionPrograms.payoutMilestoneNotes,
    })
    .from(distributionPrograms)
    .innerJoin(developments, eq(distributionPrograms.developmentId, developments.id))
    .where(withConditions(conditions))
    .orderBy(developments.province, developments.city, developments.name);

  if (!rows.length) {
    return { items: [] };
  }

  const developmentIds: number[] = Array.from(
    new Set(rows.map(row => Number(row.developmentId)).filter(value => Number.isFinite(value))),
  );
  const brandProfileIds: number[] = Array.from(
    new Set(
      rows
        .flatMap(row => [
          Number(row.developerBrandProfileId || 0),
          Number(row.marketingBrandProfileId || 0),
        ])
        .filter((value): value is number => Number.isFinite(value) && value > 0),
    ),
  );

  const brandRows = brandProfileIds.length
    ? await db
        .select({
          id: developerBrandProfiles.id,
          brandName: developerBrandProfiles.brandName,
        })
        .from(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, brandProfileIds))
    : [];

  const brandById = new Map<number, { id: number; brandName: string }>();
  for (const row of brandRows) {
    brandById.set(Number(row.id), {
      id: Number(row.id),
      brandName: String(row.brandName || ''),
    });
  }

  const docsByDevelopmentId = new Map<number, PartnerProgramTermsItem['requiredDocuments']>();
  for (const developmentId of developmentIds) {
    const templates = await listDevelopmentRequiredDocumentsOrEmpty(db, developmentId);
    docsByDevelopmentId.set(
      developmentId,
      templates
        .filter(template => template.isActive && template.category === 'client_required_document')
        .map(template => ({
          templateId: Number(template.id),
          documentCode: String(template.documentCode),
          documentLabel: String(template.documentLabel || ''),
          isRequired: Boolean(template.isRequired),
          sortOrder: Number(template.sortOrder || 0),
        })),
    );
  }

  const unitRows = developmentIds.length
    ? await db
        .select({
          developmentId: unitTypes.developmentId,
          priceFrom: unitTypes.priceFrom,
          priceTo: unitTypes.priceTo,
          basePriceFrom: unitTypes.basePriceFrom,
          basePriceTo: unitTypes.basePriceTo,
        })
        .from(unitTypes)
        .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
    : [];

  const unitPriceRangeByDevelopment = new Map<
    number,
    {
      priceFrom: number | null;
      priceTo: number | null;
    }
  >();

  for (const row of unitRows) {
    const developmentId = Number(row.developmentId || 0);
    if (!developmentId) continue;
    const unitPriceFrom =
      toPositiveNumberOrNull(row.priceFrom) ?? toPositiveNumberOrNull(row.basePriceFrom);
    const fallbackTo = toPositiveNumberOrNull(row.priceTo) ?? toPositiveNumberOrNull(row.basePriceTo);
    const unitPriceTo = fallbackTo ?? unitPriceFrom;
    if (unitPriceFrom === null && unitPriceTo === null) continue;

    const current = unitPriceRangeByDevelopment.get(developmentId) || {
      priceFrom: null,
      priceTo: null,
    };

    const nextMin =
      unitPriceFrom === null
        ? current.priceFrom
        : current.priceFrom === null
          ? unitPriceFrom
          : Math.min(current.priceFrom, unitPriceFrom);
    const nextMax =
      unitPriceTo === null
        ? current.priceTo
        : current.priceTo === null
          ? unitPriceTo
          : Math.max(current.priceTo, unitPriceTo);

    unitPriceRangeByDevelopment.set(developmentId, {
      priceFrom: nextMin,
      priceTo: nextMax,
    });
  }

  const items: PartnerProgramTermsItem[] = rows.map(row => {
    const developmentId = Number(row.developmentId);
    const commissionModel = normalizeCommissionModel(row.commissionModel);
    const defaultCommissionPercent = toNumberOrNull(row.defaultCommissionPercent);
    const defaultCommissionAmount = toNumberOrNull(row.defaultCommissionAmount);
    const currencyCode = row.currencyCode ? String(row.currencyCode) : null;
    const payoutMilestone = row.payoutMilestone ? String(row.payoutMilestone) : null;
    const payoutMilestoneNotes = row.payoutMilestoneNotes ? String(row.payoutMilestoneNotes) : null;

    const requiredDocuments = docsByDevelopmentId.get(developmentId) || [];
    const primaryBrandId = Number(row.developerBrandProfileId || 0) || Number(row.marketingBrandProfileId || 0);
    const brandRecord = primaryBrandId ? brandById.get(primaryBrandId) : null;
    const unitPriceRange = unitPriceRangeByDevelopment.get(developmentId);
    const developmentPriceFrom = toPositiveNumberOrNull(row.developmentPriceFrom);
    const developmentPriceTo = toPositiveNumberOrNull(row.developmentPriceTo);
    const priceFrom = unitPriceRange?.priceFrom ?? developmentPriceFrom;
    const fallbackPriceTo = developmentPriceTo ?? developmentPriceFrom;
    const rawPriceTo = unitPriceRange?.priceTo ?? fallbackPriceTo ?? priceFrom;
    const priceTo =
      priceFrom !== null && rawPriceTo !== null && rawPriceTo < priceFrom ? priceFrom : rawPriceTo;

    return {
      developmentId,
      developmentName: String(row.developmentName || `Development #${developmentId}`),
      city: row.city || null,
      province: row.province || null,
      priceFrom: priceFrom ?? null,
      priceTo: priceTo ?? null,
      imageUrl: extractHeroImageUrl(row.developmentImages),
      brand: brandRecord
        ? { brandProfileId: brandRecord.id, brandName: brandRecord.brandName }
        : null,
      program: {
        programId: Number(row.programId),
        isActive: boolFromTinyInt(row.isActive),
        isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
        tierAccessPolicy: row.tierAccessPolicy ? String(row.tierAccessPolicy) : null,
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        currencyCode,
        payoutMilestone,
        payoutMilestoneNotes,
      },
      requiredDocuments,
      computed: {
        commissionDisplay: buildCommissionDisplay({
          commissionModel,
          defaultCommissionPercent,
          defaultCommissionAmount,
          currencyCode,
        }),
        payoutDisplay: buildPayoutDisplay(payoutMilestone, payoutMilestoneNotes),
        requiredDocsSummary: buildRequiredDocsSummary(requiredDocuments),
      },
    };
  });

  return { items };
}

export async function getPartnerProgramTermsByDevelopmentId(developmentId: number) {
  const result = await listPartnerProgramTerms({
    developmentIds: [developmentId],
    includeDisabled: false,
  });
  return result.items.find(item => item.developmentId === developmentId) || null;
}
