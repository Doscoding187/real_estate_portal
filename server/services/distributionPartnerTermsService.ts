import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import {
  developerBrandProfiles,
  developments,
  distributionDevelopmentAccess,
  distributionPrograms,
  unitTypes,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { evaluateDevelopmentDistributionAccess } from './distributionAccessPolicy';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';
import {
  getDistributionSchemaReadinessSnapshot,
  warnSchemaCapabilityOnce,
} from './runtimeSchemaCapabilities';

type ListPartnerProgramTermsInput = {
  brandProfileId?: number;
  developmentIds?: number[];
  includeDisabled?: boolean;
};

type BrochureConfig = {
  headline?: string | null;
  description?: string | null;
  highlightBullets?: string[];
  amenityLabels?: string[];
  heroImageUrl?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type PartnerProgramTermsItem = {
  developmentId: number;
  developmentName: string;
  city?: string | null;
  province?: string | null;
  suburb?: string | null;
  address?: string | null;
  description?: string | null;
  amenities?: string | null;
  features?: unknown;
  priceFrom: number | null;
  priceTo: number | null;
  imageUrl: string | null;
  brochure: BrochureConfig;
  brand: {
    brandProfileId: number;
    brandName: string;
    logoUrl: string | null;
    publicContactEmail: string | null;
  } | null;
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
  unitTypes: Array<{
    name: string;
    bedrooms: number | null;
    bathrooms: number | null;
    unitSize: number | null;
    priceFrom: number | null;
    priceTo: number | null;
  }>;
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category: 'developer_document' | 'client_required_document';
    templateFileUrl: string | null;
    templateFileName: string | null;
    isRequired: boolean;
    sortOrder: number;
  }>;
  sourceDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    fileUrl: string | null;
    fileName: string | null;
    sortOrder: number;
  }>;
  computed: {
    commissionDisplay: string;
    payoutDisplay: string;
    requiredDocsSummary: string;
  };
  opportunity: {
    status: 'ready' | 'pending_setup' | 'blocked';
    reasonCodes: string[];
    nextAction: 'submit_referral' | 'upload_docs' | 'contact_manager' | 'not_available';
    friendlyMessage: string;
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
    return (
      normalize(hero) ||
      normalize(list[0]) ||
      (typeof list[0] === 'string' ? String(list[0]) : null)
    );
  };

  if (Array.isArray(rawImages)) {
    return fromList(rawImages);
  }

  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      if (trimmed.includes(',')) {
        return (
          trimmed
            .split(',')
            .map(item => item.trim())
            .find(Boolean) || null
        );
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

function normalizeCommissionModel(
  value: unknown,
): PartnerProgramTermsItem['program']['commissionModel'] {
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

function isMissingBrochureConfigColumnError(error: unknown) {
  let cursor: any = error;
  const visited = new Set<unknown>();
  while (cursor && typeof cursor === 'object' && !visited.has(cursor)) {
    visited.add(cursor);
    const code = String(cursor?.code || '').trim();
    const message = String(cursor?.sqlMessage || cursor?.message || '').toLowerCase();
    if (code === 'ER_BAD_FIELD_ERROR' && message.includes('brochure_config_json')) {
      return true;
    }
    if (message.includes('unknown column') && message.includes('brochure_config_json')) {
      return true;
    }
    cursor = cursor?.cause;
  }
  return false;
}

async function canReadBrochureConfigColumn() {
  try {
    const snapshot = await getDistributionSchemaReadinessSnapshot();
    return Boolean(snapshot.operations['distribution.admin.setDevelopmentBrochureConfig']?.ready);
  } catch (error) {
    warnSchemaCapabilityOnce(
      'distribution-partner-terms-brochure-config-readiness',
      '[DistributionPartnerTerms] Could not verify brochure_config_json readiness. Continuing without brochure overrides.',
      error,
    );
    return false;
  }
}

export async function listPartnerProgramTerms(
  input: ListPartnerProgramTermsInput,
): Promise<{ items: PartnerProgramTermsItem[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const includeDisabled = Boolean(input.includeDisabled);
  const conditions: SQL[] = [];

  if (typeof input.brandProfileId === 'number') {
    conditions.push(
      sql`(${developments.developerBrandProfileId} = ${input.brandProfileId} OR ${developments.marketingBrandProfileId} = ${input.brandProfileId})`,
    );
  }

  if (input.developmentIds?.length) {
    conditions.push(inArray(developments.id, input.developmentIds));
  }

  if (!includeDisabled) {
    conditions.push(eq(distributionPrograms.isActive, 1));
    conditions.push(eq(distributionPrograms.isReferralEnabled, 1));
  } else {
    conditions.push(
      or(
        sql`${distributionPrograms.id} IS NOT NULL`,
        inArray(distributionDevelopmentAccess.status, ['included', 'listed']),
      ) as SQL,
    );
  }

  const selectPartnerRows = async (includeBrochureConfig: boolean) => {
    const selectFields: Record<string, any> = {
      developmentId: developments.id,
      developmentName: developments.name,
      suburb: developments.suburb,
      city: developments.city,
      province: developments.province,
      address: developments.address,
      description: developments.description,
      amenities: developments.amenities,
      features: developments.features,
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
      accessStatus: distributionDevelopmentAccess.status,
      submissionAllowed: distributionDevelopmentAccess.submissionAllowed,
    };

    if (includeBrochureConfig) {
      selectFields.brochureConfigJson = distributionDevelopmentAccess.brochureConfigJson;
    }

    return (await db
      .select(selectFields)
      .from(developments)
      .leftJoin(distributionPrograms, eq(distributionPrograms.developmentId, developments.id))
      .leftJoin(
        distributionDevelopmentAccess,
        eq(distributionDevelopmentAccess.developmentId, developments.id),
      )
      .where(withConditions(conditions))
      .orderBy(developments.province, developments.city, developments.name)) as Array<
      Record<string, any>
    >;
  };

  const includeBrochureConfig = await canReadBrochureConfigColumn();
  let rows: Array<Record<string, any>>;
  try {
    rows = await selectPartnerRows(includeBrochureConfig);
  } catch (error) {
    if (!includeBrochureConfig || !isMissingBrochureConfigColumnError(error)) {
      throw error;
    }

    warnSchemaCapabilityOnce(
      'distribution-partner-terms-missing-brochure-config-column',
      '[DistributionPartnerTerms] brochure_config_json is missing. Serving partner terms without brochure overrides because the connected database is behind the canonical schema authority.',
      error,
    );
    rows = await selectPartnerRows(false);
  }

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
          logoUrl: developerBrandProfiles.logoUrl,
          publicContactEmail: developerBrandProfiles.publicContactEmail,
        })
        .from(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, brandProfileIds))
    : [];

  const brandById = new Map<
    number,
    { id: number; brandName: string; logoUrl: string | null; publicContactEmail: string | null }
  >();
  for (const row of brandRows) {
    brandById.set(Number(row.id), {
      id: Number(row.id),
      brandName: String(row.brandName || ''),
      logoUrl: row.logoUrl || null,
      publicContactEmail: row.publicContactEmail || null,
    });
  }

  const docsByDevelopmentId = new Map<number, PartnerProgramTermsItem['requiredDocuments']>();
  const sourceDocsByDevelopmentId = new Map<number, PartnerProgramTermsItem['sourceDocuments']>();
  for (const developmentId of developmentIds) {
    const templates = await listDevelopmentRequiredDocumentsOrEmpty(db, developmentId);
    docsByDevelopmentId.set(
      developmentId,
      templates
        .filter(template => template.isActive && template.isRequired)
        .map(template => ({
          templateId: Number(template.id),
          documentCode: String(template.documentCode),
          documentLabel: String(template.documentLabel || ''),
          category: template.category,
          templateFileUrl: template.templateFileUrl || null,
          templateFileName: template.templateFileName || null,
          isRequired: Boolean(template.isRequired),
          sortOrder: Number(template.sortOrder || 0),
        })),
    );
    sourceDocsByDevelopmentId.set(
      developmentId,
      templates
        .filter(
          template =>
            template.isActive && template.category === 'developer_document' && !template.isRequired,
        )
        .map(template => ({
          templateId: Number(template.id),
          documentCode: String(template.documentCode),
          documentLabel: String(template.documentLabel || ''),
          fileUrl: template.templateFileUrl || null,
          fileName: template.templateFileName || null,
          sortOrder: Number(template.sortOrder || 0),
        })),
    );
  }

  const unitRows = developmentIds.length
    ? await db
        .select({
          developmentId: unitTypes.developmentId,
          name: unitTypes.name,
          displayOrder: unitTypes.displayOrder,
          bedrooms: unitTypes.bedrooms,
          bathrooms: unitTypes.bathrooms,
          unitSize: unitTypes.unitSize,
          priceFrom: unitTypes.priceFrom,
          priceTo: unitTypes.priceTo,
          basePriceFrom: unitTypes.basePriceFrom,
          basePriceTo: unitTypes.basePriceTo,
        })
        .from(unitTypes)
        .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
        .orderBy(unitTypes.displayOrder, unitTypes.name)
    : [];

  const unitPriceRangeByDevelopment = new Map<
    number,
    {
      priceFrom: number | null;
      priceTo: number | null;
    }
  >();
  const unitTypesByDevelopment = new Map<
    number,
    Array<{
      name: string;
      bedrooms: number | null;
      bathrooms: number | null;
      unitSize: number | null;
      priceFrom: number | null;
      priceTo: number | null;
    }>
  >();

  for (const row of unitRows) {
    const developmentId = Number(row.developmentId || 0);
    if (!developmentId) continue;
    const unitName = String(row.name || '').trim();
    const unitPriceFrom =
      toPositiveNumberOrNull(row.priceFrom) ?? toPositiveNumberOrNull(row.basePriceFrom);
    const fallbackTo =
      toPositiveNumberOrNull(row.priceTo) ?? toPositiveNumberOrNull(row.basePriceTo);
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

    if (unitName) {
      const currentUnitTypes = unitTypesByDevelopment.get(developmentId) || [];
      const existingIndex = currentUnitTypes.findIndex(item => item.name === unitName);
      if (existingIndex >= 0) {
        const existing = currentUnitTypes[existingIndex];
        currentUnitTypes[existingIndex] = {
          name: unitName,
          bedrooms: existing.bedrooms ?? toNumberOrNull(row.bedrooms),
          bathrooms: existing.bathrooms ?? toNumberOrNull(row.bathrooms),
          unitSize: existing.unitSize ?? toNumberOrNull(row.unitSize),
          priceFrom:
            existing.priceFrom === null
              ? unitPriceFrom
              : unitPriceFrom === null
                ? existing.priceFrom
                : Math.min(existing.priceFrom, unitPriceFrom),
          priceTo:
            existing.priceTo === null
              ? unitPriceTo
              : unitPriceTo === null
                ? existing.priceTo
                : Math.max(existing.priceTo, unitPriceTo),
        };
      } else {
        currentUnitTypes.push({
          name: unitName,
          bedrooms: toNumberOrNull(row.bedrooms),
          bathrooms: toNumberOrNull(row.bathrooms),
          unitSize: toNumberOrNull(row.unitSize),
          priceFrom: unitPriceFrom,
          priceTo: unitPriceTo,
        });
      }
      unitTypesByDevelopment.set(developmentId, currentUnitTypes);
    }
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
    const primaryBrandId =
      Number(row.developerBrandProfileId || 0) || Number(row.marketingBrandProfileId || 0);
    const brandRecord = primaryBrandId ? brandById.get(primaryBrandId) : null;
    const unitPriceRange = unitPriceRangeByDevelopment.get(developmentId);
    const developmentPriceFrom = toPositiveNumberOrNull(row.developmentPriceFrom);
    const developmentPriceTo = toPositiveNumberOrNull(row.developmentPriceTo);
    const priceFrom = unitPriceRange?.priceFrom ?? developmentPriceFrom;
    const fallbackPriceTo = developmentPriceTo ?? developmentPriceFrom;
    const rawPriceTo = unitPriceRange?.priceTo ?? fallbackPriceTo ?? priceFrom;
    const priceTo =
      priceFrom !== null && rawPriceTo !== null && rawPriceTo < priceFrom ? priceFrom : rawPriceTo;
    const brochureConfig =
      row.brochureConfigJson && typeof row.brochureConfigJson === 'object'
        ? (row.brochureConfigJson as BrochureConfig)
        : {};

    return {
      developmentId,
      developmentName:
        String(brochureConfig.headline || '').trim() ||
        String(row.developmentName || `Development #${developmentId}`),
      suburb: row.suburb || null,
      city: row.city || null,
      province: row.province || null,
      address: row.address || null,
      description: brochureConfig.description?.trim() || row.description || null,
      amenities: brochureConfig.amenityLabels?.length
        ? brochureConfig.amenityLabels
        : row.amenities || null,
      features: brochureConfig.highlightBullets?.length
        ? brochureConfig.highlightBullets
        : row.features || null,
      priceFrom: priceFrom ?? null,
      priceTo: priceTo ?? null,
      imageUrl: brochureConfig.heroImageUrl?.trim() || extractHeroImageUrl(row.developmentImages),
      brochure: brochureConfig,
      brand: brandRecord
        ? {
            brandProfileId: brandRecord.id,
            brandName: brandRecord.brandName,
            logoUrl: brandRecord.logoUrl,
            publicContactEmail: brandRecord.publicContactEmail,
          }
        : null,
      program: {
        programId: Number(row.programId || 0),
        isActive:
          boolFromTinyInt(row.isActive) ||
          (row.accessStatus ? String(row.accessStatus) !== 'excluded' : false),
        isReferralEnabled:
          boolFromTinyInt(row.isReferralEnabled) || boolFromTinyInt(row.submissionAllowed),
        tierAccessPolicy: row.tierAccessPolicy ? String(row.tierAccessPolicy) : null,
        commissionModel,
        defaultCommissionPercent,
        defaultCommissionAmount,
        currencyCode,
        payoutMilestone,
        payoutMilestoneNotes,
      },
      unitTypes: unitTypesByDevelopment.get(developmentId) || [],
      requiredDocuments,
      sourceDocuments: sourceDocsByDevelopmentId.get(developmentId) || [],
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
      opportunity: {
        status: 'blocked',
        reasonCodes: ['NOT_AVAILABLE'],
        nextAction: 'not_available',
        friendlyMessage: 'This opportunity is not accepting referrals right now.',
      },
    };
  });

  const evaluatedItems = await Promise.all(
    items.map(async item => {
      try {
        const evaluation = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: item.developmentId,
          actor: { role: 'referrer' },
          channel: 'submission',
        });
        return {
          ...item,
          opportunity: evaluation.opportunity,
          program: {
            ...item.program,
            isActive: evaluation.programActive,
            isReferralEnabled: evaluation.referralEnabled,
          },
        };
      } catch {
        return item;
      }
    }),
  );

  return {
    items: evaluatedItems,
  };
}

export async function getPartnerProgramTermsByDevelopmentId(developmentId: number) {
  const result = await listPartnerProgramTerms({
    developmentIds: [developmentId],
    includeDisabled: false,
  });
  return result.items.find(item => item.developmentId === developmentId) || null;
}
