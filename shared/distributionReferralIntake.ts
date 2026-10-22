import { z } from 'zod';

export const DISTRIBUTION_REFERRAL_INTAKE_PAUSED_TITLE = 'Partner referral intake is paused';

export const DISTRIBUTION_REFERRAL_INTAKE_PAUSED_MESSAGE =
  'This referral action is paused until the program has a complete private evidence and supporting-document workflow. Each program must have versioned sharing and privacy information, named recipients, identity-evidence rules, and retention settings. Sharing permission, partner identity evidence, buyer documents, and any credit-report authorization are separate records.';

export const DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const DISTRIBUTION_REFERRAL_INTAKE_ACKNOWLEDGEMENT_METHODS = [
  'in_app_acknowledgement',
] as const;

export const DISTRIBUTION_REFERRAL_EVIDENCE_REVIEWER_ROLES = [
  'agent',
  'agency_admin',
  'property_developer',
  'service_provider',
  'super_admin',
] as const;

/** JSON/base64 travels through the current 14 MiB request boundary. */
export const DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const intakeDocumentSchema = z.object({
  version: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(180),
  content: z
    .string()
    .min(1)
    .max(40_000)
    .refine(value => value.trim().length > 0, 'Document text cannot be blank.'),
});

const intakeRecipientSchema = z.object({
  name: z.string().trim().min(2).max(180),
  organization: z.string().trim().min(2).max(180),
  role: z.string().trim().min(2).max(180),
});

const retentionAnchorValues = [
  'draft_created',
  'last_activity',
  'evidence_captured',
  'referral_submitted',
  'referral_withdrawn',
  'referral_closed',
  'authorization_captured',
  'credit_report_requested',
] as const;

const retentionRuleSchema = z.object({
  days: z.number().int().positive().max(36_500),
  startsFrom: z.enum(retentionAnchorValues),
});

const identityEvidenceSchema = z.object({
  acceptedEvidenceTypes: z.array(z.string().trim().min(2).max(120)).min(1).max(20),
  allowedMimeTypes: z.array(z.enum(DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES)).min(1).max(4),
  maxFileBytes: z
    .number()
    .int()
    .positive()
    .max(DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES),
  verificationInstructions: z.string().trim().min(3).max(4_000),
  authorizedRoles: z.array(z.enum(DISTRIBUTION_REFERRAL_EVIDENCE_REVIEWER_ROLES)).min(1).max(5),
});

const workflowStepSchema = z.object({
  key: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(180),
  partnerInstructions: z.string().trim().min(3).max(4_000),
  ownerRole: z.string().trim().min(2).max(120),
  isBlocking: z.boolean(),
});

const creditReportConfigurationSchema = z
  .object({
    enabled: z.boolean(),
    providerName: z.string().trim().min(2).max(180).nullable(),
    providerApprovalReference: z.string().trim().min(2).max(180).nullable(),
    authorizationDocument: intakeDocumentSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (!value.enabled) return;
    if (!value.providerName) {
      context.addIssue({
        code: 'custom',
        path: ['providerName'],
        message: 'Name the approved provider.',
      });
    }
    if (!value.providerApprovalReference) {
      context.addIssue({
        code: 'custom',
        path: ['providerApprovalReference'],
        message: 'Record the provider approval reference.',
      });
    }
    if (!value.authorizationDocument) {
      context.addIssue({
        code: 'custom',
        path: ['authorizationDocument'],
        message: 'Add the separate credit-report authorization document.',
      });
    }
  });

export const distributionReferralIntakePolicyDraftSchema = z.object({
  sharingPermissionDocument: intakeDocumentSchema.partial().optional(),
  privacyNoticeDocument: intakeDocumentSchema.partial().optional(),
  sharingPurpose: z.string().trim().max(2_000).optional(),
  namedRecipients: z.array(intakeRecipientSchema.partial()).max(30).optional(),
  signatureMethod: z.enum(DISTRIBUTION_REFERRAL_INTAKE_ACKNOWLEDGEMENT_METHODS).optional(),
  identityEvidence: identityEvidenceSchema.partial().optional(),
  retention: z
    .object({
      abandonedIntake: retentionRuleSchema.partial().optional(),
      sharingPermission: retentionRuleSchema.partial().optional(),
      identityEvidence: retentionRuleSchema.partial().optional(),
      activeReferral: retentionRuleSchema.partial().optional(),
      withdrawnReferral: retentionRuleSchema.partial().optional(),
      closedReferral: retentionRuleSchema.partial().optional(),
      creditAuthorization: retentionRuleSchema.partial().optional(),
    })
    .partial()
    .optional(),
  workflowSteps: z.array(workflowStepSchema.partial()).max(30).optional(),
  creditReport: z
    .object({
      enabled: z.boolean().optional(),
      providerName: z.string().trim().max(180).nullable().optional(),
      providerApprovalReference: z.string().trim().max(180).nullable().optional(),
      authorizationDocument: intakeDocumentSchema.partial().nullable().optional(),
    })
    .partial()
    .optional(),
});

export const distributionReferralIntakePolicyConfigurationSchema = z
  .object({
    sharingPermissionDocument: intakeDocumentSchema,
    privacyNoticeDocument: intakeDocumentSchema,
    sharingPurpose: z.string().trim().min(3).max(2_000),
    namedRecipients: z.array(intakeRecipientSchema).min(1).max(30),
    signatureMethod: z.enum(DISTRIBUTION_REFERRAL_INTAKE_ACKNOWLEDGEMENT_METHODS),
    identityEvidence: identityEvidenceSchema,
    retention: z.object({
      abandonedIntake: retentionRuleSchema,
      sharingPermission: retentionRuleSchema,
      identityEvidence: retentionRuleSchema,
      activeReferral: retentionRuleSchema,
      withdrawnReferral: retentionRuleSchema,
      closedReferral: retentionRuleSchema,
      creditAuthorization: retentionRuleSchema.optional(),
    }),
    workflowSteps: z.array(workflowStepSchema).min(1).max(30),
    creditReport: creditReportConfigurationSchema,
  })
  .superRefine((value, context) => {
    if (value.creditReport.enabled && !value.retention.creditAuthorization) {
      context.addIssue({
        code: 'custom',
        path: ['retention', 'creditAuthorization'],
        message: 'Set a separate retention rule for credit-report authorization evidence.',
      });
    }
  });

export type DistributionReferralIntakePolicyDraft = z.infer<
  typeof distributionReferralIntakePolicyDraftSchema
>;
export type DistributionReferralIntakePolicyConfiguration = z.infer<
  typeof distributionReferralIntakePolicyConfigurationSchema
>;
