import { z } from 'zod';

export const DISTRIBUTION_REFERRAL_INTAKE_PAUSED_TITLE = 'This opportunity is not ready for a referral';

export const DISTRIBUTION_REFERRAL_INTAKE_PAUSED_MESSAGE =
  'We can’t start an introduction for this opportunity right now. Check its status later or choose another option. You can still explore current sale and rental properties without sharing anyone’s personal details.';

export const DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

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
    .max(25 * 1024 * 1024),
  verificationInstructions: z.string().trim().min(3).max(4_000),
  authorizedRoles: z.array(z.string().trim().min(2).max(120)).min(1).max(20),
});

export const distributionReferralIntakeWorkflowStepSchema = z.object({
  key: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(180),
  partnerInstructions: z.string().trim().min(3).max(4_000),
  ownerRole: z.string().trim().min(2).max(120),
  isBlocking: z.boolean(),
});

export type DistributionReferralIntakeWorkflowStep = z.infer<
  typeof distributionReferralIntakeWorkflowStepSchema
>;

export const DISTRIBUTION_DEFAULT_REFERRAL_WORKFLOW_STEPS: readonly DistributionReferralIntakeWorkflowStep[] =
  Object.freeze([
    {
      key: 'referral_received',
      title: 'Referral received',
      partnerInstructions:
        "Your referral has reached the developer's sales team. Keep the prospect informed while they review it.",
      ownerRole: 'Developer team',
      isBlocking: true,
    },
    {
      key: 'qualification',
      title: 'Qualification',
      partnerInstructions:
        "The developer confirms the prospect's budget, timing, and fit, then records the next step.",
      ownerRole: 'Developer team',
      isBlocking: true,
    },
    {
      key: 'viewing_arranged',
      title: 'Viewing arranged',
      partnerInstructions:
        'Coordinate the viewing with the developer and tell the prospect once the date and time are confirmed.',
      ownerRole: 'Developer team',
      isBlocking: false,
    },
    {
      key: 'application_submitted',
      title: 'Application submitted',
      partnerInstructions:
        'The developer collects the required documents and submits the application or rental offer.',
      ownerRole: 'Developer team',
      isBlocking: true,
    },
    {
      key: 'outcome_recorded',
      title: 'Outcome recorded',
      partnerInstructions:
        'The developer records the decision and any contract, bond, or lease outcome.',
      ownerRole: 'Developer team',
      isBlocking: true,
    },
    {
      key: 'payout_recorded',
      title: 'Payout recorded',
      partnerInstructions:
        'Property Listify records the payout after the deal closes and the required milestones are met.',
      ownerRole: 'Property Listify team',
      isBlocking: false,
    },
  ]);

export function createDefaultReferralWorkflowSteps(): DistributionReferralIntakeWorkflowStep[] {
  return DISTRIBUTION_DEFAULT_REFERRAL_WORKFLOW_STEPS.map(step => ({ ...step }));
}

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
  signatureMethod: z.string().trim().max(180).optional(),
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
  workflowSteps: z.array(distributionReferralIntakeWorkflowStepSchema.partial()).max(30).optional(),
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
    signatureMethod: z.string().trim().min(3).max(180),
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
    workflowSteps: z.array(distributionReferralIntakeWorkflowStepSchema).min(1).max(30),
    creditReport: creditReportConfigurationSchema,
  })
  .superRefine((value, context) => {
    const requiredAnchors = [
      ['abandonedIntake', 'draft_created'],
      ['sharingPermission', 'evidence_captured'],
      ['identityEvidence', 'evidence_captured'],
      ['activeReferral', 'referral_submitted'],
      ['withdrawnReferral', 'referral_withdrawn'],
      ['closedReferral', 'referral_closed'],
    ] as const;
    for (const [key, expectedAnchor] of requiredAnchors) {
      if (value.retention[key].startsFrom !== expectedAnchor) {
        context.addIssue({
          code: 'custom',
          path: ['retention', key, 'startsFrom'],
          message: `Choose ${expectedAnchor.replace(/_/g, ' ')} so the system can apply this retention rule.`,
        });
      }
    }
    if (value.creditReport.enabled && !value.retention.creditAuthorization) {
      context.addIssue({
        code: 'custom',
        path: ['retention', 'creditAuthorization'],
        message: 'Set a separate retention rule for credit-report authorization evidence.',
      });
    } else if (
      value.retention.creditAuthorization &&
      value.retention.creditAuthorization.startsFrom !== 'authorization_captured'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['retention', 'creditAuthorization', 'startsFrom'],
        message: 'Choose authorization captured for credit-report authorization evidence.',
      });
    }
  });

export type DistributionReferralIntakePolicyDraft = z.infer<
  typeof distributionReferralIntakePolicyDraftSchema
>;
export type DistributionReferralIntakePolicyConfiguration = z.infer<
  typeof distributionReferralIntakePolicyConfigurationSchema
>;
