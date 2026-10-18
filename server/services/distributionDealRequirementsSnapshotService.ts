import { and, eq, inArray } from 'drizzle-orm';
import { developmentRequiredDocuments } from '../../drizzle/schema';
import { DISTRIBUTION_PROCESS_DOCUMENT_CODES } from './distributionRequiredDocumentsService';
import { isValidDistributionReferralTermsSnapshot } from './distributionReferralTermsSnapshotService';

type DbExecutor = any;

export type SavedDealDocumentRequirement = {
  templateId: number | null;
  documentCode: string;
  documentLabel: string;
  category: 'client_required_document';
  isRequired: true;
  sortOrder: number;
  isAvailable: boolean;
};

export type DealRequirementSnapshotRecord = {
  dealId: number;
  developmentId: number;
  snapshotJson: unknown;
  snapshotDigest: string | null | undefined;
};

export type ResolvedDealRequirementSnapshot = {
  dealId: number;
  snapshotValid: boolean;
  requirements: SavedDealDocumentRequirement[];
};

type ParsedSavedRequirement = {
  templateId: number | null;
  documentCode: string;
  documentLabel: string;
  category: 'client_required_document';
  isRequired: true;
  sortOrder: number;
};

type ParsedSavedRequirements = {
  version: number;
  requirements: ParsedSavedRequirement[];
};

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseSavedRequirements(snapshot: Record<string, unknown>): ParsedSavedRequirements | null {
  const version = Number(snapshot.version);
  if (version !== 1 && version !== 2) return null;
  if (!Array.isArray(snapshot.requiredDocuments)) return null;

  const allowedCodes = new Set<string>(DISTRIBUTION_PROCESS_DOCUMENT_CODES);
  const requirements: ParsedSavedRequirement[] = [];

  for (const value of snapshot.requiredDocuments) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    const documentCode = String(row.documentCode || '').trim();
    const category = String(row.category || 'client_required_document');
    const isRequired = row.isRequired === true || Number(row.isRequired) === 1;
    const rawTemplateId = row.templateId;
    const templateId =
      rawTemplateId === null || typeof rawTemplateId === 'undefined'
        ? null
        : Number(rawTemplateId);

    if (
      !allowedCodes.has(documentCode) ||
      category !== 'client_required_document' ||
      !isRequired ||
      (version === 2 && (!Number.isInteger(templateId) || Number(templateId) <= 0)) ||
      (templateId !== null && (!Number.isInteger(templateId) || templateId <= 0))
    ) {
      return null;
    }

    requirements.push({
      templateId,
      documentCode,
      documentLabel: String(row.documentLabel || documentCode),
      category: 'client_required_document',
      isRequired: true,
      sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    });
  }

  return { version, requirements };
}

/**
 * Resolve the requirements captured on a referral. Version 2 stores stable
 * template IDs. Version 1 is resolved only when a saved code has exactly one
 * matching Distribution template for the same development.
 */
