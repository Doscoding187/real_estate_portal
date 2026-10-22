import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import { legalReleaseContentDigest } from '../../../services/legalAcceptancePolicy';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  stableDigest,
  withTransaction,
} from './common';
import {
  assertHomepageJourneyPreviewPassword,
  assertHomepageJourneyPreviewTarget,
} from './homepageJourneyPreviewFixture';
import {
  assertCentralEnvironmentReady,
  inspectCentralLocalEnvironment,
  resolveCentralLocalEnvironment,
} from '../../../../scripts/localEnvironmentAuthority';

export const LOCAL_JOURNEY_VERSION = 'local-journey-preview-v2';
export const LOCAL_JOURNEY_USERS = Object.freeze([
  {
    id: 996004,
    email: 'local-agent@listify.local',
    firstName: 'Naledi',
    lastName: 'Demo',
    slug: 'local-agent-demo',
  },
  {
    id: 996005,
    email: 'journey-agent@listify.local',
    firstName: 'Thabo',
    lastName: 'Walkthrough',
    slug: 'local-agent-walkthrough',
  },
  {
    id: 996006,
    email: 'payment-agent@listify.local',
    firstName: 'Mpho',
    lastName: 'Pending',
    slug: 'local-agent-payment-pending',
  },
  {
    id: 996007,
    email: 'referrer@listify.local',
    firstName: 'Lindiwe',
    lastName: 'Referral Demo',
    slug: 'local-distribution-referrer',
  },
]);
const LOCAL_DISTRIBUTION_PARTNER = Object.freeze({
  userId: 996007,
  email: 'referrer@listify.local',
  identityType: 'referrer' as const,
  displayName: 'Local Distribution Partner',
});
const LEGAL_BUNDLE_ID = 'local-journey-synthetic-v1';
export const LOCAL_JOURNEY_DIGEST = stableDigest({
  version: LOCAL_JOURNEY_VERSION,
  users: LOCAL_JOURNEY_USERS,
  distributionPartner: LOCAL_DISTRIBUTION_PARTNER,
  legalBundleId: LEGAL_BUNDLE_ID,
  purchaseTerms: 'terms-payment-notice-2026-10-13.2.txt',
  privacy: 'privacy.txt',
  payments: 'not-seeded;real-local-invoice-and-approval-journey',
});
type Input = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
};

// Reuse the established manual-preview guard: exact owned worktree on 127.0.0.1:3307.
export const assertLocalJourneyTarget = assertHomepageJourneyPreviewTarget;

function localLegalContent(root: string) {
  const directory = resolve(
    root,
    'docs/architecture/launch-readiness-and-product-convergence/evidence/b15-existing-certificate-20261013',
  );
  const label =
    'LOCAL DEMONSTRATION ONLY. Synthetic fixture; no public release or founder approval is inferred. Do not send real money.\n\n';
  return {
    formatVersion: 1 as const,
    bundleId: LEGAL_BUNDLE_ID,
    effectiveAt: '2026-01-01T00:00:00.000Z',
    terms: {
      version: 'local-demo-terms-v1',
      content:
        label + readFileSync(resolve(directory, 'terms-payment-notice-2026-10-13.2.txt'), 'utf8'),
    },
    privacy: {
      version: 'local-demo-privacy-v1',
      content: label + readFileSync(resolve(directory, 'privacy.txt'), 'utf8'),
    },
  };
}

