import {
  BUYING_MODES,
  CONTACT_METHODS,
  CREDIT_REPORT_STATUSES,
  EMPLOYMENT_TYPES,
  LeadImportBatchInputSchema,
  type BuyingMode,
  type CaptureBuyerLeadInput,
  type ContactMethod,
  type CreditReportStatus,
  type EmploymentType,
  type LeadImportBatchInput,
  type LeadImportRow,
  type LeadImportRowResult,
  type LeadSourceType,
  type SaveQualificationProfileInput,
} from '../../shared/leadRouting';
import { captureBuyerLead } from './leadRoutingLeadCaptureService';
import { saveQualificationProfile } from './leadRoutingQualificationService';
import { startLeadFunnelSession } from './leadRoutingSessionService';

const BOOLEAN_TRUE_VALUES = new Set(['true', 'yes', 'y', '1', 'agreed', 'consent', 'opted_in']);
const BOOLEAN_FALSE_VALUES = new Set(['false', 'no', 'n', '0', 'declined', 'opted_out']);

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeKey(value: unknown): string {
  return (
    cleanText(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') ?? ''
  );
}

export function parseImportedBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const key = normalizeKey(value);
  if (BOOLEAN_TRUE_VALUES.has(key)) return true;
  if (BOOLEAN_FALSE_VALUES.has(key)) return false;
  return fallback;
}

export function buildImportedFullName(row: LeadImportRow): string | null {
  const fullName = cleanText(row.fullName);
  if (fullName) return fullName;
  return [row.firstName, row.lastName].map(cleanText).filter(Boolean).join(' ') || null;
}

export function normalizeImportedContactMethod(value: unknown): ContactMethod {
  const key = normalizeKey(value);
  if (CONTACT_METHODS.includes(key as ContactMethod)) return key as ContactMethod;
  if (key.includes('whatsapp')) return 'whatsapp';
  if (key.includes('mail')) return 'email';
  if (key.includes('call') || key.includes('phone')) return 'phone';
  return 'any';
}

export function normalizeImportedBuyingMode(value: unknown): BuyingMode | null {
  const key = normalizeKey(value);
  if (!key) return null;
  if (BUYING_MODES.includes(key as BuyingMode)) return key as BuyingMode;
  if (key.includes('joint') || key.includes('co_app') || key.includes('partner')) return 'joint';
  if (key.includes('alone') || key.includes('solo') || key.includes('single')) return 'solo';
  if (key.includes('unsure') || key.includes('not_sure')) return 'unsure';
  return null;
}

export function normalizeImportedEmploymentType(value: unknown): EmploymentType | null {
  const key = normalizeKey(value);
  if (!key) return null;
  if (EMPLOYMENT_TYPES.includes(key as EmploymentType)) return key as EmploymentType;
  if (key.includes('government')) return 'government_employee';
  if (key.includes('business_owner') || key.includes('business') || key.includes('owner'))
    return 'business_owner';
  if (key.includes('self')) return 'self_employed';
  if (key.includes('contract')) return 'contract_worker';
  if (key.includes('unemployed') || key.includes('not_current')) return 'not_currently_employed';
  if (key.includes('permanent') || key.includes('employed')) return 'permanently_employed';
  return 'other';
}

export function normalizeImportedCreditReportStatus(value: unknown): CreditReportStatus | null {
  const key = normalizeKey(value);
  if (!key) return null;
  if (CREDIT_REPORT_STATUSES.includes(key as CreditReportStatus)) return key as CreditReportStatus;
  if (key.includes('good')) return 'checked_good';
  if (key.includes('unsure') || key.includes('not_sure')) return 'checked_unsure';
  if (key.includes('help')) return 'needs_help';
  if (key.includes('no') || key.includes('not_checked')) return 'not_checked_recently';
  if (key.includes('prefer')) return 'prefer_not_to_say';
  return null;
}

