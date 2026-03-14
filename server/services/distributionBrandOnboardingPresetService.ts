import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { distributionBrandPartnerships } from '../../drizzle/schema';
import { getDb } from '../db';
import { getBrandPartnershipByBrandProfileId } from './distributionAccessRepository';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const brandOnboardingPresetDocumentSchema = z.object({
  category: z
    .enum(['developer_document', 'client_required_document'])
    .default('client_required_document'),
  documentCode: z.enum([
    'id_document',
    'proof_of_address',
    'proof_of_income',
    'bank_statement',
    'pre_approval',
    'signed_offer_to_purchase',
    'sale_agreement',
    'attorney_instruction_letter',
    'transfer_documents',
    'custom',
  ]),
  documentLabel: z.string().trim().min(2).max(160),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const brandOnboardingPresetSchema = z.object({
  commissionModel: z.enum(['flat_percentage', 'flat_amount']),
  defaultCommissionPercent: z.number().min(0).nullable(),
  defaultCommissionAmount: z.number().int().min(0).nullable(),
  tierAccessPolicy: z.enum(['restricted', 'open', 'invite_only']),
  payoutMilestone: z.enum([
    'attorney_instruction',
    'attorney_signing',
    'bond_approval',
    'transfer_registration',
    'occupation',
    'custom',
  ]),
  payoutMilestoneNotes: z.string().trim().max(2000).nullable(),
  currencyCode: z.string().trim().min(3).max(3),
  isActive: z.boolean(),
  primaryManagerUserId: z.number().int().positive().nullable(),
  documents: z.array(brandOnboardingPresetDocumentSchema),
});

export type BrandOnboardingPreset = z.infer<typeof brandOnboardingPresetSchema>;

function isMissingBrandPresetSchemaError(error: unknown): boolean {
  const candidate = error as { code?: string; errno?: number; cause?: unknown } | null;
  if (!candidate) return false;
  if (candidate.code === 'ER_NO_SUCH_TABLE' || candidate.code === 'ER_BAD_FIELD_ERROR') return true;
  if (candidate.errno === 1146 || candidate.errno === 1054) return true;
  if (candidate.cause && candidate.cause !== error) {
    return isMissingBrandPresetSchemaError(candidate.cause);
  }
  return false;
}

function normalizePreset(input: BrandOnboardingPreset): BrandOnboardingPreset {
  return {
    ...input,
    currencyCode: input.currencyCode.trim().toUpperCase(),
    payoutMilestoneNotes: input.payoutMilestoneNotes?.trim() || null,
    documents: input.documents
      .map((document, index) => ({
        ...document,
        documentLabel: document.documentLabel.trim(),
        sortOrder: typeof document.sortOrder === 'number' ? document.sortOrder : index,
        category: (
          document.category === 'developer_document'
            ? 'developer_document'
            : 'client_required_document'
        ) as 'developer_document' | 'client_required_document',
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function getBrandOnboardingPreset(
  db: DbHandle,
  brandProfileId: number,
): Promise<BrandOnboardingPreset | null> {
  try {
    const [row] = await db
      .select({
        onboardingDefaultsJson: distributionBrandPartnerships.onboardingDefaultsJson,
      })
      .from(distributionBrandPartnerships)
      .where(eq(distributionBrandPartnerships.brandProfileId, brandProfileId))
      .limit(1);

    if (!row?.onboardingDefaultsJson) return null;
    const parsed = brandOnboardingPresetSchema.safeParse(row.onboardingDefaultsJson);
    return parsed.success ? normalizePreset(parsed.data) : null;
  } catch (error) {
    if (isMissingBrandPresetSchemaError(error)) return null;
    throw error;
  }
}

export async function setBrandOnboardingPreset(input: {
  db: DbHandle;
  brandProfileId: number;
  actorUserId: number;
  preset: BrandOnboardingPreset;
}): Promise<BrandOnboardingPreset> {
  const normalized = normalizePreset(brandOnboardingPresetSchema.parse(input.preset));

  try {
    const existing = await getBrandPartnershipByBrandProfileId(input.db, input.brandProfileId);

    if (!existing) {
      await input.db.insert(distributionBrandPartnerships).values({
        brandProfileId: input.brandProfileId,
        status: 'pending',
        onboardingDefaultsJson: normalized,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      });
    } else {
      await input.db
        .update(distributionBrandPartnerships)
        .set({
          onboardingDefaultsJson: normalized,
          updatedBy: input.actorUserId,
        })
        .where(eq(distributionBrandPartnerships.id, existing.id));
    }

    return normalized;
  } catch (error) {
    if (isMissingBrandPresetSchemaError(error)) {
      throw new Error(
        'Brand onboarding preset schema is not ready yet. Run the latest distribution migrations, then retry.',
      );
    }
    throw error;
  }
}
