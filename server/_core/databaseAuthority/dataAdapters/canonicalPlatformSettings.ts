import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';

/**
 * Canonical platform settings reference data.
 *
 * The SARB rates are operational reference values, not fixture data: the
 * affordability tool and the public settings surface read the same rows.
 * This adapter converged the rates onto the canonical `platform_settings`
 * model, whose `category` enum has no `financial` member — the retired
 * hand-applied SQL that used it is historical evidence, not a shape to copy.
 */
export const CANONICAL_PLATFORM_SETTINGS_VERSION = 'canonical-platform-settings-v1' as const;

export type CanonicalPlatformSettingSeed = Readonly<{
  settingKey: string;
  settingValue: string;
  description: string;
  category: 'pricing';
  isPublic: 1;
}>;

export const CANONICAL_PLATFORM_SETTINGS: readonly CanonicalPlatformSettingSeed[] = Object.freeze([
  Object.freeze({
    settingKey: 'sarb_prime_rate',
    settingValue: '10.50',
    description:
      'Current South African Reserve Bank Prime Lending Rate (updated when SARB announces changes)',
    category: 'pricing' as const,
    isPublic: 1 as const,
  }),
  Object.freeze({
    settingKey: 'sarb_repo_rate',
    settingValue: '7.00',
    description: 'Current South African Reserve Bank Repo Rate (base rate)',
    category: 'pricing' as const,
    isPublic: 1 as const,
  }),
]);

const PLATFORM_SETTINGS_PAYLOAD = Object.freeze({
  version: CANONICAL_PLATFORM_SETTINGS_VERSION,
  source: 'docs/UPDATE_SARB_RATE.md',
  rateRelationship: 'prime = repo + 3.50',
  rows: CANONICAL_PLATFORM_SETTINGS,
});

export const CANONICAL_PLATFORM_SETTINGS_DIGEST = stableDigest(PLATFORM_SETTINGS_PAYLOAD);

export const CANONICAL_PLATFORM_SETTING_KEYS = CANONICAL_PLATFORM_SETTINGS.map(
  setting => setting.settingKey,
);

type StoredSetting = Readonly<{
  id: number;
  settingKey: string;
  settingValue: string;
  description: string;
  category: string;
  isPublic: number;
}>;

type SettingAction = 'inserted' | 'converged' | 'unchanged';

export type CanonicalPlatformSettingsEvidence = AdapterEvidence & {
  schemaMutation: false;
  source: 'docs/UPDATE_SARB_RATE.md';
  actions: ReadonlyArray<{ settingKey: string; action: SettingAction | 'reused' }>;
  verified: {
    rowCount: number;
    settingKeys: readonly string[];
    values: Readonly<Record<string, string>>;
    primeRatePresent: true;
    repoRatePresent: true;
  };
};

function evidenceBase(
  authority: ResolvedDatabaseAuthority,
  evidence: AdapterEvidence,
): AdapterEvidence {
  return {
    ...evidence,
    adapter: 'canonical-platform-settings',
    version: CANONICAL_PLATFORM_SETTINGS_VERSION,
    digest: CANONICAL_PLATFORM_SETTINGS_DIGEST,
    targetFingerprintHash: authority.context.targetFingerprintHash,
    databaseName: authority.context.databaseName,
    ownershipKey: authority.context.worktree.ownershipKey,
  };
}

async function readStoredSettings(
  connection: AuthoritySqlConnection,
): Promise<Map<string, StoredSetting[]>> {
  const rows = await queryRows(
    connection,
    'SELECT id, setting_key, setting_value, description, category, isPublic FROM platform_settings WHERE setting_key IN (?, ?) ORDER BY setting_key, id',
    CANONICAL_PLATFORM_SETTING_KEYS,
  );
  const grouped = new Map<string, StoredSetting[]>();
  for (const row of rows) {
    const settingKey = String(rowValue(row, 'setting_key') ?? '');
    const entry: StoredSetting = {
      id: Number(rowValue(row, 'id')),
      settingKey,
      settingValue: String(rowValue(row, 'setting_value') ?? ''),
      description: String(rowValue(row, 'description') ?? ''),
      category: String(rowValue(row, 'category') ?? ''),
      isPublic: Number(rowValue(row, 'isPublic')),
    };
    const existing = grouped.get(settingKey);
    if (existing) existing.push(entry);
    else grouped.set(settingKey, [entry]);
  }
  return grouped;
}

function assertUnambiguousSettings(grouped: Map<string, StoredSetting[]>): void {
  for (const settingKey of CANONICAL_PLATFORM_SETTING_KEYS) {
    const rows = grouped.get(settingKey) ?? [];
    if (rows.length > 1) {
      throw new Error(
        `canonical-platform-settings refused: target holds ${rows.length} rows for ${settingKey}; ` +
          'the key is ambiguous without a reviewed decision.',
      );
    }
  }
}