export function buildCaptureInputFromImportRow(input: {
  row: LeadImportRow;
  sourceType: LeadSourceType;
  campaignId?: number | null;
  sessionToken?: string | null;
  privacyPolicyVersion?: string | null;
  defaultContactPermission?: boolean;
  defaultMarketingConsent?: boolean;
}): CaptureBuyerLeadInput | null {
  const fullName = buildImportedFullName(input.row);
  const phone = cleanText(input.row.phone);
  const email = cleanText(input.row.email);
  if (!fullName || (!phone && !email)) return null;

  const externalLeadId = cleanText(input.row.externalLeadId);
  const metadata = {
    importAdapter: input.sourceType === 'meta_ads' ? 'meta_csv' : 'manual_import',
    externalLeadId,
    rowMetadata: input.row.metadata ?? null,
  };

  return {
    sessionToken: input.sessionToken ?? undefined,
    campaignId: input.campaignId ?? undefined,
    sourceType: input.sourceType,
    fullName,
    phone,
    email,
    preferredContactMethod: normalizeImportedContactMethod(input.row.preferredContactMethod),
    contactPermission: parseImportedBoolean(
      input.row.contactPermission,
      input.defaultContactPermission ?? false,
    ),
    marketingConsent: parseImportedBoolean(
      input.row.marketingConsent,
      input.defaultMarketingConsent ?? false,
    ),
    privacyPolicyVersion: input.privacyPolicyVersion ?? null,
    notes: cleanText(input.row.notes),
    metadata,
  };
}

export function buildQualificationInputFromImportRow(input: {
  row: LeadImportRow;
  buyerLeadId: number;
}): SaveQualificationProfileInput | null {
  const qualification: SaveQualificationProfileInput = {
    buyerLeadId: input.buyerLeadId,
    targetArea: cleanText(input.row.preferredArea),
    grossMonthlyIncomeRange: cleanText(input.row.grossMonthlyIncomeRange),
    buyingMode: normalizeImportedBuyingMode(input.row.buyingMode),
    employmentType: normalizeImportedEmploymentType(input.row.employmentType),
    creditReportStatus: normalizeImportedCreditReportStatus(input.row.creditReportStatus),
    buyingTimeline: cleanText(input.row.buyingTimeline),
    metadata: {
      importAdapter: 'lead_import',
      externalLeadId: cleanText(input.row.externalLeadId),
    },
  };

  const hasAnswers = Boolean(
    qualification.targetArea ||
    qualification.grossMonthlyIncomeRange ||
    qualification.buyingMode ||
    qualification.employmentType ||
    qualification.creditReportStatus ||
    qualification.buyingTimeline,
  );

  return hasAnswers ? qualification : null;
}

export async function importBuyerLeads(input: LeadImportBatchInput): Promise<{
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  results: LeadImportRowResult[];
}> {
  const parsed = LeadImportBatchInputSchema.parse(input);
  const results: LeadImportRowResult[] = [];

  for (const [index, row] of parsed.rows.entries()) {
    const captureInput = buildCaptureInputFromImportRow({
      row,
      sourceType: parsed.sourceType,
      campaignId: parsed.campaignId,
      privacyPolicyVersion: parsed.privacyPolicyVersion,
      defaultContactPermission: parsed.defaultContactPermission,
      defaultMarketingConsent: parsed.defaultMarketingConsent,
    });

    if (!captureInput) {
      results.push({ rowIndex: index, status: 'skipped', reason: 'missing_name_or_contact' });
      continue;
    }

    try {
      const session = await startLeadFunnelSession({
        ...(parsed.attribution ?? {}),
        sourceType: parsed.sourceType,
        campaignId: parsed.campaignId ?? undefined,
      });
      const captured = await captureBuyerLead({
        ...captureInput,
        sessionToken: session.sessionToken,
      });
      const qualificationInput = buildQualificationInputFromImportRow({
        row,
        buyerLeadId: captured.buyerLeadId,
      });
      if (qualificationInput) await saveQualificationProfile(qualificationInput);

      results.push({
        rowIndex: index,
        status: captured.status === 'duplicate' ? 'duplicate' : 'imported',
        buyerLeadId: captured.buyerLeadId,
        duplicateOfLeadId: captured.duplicateOfLeadId,
      });
    } catch (error) {
      results.push({
        rowIndex: index,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'import_failed',
      });
    }
  }

  return {
    imported: results.filter(result => result.status === 'imported').length,
    duplicates: results.filter(result => result.status === 'duplicate').length,
    skipped: results.filter(result => result.status === 'skipped').length,
    failed: results.filter(result => result.status === 'failed').length,
    results,
  };
}