async function inspect(input: Input, password: string) {
  const accounts: Array<Record<string, unknown>> = [];
  for (const user of LOCAL_JOURNEY_USERS) {
    const rows = await queryRows(
      input.connection,
      'SELECT id, openId, email, passwordHash, role, emailVerified, agencyId FROM users WHERE id = ? OR email = ? OR openId = ?',
      [user.id, user.email, user.slug],
    );
    const row = rows[0];
    if (
      rows.length !== 1 ||
      Number(row.id) !== user.id ||
      row.email !== user.email ||
      row.openId !== user.slug ||
      row.role !== 'agent' ||
      Number(row.emailVerified) !== 1 ||
      row.agencyId !== null ||
      !(await bcrypt.compare(password, String(row.passwordHash)))
    ) {
      throw new Error(`Local journey identity missing or conflicting: ${user.email}`);
    }
    const agents = await queryRows(
      input.connection,
      'SELECT id, userId, agencyId, slug FROM agents WHERE id = ? OR userId = ? OR slug = ?',
      [user.id, user.id, user.slug],
    );
    if (
      agents.length !== 1 ||
      Number(agents[0].id) !== user.id ||
      Number(agents[0].userId) !== user.id ||
      agents[0].agencyId !== null ||
      agents[0].slug !== user.slug
    )
      throw new Error('Local agent profile conflicts.');
    const bills = await queryRows(
      input.connection,
      'SELECT id, account_kind FROM billable_accounts WHERE user_id = ?',
      [user.id],
    );
    if (bills.length !== 1 || bills[0].account_kind !== 'agent')
      throw new Error('Local agent billing account conflicts.');
    // Report progress; never delete invoices or reset access when prepare is repeated.
    const progress = await queryRows(
      input.connection,
      'SELECT (SELECT COUNT(*) FROM billing_invoices WHERE billable_account_id = ?) AS invoices, (SELECT COUNT(*) FROM subscriptions WHERE billable_account_id = ?) AS subscriptions',
      [bills[0].id, bills[0].id],
    );
    accounts.push({ email: user.email, userId: user.id, ...progress[0] });
  }
  const distributionIdentities = await queryRows(
    input.connection,
    'SELECT user_id, identity_type, active, display_name FROM distribution_identities WHERE user_id = ? AND identity_type = ?',
    [LOCAL_DISTRIBUTION_PARTNER.userId, LOCAL_DISTRIBUTION_PARTNER.identityType],
  );
  if (
    distributionIdentities.length !== 1 ||
    Number(distributionIdentities[0].user_id) !== LOCAL_DISTRIBUTION_PARTNER.userId ||
    Number(distributionIdentities[0].active) !== 1 ||
    distributionIdentities[0].display_name !== LOCAL_DISTRIBUTION_PARTNER.displayName
  ) {
    throw new Error('Local Distribution partner identity missing or conflicting.');
  }
  const content = localLegalContent(input.authority.context.repository.root);
  const releases = await queryRows(
    input.connection,
    'SELECT * FROM legal_releases WHERE bundle_id = ?',
    [LEGAL_BUNDLE_ID],
  );
  const active = await queryRows(
    input.connection,
    "SELECT bundle_id FROM legal_active_release WHERE purpose = 'account_registration'",
  );
  const release = releases[0];
  if (
    releases.length !== 1 ||
    active.length !== 1 ||
    active[0].bundle_id !== LEGAL_BUNDLE_ID ||
    release.content_sha256 !== legalReleaseContentDigest(content) ||
    release.terms_content !== content.terms.content ||
    release.privacy_content !== content.privacy.content ||
    release.approval_reference !== 'LOCAL-DEMO-SYNTHETIC' ||
    release.approval_actor !== 'Local demo fixture' ||
    release.effective_at !== content.effectiveAt ||
    release.approved_at !== content.effectiveAt ||
    release.terms_version !== content.terms.version ||
    release.privacy_version !== content.privacy.version ||
    Number(release.format_version) !== 1
  )
    throw new Error('Local synthetic legal fixture conflicts.');
  return {
    accounts,
    distributionIdentity: {
      userId: LOCAL_DISTRIBUTION_PARTNER.userId,
      email: LOCAL_DISTRIBUTION_PARTNER.email,
      identityType: LOCAL_DISTRIBUTION_PARTNER.identityType,
      active: true,
    },
    legalBundleId: LEGAL_BUNDLE_ID,
    syntheticOnly: true,
    progressPreserved: true,
  };
}