function assertMatchesSeed(stored: StoredSetting, seed: CanonicalPlatformSettingSeed): void {
  const differences: string[] = [];
  if (stored.settingValue !== seed.settingValue)
    differences.push(`setting_value ${stored.settingValue} != ${seed.settingValue}`);
  if (stored.description !== seed.description)
    differences.push(`description ${stored.description} != ${seed.description}`);
  if (stored.category !== seed.category)
    differences.push(`category ${stored.category} != ${seed.category}`);
  if (stored.isPublic !== seed.isPublic)
    differences.push(`isPublic ${stored.isPublic} != ${seed.isPublic}`);
  if (differences.length > 0) {
    throw new Error(
      `canonical-platform-settings refused: ${stored.settingKey} disagrees with the canonical seed ` +
        `(${differences.join('; ')}).`,
    );
  }
}

function verifiedEvidence(grouped: Map<string, StoredSetting[]>): CanonicalPlatformSettingsEvidence['verified'] {
  const values: Record<string, string> = {};
  let rowCount = 0;
  for (const seed of CANONICAL_PLATFORM_SETTINGS) {
    const rows = grouped.get(seed.settingKey) ?? [];
    if (rows.length !== 1) {
      throw new Error(
        `canonical-platform-settings refused: ${seed.settingKey} is ${rows.length === 0 ? 'missing' : 'duplicated'}; ` +
          'prepared evidence requires exactly one row.',
      );
    }
    assertMatchesSeed(rows[0], seed);
    values[seed.settingKey] = rows[0].settingValue;
    rowCount += 1;
  }
  return {
    rowCount,
    settingKeys: [...CANONICAL_PLATFORM_SETTING_KEYS],
    values,
    primeRatePresent: true,
    repoRatePresent: true,
  };
}

async function writeStoredSettings(
  connection: AuthoritySqlConnection,
  stored: Map<string, StoredSetting[]>,
): Promise<SettingAction[]> {
  const actions: SettingAction[] = [];
  for (const seed of CANONICAL_PLATFORM_SETTINGS) {
    const rows = stored.get(seed.settingKey) ?? [];
    if (rows.length === 0) {
      await connection.execute(
        `INSERT INTO platform_settings
           (setting_key, setting_value, description, category, isPublic, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          seed.settingKey,
          seed.settingValue,
          seed.description,
          seed.category,
          seed.isPublic,
        ],
      );
      actions.push('inserted');
      continue;
    }
    const current = rows[0];
    const unchanged =
      current.settingValue === seed.settingValue &&
      current.description === seed.description &&
      current.category === seed.category &&
      current.isPublic === seed.isPublic;
    if (unchanged) {
      actions.push('unchanged');
      continue;
    }
    await connection.execute(
      `UPDATE platform_settings
          SET setting_value = ?, description = ?, category = ?, isPublic = ?, updatedAt = NOW()
        WHERE id = ?`,
      [seed.settingValue, seed.description, seed.category, seed.isPublic, current.id],
    );
    actions.push('converged');
  }
  return actions;
}

export async function prepareCanonicalPlatformSettings(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<CanonicalPlatformSettingsEvidence> {
  assertOperation(input.decision, ['reference-seed']);
  const base = evidenceBase(input.authority, requireReferenceAdapterTarget(input.authority));
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });

  const actions = await withTransaction(input.connection, async () => {
    const stored = await readStoredSettings(input.connection);
    assertUnambiguousSettings(stored);
    const written = await writeStoredSettings(input.connection, stored);
    const storedAfter = await readStoredSettings(input.connection);
    assertUnambiguousSettings(storedAfter);
    verifiedEvidence(storedAfter);
    return written;
  });

  const storedAfter = await readStoredSettings(input.connection);
  assertUnambiguousSettings(storedAfter);
  return {
    ...base,
    schemaMutation: false,
    source: 'docs/UPDATE_SARB_RATE.md',
    actions: actions.map((action, index) => ({
      settingKey: CANONICAL_PLATFORM_SETTINGS[index].settingKey,
      action,
    })),
    verified: verifiedEvidence(storedAfter),
  };
}

export async function verifyCanonicalPlatformSettings(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<CanonicalPlatformSettingsEvidence> {
  assertOperation(input.decision, ['verification', 'readiness']);
  const base = evidenceBase(input.authority, requireReferenceAdapterTarget(input.authority));
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });

  const stored = await readStoredSettings(input.connection);
  assertUnambiguousSettings(stored);
  return {
    ...base,
    schemaMutation: false,
    source: 'docs/UPDATE_SARB_RATE.md',
    actions: CANONICAL_PLATFORM_SETTINGS.map(seed => ({
      settingKey: seed.settingKey,
      action: 'reused' as const,
    })),
    verified: verifiedEvidence(stored),
  };
}