export async function resolveDealRequirementSnapshots(
  db: DbExecutor,
  records: DealRequirementSnapshotRecord[],
): Promise<Map<number, ResolvedDealRequirementSnapshot>> {
  const parsedByDeal = new Map<
    number,
    {
      version: number;
      developmentId: number;
      requirements: ParsedSavedRequirement[];
    }
  >();
  const result = new Map<number, ResolvedDealRequirementSnapshot>();

  for (const record of records) {
    const dealId = Number(record.dealId);
    const snapshot = parseJsonObject(record.snapshotJson);
    if (
      !snapshot ||
      Number(snapshot.developmentId) !== Number(record.developmentId) ||
      !isValidDistributionReferralTermsSnapshot(record.snapshotJson, record.snapshotDigest)
    ) {
      result.set(dealId, { dealId, snapshotValid: false, requirements: [] });
      continue;
    }

    const saved = parseSavedRequirements(snapshot);
    if (!saved) {
      result.set(dealId, { dealId, snapshotValid: false, requirements: [] });
      continue;
    }
    parsedByDeal.set(dealId, {
      version: saved.version,
      developmentId: Number(record.developmentId),
      requirements: saved.requirements,
    });
    result.set(dealId, { dealId, snapshotValid: true, requirements: [] });
  }

  const templateIds = Array.from(
    new Set(
      Array.from(parsedByDeal.values()).flatMap(({ version, requirements }) =>
        version === 2
          ? requirements.flatMap(requirement =>
              requirement.templateId ? [requirement.templateId] : [],
            )
          : [],
      ),
    ),
  );
  const legacyPairs = Array.from(parsedByDeal.entries()).flatMap(([dealId, entry]) =>
    entry.version === 1
      ? entry.requirements.map(requirement => ({
          developmentId: entry.developmentId,
          documentCode: requirement.documentCode,
        }))
      : [],
  );
  const legacyDevelopmentIds = Array.from(new Set(legacyPairs.map(pair => pair.developmentId)));
  const legacyCodes = Array.from(new Set(legacyPairs.map(pair => pair.documentCode)));

  const [templatesById, legacyTemplates] = await Promise.all([
    templateIds.length
      ? db
          .select({
            id: developmentRequiredDocuments.id,
            developmentId: developmentRequiredDocuments.developmentId,
            category: developmentRequiredDocuments.category,
          })
          .from(developmentRequiredDocuments)
          .where(inArray(developmentRequiredDocuments.id, templateIds))
      : Promise.resolve([]),
    legacyDevelopmentIds.length && legacyCodes.length
      ? db
          .select({
            id: developmentRequiredDocuments.id,
            developmentId: developmentRequiredDocuments.developmentId,
            documentCode: developmentRequiredDocuments.documentCode,
            category: developmentRequiredDocuments.category,
          })
          .from(developmentRequiredDocuments)
          .where(
            and(
              inArray(developmentRequiredDocuments.developmentId, legacyDevelopmentIds),
              inArray(developmentRequiredDocuments.documentCode, legacyCodes),
              eq(developmentRequiredDocuments.category, 'client_required_document'),
            ),
          )
      : Promise.resolve([]),
  ]);

  const templateById = new Map<number, (typeof templatesById)[number]>();
  for (const template of templatesById) {
    templateById.set(Number(template.id), template);
  }
  const legacyByDevelopmentAndCode = new Map<string, Array<(typeof legacyTemplates)[number]>>();
  for (const template of legacyTemplates) {
    const key = `${Number(template.developmentId)}:${String(template.documentCode)}`;
    const matches = legacyByDevelopmentAndCode.get(key) || [];
    matches.push(template);
    legacyByDevelopmentAndCode.set(key, matches);
  }

  for (const [dealId, entry] of parsedByDeal) {
    const legacyCodeCounts = new Map<string, number>();
    if (entry.version === 1) {
      for (const requirement of entry.requirements) {
        legacyCodeCounts.set(
          requirement.documentCode,
          (legacyCodeCounts.get(requirement.documentCode) || 0) + 1,
        );
      }
    }

    const requirements = entry.requirements.map(requirement => {
      let resolvedTemplateId: number | null = null;
      if (entry.version === 2 && requirement.templateId) {
        const template = templateById.get(requirement.templateId);
        if (
          template &&
          Number(template.developmentId) === entry.developmentId &&
          template.category === 'client_required_document'
        ) {
          resolvedTemplateId = requirement.templateId;
        }
      } else if (entry.version === 1 && legacyCodeCounts.get(requirement.documentCode) === 1) {
        const matches =
          legacyByDevelopmentAndCode.get(`${entry.developmentId}:${requirement.documentCode}`) || [];
        if (matches.length === 1) resolvedTemplateId = Number(matches[0].id);
      }

      return {
        ...requirement,
        templateId: resolvedTemplateId,
        isAvailable: resolvedTemplateId !== null,
      };
    });
    result.set(dealId, { dealId, snapshotValid: true, requirements });
  }

  return result;
}