async function run(input: Input, prepare: boolean) {
  assertOperation(
    input.decision,
    prepare ? ['demo-seed'] : ['verification', 'browser-verification'],
  );
  assertLocalJourneyTarget(input.authority);
  const base = requireExactAdapterTarget(input.authority);
  const manifest = await requireAcceptedMigrationHead(input);
  const central = inspectCentralLocalEnvironment(resolveCentralLocalEnvironment());
  assertCentralEnvironmentReady(central);
  const password = central.values.LOCAL_DEMO_AGENCY_PASSWORD;
  assertHomepageJourneyPreviewPassword(password);
  if (prepare)
    await withTransaction(input.connection, async () => {
      for (const user of LOCAL_JOURNEY_USERS) {
        const existing = await queryRows(
          input.connection,
          'SELECT id FROM users WHERE id = ? OR email = ? OR openId = ?',
          [user.id, user.email, user.slug],
        );
        if (existing.length === 0)
          await input.connection.execute(
            `INSERT INTO users (id, openId, email, passwordHash, name, firstName, lastName, loginMethod, role, emailVerified, onboarding_complete, onboarding_step)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'email', 'agent', 1, 1, 0)`,
            [
              user.id,
              user.slug,
              user.email,
              await bcrypt.hash(password, 10),
              `${user.firstName} ${user.lastName}`,
              user.firstName,
              user.lastName,
            ],
          );
        const agents = await queryRows(
          input.connection,
          'SELECT id FROM agents WHERE id = ? OR userId = ? OR slug = ?',
          [user.id, user.id, user.slug],
        );
        if (agents.length === 0)
          await input.connection.execute(
            `INSERT INTO agents (id, userId, firstName, lastName, displayName, slug, bio, email, phone, isVerified, isFeatured, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Fictitious independent agent for local visual review.', ?, '+27110000000', 0, 0, 'approved')`,
            [
              user.id,
              user.id,
              user.firstName,
              user.lastName,
              `${user.firstName} ${user.lastName}`,
              user.slug,
              user.email,
            ],
          );
        const accounts = await queryRows(
          input.connection,
          'SELECT id FROM billable_accounts WHERE user_id = ?',
          [user.id],
        );
        if (accounts.length === 0)
          await input.connection.execute(
            "INSERT INTO billable_accounts (account_kind, user_id) VALUES ('agent', ?)",
            [user.id],
          );
      }
      const distributionIdentities = await queryRows(
        input.connection,
        'SELECT user_id FROM distribution_identities WHERE user_id = ? AND identity_type = ?',
        [LOCAL_DISTRIBUTION_PARTNER.userId, LOCAL_DISTRIBUTION_PARTNER.identityType],
      );
      if (distributionIdentities.length === 0)
        await input.connection.execute(
          'INSERT INTO distribution_identities (user_id, identity_type, active, display_name) VALUES (?, ?, 1, ?)',
          [
            LOCAL_DISTRIBUTION_PARTNER.userId,
            LOCAL_DISTRIBUTION_PARTNER.identityType,
            LOCAL_DISTRIBUTION_PARTNER.displayName,
          ],
        );
      const content = localLegalContent(input.authority.context.repository.root);
      const releases = await queryRows(
        input.connection,
        'SELECT bundle_id FROM legal_releases WHERE bundle_id = ?',
        [LEGAL_BUNDLE_ID],
      );
      if (releases.length === 0)
        await input.connection.execute(
          `INSERT INTO legal_releases (bundle_id, format_version, effective_at, terms_version, terms_content, privacy_version, privacy_content, approval_reference, approval_actor, approved_at, content_sha256)
       VALUES (?, 1, ?, ?, ?, ?, ?, 'LOCAL-DEMO-SYNTHETIC', 'Local demo fixture', ?, ?)`,
          [
            LEGAL_BUNDLE_ID,
            content.effectiveAt,
            content.terms.version,
            content.terms.content,
            content.privacy.version,
            content.privacy.content,
            content.effectiveAt,
            legalReleaseContentDigest(content),
          ],
        );
      const active = await queryRows(
        input.connection,
        "SELECT bundle_id FROM legal_active_release WHERE purpose = 'account_registration'",
      );
      if (active.length === 0)
        await input.connection.execute(
          "INSERT INTO legal_active_release (purpose, bundle_id) VALUES ('account_registration', ?)",
          [LEGAL_BUNDLE_ID],
        );
      // Conflict detection is inside the transaction: collisions roll back all additions.
      await inspect(input, password);
    });
  return {
    ...base,
    adapter: 'local-journey-preview',
    version: LOCAL_JOURNEY_VERSION,
    digest: LOCAL_JOURNEY_DIGEST,
    migrationHead: manifest.document.expectedHead,
    ...(await inspect(input, password)),
  };
}

export const prepareLocalJourneyPreview = (input: Input) => run(input, true);
export const verifyLocalJourneyPreview = (input: Input) => run(input, false);
