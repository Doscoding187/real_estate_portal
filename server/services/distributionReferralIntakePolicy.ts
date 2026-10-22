import { createHash } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  distributionPrograms,
  distributionReferralIntakePolicyReleases,
} from '../../drizzle/schema';
import { DISTRIBUTION_REFERRAL_INTAKE_PAUSED_MESSAGE } from '../../shared/distributionReferralIntake';
import {
  distributionReferralIntakePolicyConfigurationSchema,
  distributionReferralIntakePolicyDraftSchema,
  type DistributionReferralIntakePolicyDraft,
} from '../../shared/distributionReferralIntake';
import { getDb } from '../db';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function configurationDigest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function currentTimestampForSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function getConfigurationErrorMessage(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string {
  return error.issues
    .map(issue => `${issue.path.length ? issue.path.join('.') : 'configuration'}: ${issue.message}`)
    .join(' ');
}

function badConfiguration(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message });
}

async function lockProgramForDevelopment(tx: any, developmentId: number): Promise<number> {
  await tx.execute(
    sql`SELECT id FROM distribution_programs WHERE development_id = ${developmentId} FOR UPDATE`,
  );
  const [program] = await tx
    .select({ id: distributionPrograms.id })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, developmentId))
    .limit(1);
  if (!program) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Create a partner program for this development before configuring referral intake.',
    });
  }
  return Number(program.id);
}

export async function getDistributionReferralIntakePolicy(developmentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [program] = await db
    .select({ id: distributionPrograms.id })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, developmentId))
    .limit(1);

  if (!program) {
    return { programId: null, activeRelease: null, draftRelease: null, intakePaused: true };
  }

  const [activeRows, draftRows] = await Promise.all([
    db
      .select()
      .from(distributionReferralIntakePolicyReleases)
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.programId, program.id),
          eq(distributionReferralIntakePolicyReleases.status, 'active'),
        ),
      )
      .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
      .limit(1),
    db
      .select()
      .from(distributionReferralIntakePolicyReleases)
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.programId, program.id),
          eq(distributionReferralIntakePolicyReleases.status, 'draft'),
        ),
      )
      .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
      .limit(1),
  ]);

  return {
    programId: Number(program.id),
    activeRelease: activeRows[0] ?? null,
    draftRelease: draftRows[0] ?? null,
    intakePaused: true as const,
  };
}

export async function saveDistributionReferralIntakePolicyDraft(input: {
  developmentId: number;
  releaseId?: number;
  expectedConfigurationDigest?: string;
  configuration: DistributionReferralIntakePolicyDraft;
  actorUserId: number;
}) {
  const parsed = distributionReferralIntakePolicyDraftSchema.safeParse(input.configuration);
  if (!parsed.success) badConfiguration(getConfigurationErrorMessage(parsed.error));

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async tx => {
    const programId = await lockProgramForDevelopment(tx, input.developmentId);
    const drafts = await tx
      .select()
      .from(distributionReferralIntakePolicyReleases)
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.programId, programId),
          eq(distributionReferralIntakePolicyReleases.status, 'draft'),
        ),
      )
      .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
      .limit(1);
    const currentDraft = drafts[0];

    if (input.releaseId) {
      if (!currentDraft || Number(currentDraft.id) !== input.releaseId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'This policy draft is no longer the current editable version. Refresh and review the latest draft.',
        });
      }
      if (
        !input.expectedConfigurationDigest ||
        currentDraft.configurationDigest !== input.expectedConfigurationDigest
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This policy draft changed after it was opened. Refresh before saving again.',
        });
      }

      const [updated] = await tx
        .update(distributionReferralIntakePolicyReleases)
        .set({
          configuration: parsed.data as Record<string, unknown>,
          configurationDigest: configurationDigest(parsed.data),
          updatedBy: input.actorUserId,
        })
        .where(eq(distributionReferralIntakePolicyReleases.id, input.releaseId))
        .$returningId();

      return { success: true, releaseId: Number(updated.id), created: false };
    }

    if (currentDraft) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A policy draft already exists. Refresh and edit that draft.',
      });
    }

    const [latest] = await tx
      .select({ policyVersion: distributionReferralIntakePolicyReleases.policyVersion })
      .from(distributionReferralIntakePolicyReleases)
      .where(eq(distributionReferralIntakePolicyReleases.programId, programId))
      .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
      .limit(1);
    const [created] = await tx
      .insert(distributionReferralIntakePolicyReleases)
      .values({
        programId,
        policyVersion: Number(latest?.policyVersion ?? 0) + 1,
        status: 'draft',
        configuration: parsed.data as Record<string, unknown>,
        configurationDigest: configurationDigest(parsed.data),
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      })
      .$returningId();

    return { success: true, releaseId: Number(created.id), created: true };
  });
}

export async function publishDistributionReferralIntakePolicy(input: {
  developmentId: number;
  releaseId: number;
  expectedConfigurationDigest: string;
  approvalReference: string;
  actorUserId: number;
}) {
  const approvalReference = input.approvalReference.trim();
  if (approvalReference.length < 2 || approvalReference.length > 180) {
    badConfiguration('Enter the reference for the policy approval record (2–180 characters).');
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async tx => {
    const programId = await lockProgramForDevelopment(tx, input.developmentId);
    const [draft] = await tx
      .select()
      .from(distributionReferralIntakePolicyReleases)
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.id, input.releaseId),
          eq(distributionReferralIntakePolicyReleases.programId, programId),
          eq(distributionReferralIntakePolicyReleases.status, 'draft'),
        ),
      )
      .limit(1);

    if (!draft || draft.configurationDigest !== input.expectedConfigurationDigest) {
      throw new TRPCError({
        code: 'CONFLICT',
        message:
          'This policy draft changed or was already published. Refresh and review the latest version.',
      });
    }

    const parsed = distributionReferralIntakePolicyConfigurationSchema.safeParse(
      draft.configuration,
    );
    if (!parsed.success) {
      badConfiguration(
        `Complete the policy before publishing. ${getConfigurationErrorMessage(parsed.error)}`,
      );
    }

    await tx
      .update(distributionReferralIntakePolicyReleases)
      .set({ status: 'retired' })
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.programId, programId),
          eq(distributionReferralIntakePolicyReleases.status, 'active'),
        ),
      );

    await tx
      .update(distributionReferralIntakePolicyReleases)
      .set({
        status: 'active',
        configuration: parsed.data as Record<string, unknown>,
        configurationDigest: configurationDigest(parsed.data),
        approvalReference,
        publishedBy: input.actorUserId,
        publishedAt: currentTimestampForSql(),
        updatedBy: input.actorUserId,
      })
      .where(eq(distributionReferralIntakePolicyReleases.id, input.releaseId));

    return {
      success: true,
      releaseId: input.releaseId,
      policyVersion: Number(draft.policyVersion),
      intakePaused: true as const,
    };
  });
}

/**
 * Fail closed while the private, versioned evidence workflow is not implemented.
 * Replace this guard with evidence-backed policy validation when that workflow ships.
 */
export function assertDistributionReferralIntakeReady(): void {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: DISTRIBUTION_REFERRAL_INTAKE_PAUSED_MESSAGE,
  });
}
