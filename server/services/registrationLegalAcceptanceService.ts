import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { getDb } from '../db-connection';
import {
  getRegistrationLegalDisclosure,
  validateRegistrationLegalAcceptance,
  type LegalRelease,
} from './legalAcceptancePolicy';

type Database = MySql2Database<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type ReleaseRow = typeof schema.legalReleases.$inferSelect;

function releaseFromRow(row: ReleaseRow | undefined): unknown {
  if (!row) return undefined;
  return {
    formatVersion: row.formatVersion,
    bundleId: row.bundleId,
    effectiveAt: row.effectiveAt,
    terms: { version: row.termsVersion, content: row.termsContent },
    privacy: { version: row.privacyVersion, content: row.privacyContent },
    status: 'approved',
    approval: {
      reference: row.approvalReference,
      actor: row.approvalActor,
      approvedAt: row.approvedAt,
      contentSha256: row.contentSha256,
    },
  };
}

async function database(): Promise<Database> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db as Database;
}

export class RegistrationLegalError extends Error {
  constructor(
    public readonly code:
      | 'LEGAL_RELEASE_UNAVAILABLE'
      | 'TERMS_ACCEPTANCE_REQUIRED'
      | 'LEGAL_VERSION_STALE',
  ) {
    super(
      code === 'LEGAL_RELEASE_UNAVAILABLE'
        ? 'New account registration is temporarily unavailable. Please try again later.'
        : code === 'LEGAL_VERSION_STALE'
          ? 'The Terms or Privacy Notice have changed. Review the current documents and choose again.'
          : 'Please review the Terms of Service and Privacy Notice and explicitly accept the Terms.',
    );
    this.name = 'RegistrationLegalError';
  }
}

/** Every response contains the exact validated copy; no request owns approval. */
export async function getCurrentRegistrationLegalRelease(bundleId?: string) {
  const db = await database();
  let row: ReleaseRow | undefined;
  if (bundleId) {
    [row] = await db
      .select()
      .from(schema.legalReleases)
      .where(eq(schema.legalReleases.bundleId, bundleId))
      .limit(1);
  } else {
    const [selected] = await db
      .select({ release: schema.legalReleases })
      .from(schema.legalActiveRelease)
      .innerJoin(
        schema.legalReleases,
        eq(schema.legalActiveRelease.bundleId, schema.legalReleases.bundleId),
      )
      .where(eq(schema.legalActiveRelease.purpose, 'account_registration'))
      .limit(1);
    row = selected?.release;
  }
  const release = releaseFromRow(row);
  const disclosure = getRegistrationLegalDisclosure(release, new Date());
  if (!disclosure) throw new RegistrationLegalError('LEGAL_RELEASE_UNAVAILABLE');
  const approved = release as LegalRelease;
  return {
    ...disclosure,
    terms: { ...disclosure.terms, content: approved.terms.content },
    privacy: { ...disclosure.privacy, content: approved.privacy.content },
  };
}

export interface RegistrationAgentProfile {
  displayName: string;
  phone: string;
  bio?: string;
  licenseNumber?: string;
  specializations?: string[];
}

/** Exported transaction body is also exercised against the actual local schema. */
export async function insertRegistrationWithLegalAcceptance(
  tx: Transaction,
  userData: Omit<schema.InsertUser, 'id' | 'createdAt' | 'updatedAt' | 'lastSignedIn'>,
  choice: unknown,
  agentProfile?: RegistrationAgentProfile,
): Promise<{ userId: number; evidenceId: string }> {
  // Registration and a governed pointer switch must lock this same row.
  const [pointer] = await tx
    .select()
    .from(schema.legalActiveRelease)
    .where(eq(schema.legalActiveRelease.purpose, 'account_registration'))
    .limit(1)
    .for('update');
  const [row] = pointer
    ? await tx
        .select()
        .from(schema.legalReleases)
        .where(eq(schema.legalReleases.bundleId, pointer.bundleId))
        .limit(1)
    : [];
  const now = new Date();
  const result = validateRegistrationLegalAcceptance(choice, releaseFromRow(row), now);
  if (!result.ok) throw new RegistrationLegalError(result.code);
  if (
    !userData.email ||
    !userData.passwordHash ||
    userData.loginMethod !== 'email' ||
    userData.founderAuthority ||
    userData.role === 'super_admin'
  ) {
    throw new Error('Invalid public registration identity');
  }
  const [existing] = await tx
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`LOWER(TRIM(${schema.users.email})) = ${userData.email.trim().toLowerCase()}`)
    .limit(1);
  if (existing) throw new Error('User with this email already exists');
  if (
    userData.role === 'agent' &&
    (!agentProfile?.displayName.trim() || !agentProfile.phone.trim())
  ) {
    throw new Error('Agent profile with display name and phone number is required');
  }
  const mysqlNow = now.toISOString().slice(0, 23).replace('T', ' ');
  const [created] = await tx
    .insert(schema.users)
    .values({ ...userData, createdAt: mysqlNow, updatedAt: mysqlNow, lastSignedIn: mysqlNow });
  const userId = Number(created.insertId);
  if (!Number.isSafeInteger(userId) || userId <= 0)
    throw new Error('Registration did not return an account identity');
  if (userData.role === 'agent' && agentProfile) {
    const displayName = agentProfile.displayName.trim();
    await tx.insert(schema.agents).values({
      userId,
      displayName,
      phone: agentProfile.phone.trim(),
      bio: agentProfile.bio || null,
      licenseNumber: agentProfile.licenseNumber || null,
      specialization: agentProfile.specializations?.join(',') || null,
      firstName: displayName.split(' ')[0],
      lastName: displayName.split(' ').slice(1).join(' '),
      isVerified: 0,
      isFeatured: 0,
      status: 'pending',
      createdAt: mysqlNow,
      updatedAt: mysqlNow,
    });
  }
  const evidenceId = randomUUID();
  const acceptance = result.acceptance;
  await tx.insert(schema.userLegalAcceptances).values({
    id: evidenceId,
    userId,
    bundleId: acceptance.bundleId,
    termsSha256: acceptance.termsSha256,
    privacyNoticeSha256: acceptance.privacyNoticeSha256,
    releaseContentSha256: acceptance.releaseContentSha256,
    acceptedAt: mysqlNow,
    source: acceptance.source,
  });
  return { userId, evidenceId };
}

export async function createRegistrationWithLegalAcceptance(
  userData: Parameters<typeof insertRegistrationWithLegalAcceptance>[1],
  choice: unknown,
  agentProfile?: RegistrationAgentProfile,
) {
  const db = await database();
  return db.transaction(tx =>
    insertRegistrationWithLegalAcceptance(tx, userData, choice, agentProfile),
  );
}
