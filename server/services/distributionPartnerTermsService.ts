import { and, eq, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import {
  cataloguePublishers,
  developmentPhases,
  developmentTeamContacts,
  developments,
  distributionDevelopmentAccess,
  distributionPrograms,
  unitTypes,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { evaluateDevelopmentDistributionAccess } from './distributionAccessPolicy';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';

type ListPartnerProgramTermsInput = {
  cataloguePublisherId?: number;
  developmentIds?: number[];
  includeDisabled?: boolean;
  includeSoldOut?: boolean;
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
  marketStatus: 'launching-soon' | 'selling' | 'sold-out';
  transactionModes: Array<'for_sale' | 'for_rent'>;
  pricingByMode: {
    for_sale: { priceFrom: number | null; priceTo: number | null } | null;
    for_rent: { priceFrom: number | null; priceTo: number | null } | null;
  };
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
    cataloguePublisherId: number;
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
    transactionType: 'for_sale' | 'for_rent';
    availableUnits: number | null;
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
    sharedAt: string | null;
  }>;
  teamContacts: Array<{
    phaseLabel: string | null;
    roleTitle: string;
    displayName: string;
    organizationName: string | null;
    email: string | null;
    phone: string | null;
    responsibility: string | null;
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

export async function listPartnerProgramTerms(
  input: ListPartnerProgramTermsInput,
): Promise<{ items: PartnerProgramTermsItem[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const includeDisabled = Boolean(input.includeDisabled);
  const conditions: SQL[] = [];

  if (typeof input.cataloguePublisherId === 'number') {
    conditions.push(eq(developments.cataloguePublisherId, input.cataloguePublisherId));
  }

  if (input.developmentIds?.length) {
    conditions.push(inArray(developments.id, input.developmentIds));
  }

  if (!input.includeSoldOut) {
    conditions.push(ne(developments.status, 'sold-out'));
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

  const selectPartnerRows = async () => {
    const selectFields: Record<string, any> = {
      developmentId: developments.id,
      developmentName: developments.name,
      marketStatus: developments.status,
      transactionType: developments.transactionType,
      inventoryMode: developments.inventoryMode,
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
      cataloguePublisherId: developments.cataloguePublisherId,
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

    selectFields.brochureConfigJson = distributionDevelopmentAccess.brochureConfigJson;

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

  const rows = await selectPartnerRows();

  if (!rows.length) {
    return { items: [] };
  }

  const developmentIds: number[] = Array.from(
    new Set(rows.map(row => Number(row.developmentId)).filter(value => Number.isFinite(value))),
  );
  const cataloguePublisherIds: number[] = Array.from(
    new Set(
      rows
        .map(row => Number(row.cataloguePublisherId || 0))
        .filter((value): value is number => Number.isFinite(value) && value > 0),
    ),
  );

  const brandRows = cataloguePublisherIds.length
    ? await db
        .select({
          id: cataloguePublishers.id,
          brandName: cataloguePublishers.name,
          logoUrl: cataloguePublishers.logoUrl,
          publicContactEmail: cataloguePublishers.publicContactEmail,
        })
        .from(cataloguePublishers)
        .where(inArray(cataloguePublishers.id, cataloguePublisherIds))
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
          sharedAt: template.createdAt || null,
        })),
    );
  }

  const partnerContactRows = developmentIds.length
    ? await db
        .select({
          developmentId: developmentTeamContacts.developmentId,
          phaseId: developmentTeamContacts.phaseId,
          phaseNumber: developmentPhases.phaseNumber,
          phaseName: developmentPhases.name,
          phaseStatus: developmentPhases.status,
          roleTitle: developmentTeamContacts.roleTitle,
          displayName: developmentTeamContacts.displayName,
          organizationName: developmentTeamContacts.organizationName,
          email: developmentTeamContacts.email,
          phone: developmentTeamContacts.phone,
          responsibility: developmentTeamContacts.responsibility,
        })
        .from(developmentTeamContacts)
        .leftJoin(
          developmentPhases,
          and(
            eq(developmentTeamContacts.phaseId, developmentPhases.id),
            eq(developmentTeamContacts.developmentId, developmentPhases.developmentId),
          ),
        )
        .where(and(
          inArray(developmentTeamContacts.developmentId, developmentIds),
          eq(developmentTeamContacts.isActive, 1),
          eq(developmentTeamContacts.visibleToPartners, 1),
          or(
            isNull(developmentTeamContacts.phaseId),
            and(eq(developmentPhases.status, 'selling'), isNull(developmentPhases.archivedAt)),
          ),
        ))
        .orderBy(developmentTeamContacts.displayOrder, developmentTeamContacts.roleTitle)
    : [];
  const teamContactsByDevelopmentId = new Map<number, PartnerProgramTermsItem['teamContacts']>();
  for (const contact of partnerContactRows) {
    const developmentId = Number(contact.developmentId);
    const contacts = teamContactsByDevelopmentId.get(developmentId) || [];
    contacts.push({
      phaseLabel: contact.phaseId === null
        ? null
        : `Phase ${Number(contact.phaseNumber)}: ${String(contact.phaseName || '')}`,
      roleTitle: String(contact.roleTitle || ''),
      displayName: String(contact.displayName || ''),
      organizationName: contact.organizationName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      responsibility: contact.responsibility || null,
    });
    teamContactsByDevelopmentId.set(developmentId, contacts);
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
          monthlyRentFrom: unitTypes.monthlyRentFrom,
          monthlyRentTo: unitTypes.monthlyRentTo,
          availableUnits: unitTypes.availableUnits,
          availableForSaleUnits: unitTypes.availableForSaleUnits,
          availableForRentUnits: unitTypes.availableForRentUnits,
          availableSalePriceFrom: unitTypes.availableSalePriceFrom,
          availableSalePriceTo: unitTypes.availableSalePriceTo,
          availableRentPriceFrom: unitTypes.availableRentPriceFrom,
          availableRentPriceTo: unitTypes.availableRentPriceTo,
        })
        .from(unitTypes)
        .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
        .orderBy(unitTypes.displayOrder, unitTypes.name)
    : [];

  const developmentById = new Map(rows.map(row => [Number(row.developmentId), row]));
  const unitPriceRangeByDevelopment = new Map<
    number,
    Record<'for_sale' | 'for_rent', { priceFrom: number | null; priceTo: number | null }>
  >();
  const unitTypesByDevelopment = new Map<
    number,
    Array<{
      name: string;
      transactionType: 'for_sale' | 'for_rent';
      availableUnits: number | null;
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
    const development = developmentById.get(developmentId);
    if (!development) continue;
    const unitName = String(row.name || '').trim();
    const isItemized = development.inventoryMode === 'itemized';
    const modes: Array<'for_sale' | 'for_rent'> = isItemized
      ? [
          ...(Number(row.availableForSaleUnits || 0) > 0 ? (['for_sale'] as const) : []),
          ...(Number(row.availableForRentUnits || 0) > 0 ? (['for_rent'] as const) : []),
        ]
      : development.transactionType === 'for_sale' || development.transactionType === 'for_rent'
        ? [development.transactionType]
        : [];

    for (const transactionType of modes) {
      const unitPriceFrom =
        isItemized
          ? transactionType === 'for_rent'
            ? toPositiveNumberOrNull(row.availableRentPriceFrom)
            : toPositiveNumberOrNull(row.availableSalePriceFrom)
          : transactionType === 'for_rent'
            ? toPositiveNumberOrNull(row.monthlyRentFrom)
            : toPositiveNumberOrNull(row.priceFrom) ?? toPositiveNumberOrNull(row.basePriceFrom);
      const unitPriceTo =
        (isItemized
          ? transactionType === 'for_rent'
            ? toPositiveNumberOrNull(row.availableRentPriceTo)
            : toPositiveNumberOrNull(row.availableSalePriceTo)
          : transactionType === 'for_rent'
            ? toPositiveNumberOrNull(row.monthlyRentTo)
            : toPositiveNumberOrNull(row.priceTo) ?? toPositiveNumberOrNull(row.basePriceTo)) ??
        unitPriceFrom;
      const currentByMode = unitPriceRangeByDevelopment.get(developmentId) || {
        for_sale: { priceFrom: null, priceTo: null },
        for_rent: { priceFrom: null, priceTo: null },
      };
      const current = currentByMode[transactionType];
      currentByMode[transactionType] = {
        priceFrom:
          unitPriceFrom === null
            ? current.priceFrom
            : current.priceFrom === null
              ? unitPriceFrom
              : Math.min(current.priceFrom, unitPriceFrom),
        priceTo:
          unitPriceTo === null
            ? current.priceTo
            : current.priceTo === null
              ? unitPriceTo
              : Math.max(current.priceTo, unitPriceTo),
      };
      unitPriceRangeByDevelopment.set(developmentId, currentByMode);

      if (unitName) {
        const currentUnitTypes = unitTypesByDevelopment.get(developmentId) || [];
        currentUnitTypes.push({
          name: unitName,
          transactionType,
          availableUnits: isItemized
            ? Number(transactionType === 'for_rent' ? row.availableForRentUnits : row.availableForSaleUnits)
            : toNumberOrNull(row.availableUnits),
          bedrooms: toNumberOrNull(row.bedrooms),
          bathrooms: toNumberOrNull(row.bathrooms),
          unitSize: toNumberOrNull(row.unitSize),
          priceFrom: unitPriceFrom,
          priceTo: unitPriceTo,
        });
        unitTypesByDevelopment.set(developmentId, currentUnitTypes);
      }
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
    const primaryBrandId = Number(row.cataloguePublisherId || 0);
    const brandRecord = primaryBrandId ? brandById.get(primaryBrandId) : null;
    const unitPriceRanges = unitPriceRangeByDevelopment.get(developmentId) || {
      for_sale: { priceFrom: null, priceTo: null },
      for_rent: { priceFrom: null, priceTo: null },
    };
    const currentUnitTypes = unitTypesByDevelopment.get(developmentId) || [];
    const transactionModes = Array.from(
      new Set(currentUnitTypes.map(unit => unit.transactionType)),
    );
    const isItemized = row.inventoryMode === 'itemized';
    const developmentPriceFrom = toPositiveNumberOrNull(row.developmentPriceFrom);
    const developmentPriceTo = toPositiveNumberOrNull(row.developmentPriceTo);
    const singleModeRange =
      transactionModes.length === 1 ? unitPriceRanges[transactionModes[0]] : null;
    const priceFrom = isItemized
      ? transactionModes.length === 1
        ? singleModeRange?.priceFrom ?? null
        : null
      : singleModeRange?.priceFrom ?? developmentPriceFrom;
    const fallbackPriceTo = developmentPriceTo ?? developmentPriceFrom;
    const rawPriceTo = isItemized
      ? transactionModes.length === 1
        ? singleModeRange?.priceTo ?? priceFrom
        : null
      : transactionModes.length > 1
        ? null
        : singleModeRange?.priceTo ?? fallbackPriceTo ?? priceFrom;
    const priceTo = priceFrom !== null && rawPriceTo !== null && rawPriceTo < priceFrom ? priceFrom : rawPriceTo;
    const brochureConfig =
      row.brochureConfigJson && typeof row.brochureConfigJson === 'object'
        ? (row.brochureConfigJson as BrochureConfig)
        : {};

    return {
      developmentId,
      developmentName:
        String(brochureConfig.headline || '').trim() ||
        String(row.developmentName || `Development #${developmentId}`),
      marketStatus: row.marketStatus,
      transactionModes,
      pricingByMode: {
        for_sale: transactionModes.includes('for_sale') ? unitPriceRanges.for_sale : null,
        for_rent: transactionModes.includes('for_rent') ? unitPriceRanges.for_rent : null,
      },
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
            cataloguePublisherId: brandRecord.id,
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
      unitTypes: currentUnitTypes,
      requiredDocuments,
      sourceDocuments: sourceDocsByDevelopmentId.get(developmentId) || [],
      teamContacts: teamContactsByDevelopmentId.get(developmentId) || [],
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
          teamContacts:
            item.marketStatus !== 'sold-out' && evaluation.opportunity.status === 'ready'
              ? item.teamContacts
              : [],
          sourceDocuments:
            item.marketStatus !== 'sold-out' && evaluation.opportunity.status === 'ready'
              ? item.sourceDocuments
              : [],
          program: {
            ...item.program,
            isActive: evaluation.programActive,
            isReferralEnabled: evaluation.referralEnabled,
          },
        };
      } catch {
        return { ...item, teamContacts: [], sourceDocuments: [] };
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
    includeSoldOut: true,
  });
  return result.items.find(item => item.developmentId === developmentId) || null;
}
