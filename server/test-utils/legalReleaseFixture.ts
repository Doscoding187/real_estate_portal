import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { legalReleaseContentDigest } from '../services/legalAcceptancePolicy';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../_core/databaseAuthority/connectionAuthority';

/** Synthetic fixture for an already-authorized isolated test database only. */
export async function installSyntheticLegalRelease() {
  if (process.env.VITEST !== 'true')
    throw new Error('Synthetic legal releases are test fixtures only');
  const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
  const decision = authorizeDatabaseOperation(authority);
  if (!['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass))
    throw new Error('Synthetic legal releases require an owned disposable test target');
  // CI runtime credentials intentionally cannot write approved-copy tables.
  // Fixture creation uses the separate, authorized test-fixture channel.
  const connection = await createAuthoritySqlConnection(authority, decision);
  const db = drizzle(connection as never, { schema, mode: 'default' });
  try {
    const bundleId = `synthetic-test-${randomUUID()}`;
    const content = {
      formatVersion: 1 as const,
      bundleId,
      effectiveAt: '2026-01-01T00:00:00.000Z',
      terms: {
        version: 'test-terms',
        content: 'Synthetic purchase Terms for isolated tests only.',
      },
      privacy: { version: 'test-privacy', content: 'Synthetic notice for isolated tests only.' },
    };
    const [original] = await db
      .select()
      .from(schema.legalActiveRelease)
      .where(eq(schema.legalActiveRelease.purpose, 'account_registration'));
    await db.transaction(async tx => {
      await tx.insert(schema.legalReleases).values({
        bundleId,
        formatVersion: 1,
        effectiveAt: content.effectiveAt,
        termsVersion: content.terms.version,
        termsContent: content.terms.content,
        privacyVersion: content.privacy.version,
        privacyContent: content.privacy.content,
        approvalReference: 'SYNTHETIC-TEST-ONLY',
        approvalActor: 'Test fixture',
        approvedAt: content.effectiveAt,
        contentSha256: legalReleaseContentDigest(content),
      });
      await tx
        .insert(schema.legalActiveRelease)
        .values({ purpose: 'account_registration', bundleId })
        .onDuplicateKeyUpdate({ set: { bundleId } });
    });
    return {
      choice: { bundleId, termsAccepted: true as const, purchaseAccepted: true as const },
      cleanup: async () => {
        try {
          await db.transaction(async tx => {
            if (original)
              await tx
                .update(schema.legalActiveRelease)
                .set({ bundleId: original.bundleId })
                .where(eq(schema.legalActiveRelease.bundleId, bundleId));
            else
              await tx
                .delete(schema.legalActiveRelease)
                .where(eq(schema.legalActiveRelease.bundleId, bundleId));
            await tx
              .delete(schema.legalReleases)
              .where(eq(schema.legalReleases.bundleId, bundleId));
          });
        } finally {
          await connection.end();
        }
      },
    };
  } catch (error) {
    await connection.end();
    throw error;
  }
}
